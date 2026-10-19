import { getPromoAsset, popPromoHandoff } from './promoStudioStorage';

const KEY = 'promo-studio-editor-draft-v1';
const freshId = label => label+'-'+crypto.randomUUID();

function imageElement(slideId, id, url) {
  return {
    id:freshId('temp-image'), type:'image', slide_id:slideId, sourceAssetId:id,
    content:url, x:0,y:0,width:1280,height:720,rotation:0,opacity:100,z_index:0,
    locked:false,visible:true,style:JSON.stringify({objectFit:'cover'}),
    entrance_type:'fade_in',entrance_duration:500,entrance_delay:0,
    start_ms:0,end_ms:6000
  };
}
function textElement(slideId, value, x, y, width, fontSize, color, weight, z) {
  return {
    id:freshId('temp-text'),type:'text',slide_id:slideId,content:String(value||''),
    x,y,width,height:140,rotation:0,opacity:100,z_index:z,
    locked:false,visible:true,
    style:JSON.stringify({fontFamily:'Outfit',fontWeight:weight,fontSize,color,align:'left',lineHeight:1.05}),
    entrance_type:'fade_in',entrance_duration:500,entrance_delay:140,
    start_ms:0,end_ms:6000
  };
}
async function rehydrate(map) {
  const urls={};
  for (const group of Object.values(map)){
    for(const el of group){
      if(!el.sourceAssetId)continue;
      if(!urls[el.sourceAssetId]){
        const asset=await getPromoAsset(el.sourceAssetId);
        if(asset?.file)urls[el.sourceAssetId]=URL.createObjectURL(asset.file);
      }
      el.content=urls[el.sourceAssetId]||'';
    }
  }
  return map;
}
function createFromHandoff(data) {
  const ppId=freshId('promo');
  const slides=[];
  const elementsBySlide={};
  data.scenes.slice(0,5).forEach((scene,index)=>{
    const slideId=freshId('temp-slide');
    slides.push({
      id:slideId, pp_id:ppId,stories_presentation_id:null,slide_number:index+1,
      slide_type:'promo', title:scene.headline||'Scene '+(index+1),
      body_text:scene.subtitle||'',speaker_notes:'Promo Studio | '+(index*6)+'–'+((index+1)*6)+' seconds',
      transition:'fade',status:'editing',
      background:JSON.stringify({color:'#0b1424'}),
      duration_ms:6000,timing:JSON.stringify({duration_ms:6000}),
      version:1
    });
    const x=data.layout==='split'?680:96;
    const textWidth=data.layout==='split'?515:1070;
    const items=[];
    if(scene.imageId)items.push(imageElement(slideId,scene.imageId,''));
    items.push(textElement(slideId,scene.headline||'',x,470,textWidth,68,'#ffffff',900,3));
    items.push(textElement(slideId,scene.subtitle||'',x,615,textWidth,28,data.accent||'#54dffb',600,4));
    elementsBySlide[slideId]=items;
  });
  return {
    presentation: {
      title:data.projectName||'My Promo',pp_id:ppId,production_profile:'promo_studio',
      aspect_ratio:data.format==='portrait'?'9:16':'16:9',
      total_runtime_ms:30000,story_count:slides.length,presentation_version:1,
      status:'editing',slide_order:JSON.stringify(slides.map(s=>s.id))
    },slides,elementsBySlide
  };
}
export async function loadPromoEditorDraft() {
  const handoff=popPromoHandoff();
  let doc;
  if(handoff){
    doc=createFromHandoff(handoff);
  } else {
    try{doc=JSON.parse(localStorage.getItem(KEY)||'null')}catch{doc=null}
  }
  if(!doc?.presentation || !Array.isArray(doc?.slides) || !doc.elementsBySlide)return null;
  doc.elementsBySlide=await rehydrate(doc.elementsBySlide);
  return doc;
}
export function storePromoEditorDraft(presentation, slides, elementsBySlide) {
  const serializable={presentation,slides,elementsBySlide:{}};
  Object.entries(elementsBySlide).forEach(([id,els])=>{
    serializable.elementsBySlide[id]=els.map(el=>({
      ...el,
      content:el.sourceAssetId ? '' : el.content,
    }));
  });
  localStorage.setItem(KEY,JSON.stringify(serializable));
}
