import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Music2, Sparkles, Clapperboard, Play, Pause, Download, FolderOpen, Trash2, Palette, AlignLeft, MoveRight, RefreshCw, Layers, Video, ChevronRight, ShieldCheck, Save, WandSparkles } from 'lucide-react';
import { savePromoAsset, listPromoAssets, getPromoAsset, deletePromoAsset, updatePromoAsset, savePromoHandoff } from '@/lib/promoStudioStorage';
import { apdGetAIDirectorPlan } from '../../apps/promo-studio/src/apd-core.js';
import './promoStudio.css';

const DURATION = 30;
const SCENE_COUNT = 5;
const DEFAULTS = [
  { headline: 'YOUR BRAND. YOUR STORY.', subtitle: 'Make a first impression.', imageId: null },
  { headline: 'INTRODUCING SOMETHING NEW', subtitle: 'Your message, brought to life.', imageId: null },
  { headline: 'MADE TO STAND OUT', subtitle: 'Show people what matters.', imageId: null },
  { headline: 'SEE THE DIFFERENCE', subtitle: 'Give them a reason to remember.', imageId: null },
  { headline: 'GET STARTED TODAY!', subtitle: 'Your next step starts here.', imageId: null },
];
const LAYOUTS = [
  { id: 'market', label: 'Full-bleed', description: 'Market Veggies–style cinematic motion' },
  { id: 'clean', label: 'Clean Title', description: 'Minimal text and open space' },
  { id: 'split', label: 'Split Focus', description: 'Image on one side, message opposite' },
  { id: 'poster', label: 'Bold Poster', description: 'Large text over dramatic imagery' },
];
const THEMES = [{ id:'electric', label:'Electric',color:'#54dffb'}, {id:'sunset',label:'Sunset',color:'#ff9b51'}, {id:'emerald',label:'Emerald',color:'#3edc9b'}, {id:'lilac',label:'Lilac',color:'#b7a2ff'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safeName=s=>(String(s||'promo').replace(/[^a-z0-9-_]/gi,'-').slice(0,60)||'promo');

function drawFrame(ctx, images, project, seconds, width, height) {
  const index=clamp(Math.floor(seconds / 6),0,SCENE_COUNT-1);
  const scene=project.scenes[index];
  const image=images[scene.imageId];
  const p=clamp((seconds-index*6)/6,0,1);
  ctx.fillStyle='#10172f';
  ctx.fillRect(0,0,width,height);
  const accent=project.accent;
  if(image){
    const zoom=1.02+p*.1;
    const scale=Math.max(width/image.width,height/image.height)*zoom;
    const iw=image.width*scale, ih=image.height*scale;
    ctx.globalAlpha=1;
    if(project.layout==='split'){
      const region=width*.56;
      const cropWidth=width>.8*height?region:width;
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,cropWidth,height);ctx.clip();
    }
    ctx.drawImage(image,(width-iw)/2,(height-ih)/2,iw,ih);
    if(project.layout==='split')ctx.restore();
  }
  const vertical=height>width;
  const grad=project.layout==='split'
    ? ctx.createLinearGradient(width*.45,0,width,0)
    : ctx.createLinearGradient(0,height*.2,0,height);
  if(project.layout==='split') {
    grad.addColorStop(0,'rgba(6,12,27,0)');
    grad.addColorStop(.35,'rgba(6,12,27,.89)');
    grad.addColorStop(1,'rgba(6,12,27,.98)');
  } else {
    grad.addColorStop(0,'rgba(3,10,25,.04)');
    grad.addColorStop(.45,'rgba(3,10,25,.2)');
    grad.addColorStop(1,'rgba(3,10,25,.89)');
  }
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,width,height);
  const fade=clamp(p*6,0,1)*clamp((1-p)*7,0,1);
  ctx.globalAlpha=fade;
  const px=vertical?width*.1:width*.07;
  const maxTextWidth=project.layout==='split'?(vertical?width*.8:width*.44):(width-2*px);
  const x=project.layout==='split'&&!vertical?width*.55: (project.position==='center'?width/2:px);
  const y=project.layout==='split'&&!vertical?height*.43:(project.position==='center'?height*.58:height*.64);
  ctx.textAlign=project.layout==='split'&&!vertical?'left':(project.position==='center'?'center':'left');
  ctx.textBaseline='middle';
  const fontSize=vertical?clamp(width*.09,36,82):clamp(width*.055,44,100);
  ctx.font='900 '+fontSize+'px Outfit, Arial, sans-serif';
  const words=String(scene.headline||'').toUpperCase().split(/\s+/);
  let lines=[], line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>maxTextWidth&&line){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  const gap=fontSize*1.12;
  ctx.fillStyle='#fff';
  const startY=y-(lines.length-1)*gap*.5;
  lines.forEach((text,i)=>ctx.fillText(text,x,startY+i*gap,maxTextWidth));
  ctx.fillStyle=accent;
  ctx.fillRect(ctx.textAlign==='center'?x-42:x,startY+(lines.length-1)*gap+fontSize*.75,84,6);
  ctx.font='600 '+(vertical?27:30)+'px DM Sans, Arial, sans-serif';
  ctx.fillStyle='#fff';
  ctx.fillText(scene.subtitle||'',x,startY+(lines.length-1)*gap+fontSize*1.5,maxTextWidth);
  ctx.globalAlpha=1;
}
async function loadForExport(scenes) {
  const images={};
  for(const id of new Set(scenes.map(s=>s.imageId).filter(Boolean))){
    const asset=await getPromoAsset(id);
    if(!asset?.file)continue;
    const url=URL.createObjectURL(asset.file);
    try {
      const image=new Image();
      image.src=url;
      await image.decode();
      images[id]=image;
    }finally{URL.revokeObjectURL(url)}
  }
  return images;
}

export default function PromoStudio() {
  const navigate=useNavigate();
  const [assets,setAssets]=useState([]);
  const [assetUrls,setAssetUrls]=useState({});
  const urlRef=useRef({});
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [folder,setFolder]=useState('My Artwork');
  const [selected,setSelected]=useState(0);
  const [scenes,setScenes]=useState(DEFAULTS);
  const [projectName,setProjectName]=useState('My First Promo');
  const [brandName,setBrandName]=useState('');
  const [callToAction,setCallToAction]=useState('Get yours today!');
  const [layout,setLayout]=useState('market');
  const [theme,setTheme]=useState('electric');
  const [format,setFormat]=useState('portrait');
  const [position,setPosition]=useState('bottom');
  const [musicId,setMusicId]=useState('');
  const [playhead,setPlayhead]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [output,setOutput]=useState(null);
  const rafRef=useRef(null);
  const startRef=useRef(null);
  const audioRef=useRef(null);
  const stopExportRef=useRef(null);
  const fileInput=useRef(null);
  const musicInput=useRef(null);
  const accent=THEMES.find(t=>t.id===theme)?.color||'#54dffb';
  const selectedScene=scenes[selected];
  const activeIndex=clamp(Math.floor(playhead/6),0,SCENE_COUNT-1);

  async function refreshAssets() {
    const found=await listPromoAssets();
    setAssets(found);
    const urls={};
    for(const asset of found){
      const full=await getPromoAsset(asset.id);
      if(full?.file)urls[asset.id]=URL.createObjectURL(full.file);
    }
    Object.values(urlRef.current).forEach(url=>URL.revokeObjectURL(url));
    urlRef.current=urls;
    setAssetUrls(urls);
  }
  useEffect(()=>{refreshAssets().catch(e=>setStatus(e.message));return()=>{Object.values(urlRef.current).forEach(URL.revokeObjectURL)}},[]);
  useEffect(()=>()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);if(stopExportRef.current)stopExportRef.current()},[]);

  const filtered=useMemo(()=>assets.filter(a=>{
    if(filter!=='all'&&a.type!==filter&&a.folder!==filter)return false;
    return (a.name+' '+a.folder).toLowerCase().includes(search.toLowerCase());
  }),[assets,filter,search]);
  const images=assets.filter(a=>a.type==='image');
  const audio=assets.filter(a=>a.type==='audio');
  const folders=[...new Set(assets.map(a=>a.folder).filter(Boolean))];

  async function uploadFiles(files,kind) {
    if(!files?.length)return;
    setBusy(true);setStatus('Importing into your artwork library...');
    try {
      for(const file of files){await savePromoAsset(file,kind,folder||'My Artwork')}
      await refreshAssets();
      setStatus('Artwork saved to your private browser library.');
    }catch(e){setStatus(e.message)}finally{setBusy(false)}
  }
  const updateScene=patch=>setScenes(prev=>prev.map((scene,i)=>i===selected?{...scene,...patch}:scene));
  function autoAssign() {
    if(!images.length){setStatus('Upload images before building a storyboard.');return}
    setScenes(prev=>prev.map((s,i)=>({...s,imageId:images[i%images.length].id})));
    setStatus('Images distributed across five six-second scenes.');
  }
  function setFromTemplate(id) {
    setLayout(id);
    setStatus('Layout applied. Adjust individual scene text in the inspector.');
  }
  async function directWithAPD() {
    if(!projectName.trim()){setStatus('Name your promotion first.');return}
    setBusy(true);setStatus('APD is directing the creative brief...');
    try{
      const plan=await apdGetAIDirectorPlan('Make an engaging 30-second promotional video advertising '+projectName+'. Audience and identity: '+(brandName||projectName)+'. Call to action: '+callToAction+'.',()=>{});
      setScenes(prev=>prev.map((s,i)=>({
        ...s,
        headline:i===0?(plan.typography_headline||projectName)
          :i===4?callToAction.toUpperCase()
          :i===1?(plan.typography_support_line||'Discover more')
          :s.headline,
        subtitle:i===0?(brandName||s.subtitle):i===4?(brandName||s.subtitle):s.subtitle,
      })));
      setStatus('APD directed the headline and opening message. All artwork and edits remain yours.');
    }catch(e){setStatus('APD could not connect: '+(e.message||'Please try again')+'. You can continue editing manually.')}
    finally{setBusy(false)}
  }
  function togglePlayback(){
    if(playing){setPlaying(false);if(audioRef.current)audioRef.current.pause();return}
    if(playhead>=DURATION)setPlayhead(0);
    startRef.current=performance.now()-(playhead>=DURATION?0:playhead)*1000;
    setPlaying(true);
    if(audioRef.current){audioRef.current.currentTime=0;audioRef.current.play().catch(()=>{})}
  }
  useEffect(()=>{
    if(!playing)return;
    let raf;
    function tick(){
      const t=(performance.now()-startRef.current)/1000;
      if(t>=DURATION){setPlayhead(0);setPlaying(false);audioRef.current?.pause();return}
      setPlayhead(t);raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[playing]);
  async function exportWebM(){
    if(exporting)return;
    if(!images.length||!scenes.some(s=>s.imageId)){setStatus('Add artwork to your storyboard before exporting.');return}
    if(typeof HTMLCanvasElement.prototype.captureStream!=='function'||typeof MediaRecorder==='undefined'){setStatus('Your browser does not support local WebM recording. Use a current Chrome or Edge browser.');return}
    setExporting(true);setStatus('Rendering the full 30-second video on your device...');
    let ctxAudio=null;
    try {
      if(output)URL.revokeObjectURL(output.url);
      const available=await loadForExport(scenes);
      const width=format==='portrait'?720:1280, height=format==='portrait'?1280:720;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false});
      const stream=canvas.captureStream(30);
      const project={scenes,layout,accent,position};
      const audioElement=audioRef.current;
      if(musicId&&audioElement&&audioElement.src){
        ctxAudio=new (window.AudioContext||window.webkitAudioContext)();
        const source=ctxAudio.createMediaElementSource(audioElement);
        const dest=ctxAudio.createMediaStreamDestination();
        source.connect(dest);source.connect(ctxAudio.destination);
        dest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
        audioElement.currentTime=0;
      }
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
      const chunks=[];
      const saved=new Promise((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
        recorder.onerror=e=>reject(e.error||new Error('Recording error'));
        recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));
      });
      let frameId=0;let stopped=false;
      const begin=performance.now();
      function stop(){
        if(stopped)return;
        stopped=true;
        cancelAnimationFrame(frameId);
        if(recorder.state!=='inactive')recorder.stop();
        stream.getTracks().forEach(track=>track.stop());
      }
      stopExportRef.current=stop;
      recorder.start(300);
      drawFrame(ctx,available,project,0,width,height);
      if(ctxAudio)await audioElement.play();
      function render(){
        if(stopped)return;
        const elapsed=(performance.now()-begin)/1000;
        drawFrame(ctx,available,project,Math.min(elapsed,29.999),width,height);
        setPlayhead(Math.min(elapsed,DURATION));
        if(elapsed>=DURATION){stop();return}
        frameId=requestAnimationFrame(render);
      }
      frameId=requestAnimationFrame(render);
      const blob=await saved;
      if(audioElement)audioElement.pause();
      const url=URL.createObjectURL(blob);
      setOutput({url,name:safeName(projectName)+'-'+format+'-30s.webm'});
      setPlayhead(0);
      setStatus('Your 30-second video is ready. Download the WebM to review it.');
    }catch(e){setStatus('Export failed: '+(e.message||e))}
    finally{stopExportRef.current=null;if(ctxAudio)await ctxAudio.close().catch(()=>{});setExporting(false)}
  }
  function openEditor(){
    if(!scenes.some(s=>s.imageId)){setStatus('Select artwork before opening the layout editor.');return}
    savePromoHandoff({projectName,scenes,brandName,layout,format,position,accent,callToAction,musicId});
    navigate('/editor');
  }
  const sceneAtPreview=scenes[activeIndex];
  const previewImage=assetUrls[sceneAtPreview?.imageId];
  const pickedFormat=format==='portrait';
  return <div className="ps-root">
    <header className="ps-header">
      <div className="ps-brand"><div className="ps-mark"><Clapperboard size={23}/></div><div><strong>Promo<span>Studio</span></strong><small>CREATE · DIRECT · PUBLISH</small></div></div>
      <div className="ps-status"><span className="ps-status-light"/>Private beta · 30-sec creator</div>
      <button className="ps-secondary" onClick={openEditor}><Layers size={17}/> Open Presentation Editor <ChevronRight size={15}/></button>
    </header>
    <section className="ps-hero"><div><div className="ps-overline">YOUR BRAND. YOUR CREATIVE CONTROL.</div><h1>Build promos that <em>move people.</em></h1><p>Your artwork library, APD creative direction, and custom layouts — together in one studio.</p></div><div className="ps-hero-actions"><button className="ps-gradient-btn" onClick={directWithAPD} disabled={busy}><Sparkles size={17}/>{busy?'APD working...':'Let APD Direct'}</button></div></section>
    <main className="ps-grid">
      <aside className="ps-panel ps-library">
        <div className="ps-panel-head"><div><span className="ps-overline">01 / YOUR ASSETS</span><h2><FolderOpen size={17}/> Artwork Library</h2></div><span className="ps-pill">{assets.length}</span></div>
        <div className="ps-upload">
          <div className="ps-upload-actions"><button onClick={()=>fileInput.current?.click()}><ImagePlus size={17}/> Add Artwork</button><button onClick={()=>musicInput.current?.click()}><Music2 size={17}/> Add Music</button></div>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={e=>{uploadFiles([...e.target.files],'image');e.target.value=''}}/>
          <input ref={musicInput} type="file" accept="audio/*" multiple hidden onChange={e=>{uploadFiles([...e.target.files],'audio');e.target.value=''}}/>
          <input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="Library collection" aria-label="Library collection" className="ps-folder-input"/>
        </div>
        <input className="ps-field" placeholder="Search artwork or collections…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="ps-filterbar"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button><button className={filter==='image'?'active':''} onClick={()=>setFilter('image')}>Images</button><button className={filter==='audio'?'active':''} onClick={()=>setFilter('audio')}>Music</button></div>
        <div className="ps-folderbar">{folders.map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(filter===f?'all':f)}>{f}</button>)}</div>
        <div className="ps-assets">
          {filtered.length===0&&<div className="ps-empty"><ImagePlus size={28}/><b>Your creative library starts here.</b><small>Upload artwork and it stays available in this browser.</small></div>}
          {filtered.map(asset=><div key={asset.id} className="ps-asset">
            <div className="ps-thumb">{asset.type==='image'?<img src={assetUrls[asset.id]} alt={asset.name}/>:<Music2 size={22}/>}</div>
            <div className="ps-asset-details"><b title={asset.name}>{asset.name}</b><small>{asset.folder} · {asset.type}</small><div className="ps-asset-actions">
              <button onClick={()=>asset.type==='image'?updateScene({imageId:asset.id}):setMusicId(asset.id)}>{asset.type==='image'?'Use in scene':'Use music'}</button>
              <button title={asset.favorite?'Unfavorite':'Favorite'} onClick={async()=>{await updatePromoAsset(asset.id,{favorite:!asset.favorite});refreshAssets()}}>{asset.favorite?'★':'☆'}</button>
              <button title="Delete asset" onClick={async()=>{if(!confirm('Remove this file from your private library?'))return;await deletePromoAsset(asset.id);setScenes(prev=>prev.map(s=>s.imageId===asset.id?{...s,imageId:null}:s));if(musicId===asset.id)setMusicId('');refreshAssets()}}><Trash2 size={12}/></button>
            </div></div>
          </div>)}
        </div>
        <div className="ps-panel-foot"><ShieldCheck size={14}/> Artwork is private to this browser in beta.</div>
      </aside>
      <section className="ps-panel ps-workspace">
        <div className="ps-panel-head"><div><span className="ps-overline">02 / THE CREATIVE STUDIO</span><h2><Clapperboard size={18}/> Live Preview</h2></div><div className="ps-pill">00:{String(Math.round(playhead)).padStart(2,'0')} / 00:30</div></div>
        <div className="ps-stage-wrap"><div className={'ps-stage '+(pickedFormat?'portrait':'landscape')+' ps-layout-'+layout+' ps-position-'+position} style={{'--ps-accent':accent,backgroundImage:previewImage?'linear-gradient(0deg,rgba(5,7,18,.89),rgba(5,7,18,.03) 85%),url('+JSON.stringify(previewImage).slice(1,-1)+')':undefined}}>
          {!previewImage&&<div className="ps-stage-placeholder"><ImagePlus size={38}/><span>Choose artwork from your library</span></div>}
          <div className="ps-stage-copy"><strong>{sceneAtPreview?.headline}</strong><i/><p>{sceneAtPreview?.subtitle}</p></div>
          <div className="ps-stage-index">{activeIndex+1} / 5</div>
        </div></div>
        <div className="ps-playrow"><button onClick={togglePlayback} disabled={exporting}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':'Preview 30s'}</button><input aria-label="Video progress" type="range" min="0" max="30" step=".1" value={playhead} onChange={e=>{setPlaying(false);audioRef.current?.pause();setPlayhead(+e.target.value);setSelected(clamp(Math.floor(+e.target.value/6),0,4))}}/><button className="ps-secondary" onClick={()=>{setPlaying(false);setPlayhead(0);audioRef.current?.pause()}}><RefreshCw size={15}/></button></div>
        <div className="ps-timeline-head"><h3>30-Second Storyboard</h3><button onClick={autoAssign}><WandSparkles size={14}/> Auto-fill artwork</button></div>
        <div className="ps-scenes">{scenes.map((scene,i)=><button key={i} className={'ps-scene '+(selected===i?'selected':'')} onClick={()=>{setSelected(i);setPlayhead(i*6);setPlaying(false)}}><div className="ps-scene-art">{assetUrls[scene.imageId]?<img src={assetUrls[scene.imageId]} alt=""/>:<ImagePlus size={20}/>}<span>{String(i*6).padStart(2,'0')}–{String((i+1)*6).padStart(2,'0')}s</span></div><small>{scene.headline||'Scene '+(i+1)}</small></button>)}</div>
        <div className="ps-bottom-action"><button className="ps-secondary" onClick={openEditor}><Layers size={16}/> Fine-tune in Presentation Editor</button><button className="ps-gradient-btn" disabled={exporting} onClick={exportWebM}><Video size={17}/>{exporting?'Rendering (30 sec)…':'Export 30s video'}</button></div>
        {output&&<div className="ps-export-ready"><Download size={17}/><span>Rendered: {output.name}</span><a href={output.url} download={output.name}>Download WebM</a></div>}
        <audio ref={audioRef} src={assetUrls[musicId]||undefined} controls className="ps-audio-player"/>
      </section>
      <aside className="ps-panel ps-inspector">
        <div className="ps-panel-head"><div><span className="ps-overline">03 / THE DIRECTOR'S DESK</span><h2><Palette size={18}/> Customize</h2></div></div>
        <label className="ps-label">Campaign title<input className="ps-field" value={projectName} onChange={e=>setProjectName(e.target.value)}/></label>
        <label className="ps-label">Brand or business<input className="ps-field" placeholder="Your business name" value={brandName} onChange={e=>setBrandName(e.target.value)}/></label>
        <label className="ps-label">Call to action<input className="ps-field" value={callToAction} onChange={e=>setCallToAction(e.target.value)}/></label>
        <div className="ps-separator"/>
        <label className="ps-label">Layout template</label>
        <div className="ps-layouts">{LAYOUTS.map(l=><button key={l.id} className={layout===l.id?'selected':''} onClick={()=>setFromTemplate(l.id)}><span className={'ps-layout-swatch ps-layout-'+l.id}/><b>{l.label}</b><small>{l.description}</small></button>)}</div>
        <label className="ps-label">Color identity</label><div className="ps-themes">{THEMES.map(t=><button key={t.id} title={t.label} className={theme===t.id?'selected':''} style={{background:t.color}} onClick={()=>setTheme(t.id)} />)}</div>
        <label className="ps-label">Video format</label><div className="ps-toggle"><button className={format==='portrait'?'active':''} onClick={()=>setFormat('portrait')}>9:16 Portrait</button><button className={format==='landscape'?'active':''} onClick={()=>setFormat('landscape')}>16:9 Landscape</button></div>
        <label className="ps-label">Headline positioning</label><div className="ps-toggle"><button className={position==='bottom'?'active':''} onClick={()=>setPosition('bottom')}>Bottom</button><button className={position==='center'?'active':''} onClick={()=>setPosition('center')}>Center</button></div>
        <div className="ps-separator"/>
        <h3>Scene {selected+1} · {selected*6}–{(selected+1)*6} seconds</h3>
        <label className="ps-label">Headline<textarea rows="2" value={selectedScene.headline} onChange={e=>updateScene({headline:e.target.value})}/></label>
        <label className="ps-label">Supporting text<textarea rows="2" value={selectedScene.subtitle} onChange={e=>updateScene({subtitle:e.target.value})}/></label>
        <label className="ps-label">Soundtrack<select value={musicId} onChange={e=>setMusicId(e.target.value)}><option value="">No music</option>{audio.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <div className="ps-inspector-info"><Save size={15}/> Library files stay on this device. Cloud accounts and scheduled publishing come in the commercial release.</div>
      </aside>
    </main>
    {status&&<div className="ps-toast" role="status"><span>{status}</span><button onClick={()=>setStatus('')}>×</button></div>}
  </div>;
}
