# CREAPD OBS Bridge — Windows Native

The CREAPD OBS Bridge keeps the existing CREAPD Studio → bridge → OBS architecture intact while removing PowerShell from the normal user workflow.

## Current capabilities

- OBS WebSocket v5 authentication
- scene discovery and switching
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
- `creapd-obs://` browser-to-app pairing
- encrypted credential persistence with Windows DPAPI

## Pairing flow

1. Open OBS.
2. OBS → Tools → WebSocket Server Settings.
3. Enable the WebSocket server and keep authentication enabled.
4. Run `CREAPDBridge.exe` once so Windows registers the CREAPD pairing protocol.
5. In CREAPD Studio, choose **Pair CREAPD Bridge**.
6. Windows opens the bridge and hands it the CREAPD token automatically.
7. Enter the OBS WebSocket password the first time.
8. Click **Connect CREAPD to OBS**.

The bridge stores its connection settings encrypted for the current Windows user and can continue running in the tray.

## Smart App Control / distribution

Public Windows builds must be Authenticode-signed with a publicly trusted code-signing identity. The GitHub workflow supports Azure Artifact Signing and intentionally labels fallback artifacts as **UNSIGNED-DEV** when signing credentials are not configured.

Required GitHub repository secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `ARTIFACT_SIGNING_ENDPOINT`
- `ARTIFACT_SIGNING_ACCOUNT`
- `ARTIFACT_SIGNING_PROFILE`

When all six are present, the workflow:

1. builds the self-contained Windows executable,
2. authenticates to Azure with GitHub OIDC,
3. signs `CREAPDBridge.exe` with Azure Artifact Signing,
4. timestamps the signature,
5. verifies Authenticode reports a valid signature, and
6. uploads `CREAPD-OBS-Bridge-Windows-x64-SIGNED`.

If the signing configuration is missing, the workflow still builds for development but uploads `CREAPD-OBS-Bridge-Windows-x64-UNSIGNED-DEV` so it cannot be mistaken for a public release.

The PowerShell bridge remains a developer fallback.
