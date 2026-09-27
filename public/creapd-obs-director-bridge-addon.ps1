# CREAPD OBS Director command addon
# Dot-source this file from the main CREAPD bridge. It expects Invoke-ObsRequest and Refresh-ObsState.

function Get-CreapdSceneItem([string]$SceneName,[string]$SourceName) {
  return Invoke-ObsRequest 'GetSceneItemId' @{ sceneName=$SceneName; sourceName=$SourceName }
}

function Invoke-CreapdDirectorCommand($Command) {
  $type=[string]$Command.command_type
  $p=$Command.payload
  switch($type) {
    'create_scene' {
      $name=[string]$p.scene_name
      Invoke-ObsRequest 'CreateScene' @{ sceneName=$name } | Out-Null
      Refresh-ObsState -RefreshScenes $true
      return @{ handled=$true; result=@{ scene_name=$name; scenes=$script:SceneNames } }
    }
    'create_source' {
      $scene=[string]$p.scene_name; $name=[string]$p.source_name; $kind=[string]$p.source_type
      $settings=@{}
      switch($kind) {
        'image' { $obsKind='image_source'; $settings.file=[string]$p.path }
        'media' { $obsKind='ffmpeg_source'; $settings.local_file=[string]$p.path; $settings.is_local_file=$true; $settings.looping=[bool]$p.loop }
        'text' { $obsKind='text_gdiplus_v2'; $settings.text=[string]$p.text }
        'browser' { $obsKind='browser_source'; $settings.url=[string]$p.url; $settings.width=[int]$(if($p.width){$p.width}else{1920}); $settings.height=[int]$(if($p.height){$p.height}else{1080}) }
        'camera' { $obsKind='dshow_input'; if($p.device_id){$settings.video_device_id=[string]$p.device_id} }
        'audio_input' { $obsKind='wasapi_input_capture'; if($p.device_id){$settings.device_id=[string]$p.device_id} }
        'display_capture' { $obsKind='monitor_capture'; if($null-ne $p.monitor){$settings.monitor=[int]$p.monitor} }
        'window_capture' { $obsKind='window_capture'; if($p.window){$settings.window=[string]$p.window} }
        default { throw "Unsupported CREAPD source type: $kind" }
      }
      $created=Invoke-ObsRequest 'CreateInput' @{sceneName=$scene;inputName=$name;inputKind=$obsKind;inputSettings=$settings;sceneItemEnabled=$true}
      return @{handled=$true;result=@{scene_name=$scene;source_name=$name;source_type=$kind;scene_item_id=$created.sceneItemId}}
    }
    'remove_source' {
      $scene=[string]$p.scene_name; if([string]::IsNullOrWhiteSpace($scene)){$scene=$script:CurrentScene}
      $item=Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'RemoveSceneItem' @{sceneName=$scene;sceneItemId=[int]$item.sceneItemId}|Out-Null
      return @{handled=$true;result=@{removed=$true;source_name=[string]$p.source_name}}
    }
    'set_source_visibility' {
      $scene=[string]$p.scene_name; if([string]::IsNullOrWhiteSpace($scene)){$scene=$script:CurrentScene}
      $item=Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'SetSceneItemEnabled' @{sceneName=$scene;sceneItemId=[int]$item.sceneItemId;sceneItemEnabled=[bool]$p.visible}|Out-Null
      return @{handled=$true;result=@{source_name=[string]$p.source_name;visible=[bool]$p.visible}}
    }
    'set_source_transform' {
      $scene=[string]$p.scene_name; if([string]::IsNullOrWhiteSpace($scene)){$scene=$script:CurrentScene}
      $item=Get-CreapdSceneItem $scene ([string]$p.source_name)
      $t=@{}
      if($null-ne $p.x){$t.positionX=[double]$p.x}; if($null-ne $p.y){$t.positionY=[double]$p.y}
      if($null-ne $p.scale_x){$t.scaleX=[double]$p.scale_x}; if($null-ne $p.scale_y){$t.scaleY=[double]$p.scale_y}
      if($null-ne $p.rotation){$t.rotation=[double]$p.rotation}
      if($null-ne $p.crop_left){$t.cropLeft=[int]$p.crop_left}; if($null-ne $p.crop_right){$t.cropRight=[int]$p.crop_right}; if($null-ne $p.crop_top){$t.cropTop=[int]$p.crop_top}; if($null-ne $p.crop_bottom){$t.cropBottom=[int]$p.crop_bottom}
      Invoke-ObsRequest 'SetSceneItemTransform' @{sceneName=$scene;sceneItemId=[int]$item.sceneItemId;sceneItemTransform=$t}|Out-Null
      return @{handled=$true;result=@{source_name=[string]$p.source_name;transform=$t}}
    }
    'move_source_up' {
      $scene=[string]$p.scene_name;if([string]::IsNullOrWhiteSpace($scene)){$scene=$script:CurrentScene};$item=Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'SetSceneItemIndex' @{sceneName=$scene;sceneItemId=[int]$item.sceneItemId;sceneItemIndex=[int]$p.index}|Out-Null
      return @{handled=$true;result=@{source_name=[string]$p.source_name}}
    }
    'move_source_down' {
      $scene=[string]$p.scene_name;if([string]::IsNullOrWhiteSpace($scene)){$scene=$script:CurrentScene};$item=Get-CreapdSceneItem $scene ([string]$p.source_name)
      Invoke-ObsRequest 'SetSceneItemIndex' @{sceneName=$scene;sceneItemId=[int]$item.sceneItemId;sceneItemIndex=[int]$p.index}|Out-Null
      return @{handled=$true;result=@{source_name=[string]$p.source_name}}
    }
  }
  return @{handled=$false;result=@{}}
}
