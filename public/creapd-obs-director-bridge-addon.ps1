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
      $maxIndex = [Math]::Max(0, @($list.sceneItems).Count - 1)
      $nextIndex = [Math]::Min($maxIndex, [int]$item.sceneItemId * 0 + ([int](@($list.sceneItems) | Where-Object { [int]$_.sceneItemId -eq [int]$item.sceneItemId } | Select-Object -First 1).sceneItemIndex) + 1)
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
