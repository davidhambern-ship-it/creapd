using System.Net.Http.Json;
using System.Text.Json;

namespace CREAPDBridge;

internal sealed class CreapdClient : IDisposable
{
    private readonly HttpClient _http = new();
    private string _baseUrl = "";
    private string _bridgeToken = "";
    private string _previewBypassSecret = "";

    public void Configure(string baseUrl, string bridgeToken, string previewBypassSecret)
    {
        _baseUrl = (baseUrl ?? "").Trim().TrimEnd('/');
        _bridgeToken = (bridgeToken ?? "").Trim();
        _previewBypassSecret = (previewBypassSecret ?? "").Trim();

        if (string.IsNullOrWhiteSpace(_baseUrl))
            throw new InvalidOperationException("CREAPD URL is required.");
        if (string.IsNullOrWhiteSpace(_bridgeToken))
            throw new InvalidOperationException("CREAPD Bridge Token is required.");
    }

    public async Task<PollResult> PollAsync(
        bool obsConnected,
        string endpoint,
        string studioVersion,
        string webSocketVersion,
        string currentScene,
        IReadOnlyList<string> scenes,
        Dictionary<string, object?> capabilities,
        string? lastError,
        CancellationToken cancellationToken)
    {
        var payload = new Dictionary<string, object?>
        {
            ["action"] = "obs_bridge_agent_poll",
            ["bridge_token"] = _bridgeToken,
            ["obs_connected"] = obsConnected,
            ["obs_endpoint"] = endpoint,
            ["obs_studio_version"] = studioVersion,
            ["obs_websocket_version"] = webSocketVersion,
            ["current_scene"] = currentScene,
            ["scenes"] = scenes,
            ["capabilities"] = capabilities,
            ["last_error"] = lastError,
        };

        var root = await PostAsync(payload, cancellationToken);
        var nextPollMs = ObsClient.GetInt(root, "next_poll_ms", 5000);
        var commands = new List<BridgeCommand>();

        if (root.TryGetProperty("commands", out var commandArray) && commandArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in commandArray.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                commands.Add(new BridgeCommand(
                    ObsClient.GetString(item, "id"),
                    ObsClient.GetString(item, "command_type"),
                    item.TryGetProperty("payload", out var p) ? p.Clone() : EmptyObject(),
                    ObsClient.GetString(item, "session_type"),
                    ObsClient.GetString(item, "session_id")
                ));
            }
        }

        return new PollResult(Math.Clamp(nextPollMs, 500, 15000), commands);
    }

    public async Task CompleteCommandAsync(
        BridgeCommand command,
        bool success,
        Dictionary<string, object?> result,
        string? error,
        CancellationToken cancellationToken)
    {
        var payload = new Dictionary<string, object?>
        {
            ["action"] = "obs_bridge_agent_complete",
            ["bridge_token"] = _bridgeToken,
            ["command_id"] = command.Id,
            ["success"] = success,
            ["result"] = result,
        };
        if (!success && !string.IsNullOrWhiteSpace(error)) payload["error"] = error;

        _ = await PostAsync(payload, cancellationToken);
    }

    private async Task<JsonElement> PostAsync(Dictionary<string, object?> payload, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/creapd/production/core")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Accept.ParseAdd("application/json");
        if (!string.IsNullOrWhiteSpace(_previewBypassSecret))
            request.Headers.TryAddWithoutValidation("x-vercel-protection-bypass", _previewBypassSecret);

        using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);

        JsonDocument? document = null;
        try
        {
            document = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
        }
        catch {}

        if (!response.IsSuccessStatusCode)
        {
            var message = document is null ? "" : ReadError(document.RootElement);
            document?.Dispose();
            throw new HttpRequestException(
                string.IsNullOrWhiteSpace(message)
                    ? $"CREAPD returned HTTP {(int)response.StatusCode}."
                    : message,
                null,
                response.StatusCode);
        }

        if (document is null)
            throw new InvalidOperationException("CREAPD returned an unreadable response.");

        using (document)
        {
            return document.RootElement.Clone();
        }
    }

    private static string ReadError(JsonElement root)
    {
        if (root.TryGetProperty("diagnostic", out var diagnostic) &&
            diagnostic.ValueKind == JsonValueKind.Object)
        {
            var message = ObsClient.GetString(diagnostic, "message");
            if (!string.IsNullOrWhiteSpace(message)) return message;
        }

        foreach (var key in new[] { "message", "error" })
        {
            var value = ObsClient.GetString(root, key);
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }

        return "";
    }

    private static JsonElement EmptyObject()
    {
        using var doc = JsonDocument.Parse("{}");
        return doc.RootElement.Clone();
    }

    public void Dispose() => _http.Dispose();
}

internal sealed record BridgeCommand(
    string Id,
    string CommandType,
    JsonElement Payload,
    string SessionType,
    string SessionId);

internal sealed record PollResult(
    int NextPollMs,
    IReadOnlyList<BridgeCommand> Commands);
