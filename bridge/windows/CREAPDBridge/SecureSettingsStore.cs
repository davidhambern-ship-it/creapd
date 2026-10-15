using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CREAPDBridge;

internal sealed record PersistedBridgeSettings(
    string CreapdUrl,
    string ObsUrl,
    string BridgeToken,
    string ObsPassword,
    string PreviewBypassSecret);

internal static class SecureSettingsStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("CREAPD-OBS-Bridge-v1");

    private static string SettingsPath
    {
        get
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CREAPD");
            Directory.CreateDirectory(dir);
            return Path.Combine(dir, "obs-bridge-settings.bin");
        }
    }

    public static PersistedBridgeSettings? Load()
    {
        try
        {
            if (!File.Exists(SettingsPath)) return null;
            var encrypted = File.ReadAllBytes(SettingsPath);
            var clear = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
            return JsonSerializer.Deserialize<PersistedBridgeSettings>(clear);
        }
        catch
        {
            return null;
        }
    }

    public static void Save(PersistedBridgeSettings settings)
    {
        var clear = JsonSerializer.SerializeToUtf8Bytes(settings);
        var encrypted = ProtectedData.Protect(clear, Entropy, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(SettingsPath, encrypted);
    }
}
