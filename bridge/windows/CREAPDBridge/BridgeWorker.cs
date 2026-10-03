using System.Text.Json;

namespace CREAPDBridge;

internal sealed record BridgeSettings(
    string CreapdUrl,
    string ObsUrl,
    string BridgeToken,
    string ObsPassword,
    string PreviewBypassSecret);

internal sealed class BridgeWorker : IAsyncDisposable
{
    private readonly Action<string> _log;
    private readonly Action<string> _status;
    private readonly ObsClient _obs;
    private readonly CreapdClient _creapd = new();
    private bool _directEditMode;

    public BridgeWorker(Action<string> log, Action<string> status)
    {
        _log = log;
        _status = status;
        _obs = new ObsClient(log);
    }

    public async Task RunAsync(BridgeSettings settings, CancellationToken cancellationToken)
    {
        _creapd.Configure(settings.CreapdUrl, settings.BridgeToken, settings.PreviewBypassSecret);
        _status("Starting…");
        _log("CREAPD Bridge 0.2.0 starting.");
        _log($"CREAPD: {settings.CreapdUrl}");
        _log($"OBS: {settings.ObsUrl}");

        while (!cancellationToken.IsCancellationRequested)
        {
            string? bridgeError = null;
            try
            {
                if (!_obs.Connected)
                {
                    _status("Connecting to OBS…");
                    await _obs.ConnectAsync(settings.ObsUrl, settings.ObsPassword, cancellationToken);
                }

                await _obs.RefreshStateAsync(false, cancellationToken);
                _status($"Connected · {_obs.CurrentScene}");

                var capabilities = _obs.Capabilities();
                capabilities["direct_edit_mode"] = _directEditMode;

                var poll = await _creapd.PollAsync(
                    true,
                    _obs.Endpoint,
                    _obs.StudioVersion,
                    _obs.WebSocketVersion,
                    _obs.CurrentScene,
                    _obs.Scenes,
                    capabilities,
                    null,
                    cancellationToken);

                foreach (var command in poll.Commands)
                {
                    await ExecuteCommandAsync(command, cancellationToken);
                }

                await Task.Delay(poll.NextPollMs, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                bridgeError = ex.Message;
                _status("Waiting for OBS / CREAPD");
                _log($"Bridge waiting: {bridgeError}");

                try
                {
                    var capabilities = _obs.Capabilities();
                    capabilities["direct_edit_mode"] = _directEditMode;
                    await _creapd.PollAsync(
                        false,
                        settings.ObsUrl,
                        _obs.StudioVersion,
                        _obs.WebSocketVersion,
                        _obs.CurrentScene,
                        _obs.Scenes,
                        capabilities,
                        bridgeError,
                        cancellationToken);
                }
                catch {}

                try { await _obs.DisconnectAsync(); } catch {}

                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }

        _status("Stopped");
        _log("CREAPD Bridge stopped.");
        await _obs.DisconnectAsync();
    }

    private async Task ExecuteCommandAsync(BridgeCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Id)) return;

        try
        {
            _log($"Command: {command.CommandType}");
            Dictionary<string, object?> result;

            switch (command.CommandType)
            {
                case "set_scene":
                {
                    var scene = ObsClient.GetString(command.Payload, "scene_name");
                    if (string.IsNullOrWhiteSpace(scene)) throw new InvalidOperationException("Scene name is required.");
                    await _obs.SetSceneAsync(scene, cancellationToken);
                    result = new Dictionary<string, object?> { ["current_scene"] = _obs.CurrentScene };
                    break;
                }

                case "refresh_state":
                {
                    await _obs.RefreshStateAsync(true, cancellationToken);
                    result = StateResult();
                    Merge(result, _obs.OverlayResult());
                    break;
                }

                case "start_recording":
                    result = await _obs.StartRecordingAsync(cancellationToken);
                    break;

                case "stop_recording":
                    result = await _obs.StopRecordingAsync(cancellationToken);
                    break;

                case "pause_recording":
                    result = await _obs.PauseRecordingAsync(cancellationToken);
                    break;

                case "resume_recording":
                    result = await _obs.ResumeRecordingAsync(cancellationToken);
                    break;

                case "show_lower_third":
                {
                    var title = ObsClient.GetString(command.Payload, "title");
                    var subtitle = ObsClient.GetString(command.Payload, "subtitle");
                    var label = ObsClient.GetString(command.Payload, "label", "CREAPD LIVE");
                    var position = ObsClient.GetString(command.Payload, "position", "bottom_left");
                    await _obs.ShowLowerThirdAsync(title, subtitle, label, position, cancellationToken);
                    result = _obs.OverlayResult();
                    break;
                }

                case "clear_overlay":
                    await _obs.ClearOverlayAsync(cancellationToken);
                    result = _obs.OverlayResult();
                    break;

                case "set_direct_edit_mode":
                    _directEditMode = ObsClient.GetBool(command.Payload, "enabled");
                    result = new Dictionary<string, object?> { ["direct_edit_mode"] = _directEditMode };
                    break;

                case "create_scene":
                {
                    var scene = ObsClient.GetString(command.Payload, "scene_name");
                    if (string.IsNullOrWhiteSpace(scene)) throw new InvalidOperationException("Scene name is required.");
                    await _obs.CreateSceneAsync(scene, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["scene_name"] = scene,
                        ["scenes"] = _obs.Scenes,
                        ["current_scene"] = _obs.CurrentScene,
                    };
                    break;
                }

                case "create_source":
                    result = await _obs.CreateSourceAsync(command.Payload, cancellationToken);
                    break;

                case "remove_source":
                {
                    var source = ObsClient.GetString(command.Payload, "source_name");
                    await _obs.RemoveSourceAsync(command.Payload, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["removed"] = true,
                        ["source_name"] = source,
                    };
                    break;
                }

                case "set_source_visibility":
                {
                    var source = ObsClient.GetString(command.Payload, "source_name");
                    var visible = ObsClient.GetBool(command.Payload, "visible");
                    await _obs.SetSourceVisibilityAsync(command.Payload, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["source_name"] = source,
                        ["visible"] = visible,
                    };
                    break;
                }

                case "set_source_transform":
                {
                    var source = ObsClient.GetString(command.Payload, "source_name");
                    var transform = await _obs.SetSourceTransformAsync(command.Payload, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["source_name"] = source,
                        ["transform"] = transform,
                    };
                    break;
                }

                case "move_source_up":
                {
                    var source = ObsClient.GetString(command.Payload, "source_name");
                    var index = await _obs.MoveSourceAsync(command.Payload, 1, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["source_name"] = source,
                        ["index"] = index,
                    };
                    break;
                }

                case "move_source_down":
                {
                    var source = ObsClient.GetString(command.Payload, "source_name");
                    var index = await _obs.MoveSourceAsync(command.Payload, -1, cancellationToken);
                    result = new Dictionary<string, object?>
                    {
                        ["source_name"] = source,
                        ["index"] = index,
                    };
                    break;
                }

                default:
                    throw new InvalidOperationException($"Unsupported CREAPD OBS command: {command.CommandType}");
            }

            await _creapd.CompleteCommandAsync(command, true, result, null, cancellationToken);
            _log($"Completed: {command.CommandType}");
        }
        catch (Exception ex)
        {
            _log($"Command failed ({command.CommandType}): {ex.Message}");
            try
            {
                await _creapd.CompleteCommandAsync(
                    command,
                    false,
                    new Dictionary<string, object?>(),
                    ex.Message,
                    cancellationToken);
            }
            catch {}
        }
    }

    private Dictionary<string, object?> StateResult() => new()
    {
        ["current_scene"] = _obs.CurrentScene,
        ["scenes"] = _obs.Scenes,
        ["recording_active"] = _obs.RecordingActive,
        ["recording_paused"] = _obs.RecordingPaused,
        ["recording_timecode"] = _obs.RecordingTimecode,
    };

    private static void Merge(Dictionary<string, object?> target, Dictionary<string, object?> source)
    {
        foreach (var pair in source) target[pair.Key] = pair.Value;
    }

    public async ValueTask DisposeAsync()
    {
        await _obs.DisposeAsync();
        _creapd.Dispose();
    }
}
