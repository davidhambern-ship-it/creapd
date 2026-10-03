using Microsoft.Win32;

namespace CREAPDBridge;

internal static class ProtocolRegistration
{
    private const string Scheme = "creapd-obs";

    public static void EnsureRegistered()
    {
        try
        {
            var exe = Environment.ProcessPath;
            if (string.IsNullOrWhiteSpace(exe)) return;

            using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{Scheme}");
            key?.SetValue("", "URL:CREAPD OBS Bridge");
            key?.SetValue("URL Protocol", "");

            using var icon = key?.CreateSubKey("DefaultIcon");
            icon?.SetValue("", $"\\\"{exe}\\\",0");

            using var command = key?.CreateSubKey(@"shell\open\command");
            command?.SetValue("", $"\\\"{exe}\\\" \\\"%1\\\"");
        }
        catch
        {
            // Pairing remains usable through manual token entry if Windows blocks registry writes.
        }
    }

    public static PairingPayload? ParsePairingUri(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri)) return null;
        if (!string.Equals(uri.Scheme, Scheme, StringComparison.OrdinalIgnoreCase)) return null;
        if (!string.Equals(uri.Host, "pair", StringComparison.OrdinalIgnoreCase)) return null;

        var values = ParseQuery(uri.Query);
        values.TryGetValue("creapd_url", out var creapdUrl);
        values.TryGetValue("bridge_token", out var bridgeToken);

        creapdUrl = Uri.UnescapeDataString(creapdUrl ?? "").Trim();
        bridgeToken = Uri.UnescapeDataString(bridgeToken ?? "").Trim();

        if (string.IsNullOrWhiteSpace(creapdUrl) || string.IsNullOrWhiteSpace(bridgeToken))
            return null;

        return new PairingPayload(creapdUrl, bridgeToken);
    }

    private static Dictionary<string, string> ParseQuery(string query)
    {
        var output = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var trimmed = (query ?? "").TrimStart('?');
        foreach (var part in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var index = part.IndexOf('=');
            var key = index >= 0 ? part[..index] : part;
            var value = index >= 0 ? part[(index + 1)..] : "";
            output[Uri.UnescapeDataString(key)] = value;
        }
        return output;
    }
}

internal sealed record PairingPayload(string CreapdUrl, string BridgeToken);
