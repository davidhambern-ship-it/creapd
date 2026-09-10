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
$script:LastSceneRefresh = [DateTime]::MinValue
$script:RecordingActive = $false
$script:RecordingPaused = $false
$script:RecordingTimecode = $null
$script:RecordingDuration = 0
$script:RecordingBytes = 0

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
        Complete-CreapdCommand $Command $true @{
          current_scene = $script:CurrentScene
          scenes = $script:SceneNames
          recording_active = $script:RecordingActive
          recording_paused = $script:RecordingPaused
          recording_timecode = $script:RecordingTimecode
        }
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

      default {
        throw "Unsupported CREAPD OBS command: $($Command.command_type)"
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
Write-Host "Press Ctrl+C to stop the bridge." -ForegroundColor DarkGray
Write-Host ""

while ($true) {
  try {
    if (-not $script:ObsSocket -or $script:ObsSocket.State -ne [Net.WebSockets.WebSocketState]::Open) {
      Connect-Obs
    }

    Refresh-ObsState -RefreshScenes $false

    $poll = Invoke-CreapdBridge 'obs_bridge_agent_poll' @{
      obs_connected = $true
      obs_endpoint = $script:ObsUrl
      obs_studio_version = $script:ObsStudioVersion
      obs_websocket_version = $script:ObsWebSocketVersion
      current_scene = $script:CurrentScene
      scenes = $script:SceneNames
      capabilities = @{
        scene_control = $true
        recording_control = $true
        recording_active = $script:RecordingActive
        recording_paused = $script:RecordingPaused
        recording_timecode = $script:RecordingTimecode
        recording_duration = $script:RecordingDuration
        recording_bytes = $script:RecordingBytes
        protocol = 'obs-websocket-v5'
        bridge = 'powershell'
      }
      last_error = $null
    }

    foreach ($command in @($poll.commands)) {
      Run-CreapdCommand $command
    }

    Start-Sleep -Milliseconds 1200
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

    Start-Sleep -Seconds 3
  }
}
