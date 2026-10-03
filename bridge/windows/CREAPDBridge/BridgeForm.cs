using System.Drawing;

namespace CREAPDBridge;

internal sealed class BridgeForm : Form
{
    private const string DefaultCreapdUrl = "https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app";

    private readonly TextBox _creapdUrl = new();
    private readonly TextBox _obsUrl = new();
    private readonly TextBox _bridgeToken = new();
    private readonly TextBox _obsPassword = new();
    private readonly TextBox _previewBypass = new();
    private readonly TextBox _log = new();
    private readonly Label _status = new();
    private readonly Button _start = new();
    private readonly Button _stop = new();
    private readonly NotifyIcon _tray;

    private CancellationTokenSource? _bridgeCancellation;
    private BridgeWorker? _worker;
    private Task? _workerTask;
    private bool _exitRequested;

    public BridgeForm(string? pairingUri = null)
    {
        Text = "CREAPD OBS Bridge";
        Width = 720;
        Height = 760;
        MinimumSize = new Size(620, 650);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(10, 11, 16);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 9F);
        Icon = SystemIcons.Application;

        _tray = new NotifyIcon
        {
            Text = "CREAPD OBS Bridge",
            Icon = SystemIcons.Application,
            Visible = true,
            ContextMenuStrip = BuildTrayMenu(),
        };
        _tray.DoubleClick += (_, _) => RestoreFromTray();

        BuildUi();
        LoadPersistedSettings();
        var pairing = ProtocolRegistration.ParsePairingUri(pairingUri);
        if (pairing is not null)
        {
            ApplyPairing(pairing);
        }

        Shown += async (_, _) =>
        {
            if (pairing is not null && !string.IsNullOrWhiteSpace(_obsPassword.Text) && _workerTask is not { IsCompleted: false })
            {
                AppendLog("Pairing received from CREAPD. Connecting automatically…");
                await StartBridgeAsync();
            }
        };

        Resize += (_, _) =>
        {
            if (WindowState == FormWindowState.Minimized)
            {
                Hide();
                _tray.ShowBalloonTip(1200, "CREAPD OBS Bridge", "The bridge is still running in the tray.", ToolTipIcon.Info);
            }
        };

        FormClosing += OnFormClosing;
    }

    private void BuildUi()
    {
        var shell = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 1,
            Padding = new Padding(24),
            AutoScroll = true,
        };
        Controls.Add(shell);

        var stack = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoScroll = true,
        };
        shell.Controls.Add(stack);

        var title = new Label
        {
            Text = "CREAPD OBS BRIDGE",
            AutoSize = true,
            Font = new Font("Segoe UI Semibold", 18F, FontStyle.Bold),
            ForeColor = Color.FromArgb(236, 72, 153),
            Margin = new Padding(0, 0, 0, 4),
        };
        stack.Controls.Add(title);

        var subtitle = new Label
        {
            Text = "Connect CREAPD Studio to OBS without PowerShell. OBS stays local on this computer; the bridge only makes outbound HTTPS requests to CREAPD.",
            AutoSize = false,
            Width = 630,
            Height = 46,
            ForeColor = Color.FromArgb(180, 184, 195),
            Margin = new Padding(0, 0, 0, 18),
        };
        stack.Controls.Add(subtitle);

        _creapdUrl.Text = DefaultCreapdUrl;
        _obsUrl.Text = "ws://127.0.0.1:4455";
        AddField(stack, "CREAPD URL", _creapdUrl, "Preview URL for testing. This becomes the normal CREAPD URL later.");
        AddField(stack, "OBS WebSocket", _obsUrl, "OBS → Tools → WebSocket Server Settings. Default is ws://127.0.0.1:4455.");
        AddField(stack, "CREAPD Bridge Token", _bridgeToken, "Generate this from the OBS Connection panel in CREAPD Studio.", secret: true);
        AddField(stack, "OBS WebSocket Password", _obsPassword, "Use the password shown in OBS WebSocket Server Settings.", secret: true);
        AddField(stack, "Vercel Preview Bypass Secret (testing only)", _previewBypass, "Leave blank unless the Preview deployment is protected.", secret: true);

        var hint = new Label
        {
            Text = "Pair from CREAPD to fill the bridge token automatically. OBS credentials are encrypted for this Windows user so reconnects do not require re-entry.",
            AutoSize = false,
            Width = 630,
            Height = 40,
            ForeColor = Color.FromArgb(251, 191, 36),
            Margin = new Padding(0, 4, 0, 16),
        };
        stack.Controls.Add(hint);

        var buttons = new FlowLayoutPanel
        {
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0, 0, 0, 12),
        };

        _start.Text = "Connect CREAPD to OBS";
        _start.AutoSize = true;
        _start.Height = 38;
        _start.Padding = new Padding(12, 0, 12, 0);
        _start.BackColor = Color.FromArgb(147, 51, 234);
        _start.ForeColor = Color.White;
        _start.FlatStyle = FlatStyle.Flat;
        _start.FlatAppearance.BorderSize = 0;
        _start.Click += async (_, _) => await StartBridgeAsync();

        _stop.Text = "Stop Bridge";
        _stop.AutoSize = true;
        _stop.Height = 38;
        _stop.Padding = new Padding(12, 0, 12, 0);
        _stop.Enabled = false;
        _stop.BackColor = Color.FromArgb(35, 39, 48);
        _stop.ForeColor = Color.White;
        _stop.FlatStyle = FlatStyle.Flat;
        _stop.FlatAppearance.BorderColor = Color.FromArgb(70, 75, 88);
        _stop.Click += async (_, _) => await StopBridgeAsync();

        buttons.Controls.Add(_start);
        buttons.Controls.Add(_stop);
        stack.Controls.Add(buttons);

        var statusPanel = new Panel
        {
            Width = 630,
            Height = 58,
            BackColor = Color.FromArgb(20, 23, 31),
            Margin = new Padding(0, 0, 0, 14),
        };
        var statusCaption = new Label
        {
            Text = "STATUS",
            AutoSize = true,
            Location = new Point(14, 9),
            ForeColor = Color.FromArgb(126, 133, 150),
            Font = new Font("Segoe UI Semibold", 7.5F, FontStyle.Bold),
        };
        _status.Text = "Not connected";
        _status.AutoSize = true;
        _status.Location = new Point(14, 28);
        _status.Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold);
        _status.ForeColor = Color.FromArgb(203, 213, 225);
        statusPanel.Controls.Add(statusCaption);
        statusPanel.Controls.Add(_status);
        stack.Controls.Add(statusPanel);

        var logTitle = new Label
        {
            Text = "Bridge Log",
            AutoSize = true,
            Font = new Font("Segoe UI Semibold", 10F, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 6),
        };
        stack.Controls.Add(logTitle);

        _log.Multiline = true;
        _log.ReadOnly = true;
        _log.ScrollBars = ScrollBars.Vertical;
        _log.Width = 630;
        _log.Height = 220;
        _log.BackColor = Color.FromArgb(5, 7, 10);
        _log.ForeColor = Color.FromArgb(203, 213, 225);
        _log.BorderStyle = BorderStyle.FixedSingle;
        _log.Font = new Font("Consolas", 9F);
        stack.Controls.Add(_log);

        AppendLog("Ready. Open OBS and pair this bridge from CREAPD Studio, or use the manual fields as a fallback.");
    }

    private void LoadPersistedSettings()
    {
        var saved = SecureSettingsStore.Load();
        if (saved is null) return;

        if (!string.IsNullOrWhiteSpace(saved.CreapdUrl)) _creapdUrl.Text = saved.CreapdUrl;
        if (!string.IsNullOrWhiteSpace(saved.ObsUrl)) _obsUrl.Text = saved.ObsUrl;
        if (!string.IsNullOrWhiteSpace(saved.BridgeToken)) _bridgeToken.Text = saved.BridgeToken;
        _obsPassword.Text = saved.ObsPassword ?? "";
        _previewBypass.Text = saved.PreviewBypassSecret ?? "";
        AppendLog("Loaded encrypted bridge settings for this Windows user.");
    }

    private void ApplyPairing(PairingPayload pairing)
    {
        _creapdUrl.Text = pairing.CreapdUrl;
        _bridgeToken.Text = pairing.BridgeToken;
        AppendLog("CREAPD pairing link received. Bridge token loaded automatically.");
    }

    private void SaveSettings(BridgeSettings settings)
    {
        try
        {
            SecureSettingsStore.Save(new PersistedBridgeSettings(
                settings.CreapdUrl,
                settings.ObsUrl,
                settings.BridgeToken,
                settings.ObsPassword,
                settings.PreviewBypassSecret));
            AppendLog("Connection settings encrypted with Windows DPAPI.");
        }
        catch (Exception ex)
        {
            AppendLog($"Could not save encrypted settings: {ex.Message}");
        }
    }

    private static void AddField(
        FlowLayoutPanel stack,
        string labelText,
        TextBox input,
        string help,
        bool secret = false)
    {
        var label = new Label
        {
            Text = labelText,
            AutoSize = true,
            Font = new Font("Segoe UI Semibold", 9F, FontStyle.Bold),
            ForeColor = Color.FromArgb(226, 232, 240),
            Margin = new Padding(0, 0, 0, 5),
        };
        stack.Controls.Add(label);

        input.Width = 630;
        input.Height = 32;
        input.BackColor = Color.FromArgb(17, 20, 27);
        input.ForeColor = Color.White;
        input.BorderStyle = BorderStyle.FixedSingle;
        input.Margin = new Padding(0, 0, 0, 4);
        if (secret) input.UseSystemPasswordChar = true;
        stack.Controls.Add(input);

        var helper = new Label
        {
            Text = help,
            AutoSize = false,
            Width = 630,
            Height = 30,
            ForeColor = Color.FromArgb(126, 133, 150),
            Margin = new Padding(0, 0, 0, 9),
        };
        stack.Controls.Add(helper);
    }

    private async Task StartBridgeAsync()
    {
        if (_workerTask is { IsCompleted: false }) return;

        var settings = new BridgeSettings(
            _creapdUrl.Text.Trim(),
            _obsUrl.Text.Trim(),
            _bridgeToken.Text.Trim(),
            _obsPassword.Text,
            _previewBypass.Text.Trim());

        if (string.IsNullOrWhiteSpace(settings.CreapdUrl))
        {
            MessageBox.Show(this, "Enter the CREAPD URL.", "CREAPD Bridge", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        if (string.IsNullOrWhiteSpace(settings.BridgeToken))
        {
            MessageBox.Show(this, "Generate a Bridge Token in CREAPD Studio and paste it here.", "CREAPD Bridge", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        SaveSettings(settings);

        SetInputsEnabled(false);
        _start.Enabled = false;
        _stop.Enabled = true;
        _bridgeCancellation = new CancellationTokenSource();
        _worker = new BridgeWorker(AppendLogThreadSafe, SetStatusThreadSafe);

        AppendLog("Starting native bridge…");

        _workerTask = Task.Run(async () =>
        {
            try
            {
                await _worker.RunAsync(settings, _bridgeCancellation.Token);
            }
            catch (OperationCanceledException) {}
            catch (Exception ex)
            {
                AppendLogThreadSafe($"Bridge stopped with error: {ex.Message}");
                SetStatusThreadSafe("Error");
            }
            finally
            {
                await _worker.DisposeAsync();
                BeginInvoke(new Action(() =>
                {
                    _worker = null;
                    _bridgeCancellation?.Dispose();
                    _bridgeCancellation = null;
                    _start.Enabled = true;
                    _stop.Enabled = false;
                    SetInputsEnabled(true);
                }));
            }
        });

        await Task.Yield();
    }

    private async Task StopBridgeAsync()
    {
        _stop.Enabled = false;
        _bridgeCancellation?.Cancel();
        if (_workerTask is not null)
        {
            try { await _workerTask; } catch {}
        }
    }

    private void SetInputsEnabled(bool enabled)
    {
        _creapdUrl.Enabled = enabled;
        _obsUrl.Enabled = enabled;
        _bridgeToken.Enabled = enabled;
        _obsPassword.Enabled = enabled;
        _previewBypass.Enabled = enabled;
    }

    private void AppendLog(string message)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] {message}";
        _log.AppendText(line + Environment.NewLine);
        _log.SelectionStart = _log.TextLength;
        _log.ScrollToCaret();
    }

    private void AppendLogThreadSafe(string message)
    {
        if (IsDisposed) return;
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(AppendLog), message);
            return;
        }
        AppendLog(message);
    }

    private void SetStatusThreadSafe(string value)
    {
        if (IsDisposed) return;
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(SetStatusThreadSafe), value);
            return;
        }

        _status.Text = value;
        _status.ForeColor = value.StartsWith("Connected", StringComparison.OrdinalIgnoreCase)
            ? Color.FromArgb(110, 231, 183)
            : value.Contains("Error", StringComparison.OrdinalIgnoreCase)
                ? Color.FromArgb(248, 113, 113)
                : Color.FromArgb(251, 191, 36);

        _tray.Text = value.StartsWith("Connected", StringComparison.OrdinalIgnoreCase)
            ? $"CREAPD OBS Bridge · {value}".Substring(0, Math.Min(63, $"CREAPD OBS Bridge · {value}".Length))
            : "CREAPD OBS Bridge";
    }

    private ContextMenuStrip BuildTrayMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Open CREAPD Bridge", null, (_, _) => RestoreFromTray());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Exit", null, async (_, _) =>
        {
            _exitRequested = true;
            await StopBridgeAsync();
            _tray.Visible = false;
            Close();
        });
        return menu;
    }

    private void RestoreFromTray()
    {
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private async void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (!_exitRequested && _workerTask is { IsCompleted: false })
        {
            e.Cancel = true;
            Hide();
            _tray.ShowBalloonTip(1200, "CREAPD OBS Bridge", "The bridge is still connected. Use the tray icon to reopen or exit.", ToolTipIcon.Info);
            return;
        }

        _tray.Visible = false;
        _bridgeCancellation?.Cancel();
        if (_workerTask is not null)
        {
            try { await _workerTask; } catch {}
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _tray.Dispose();
            _bridgeCancellation?.Dispose();
        }
        base.Dispose(disposing);
    }
}
