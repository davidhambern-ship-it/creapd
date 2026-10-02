# CREAPD OBS Bridge — Windows Native Preview

This is the first native replacement for the PowerShell OBS bridge.

## Goal

Keep the existing CREAPD Studio → bridge → OBS architecture exactly as-is, but remove PowerShell from the user workflow.

The native bridge currently supports the same core command families as the Preview PowerShell bridge:

- OBS WebSocket v5 authentication
- scene discovery and scene switching
- scene creation
- recording start / stop / pause / resume
- lower-third overlays
- source creation
- source visibility
- source transforms
- source layer ordering
- image/video asset download for OBS
- CREAPD bridge heartbeat
- CREAPD command polling/completion
- tray/background operation

## First test UX

This is Phase 1. It removes PowerShell, but does not yet remove the bridge token/password setup.

1. Open OBS.
2. OBS → Tools → WebSocket Server Settings.
3. Enable the WebSocket server and keep authentication enabled.
4. In CREAPD Podcast Studio, open OBS Connection and generate a Bridge Token.
5. Run `CREAPDBridge.exe`.
6. Paste the CREAPD Bridge Token.
7. Enter the OBS WebSocket password.
8. Click **Connect CREAPD to OBS**.

The app stays in the Windows tray while connected.

Secrets are kept in memory only in this first build. They are not written to disk.

## Next phase

After native feature parity is proven:

- one-click `creapd-obs://` browser-to-app pairing
- no visible bridge token
- Windows Credential Manager storage for the OBS password
- auto-start / auto-reconnect
- Studio button that detects/opens the bridge
- signed installer / updater

The PowerShell bridge remains available as a developer fallback until the native bridge is proven stable.
