# CREAPD OBS Bridge — Native developer fallback

The normal CREAPD user path no longer depends on this unsigned Windows executable.

CREAPD now ships a zero-install browser bridge at:

`/creapd-obs-browser-bridge.html`

The Studio downloads that HTML bridge with the current CREAPD origin preconfigured. The user opens the file, enters the OBS WebSocket password, and the bridge connects directly to OBS on `ws://127.0.0.1:4455`. The bridge then opens CREAPD Studio and passes OBS commands between the Studio tab and the local OBS WebSocket connection with `postMessage`.

That avoids:

- Smart App Control blocking an unsigned executable
- PowerShell
- Microsoft Store packaging
- paid code-signing services
- visible CREAPD bridge tokens

The browser bridge supports the same core command families as the native bridge:

- OBS WebSocket v5 authentication
- scene discovery and switching
- scene creation
- recording start / stop / pause / resume
- lower-third overlays
- source creation
- source visibility
- source transforms
- source layer ordering

## Native bridge

The WinForms bridge remains in this folder as a developer/testing fallback because it has already proven the underlying CREAPD → OBS command model.

It is not the intended layman streamer onboarding path.
