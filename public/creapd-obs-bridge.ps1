param(
  [string]$CreapdUrl = "https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app",
  [string]$ObsUrl = "ws://127.0.0.1:4455"
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "========================================" -ForegroundColor DarkMagenta
Write-Host "  CREAPD OBS BRIDGE - Preview" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor DarkMagenta
Write-Host "This bridge keeps OBS local. It only makes outbound HTTPS calls to CREAPD." -ForegroundColor Gray
Write-Host ""

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

$script:BridgeToken = Read-SecretText "Paste the Bridge Token from CREAPD Live"
if ([string]::IsNullOrWhiteSpace($script:BridgeToken)) {
  throw "A CREAPD Bridge Token is required."
}

$script:ObsPassword = Read-SecretText "OBS WebSocket password (press Enter if authentication is disabled)"
$script:VercelBypassSecret = Read-SecretText "Vercel Preview Bypass Secret (press Enter only if Preview protection is disabled)"
$script:CreapdUrl = $CreapdUrl.TrimEnd('/')
$script:ObsUrl = $ObsUrl
$script:ObsSocket = $null
$script:ObsStudioVersion = $null
$script:ObsWebSocketVersion = $null
$script:CurrentScene = $null
$script:SceneNames = @()
$script:SceneSources = @()
$script:LastSceneRefresh = [DateTime]::MinValue
$script:LastSourceRefresh = [DateTime]::MinValue
$script:RecordingActive = $false
$script:RecordingPaused = $false
$script:RecordingTimecode = $null
$script:RecordingDuration = 0
$script:RecordingBytes = 0
$script:OverlayInputName = 'CREAPD Overlay'
$script:OverlayVisible = $false
$script:OverlayTitle = $null
$script:OverlaySubtitle = $null
$script:OverlayLabel = $null
$script:OverlayPosition = 'bottom_left'
$script:OverlayFile = $null
$script:VideoWidth = 1920
$script:VideoHeight = 1080
$script:OverlayDirectory = Join-Path $env:LOCALAPPDATA 'CREAPD\obs-overlays'
$script:NextPollMs = 5000

function ConvertTo-CompactJson($Value) {
  return ($Value | ConvertTo-Json -Depth 12 -Compress)
}

function Send-ObsJson($Socket, $Value) {
  $json = ConvertTo-CompactJson $Value
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $segment = [ArraySegment[byte]]::new($bytes)
  $null = $Socket.SendAsync(
    $segment,
    [Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()
}

function Receive-ObsJson($Socket) {
  $buffer = New-Object byte[] 65536
  $stream = New-Object IO.MemoryStream
  try {
    do {
      $segment = [ArraySegment[byte]]::new($buffer)
      $result = $Socket.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($result.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close) {
        $closeCode = 'unknown'
        if ($null -ne $result.CloseStatus) {
          try { $closeCode = [int]$result.CloseStatus } catch { $closeCode = [string]$result.CloseStatus }
        }
        $closeReason = [string]$result.CloseStatusDescription
        if ([string]::IsNullOrWhiteSpace($closeReason)) {
          $closeReason = 'No close reason provided by OBS.'
        }
        throw "OBS WebSocket closed the connection (code $closeCode): $closeReason"
      }
      if ($result.Count -gt 0) {
        $stream.Write($buffer, 0, $result.Count)
      }
    } while (-not $result.EndOfMessage)

    $text = [Text.Encoding]::UTF8.GetString($stream.ToArray())
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return ($text | ConvertFrom-Json)
  } finally {
    $stream.Dispose()
  }
}

function Get-Sha256Base64([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
    return [Convert]::ToBase64String($sha.ComputeHash($bytes))
  } finally {
    $sha.Dispose()
  }
}

function Connect-Obs {
  if ($script:ObsSocket) {
    try { $script:ObsSocket.Dispose() } catch {}
    $script:ObsSocket = $null
  }

  Write-Host "Connecting to OBS at $($script:ObsUrl)..." -ForegroundColor Cyan
  $socket = [Net.WebSockets.ClientWebSocket]::new()
  $socket.Options.AddSubProtocol('obswebsocket.json')
  $null = $socket.ConnectAsync([Uri]$script:ObsUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

  $hello = Receive-ObsJson $socket
  if (-not $hello -or [int]$hello.op -ne 0) {
    $socket.Dispose()
    throw "OBS did not send the expected WebSocket Hello message."
  }

  $authRequired = $null -ne $hello.d.authentication
  Write-Host ("OBS handshake received. Authentication required: " + $(if ($authRequired) { 'Yes' } else { 'No' })) -ForegroundColor DarkGray

  $identifyData = @{
    rpcVersion = [Math]::Min(1, [int]$hello.d.rpcVersion)
    eventSubscriptions = 0
  }

  if ($hello.d.authentication) {
    if ([string]::IsNullOrEmpty($script:ObsPassword)) {
      $socket.Dispose()
      throw "OBS requires WebSocket authentication. Enter the password shown in OBS Tools > WebSocket Server Settings."
    }
    $secret = Get-Sha256Base64 ($script:ObsPassword + [string]$hello.d.authentication.salt)
    $identifyData.authentication = Get-Sha256Base64 ($secret + [string]$hello.d.authentication.challenge)
  }

  Send-ObsJson $socket @{ op = 1; d = $identifyData }

  $identified = $null
  while (-not $identified) {
    $message = Receive-ObsJson $socket
    if ($message -and [int]$message.op -eq 2) {
      $identified = $message
    }
  }

  Write-Host "OBS identification accepted." -ForegroundColor DarkGray

  $script:ObsSocket = $socket
  $version = Invoke-ObsRequest 'GetVersion' @{}
  $script:ObsStudioVersion = [string]$version.obsVersion
  $script:ObsWebSocketVersion = [string]$version.obsWebSocketVersion

  try {
    $video = Invoke-ObsRequest 'GetVideoSettings' @{}
    if ([int]$video.baseWidth -gt 0) { $script:VideoWidth = [int]$video.baseWidth }
    if ([int]$video.baseHeight -gt 0) { $script:VideoHeight = [int]$video.baseHeight }
  } catch {
    Write-Host "Using 1920x1080 for the CREAPD overlay canvas." -ForegroundColor DarkGray
  }

  $script:LastSceneRefresh = [DateTime]::MinValue
  Refresh-ObsState -RefreshScenes $true

  Write-Host "OBS connected. Scene: $($script:CurrentScene)" -ForegroundColor Green
}

function Invoke-ObsRequest([string]$RequestType, $RequestData) {
  if (-not $script:ObsSocket -or $script:ObsSocket.State -ne [Net.WebSockets.WebSocketState]::Open) {
    throw "OBS WebSocket is not connected."
  }

  $requestId = [Guid]::NewGuid().ToString()
  Send-ObsJson $script:ObsSocket @{
    op = 6
    d = @{
      requestType = $RequestType
      requestId = $requestId
      requestData = $RequestData
    }
  }

  while ($true) {
    $message = Receive-ObsJson $script:ObsSocket
    if (-not $message) { continue }
    if ([int]$message.op -eq 7 -and [string]$message.d.requestId -eq $requestId) {
      if (-not [bool]$message.d.requestStatus.result) {
        $comment = [string]$message.d.requestStatus.comment
        if ([string]::IsNullOrWhiteSpace($comment)) { $comment = 'OBS rejected the request.' }
        throw "$RequestType failed: $comment"
      }
      return $message.d.responseData
    }
  }
}

function Refresh-ObsState([bool]$RefreshScenes = $false) {
  $current = Invoke-ObsRequest 'GetCurrentProgramScene' @{}
  $script:CurrentScene = [string]$current.currentProgramSceneName

  if ($RefreshScenes -or ((Get-Date) - $script:LastSceneRefresh).TotalSeconds -ge 10) {
    $sceneList = Invoke-ObsRequest 'GetSceneList' @{}
    $names = @()
    foreach ($scene in @($sceneList.scenes)) {
      if ($scene.sceneName) { $names += [string]$scene.sceneName }
    }
    $script:SceneNames = $names
    $script:LastSceneRefresh = Get-Date
  }

  $recordStatus = Invoke-ObsRequest 'GetRecordStatus' @{}
  $script:RecordingActive = [bool]$recordStatus.outputActive
  $script:RecordingPaused = [bool]$recordStatus.outputPaused
  $script:RecordingTimecode = [string]$recordStatus.outputTimecode
  $script:RecordingDuration = [int64]$recordStatus.outputDuration
  $script:RecordingBytes = [int64]$recordStatus.outputBytes
}

function Normalize-OverlayPosition([string]$Position) {
  $value = ([string]$Position).Trim().ToLowerInvariant()
  switch ($value) {
    'bottom_left' { return 'bottom_left' }
    'bottom_center' { return 'bottom_center' }
    'bottom_right' { return 'bottom_right' }
    'top_left' { return 'top_left' }
    'top_center' { return 'top_center' }
    'top_right' { return 'top_right' }
    default { return 'bottom_left' }
  }
}

function Get-CreapdOverlayHtml([string]$Title, [string]$Subtitle, [string]$Label, [bool]$Visible, [string]$Position) {
  $safeTitle = [Net.WebUtility]::HtmlEncode([string]$Title)
  $safeSubtitle = [Net.WebUtility]::HtmlEncode([string]$Subtitle)
  $safeLabel = [Net.WebUtility]::HtmlEncode([string]$Label)
  $stateClass = $(if ($Visible) { 'show' } else { 'hidden' })
  $positionClass = Normalize-OverlayPosition $Position
  $subtitleMarkup = $(if ([string]::IsNullOrWhiteSpace($safeSubtitle)) { '' } else { "<div class=`"subtitle`">$safeSubtitle</div>" })

  return @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: rgba(0,0,0,0); font-family: Arial, Helvetica, sans-serif; }
  .stage { position: relative; width: 100vw; height: 100vh; }
  .anchor { position: absolute; max-width: 90vw; }
  .anchor.bottom_left { left: 5.2vw; bottom: 6.5vh; }
  .anchor.bottom_center { left: 50%; bottom: 6.5vh; transform: translateX(-50%); }
  .anchor.bottom_right { right: 5.2vw; bottom: 6.5vh; }
  .anchor.top_left { left: 5.2vw; top: 6.5vh; }
  .anchor.top_center { left: 50%; top: 6.5vh; transform: translateX(-50%); }
  .anchor.top_right { right: 5.2vw; top: 6.5vh; }
  .lower { min-width: 420px; max-width: 72vw; display: flex; align-items: stretch; filter: drop-shadow(0 14px 28px rgba(0,0,0,.45)); }
  .accent { width: 10px; border-radius: 12px 0 0 12px; background: linear-gradient(180deg,#8b5cf6,#d946ef); }
  .card { min-width: 0; padding: 17px 25px 18px 22px; border-radius: 0 12px 12px 0; background: linear-gradient(105deg,rgba(10,11,18,.97),rgba(25,22,38,.94)); border: 1px solid rgba(255,255,255,.15); border-left: 0; }
  .label { display: inline-flex; align-items: center; margin-bottom: 7px; font-size: 15px; line-height: 1; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #c4b5fd; }
  .title { font-size: 42px; line-height: 1.04; font-weight: 850; letter-spacing: -.025em; color: #fff; white-space: normal; text-wrap: balance; }
  .subtitle { margin-top: 7px; font-size: 23px; line-height: 1.18; font-weight: 500; color: rgba(255,255,255,.76); }
  .show .lower { animation: creapdIn .46s cubic-bezier(.16,1,.3,1) both; }
  .hidden .lower { opacity: 0; transform: translateY(18px) scale(.98); }
  @keyframes creapdIn { from { opacity: 0; transform: translateY(28px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
</head>
<body class="$stateClass">
  <div class="stage">
    <div class="anchor $positionClass">
      <div class="lower">
        <div class="accent"></div>
        <div class="card">
          <div class="label">$safeLabel</div>
          <div class="title">$safeTitle</div>
          $subtitleMarkup
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"@
}

function Write-CreapdOverlayFile([string]$Title, [string]$Subtitle, [string]$Label, [bool]$Visible, [string]$Position) {
  if (-not (Test-Path -LiteralPath $script:OverlayDirectory)) {
    New-Item -ItemType Directory -Path $script:OverlayDirectory -Force | Out-Null
  }

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $path = Join-Path $script:OverlayDirectory "creapd-overlay-$stamp.html"
  $html = Get-CreapdOverlayHtml $Title $Subtitle $Label $Visible $Position
  Set-Content -LiteralPath $path -Value $html -Encoding UTF8
  $script:OverlayFile = $path
  return $path
}

function Ensure-CreapdOverlayInput([string]$LocalFile) {
  $inputList = Invoke-ObsRequest 'GetInputList' @{}
  $existingInput = @($inputList.inputs) | Where-Object { [string]$_.inputName -eq $script:OverlayInputName } | Select-Object -First 1

  $settings = @{
    is_local_file = $true
    local_file = $LocalFile
    width = $script:VideoWidth
    height = $script:VideoHeight
    fps = 30
    shutdown = $false
    restart_when_active = $false
    reroute_audio = $false
  }

  if (-not $existingInput) {
    Invoke-ObsRequest 'CreateInput' @{
      sceneName = $script:CurrentScene
      inputName = $script:OverlayInputName
      inputKind = 'browser_source'
      inputSettings = $settings
      sceneItemEnabled = $true
    } | Out-Null
  } else {
    Invoke-ObsRequest 'SetInputSettings' @{
      inputName = $script:OverlayInputName
      inputSettings = $settings
      overlay = $true
    } | Out-Null
  }

  foreach ($sceneName in @($script:SceneNames)) {
    if ([string]::IsNullOrWhiteSpace([string]$sceneName)) { continue }
    try {
      Invoke-ObsRequest 'GetSceneItemId' @{
        sceneName = [string]$sceneName
        sourceName = $script:OverlayInputName
      } | Out-Null
    } catch {
      try {
        Invoke-ObsRequest 'CreateSceneItem' @{
          sceneName = [string]$sceneName
          sourceName = $script:OverlayInputName
          sceneItemEnabled = $true
        } | Out-Null
      } catch {
        Write-Host "Overlay warning for scene '$sceneName': $($_.Exception.Message)" -ForegroundColor DarkYellow
      }
    }
  }
}

function Set-CreapdLowerThird([string]$Title, [string]$Subtitle, [string]$Label, [string]$Position) {
  if ([string]::IsNullOrWhiteSpace($Title)) { throw 'Lower-third title is required.' }
  if ([string]::IsNullOrWhiteSpace($Label)) { $Label = 'CREAPD LIVE' }
  $Position = Normalize-OverlayPosition $Position

  Refresh-ObsState -RefreshScenes $true
  $file = Write-CreapdOverlayFile $Title $Subtitle $Label $true $Position
  Ensure-CreapdOverlayInput $file
  $script:OverlayVisible = $true
  $script:OverlayTitle = $Title
  $script:OverlaySubtitle = $Subtitle
  $script:OverlayLabel = $Label
  $script:OverlayPosition = $Position
}

function Clear-CreapdOverlay {
  $file = Write-CreapdOverlayFile '' '' '' $false $script:OverlayPosition
  Ensure-CreapdOverlayInput $file
  $script:OverlayVisible = $false
  $script:OverlayTitle = $null
  $script:OverlaySubtitle = $null
  $script:OverlayLabel = $null
}

function Get-OverlayResult {
  return @{
    overlay_visible = $script:OverlayVisible
    overlay_title = $script:OverlayTitle
    overlay_subtitle = $script:OverlaySubtitle
    overlay_label = $script:OverlayLabel
    overlay_position = $script:OverlayPosition
    overlay_input_name = $script:OverlayInputName
  }
}

function Invoke-CreapdBridge([string]$Action, $Fields = @{}) {
  $body = @{
    action = $Action
    bridge_token = $script:BridgeToken
  }
  if ($Fields) {
    foreach ($key in $Fields.Keys) {
      $body[$key] = $Fields[$key]
    }
  }

  $request = @{
    Method = 'Post'
    Uri = "$($script:CreapdUrl)/api/creapd/production/core"
    ContentType = 'application/json'
    Body = (ConvertTo-CompactJson $body)
  }

  if (-not [string]::IsNullOrWhiteSpace($script:VercelBypassSecret)) {
    $request.Headers = @{
      'x-vercel-protection-bypass' = $script:VercelBypassSecret
    }
  }

  return Invoke-RestMethod @request
}

function Complete-CreapdCommand($Command, [bool]$Success, $Result = @{}, [string]$ErrorMessage = $null) {
  $fields = @{
    command_id = [string]$Command.id
    success = $Success
    result = $Result
  }
  if (-not $Success -and $ErrorMessage) {
    $fields.error = $ErrorMessage
  }
  Invoke-CreapdBridge 'obs_bridge_agent_complete' $fields | Out-Null
}

function Get-RecordingResult($Extra = @{}) {
  $result = @{
    recording_active = $script:RecordingActive
    recording_paused = $script:RecordingPaused
    recording_timecode = $script:RecordingTimecode
    recording_duration = $script:RecordingDuration
    recording_bytes = $script:RecordingBytes
  }
  if ($Extra) {
    foreach ($key in $Extra.Keys) {
      $result[$key] = $Extra[$key]
    }
  }
  return $result
}

# CREAPD OBS Director scene/source command helpers

function Get-CreapdSceneItem([string]$SceneName, [string]$SourceName) {
  return Invoke-ObsRequest 'GetSceneItemId' @{ sceneName = $SceneName; sourceName = $SourceName }
}

function Refresh-CreapdSceneSources([bool]$Force = $false) {
  if ([string]::IsNullOrWhiteSpace($script:CurrentScene)) {
    $script:SceneSources = @()
    return
  }
  if (-not $Force -and ((Get-Date) - $script:LastSourceRefresh).TotalSeconds -lt 8) { return }
  try {
    $list = Invoke-ObsRequest 'GetSceneItemList' @{ sceneName = $script:CurrentScene }
    $items = @()
    foreach ($item in @($list.sceneItems)) {
      $items += @{
        name = [string]$item.sourceName
        id = [int]$item.sceneItemId
        index = [int]$item.sceneItemIndex
        enabled = [bool]$item.sceneItemEnabled
        kind = [string]$item.inputKind
        source_type = [string]$item.sourceType
      }
    }
    $script:SceneSources = $items
    $script:LastSourceRefresh = Get-Date
  } catch {
    $script:SceneSources = @()
  }
}

function Resolve-CreapdAssetPath([string]$Value, [string]$SourceName) {
  $raw = ([string]$Value).Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) { return $raw }
  if ($raw -notmatch '^https?://') { return $raw }

  $dir = Join-Path $env:LOCALAPPDATA 'CREAPD\obs-assets'
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

  $safeName = ([string]$SourceName -replace '[^A-Za-z0-9._-]', '_').Trim('_')
  if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = 'asset' }
  try {
    $uri = [Uri]$raw
    $extension = [IO.Path]::GetExtension($uri.AbsolutePath)
  } catch { $extension = '' }
  if ([string]::IsNullOrWhiteSpace($extension) -or $extension.Length -gt 8) { $extension = '.bin' }
  $path = Join-Path $dir ("{0}-{1}{2}" -f $safeName, [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(), $extension)
  Invoke-WebRequest -UseBasicParsing -Uri $raw -OutFile $path
  return $path
}

function Invoke-CreapdDirectorCommand($Command) {
  $type = [string]$Command.command_type
  $p = $Command.payload

  switch ($type) {
    'create_scene' {
      $name = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($name)) { throw 'Scene name is required.' }
      Invoke-ObsRequest 'CreateScene' @{ sceneName = $name } | Out-Null
      Refresh-ObsState -RefreshScenes $true
      Invoke-ObsRequest 'SetCurrentProgramScene' @{ sceneName = $name } | Out-Null
      Refresh-ObsState -RefreshScenes $true
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ scene_name = $name; scenes = $script:SceneNames; current_scene = $script:CurrentScene } }
    }

    'create_source' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $name = [string]$p.source_name
      $kind = ([string]$p.source_type).Trim().ToLowerInvariant()
      if ([string]::IsNullOrWhiteSpace($scene) -or [string]::IsNullOrWhiteSpace($name)) { throw 'Scene and source name are required.' }

      $settings = @{}
      switch ($kind) {
        'image' {
          $obsKind = 'image_source'
          $asset = $(if ($p.path) { [string]$p.path } else { [string]$p.url })
          $settings.file = Resolve-CreapdAssetPath $asset $name
        }
        'media' {
          $obsKind = 'ffmpeg_source'
          $asset = $(if ($p.path) { [string]$p.path } else { [string]$p.url })
          $settings.local_file = Resolve-CreapdAssetPath $asset $name
          $settings.is_local_file = $true
          $settings.looping = [bool]$p.loop
          $settings.restart_on_activate = $true
        }
        'text' {
          $obsKind = 'text_gdiplus_v2'
          $settings.text = [string]$p.text
        }
        'browser' {
          $obsKind = 'browser_source'
          $settings.url = [string]$p.url
          $settings.width = [int]$(if ($p.width) { $p.width } else { 1920 })
          $settings.height = [int]$(if ($p.height) { $p.height } else { 1080 })
          $settings.shutdown = $false
          $settings.restart_when_active = $false
        }
        'camera' {
          $obsKind = 'dshow_input'
          if ($p.device_id) { $settings.video_device_id = [string]$p.device_id }
        }
        'audio_input' {
          $obsKind = 'wasapi_input_capture'
          if ($p.device_id) { $settings.device_id = [string]$p.device_id }
        }
        'display_capture' {
          $obsKind = 'monitor_capture'
          if ($null -ne $p.monitor) { $settings.monitor = [int]$p.monitor }
        }
        'window_capture' {
          $obsKind = 'window_capture'
          if ($p.window) { $settings.window = [string]$p.window }
        }
        default { throw "Unsupported CREAPD source type: $kind" }
      }

      $created = Invoke-ObsRequest 'CreateInput' @{
        sceneName = $scene
        inputName = $name
        inputKind = $obsKind
        inputSettings = $settings
        sceneItemEnabled = $true
      }
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ scene_name = $scene; source_name = $name; source_type = $kind; scene_item_id = $created.sceneItemId } }
    }

    'remove_source' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $item = Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'RemoveSceneItem' @{ sceneName = $scene; sceneItemId = [int]$item.sceneItemId } | Out-Null
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ removed = $true; source_name = [string]$p.source_name } }
    }

    'set_source_visibility' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $item = Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'SetSceneItemEnabled' @{ sceneName = $scene; sceneItemId = [int]$item.sceneItemId; sceneItemEnabled = [bool]$p.visible } | Out-Null
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ source_name = [string]$p.source_name; visible = [bool]$p.visible } }
    }

    'set_source_transform' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $item = Get-CreapdSceneItem $scene ([string]$p.source_name)
      $t = @{}
      if ($null -ne $p.x) { $t.positionX = [double]$p.x }
      if ($null -ne $p.y) { $t.positionY = [double]$p.y }
      if ($null -ne $p.scale_x) { $t.scaleX = [double]$p.scale_x }
      if ($null -ne $p.scale_y) { $t.scaleY = [double]$p.scale_y }
      if ($null -ne $p.rotation) { $t.rotation = [double]$p.rotation }
      if ($null -ne $p.crop_left) { $t.cropLeft = [int]$p.crop_left }
      if ($null -ne $p.crop_right) { $t.cropRight = [int]$p.crop_right }
      if ($null -ne $p.crop_top) { $t.cropTop = [int]$p.crop_top }
      if ($null -ne $p.crop_bottom) { $t.cropBottom = [int]$p.crop_bottom }
      Invoke-ObsRequest 'SetSceneItemTransform' @{ sceneName = $scene; sceneItemId = [int]$item.sceneItemId; sceneItemTransform = $t } | Out-Null
      return @{ handled = $true; result = @{ source_name = [string]$p.source_name; transform = $t } }
    }

    'move_source_up' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $item = Get-CreapdSceneItem $scene ([string]$p.source_name)
      $list = Invoke-ObsRequest 'GetSceneItemList' @{ sceneName = $scene }
      $entry = @($list.sceneItems) | Where-Object { [int]$_.sceneItemId -eq [int]$item.sceneItemId } | Select-Object -First 1
      $maxIndex = [Math]::Max(0, @($list.sceneItems).Count - 1)
      $nextIndex = [Math]::Min($maxIndex, [int]$entry.sceneItemIndex + 1)
      Invoke-ObsRequest 'SetSceneItemIndex' @{ sceneName = $scene; sceneItemId = [int]$item.sceneItemId; sceneItemIndex = $nextIndex } | Out-Null
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ source_name = [string]$p.source_name; index = $nextIndex } }
    }

    'move_source_down' {
      $scene = [string]$p.scene_name
      if ([string]::IsNullOrWhiteSpace($scene)) { $scene = $script:CurrentScene }
      $item = Get-CreapdSceneItem $scene ([string]$p.source_name)
      $list = Invoke-ObsRequest 'GetSceneItemList' @{ sceneName = $scene }
      $entry = @($list.sceneItems) | Where-Object { [int]$_.sceneItemId -eq [int]$item.sceneItemId } | Select-Object -First 1
      $nextIndex = [Math]::Max(0, [int]$entry.sceneItemIndex - 1)
      Invoke-ObsRequest 'SetSceneItemIndex' @{ sceneName = $scene; sceneItemId = [int]$item.sceneItemId; sceneItemIndex = $nextIndex } | Out-Null
      Refresh-CreapdSceneSources $true
      return @{ handled = $true; result = @{ source_name = [string]$p.source_name; index = $nextIndex } }
    }
  }

  return @{ handled = $false; result = @{} }
}

function Run-CreapdCommand($Command) {
  try {
    switch ([string]$Command.command_type) {
      'set_scene' {
        $sceneName = [string]$Command.payload.scene_name
        if ([string]::IsNullOrWhiteSpace($sceneName)) { throw 'Scene name was missing from CREAPD command.' }
        Invoke-ObsRequest 'SetCurrentProgramScene' @{ sceneName = $sceneName } | Out-Null
        Refresh-ObsState -RefreshScenes $false
        Complete-CreapdCommand $Command $true @{
          current_scene = $script:CurrentScene
        }
        Write-Host "Scene changed -> $($script:CurrentScene)" -ForegroundColor Magenta
      }

      'refresh_state' {
        Refresh-ObsState -RefreshScenes $true
        $result = @{
          current_scene = $script:CurrentScene
          scenes = $script:SceneNames
          recording_active = $script:RecordingActive
          recording_paused = $script:RecordingPaused
          recording_timecode = $script:RecordingTimecode
        }
        $overlay = Get-OverlayResult
        foreach ($key in $overlay.Keys) { $result[$key] = $overlay[$key] }
        Complete-CreapdCommand $Command $true $result
      }

      'start_recording' {
        Invoke-ObsRequest 'StartRecord' @{} | Out-Null
        Start-Sleep -Milliseconds 200
        Refresh-ObsState -RefreshScenes $false
        Complete-CreapdCommand $Command $true (Get-RecordingResult)
        Write-Host "Recording started." -ForegroundColor Red
      }

      'stop_recording' {
        $stopped = Invoke-ObsRequest 'StopRecord' @{}
        Start-Sleep -Milliseconds 200
        Refresh-ObsState -RefreshScenes $false
        $extra = @{}
        if ($stopped.outputPath) { $extra.output_path = [string]$stopped.outputPath }
        Complete-CreapdCommand $Command $true (Get-RecordingResult $extra)
        Write-Host "Recording stopped." -ForegroundColor Yellow
        if ($stopped.outputPath) {
          Write-Host "Saved recording: $($stopped.outputPath)" -ForegroundColor DarkGray
        }
      }

      'pause_recording' {
        Invoke-ObsRequest 'PauseRecord' @{} | Out-Null
        Start-Sleep -Milliseconds 150
        Refresh-ObsState -RefreshScenes $false
        Complete-CreapdCommand $Command $true (Get-RecordingResult)
        Write-Host "Recording paused." -ForegroundColor Yellow
      }

      'resume_recording' {
        Invoke-ObsRequest 'ResumeRecord' @{} | Out-Null
        Start-Sleep -Milliseconds 150
        Refresh-ObsState -RefreshScenes $false
        Complete-CreapdCommand $Command $true (Get-RecordingResult)
        Write-Host "Recording resumed." -ForegroundColor Green
      }

      'show_lower_third' {
        $title = [string]$Command.payload.title
        $subtitle = [string]$Command.payload.subtitle
        $label = [string]$Command.payload.label
        $position = [string]$Command.payload.position
        Set-CreapdLowerThird $title $subtitle $label $position
        Complete-CreapdCommand $Command $true (Get-OverlayResult)
        Write-Host "Lower third ON -> $title [$($script:OverlayPosition)]" -ForegroundColor Magenta
      }

      'clear_overlay' {
        Clear-CreapdOverlay
        Complete-CreapdCommand $Command $true (Get-OverlayResult)
        Write-Host "CREAPD overlay cleared." -ForegroundColor DarkMagenta
      }

      default {
        $director = Invoke-CreapdDirectorCommand $Command
        if ($director.handled) {
          Complete-CreapdCommand $Command $true $director.result
          Write-Host "Director command -> $($Command.command_type)" -ForegroundColor Cyan
        } else {
          throw "Unsupported CREAPD OBS command: $($Command.command_type)"
        }
      }
    }
  } catch {
    $message = $_.Exception.Message
    try { Complete-CreapdCommand $Command $false @{} $message } catch {}
    Write-Host "Command failed: $message" -ForegroundColor Red
  }
}

Write-Host "CREAPD: $($script:CreapdUrl)" -ForegroundColor DarkGray
Write-Host "OBS:    $($script:ObsUrl)" -ForegroundColor DarkGray
Write-Host "Bridge: 2026.09.27-director-tools" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop the bridge." -ForegroundColor DarkGray
Write-Host ""

while ($true) {
  try {
    if (-not $script:ObsSocket -or $script:ObsSocket.State -ne [Net.WebSockets.WebSocketState]::Open) {
      Connect-Obs
    }

    Refresh-ObsState -RefreshScenes $false
    Refresh-CreapdSceneSources $false

    $poll = Invoke-CreapdBridge 'obs_bridge_agent_poll' @{
      obs_connected = $true
      obs_endpoint = $script:ObsUrl
      obs_studio_version = $script:ObsStudioVersion
      obs_websocket_version = $script:ObsWebSocketVersion
      current_scene = $script:CurrentScene
      scenes = $script:SceneNames
      capabilities = @{
        scene_control = $true
        scene_create_control = $true
        source_control = $true
        source_transform_control = $true
        scene_source_scene = $script:CurrentScene
        scene_sources = $script:SceneSources
        source_types = @('image','media','text','browser','camera','audio_input','display_capture','window_capture')
        recording_control = $true
        recording_active = $script:RecordingActive
        recording_paused = $script:RecordingPaused
        recording_timecode = $script:RecordingTimecode
        recording_duration = $script:RecordingDuration
        recording_bytes = $script:RecordingBytes
        overlay_control = $true
        overlay_position_control = $true
        overlay_visible = $script:OverlayVisible
        overlay_title = $script:OverlayTitle
        overlay_subtitle = $script:OverlaySubtitle
        overlay_label = $script:OverlayLabel
        overlay_position = $script:OverlayPosition
        overlay_input_name = $script:OverlayInputName
        protocol = 'obs-websocket-v5'
        bridge = 'powershell'
        bridge_version = '2026.09.27-director-tools'
      }
      last_error = $null
    }

    foreach ($command in @($poll.commands)) {
      Run-CreapdCommand $command
    }

    if ($poll.next_poll_ms) {
      try {
        $script:NextPollMs = [Math]::Max(3000, [Math]::Min(15000, [int]$poll.next_poll_ms))
      } catch {
        $script:NextPollMs = 5000
      }
    }
    Start-Sleep -Milliseconds $script:NextPollMs
  } catch {
    $message = $_.Exception.Message
    Write-Host "Bridge waiting: $message" -ForegroundColor Yellow

    if ($message -match 'code 4009|Authentication failed') {
      Write-Host "OBS rejected the WebSocket password. Stop the bridge with Ctrl+C, copy the current password from OBS Tools > WebSocket Server Settings, and run the bridge again." -ForegroundColor Red
    }
    if ($message -match '\(401\) Unauthorized') {
      Write-Host "CREAPD Preview rejected the bridge request. If Preview protection is enabled, enter the Vercel Automation Bypass secret when the bridge starts." -ForegroundColor Red
    }

    try {
      Invoke-CreapdBridge 'obs_bridge_agent_poll' @{
        obs_connected = $false
        obs_endpoint = $script:ObsUrl
        current_scene = $script:CurrentScene
        scenes = $script:SceneNames
        last_error = $message
      } | Out-Null
    } catch {}

    if ($script:ObsSocket) {
      try { $script:ObsSocket.Abort() } catch {}
      try { $script:ObsSocket.Dispose() } catch {}
      $script:ObsSocket = $null
    }

    Start-Sleep -Seconds 5
  }
}
