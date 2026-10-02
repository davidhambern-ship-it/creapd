using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CREAPDBridge;

internal sealed class ObsClient : IAsyncDisposable
{
    private ClientWebSocket? _socket;
    private readonly HttpClient _downloads = new();
    private readonly Action<string> _log;

    public string Endpoint { get; private set; } = "ws://127.0.0.1:4455";
    public string StudioVersion { get; private set; } = "";
    public string WebSocketVersion { get; private set; } = "";
    public string CurrentScene { get; private set; } = "";
    public List<string> Scenes { get; } = [];
    public List<Dictionary<string, object?>> SceneSources { get; } = [];
    public bool RecordingActive { get; private set; }
    public bool RecordingPaused { get; private set; }
    public string RecordingTimecode { get; private set; } = "";
    public long RecordingDuration { get; private set; }
    public long RecordingBytes { get; private set; }
    public int VideoWidth { get; private set; } = 1920;
    public int VideoHeight { get; private set; } = 1080;
    public bool OverlayVisible { get; private set; }
    public string OverlayTitle { get; private set; } = "";
    public string OverlaySubtitle { get; private set; } = "";
    public string OverlayLabel { get; private set; } = "";
    public string OverlayPosition { get; private set; } = "bottom_left";
    public string OverlayInputName { get; } = "CREAPD Overlay";

    public bool Connected => _socket?.State == WebSocketState.Open;

    public ObsClient(Action<string> log)
    {
        _log = log;
    }

    public async Task ConnectAsync(string endpoint, string password, CancellationToken cancellationToken)
    {
        await DisconnectAsync();
        Endpoint = string.IsNullOrWhiteSpace(endpoint) ? "ws://127.0.0.1:4455" : endpoint.Trim();

        _log($"Connecting to OBS at {Endpoint}…");
        var socket = new ClientWebSocket();
        socket.Options.AddSubProtocol("obswebsocket.json");
        await socket.ConnectAsync(new Uri(Endpoint), cancellationToken);

        var hello = await ReceiveAsync(socket, cancellationToken);
        if (GetInt(hello, "op") != 0)
        {
            socket.Dispose();
            throw new InvalidOperationException("OBS did not send the expected WebSocket Hello message.");
        }

        var d = hello.GetProperty("d");
        var rpcVersion = Math.Min(1, GetInt(d, "rpcVersion", 1));
        var identify = new Dictionary<string, object?>
        {
            ["rpcVersion"] = rpcVersion,
            ["eventSubscriptions"] = 0,
        };

        if (d.TryGetProperty("authentication", out var auth) && auth.ValueKind == JsonValueKind.Object)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                socket.Dispose();
                throw new InvalidOperationException("OBS requires a WebSocket password.");
            }

            var salt = GetString(auth, "salt");
            var challenge = GetString(auth, "challenge");
            var secret = Sha256Base64(password + salt);
            identify["authentication"] = Sha256Base64(secret + challenge);
        }

        await SendAsync(socket, new Dictionary<string, object?>
        {
            ["op"] = 1,
            ["d"] = identify,
        }, cancellationToken);

        while (true)
        {
            var message = await ReceiveAsync(socket, cancellationToken);
            if (GetInt(message, "op") == 2) break;
        }

        _socket = socket;
        var version = await RequestAsync("GetVersion", null, cancellationToken);
        StudioVersion = GetString(version, "obsVersion");
        WebSocketVersion = GetString(version, "obsWebSocketVersion");

        try
        {
            var video = await RequestAsync("GetVideoSettings", null, cancellationToken);
            VideoWidth = Math.Max(1, GetInt(video, "baseWidth", 1920));
            VideoHeight = Math.Max(1, GetInt(video, "baseHeight", 1080));
        }
        catch
        {
            VideoWidth = 1920;
            VideoHeight = 1080;
        }

        await RefreshStateAsync(true, cancellationToken);
        _log($"OBS connected · {StudioVersion} · Scene: {CurrentScene}");
    }

    public async Task DisconnectAsync()
    {
        var socket = _socket;
        _socket = null;
        if (socket is null) return;

        try
        {
            if (socket.State == WebSocketState.Open)
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(1));
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "CREAPD Bridge closing", cts.Token);
            }
        }
        catch {}
        finally
        {
            socket.Dispose();
        }
    }

    public async Task RefreshStateAsync(bool refreshScenes, CancellationToken cancellationToken)
    {
        var current = await RequestAsync("GetCurrentProgramScene", null, cancellationToken);
        CurrentScene = GetString(current, "currentProgramSceneName");

        if (refreshScenes || Scenes.Count == 0)
        {
            var sceneList = await RequestAsync("GetSceneList", null, cancellationToken);
            Scenes.Clear();
            if (sceneList.TryGetProperty("scenes", out var scenes) && scenes.ValueKind == JsonValueKind.Array)
            {
                foreach (var scene in scenes.EnumerateArray())
                {
                    var name = GetString(scene, "sceneName");
                    if (!string.IsNullOrWhiteSpace(name)) Scenes.Add(name);
                }
            }
        }

        var record = await RequestAsync("GetRecordStatus", null, cancellationToken);
        RecordingActive = GetBool(record, "outputActive");
        RecordingPaused = GetBool(record, "outputPaused");
        RecordingTimecode = GetString(record, "outputTimecode");
        RecordingDuration = GetLong(record, "outputDuration");
        RecordingBytes = GetLong(record, "outputBytes");

        await RefreshSceneSourcesAsync(cancellationToken);
    }

    public async Task<JsonElement> RequestAsync(string requestType, object? requestData, CancellationToken cancellationToken)
    {
        var socket = _socket;
        if (socket is null || socket.State != WebSocketState.Open)
            throw new InvalidOperationException("OBS WebSocket is not connected.");

        var requestId = Guid.NewGuid().ToString("N");
        await SendAsync(socket, new Dictionary<string, object?>
        {
            ["op"] = 6,
            ["d"] = new Dictionary<string, object?>
            {
                ["requestType"] = requestType,
                ["requestId"] = requestId,
                ["requestData"] = requestData ?? new Dictionary<string, object?>(),
            }
        }, cancellationToken);

        while (true)
        {
            var message = await ReceiveAsync(socket, cancellationToken);
            if (GetInt(message, "op") != 7) continue;
            var data = message.GetProperty("d");
            if (!string.Equals(GetString(data, "requestId"), requestId, StringComparison.Ordinal)) continue;

            if (data.TryGetProperty("requestStatus", out var status) && !GetBool(status, "result"))
            {
                var comment = GetString(status, "comment");
                throw new InvalidOperationException(string.IsNullOrWhiteSpace(comment)
                    ? $"{requestType} failed."
                    : $"{requestType} failed: {comment}");
            }

            if (data.TryGetProperty("responseData", out var responseData))
                return responseData.Clone();

            using var empty = JsonDocument.Parse("{}");
            return empty.RootElement.Clone();
        }
    }

    public async Task SetSceneAsync(string sceneName, CancellationToken cancellationToken)
    {
        await RequestAsync("SetCurrentProgramScene", new { sceneName }, cancellationToken);
        await RefreshStateAsync(false, cancellationToken);
    }

    public async Task<Dictionary<string, object?>> StartRecordingAsync(CancellationToken cancellationToken)
    {
        await RequestAsync("StartRecord", null, cancellationToken);
        await Task.Delay(200, cancellationToken);
        await RefreshStateAsync(false, cancellationToken);
        return RecordingResult();
    }

    public async Task<Dictionary<string, object?>> StopRecordingAsync(CancellationToken cancellationToken)
    {
        var stopped = await RequestAsync("StopRecord", null, cancellationToken);
        await Task.Delay(200, cancellationToken);
        await RefreshStateAsync(false, cancellationToken);
        var result = RecordingResult();
        var path = GetString(stopped, "outputPath");
        if (!string.IsNullOrWhiteSpace(path)) result["output_path"] = path;
        return result;
    }

    public async Task<Dictionary<string, object?>> PauseRecordingAsync(CancellationToken cancellationToken)
    {
        await RequestAsync("PauseRecord", null, cancellationToken);
        await Task.Delay(150, cancellationToken);
        await RefreshStateAsync(false, cancellationToken);
        return RecordingResult();
    }

    public async Task<Dictionary<string, object?>> ResumeRecordingAsync(CancellationToken cancellationToken)
    {
        await RequestAsync("ResumeRecord", null, cancellationToken);
        await Task.Delay(150, cancellationToken);
        await RefreshStateAsync(false, cancellationToken);
        return RecordingResult();
    }

    public async Task CreateSceneAsync(string sceneName, CancellationToken cancellationToken)
    {
        await RequestAsync("CreateScene", new { sceneName }, cancellationToken);
        await RequestAsync("SetCurrentProgramScene", new { sceneName }, cancellationToken);
        await RefreshStateAsync(true, cancellationToken);
    }

    public async Task<Dictionary<string, object?>> CreateSourceAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var scene = GetString(payload, "scene_name");
        if (string.IsNullOrWhiteSpace(scene)) scene = CurrentScene;
        var name = GetString(payload, "source_name");
        var sourceType = GetString(payload, "source_type").ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(scene) || string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Scene and source name are required.");

        var settings = new Dictionary<string, object?>();
        string inputKind;

        switch (sourceType)
        {
            case "image":
                inputKind = "image_source";
                settings["file"] = await ResolveAssetPathAsync(GetString(payload, "path", GetString(payload, "url")), name, cancellationToken);
                break;
            case "media":
                inputKind = "ffmpeg_source";
                settings["local_file"] = await ResolveAssetPathAsync(GetString(payload, "path", GetString(payload, "url")), name, cancellationToken);
                settings["is_local_file"] = true;
                settings["looping"] = GetBool(payload, "loop");
                settings["restart_on_activate"] = true;
                break;
            case "text":
                inputKind = "text_gdiplus_v2";
                settings["text"] = GetString(payload, "text");
                break;
            case "browser":
                inputKind = "browser_source";
                settings["url"] = GetString(payload, "url");
                settings["width"] = GetInt(payload, "width", 1920);
                settings["height"] = GetInt(payload, "height", 1080);
                settings["shutdown"] = false;
                settings["restart_when_active"] = false;
                break;
            case "camera":
                inputKind = "dshow_input";
                if (!string.IsNullOrWhiteSpace(GetString(payload, "device_id")))
                    settings["video_device_id"] = GetString(payload, "device_id");
                break;
            case "audio_input":
                inputKind = "wasapi_input_capture";
                if (!string.IsNullOrWhiteSpace(GetString(payload, "device_id")))
                    settings["device_id"] = GetString(payload, "device_id");
                break;
            case "display_capture":
                inputKind = "monitor_capture";
                settings["monitor"] = GetInt(payload, "monitor");
                break;
            case "window_capture":
                inputKind = "window_capture";
                if (!string.IsNullOrWhiteSpace(GetString(payload, "window")))
                    settings["window"] = GetString(payload, "window");
                break;
            default:
                throw new InvalidOperationException($"Unsupported CREAPD source type: {sourceType}");
        }

        var created = await RequestAsync("CreateInput", new Dictionary<string, object?>
        {
            ["sceneName"] = scene,
            ["inputName"] = name,
            ["inputKind"] = inputKind,
            ["inputSettings"] = settings,
            ["sceneItemEnabled"] = true,
        }, cancellationToken);

        await RefreshSceneSourcesAsync(cancellationToken);
        return new Dictionary<string, object?>
        {
            ["scene_name"] = scene,
            ["source_name"] = name,
            ["source_type"] = sourceType,
            ["scene_item_id"] = GetInt(created, "sceneItemId"),
        };
    }

    public async Task RemoveSourceAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var (scene, source, itemId) = await GetSceneItemAsync(payload, cancellationToken);
        await RequestAsync("RemoveSceneItem", new { sceneName = scene, sceneItemId = itemId }, cancellationToken);
        await RefreshSceneSourcesAsync(cancellationToken);
    }

    public async Task SetSourceVisibilityAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var (scene, source, itemId) = await GetSceneItemAsync(payload, cancellationToken);
        await RequestAsync("SetSceneItemEnabled", new
        {
            sceneName = scene,
            sceneItemId = itemId,
            sceneItemEnabled = GetBool(payload, "visible"),
        }, cancellationToken);
        await RefreshSceneSourcesAsync(cancellationToken);
    }

    public async Task<int> MoveSourceAsync(JsonElement payload, int direction, CancellationToken cancellationToken)
    {
        var (scene, source, itemId) = await GetSceneItemAsync(payload, cancellationToken);
        var list = await RequestAsync("GetSceneItemList", new { sceneName = scene }, cancellationToken);
        var currentIndex = 0;
        var count = 0;
        if (list.TryGetProperty("sceneItems", out var items) && items.ValueKind == JsonValueKind.Array)
        {
            count = items.GetArrayLength();
            foreach (var item in items.EnumerateArray())
            {
                if (GetInt(item, "sceneItemId") == itemId)
                {
                    currentIndex = GetInt(item, "sceneItemIndex");
                    break;
                }
            }
        }

        var next = Math.Clamp(currentIndex + direction, 0, Math.Max(0, count - 1));
        await RequestAsync("SetSceneItemIndex", new
        {
            sceneName = scene,
            sceneItemId = itemId,
            sceneItemIndex = next,
        }, cancellationToken);
        await RefreshSceneSourcesAsync(cancellationToken);
        return next;
    }

    public async Task<Dictionary<string, object?>> SetSourceTransformAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var (scene, source, itemId) = await GetSceneItemAsync(payload, cancellationToken);
        var transform = new Dictionary<string, object?>();
        AddNumberIfPresent(payload, "x", "positionX", transform);
        AddNumberIfPresent(payload, "y", "positionY", transform);
        AddNumberIfPresent(payload, "scale_x", "scaleX", transform);
        AddNumberIfPresent(payload, "scale_y", "scaleY", transform);
        AddNumberIfPresent(payload, "rotation", "rotation", transform);
        AddIntIfPresent(payload, "crop_left", "cropLeft", transform);
        AddIntIfPresent(payload, "crop_right", "cropRight", transform);
        AddIntIfPresent(payload, "crop_top", "cropTop", transform);
        AddIntIfPresent(payload, "crop_bottom", "cropBottom", transform);

        await RequestAsync("SetSceneItemTransform", new Dictionary<string, object?>
        {
            ["sceneName"] = scene,
            ["sceneItemId"] = itemId,
            ["sceneItemTransform"] = transform,
        }, cancellationToken);
        await RefreshSceneSourcesAsync(cancellationToken);
        return transform;
    }

    public async Task ShowLowerThirdAsync(string title, string subtitle, string label, string position, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new InvalidOperationException("Lower-third title is required.");
        if (string.IsNullOrWhiteSpace(label)) label = "CREAPD LIVE";
        position = NormalizePosition(position);

        await RefreshStateAsync(true, cancellationToken);
        var file = WriteOverlayFile(title, subtitle, label, true, position);
        await EnsureOverlayInputAsync(file, cancellationToken);

        OverlayVisible = true;
        OverlayTitle = title;
        OverlaySubtitle = subtitle;
        OverlayLabel = label;
        OverlayPosition = position;
    }

    public async Task ClearOverlayAsync(CancellationToken cancellationToken)
    {
        var file = WriteOverlayFile("", "", "", false, OverlayPosition);
        await EnsureOverlayInputAsync(file, cancellationToken);
        OverlayVisible = false;
        OverlayTitle = "";
        OverlaySubtitle = "";
        OverlayLabel = "";
    }

    public Dictionary<string, object?> OverlayResult() => new()
    {
        ["overlay_visible"] = OverlayVisible,
        ["overlay_title"] = OverlayTitle,
        ["overlay_subtitle"] = OverlaySubtitle,
        ["overlay_label"] = OverlayLabel,
        ["overlay_position"] = OverlayPosition,
        ["overlay_input_name"] = OverlayInputName,
    };

    public Dictionary<string, object?> Capabilities() => new()
    {
        ["scene_control"] = true,
        ["scene_create_control"] = true,
        ["source_control"] = true,
        ["source_transform_control"] = true,
        ["direct_layout_editor"] = true,
        ["canvas_width"] = VideoWidth,
        ["canvas_height"] = VideoHeight,
        ["scene_source_scene"] = CurrentScene,
        ["scene_sources"] = SceneSources,
        ["source_types"] = new[] { "image", "media", "text", "browser", "camera", "audio_input", "display_capture", "window_capture" },
        ["recording_control"] = true,
        ["recording_active"] = RecordingActive,
        ["recording_paused"] = RecordingPaused,
        ["recording_timecode"] = RecordingTimecode,
        ["recording_duration"] = RecordingDuration,
        ["recording_bytes"] = RecordingBytes,
        ["overlay_control"] = true,
        ["overlay_position_control"] = true,
        ["overlay_visible"] = OverlayVisible,
        ["overlay_title"] = OverlayTitle,
        ["overlay_subtitle"] = OverlaySubtitle,
        ["overlay_label"] = OverlayLabel,
        ["overlay_position"] = OverlayPosition,
        ["overlay_input_name"] = OverlayInputName,
        ["protocol"] = "obs-websocket-v5",
        ["bridge"] = "windows-desktop",
        ["bridge_version"] = "0.1.0",
    };

    private async Task RefreshSceneSourcesAsync(CancellationToken cancellationToken)
    {
        SceneSources.Clear();
        if (string.IsNullOrWhiteSpace(CurrentScene)) return;

        try
        {
            var list = await RequestAsync("GetSceneItemList", new { sceneName = CurrentScene }, cancellationToken);
            if (!list.TryGetProperty("sceneItems", out var items) || items.ValueKind != JsonValueKind.Array) return;

            foreach (var item in items.EnumerateArray())
            {
                var id = GetInt(item, "sceneItemId");
                Dictionary<string, object?>? transform = null;
                try
                {
                    var transformData = await RequestAsync("GetSceneItemTransform", new
                    {
                        sceneName = CurrentScene,
                        sceneItemId = id,
                    }, cancellationToken);
                    if (transformData.TryGetProperty("sceneItemTransform", out var t))
                    {
                        transform = new Dictionary<string, object?>
                        {
                            ["position_x"] = GetDouble(t, "positionX"),
                            ["position_y"] = GetDouble(t, "positionY"),
                            ["scale_x"] = GetDouble(t, "scaleX", 1),
                            ["scale_y"] = GetDouble(t, "scaleY", 1),
                            ["rotation"] = GetDouble(t, "rotation"),
                            ["width"] = GetDouble(t, "width"),
                            ["height"] = GetDouble(t, "height"),
                            ["source_width"] = GetDouble(t, "sourceWidth"),
                            ["source_height"] = GetDouble(t, "sourceHeight"),
                            ["crop_left"] = GetInt(t, "cropLeft"),
                            ["crop_top"] = GetInt(t, "cropTop"),
                            ["crop_right"] = GetInt(t, "cropRight"),
                            ["crop_bottom"] = GetInt(t, "cropBottom"),
                            ["alignment"] = GetInt(t, "alignment"),
                        };
                    }
                }
                catch {}

                SceneSources.Add(new Dictionary<string, object?>
                {
                    ["name"] = GetString(item, "sourceName"),
                    ["id"] = id,
                    ["index"] = GetInt(item, "sceneItemIndex"),
                    ["enabled"] = GetBool(item, "sceneItemEnabled"),
                    ["kind"] = GetString(item, "inputKind"),
                    ["source_type"] = GetString(item, "sourceType"),
                    ["transform"] = transform,
                });
            }
        }
        catch
        {
            SceneSources.Clear();
        }
    }

    private async Task<(string Scene, string Source, int ItemId)> GetSceneItemAsync(JsonElement payload, CancellationToken cancellationToken)
    {
        var scene = GetString(payload, "scene_name");
        if (string.IsNullOrWhiteSpace(scene)) scene = CurrentScene;
        var source = GetString(payload, "source_name");
        if (string.IsNullOrWhiteSpace(scene) || string.IsNullOrWhiteSpace(source))
            throw new InvalidOperationException("Scene and source name are required.");

        var item = await RequestAsync("GetSceneItemId", new { sceneName = scene, sourceName = source }, cancellationToken);
        return (scene, source, GetInt(item, "sceneItemId"));
    }

    private async Task<string> ResolveAssetPathAsync(string value, string sourceName, CancellationToken cancellationToken)
    {
        var raw = value.Trim();
        if (string.IsNullOrWhiteSpace(raw) || !Uri.TryCreate(raw, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return raw;

        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CREAPD", "obs-assets");
        Directory.CreateDirectory(dir);

        var safeName = new string(sourceName.Select(ch => char.IsLetterOrDigit(ch) || "._-".Contains(ch) ? ch : '_').ToArray()).Trim('_');
        if (string.IsNullOrWhiteSpace(safeName)) safeName = "asset";
        var extension = Path.GetExtension(uri.AbsolutePath);
        if (string.IsNullOrWhiteSpace(extension) || extension.Length > 8) extension = ".bin";
        var path = Path.Combine(dir, $"{safeName}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{extension}");

        await using var source = await _downloads.GetStreamAsync(uri, cancellationToken);
        await using var target = File.Create(path);
        await source.CopyToAsync(target, cancellationToken);
        return path;
    }

    private string WriteOverlayFile(string title, string subtitle, string label, bool visible, string position)
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CREAPD", "obs-overlays");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"creapd-overlay-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.html");
        File.WriteAllText(path, OverlayHtml(title, subtitle, label, visible, position), Encoding.UTF8);
        return path;
    }

    private async Task EnsureOverlayInputAsync(string localFile, CancellationToken cancellationToken)
    {
        var list = await RequestAsync("GetInputList", null, cancellationToken);
        var exists = false;
        if (list.TryGetProperty("inputs", out var inputs) && inputs.ValueKind == JsonValueKind.Array)
        {
            exists = inputs.EnumerateArray().Any(input =>
                string.Equals(GetString(input, "inputName"), OverlayInputName, StringComparison.Ordinal));
        }

        var settings = new Dictionary<string, object?>
        {
            ["is_local_file"] = true,
            ["local_file"] = localFile,
            ["width"] = VideoWidth,
            ["height"] = VideoHeight,
            ["fps"] = 30,
            ["shutdown"] = false,
            ["restart_when_active"] = false,
            ["reroute_audio"] = false,
        };

        if (!exists)
        {
            await RequestAsync("CreateInput", new Dictionary<string, object?>
            {
                ["sceneName"] = CurrentScene,
                ["inputName"] = OverlayInputName,
                ["inputKind"] = "browser_source",
                ["inputSettings"] = settings,
                ["sceneItemEnabled"] = true,
            }, cancellationToken);
        }
        else
        {
            await RequestAsync("SetInputSettings", new Dictionary<string, object?>
            {
                ["inputName"] = OverlayInputName,
                ["inputSettings"] = settings,
                ["overlay"] = true,
            }, cancellationToken);
        }

        foreach (var scene in Scenes)
        {
            try
            {
                await RequestAsync("GetSceneItemId", new { sceneName = scene, sourceName = OverlayInputName }, cancellationToken);
            }
            catch
            {
                try
                {
                    await RequestAsync("CreateSceneItem", new
                    {
                        sceneName = scene,
                        sourceName = OverlayInputName,
                        sceneItemEnabled = true,
                    }, cancellationToken);
                }
                catch {}
            }
        }
    }

    private static string OverlayHtml(string title, string subtitle, string label, bool visible, string position)
    {
        static string H(string value) => System.Net.WebUtility.HtmlEncode(value ?? "");
        var subtitleMarkup = string.IsNullOrWhiteSpace(subtitle) ? "" : $"<div class=\"subtitle\">{H(subtitle)}</div>";
        var stateClass = visible ? "show" : "hidden";
        return $@"<!doctype html>
<html><head><meta charset=""utf-8""><style>
*{{box-sizing:border-box}}html,body{{width:100%;height:100%;margin:0;overflow:hidden;background:transparent;font-family:Arial,Helvetica,sans-serif}}
.stage{{position:relative;width:100vw;height:100vh}}.anchor{{position:absolute;max-width:90vw}}
.bottom_left{{left:5.2vw;bottom:6.5vh}}.bottom_center{{left:50%;bottom:6.5vh;transform:translateX(-50%)}}.bottom_right{{right:5.2vw;bottom:6.5vh}}
.top_left{{left:5.2vw;top:6.5vh}}.top_center{{left:50%;top:6.5vh;transform:translateX(-50%)}}.top_right{{right:5.2vw;top:6.5vh}}
.lower{{min-width:420px;max-width:72vw;display:flex;filter:drop-shadow(0 14px 28px rgba(0,0,0,.45))}}
.accent{{width:10px;border-radius:12px 0 0 12px;background:linear-gradient(180deg,#8b5cf6,#d946ef)}}
.card{{min-width:0;padding:17px 25px 18px 22px;border-radius:0 12px 12px 0;background:linear-gradient(105deg,rgba(10,11,18,.97),rgba(25,22,38,.94));border:1px solid rgba(255,255,255,.15);border-left:0}}
.label{{margin-bottom:7px;font-size:15px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#c4b5fd}}
.title{{font-size:42px;line-height:1.04;font-weight:850;letter-spacing:-.025em;color:white}}.subtitle{{margin-top:7px;font-size:23px;color:rgba(255,255,255,.76)}}
.show .lower{{animation:creapdIn .46s cubic-bezier(.16,1,.3,1) both}}.hidden .lower{{opacity:0;transform:translateY(18px) scale(.98)}}
@keyframes creapdIn{{from{{opacity:0;transform:translateY(28px) scale(.97)}}to{{opacity:1;transform:translateY(0) scale(1)}}}}
</style></head><body class=""{stateClass}""><div class=""stage""><div class=""anchor {NormalizePosition(position)}""><div class=""lower""><div class=""accent""></div><div class=""card""><div class=""label"">{H(label)}</div><div class=""title"">{H(title)}</div>{subtitleMarkup}</div></div></div></div></body></html>";
    }

    private Dictionary<string, object?> RecordingResult() => new()
    {
        ["recording_active"] = RecordingActive,
        ["recording_paused"] = RecordingPaused,
        ["recording_timecode"] = RecordingTimecode,
        ["recording_duration"] = RecordingDuration,
        ["recording_bytes"] = RecordingBytes,
    };

    private static string NormalizePosition(string value) => value.Trim().ToLowerInvariant() switch
    {
        "bottom_left" => "bottom_left",
        "bottom_center" => "bottom_center",
        "bottom_right" => "bottom_right",
        "top_left" => "top_left",
        "top_center" => "top_center",
        "top_right" => "top_right",
        _ => "bottom_left",
    };

    private static void AddNumberIfPresent(JsonElement payload, string source, string target, Dictionary<string, object?> output)
    {
        if (payload.TryGetProperty(source, out var value) && value.ValueKind == JsonValueKind.Number)
            output[target] = value.GetDouble();
    }

    private static void AddIntIfPresent(JsonElement payload, string source, string target, Dictionary<string, object?> output)
    {
        if (payload.TryGetProperty(source, out var value) && value.ValueKind == JsonValueKind.Number)
            output[target] = value.GetInt32();
    }

    private static string Sha256Base64(string value) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static async Task SendAsync(ClientWebSocket socket, object value, CancellationToken cancellationToken)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
        await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
    }

    private static async Task<JsonElement> ReceiveAsync(ClientWebSocket socket, CancellationToken cancellationToken)
    {
        var buffer = new byte[65536];
        using var stream = new MemoryStream();

        while (true)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close)
                throw new WebSocketException($"OBS WebSocket closed: {result.CloseStatus} {result.CloseStatusDescription}");

            if (result.Count > 0) stream.Write(buffer, 0, result.Count);
            if (result.EndOfMessage) break;
        }

        using var document = JsonDocument.Parse(stream.ToArray());
        return document.RootElement.Clone();
    }

    internal static string GetString(JsonElement element, string name, string fallback = "")
    {
        if (!element.TryGetProperty(name, out var value)) return fallback;
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? fallback,
            JsonValueKind.Number => value.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => fallback,
        };
    }

    internal static int GetInt(JsonElement element, string name, int fallback = 0)
    {
        if (!element.TryGetProperty(name, out var value)) return fallback;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
        return int.TryParse(value.ToString(), out number) ? number : fallback;
    }

    internal static long GetLong(JsonElement element, string name, long fallback = 0)
    {
        if (!element.TryGetProperty(name, out var value)) return fallback;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number)) return number;
        return long.TryParse(value.ToString(), out number) ? number : fallback;
    }

    internal static double GetDouble(JsonElement element, string name, double fallback = 0)
    {
        if (!element.TryGetProperty(name, out var value)) return fallback;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number)) return number;
        return double.TryParse(value.ToString(), out number) ? number : fallback;
    }

    internal static bool GetBool(JsonElement element, string name, bool fallback = false)
    {
        if (!element.TryGetProperty(name, out var value)) return fallback;
        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
            _ => fallback,
        };
    }

    public async ValueTask DisposeAsync()
    {
        await DisconnectAsync();
        _downloads.Dispose();
    }
}
