import {scenes} from './scenes.js?v=20261111';
import {sunPosition,phase,localTime} from './solar.js';
import {createRenderer} from './renderer.js?v=20261111';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={room:'css',depthSource:'approximate',scene:3,mode:'photo',offset:0,motion:!reduced.matches,rain:false,paused:false,custom:false,ready:false,frames:0};
let roomRenderer=null,renderer=null,lost=false,request=0,images=null,elapsed=0,last=0,lastDraw=0,lastHud=0,pointer=[0,0],drift=[0,0],uploadedURL=null,rainNow=0;
const cache=new Map();
function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Image load failed'));im.src=url;});}
function initRenderer(){try{renderer=createRenderer($('#view'));if(images)renderer.load(...images);$('#window').classList.add('ready');}catch{renderer=null;$('#status').textContent='此瀏覽器先以靜態照片陪你看風景。';}}
initRenderer();
if(renderer)import('./room.js?v=20261111-room3d').then(({createRoom})=>{
 try{roomRenderer=createRoom($('#room-view'),$('.room'),$('#view'),mode=>state.room=mode);roomRenderer.draw();}catch{state.room='css';}
}).catch(()=>{state.room='css';});
function sourceURLs(i){return [`./assets/${scenes[i].id}.webp`,`./assets/${scenes[i].id}-depth.png`];}
function setPressed(){document.querySelectorAll('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.scene===state.scene&&!state.custom)));document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.time===state.mode)));for(const [id,key]of [['motion','motion'],['rain','rain'],['quiet','paused']])$('#'+id).setAttribute('aria-pressed',String(state[key]));$('#quiet').textContent=state.paused?'繼續看':'停一會';$('#offset').value=state.offset===0?'此刻':`${state.offset>0?'+':''}${state.offset.toFixed(1)} 小時`;$('#hour').value=state.offset;}
async function selectScene(i){
 const token=++request;$('#status').textContent='正在開一扇窗…';
 try{if(!cache.has(i))cache.set(i,Promise.all(sourceURLs(i).map(loadImage)));const loaded=await cache.get(i);if(token!==request)return;
  images=loaded;renderer?.load(...loaded);state.scene=i;state.custom=false;state.ready=true;drift=[0,0];$('#still').src=scenes[i].preview||sourceURLs(i)[0];$('#still').alt=`${scenes[i].name}實景窗景`;$('#caption').textContent=scenes[i].caption;$('#place').textContent=scenes[i].en;$('#status').textContent=renderer?'':'此瀏覽器先以靜態照片陪你看風景。';if(uploadedURL){URL.revokeObjectURL(uploadedURL);uploadedURL=null;}setPressed();updateHud();
 }catch{cache.delete(i);if(token===request)$('#status').textContent='窗景沒能載入，請再選一次。';}
}
scenes.forEach((s,i)=>{const b=document.createElement('button');b.className='place';b.dataset.scene=i;b.innerHTML=`<span>${s.name}</span><small>${String(i+1).padStart(2,'0')} / WINDOW</small>`;b.onclick=()=>selectScene(i);$('#places').appendChild(b);const li=document.createElement('li'),a=document.createElement('a');a.href=s.source||'https://polyhaven.com/a/'+s.asset;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`${s.name} · ${s.author||'Poly Haven'} · ${s.license||'CC0'}`;li.appendChild(a);$('#credits').appendChild(li);});
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.time;if(state.mode==='live')state.offset=0;setPressed();updateHud();});
$('#hour').oninput=e=>{state.offset=+e.target.value;state.mode='live';setPressed();updateHud();};
$('#motion').onclick=()=>{state.motion=!state.motion;if(!state.motion)drift=[0,0];setPressed();};$('#rain').onclick=()=>{state.rain=!state.rain;setPressed();};$('#quiet').onclick=()=>{state.paused=!state.paused;setPressed();};
$('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#status').textContent='此瀏覽器無法全螢幕，橫向看也很舒服。';}};
const about=$('#about');$('#about-open').onclick=()=>about.showModal();$('#about-close').onclick=()=>about.close();
$('#view').addEventListener('pointermove',e=>{const r=e.currentTarget.getBoundingClientRect();pointer=[(e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5];});$('#view').addEventListener('pointerleave',()=>pointer=[0,0]);
reduced.addEventListener('change',e=>{state.motion=!e.matches;setPressed();});
$('#photo').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;const token=++request;let url;
 try{if(file.size>20*1024*1024)throw Error('請選擇小於 20 MB 的照片。');$('#upload-status').textContent='正在打開照片…';url=URL.createObjectURL(file);const im=await loadImage(url);if(token!==request){URL.revokeObjectURL(url);return;}
  const ratio=Math.min(1,2048/Math.max(im.naturalWidth,im.naturalHeight));const photo=document.createElement('canvas');photo.width=Math.round(im.naturalWidth*ratio);photo.height=Math.round(im.naturalHeight*ratio);photo.getContext('2d').drawImage(im,0,0,photo.width,photo.height);
  const depth=document.createElement('canvas');depth.width=depth.height=64;const c=depth.getContext('2d'),g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,'#080800');g.addColorStop(.45,'#181800');g.addColorStop(1,'#d0d000');c.fillStyle=g;c.fillRect(0,0,64,64);
  renderer?.load(photo,depth);images=[photo,depth];if(uploadedURL)URL.revokeObjectURL(uploadedURL);uploadedURL=url;state.custom=true;state.ready=true;$('#still').src=url;$('#still').alt='你選擇的私人照片';$('#caption').textContent='你的照片，借這座城市的光。';$('#place').textContent='YOUR WINDOW';$('#upload-status').textContent='已打開，只留在你的瀏覽器。';$('#status').textContent='';setPressed();about.close();
 }catch(error){if(url)URL.revokeObjectURL(url);$('#upload-status').textContent=error.message.startsWith('請')?error.message:'這張照片讀取失敗，請試試 JPG、PNG 或 WebP。';}
};
$('#view').addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;$('#window').classList.remove('ready');$('#status').textContent='暫時以靜態照片顯示。';});
$('#view').addEventListener('webglcontextrestored',()=>{lost=false;initRenderer();if(renderer)$('#status').textContent='';});
document.addEventListener('visibilitychange',()=>{last=0;});
function updateHud(){const s=scenes[state.scene],date=new Date(Date.now()+state.offset*3600000),sun=sunPosition(date,s.lat,s.lon);$('#clock').textContent=localTime(date,s.tz);$('#clock').dateTime=date.toISOString();$('#phase').textContent=state.mode==='photo'?'拍攝光線':phase(sun.elevation);}
function tick(now){requestAnimationFrame(tick);if(document.hidden){last=0;return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
 if(!state.paused&&!about.open){elapsed+=dt;if(state.mode==='cycle'){state.offset+=dt*.25;if(state.offset>12)state.offset-=24;}}
 const active=!state.paused&&!about.open&&(state.motion||state.rain||rainNow>.001||state.mode==='cycle');if(now-lastDraw<(active?1000/30:1000))return;lastDraw=now;
 if(state.ready&&renderer&&!lost){const s=scenes[state.scene],sun=sunPosition(new Date(Date.now()+state.offset*3600000),s.lat,s.lon),night=Math.max(0,Math.min(1,(4-sun.elevation)/14)),warm=Math.max(0,1-Math.abs(sun.elevation-2)/10);
  if(!state.paused&&!about.open){const target=state.motion?[Math.sin(elapsed*.15)*.002+pointer[0]*.008,Math.sin(elapsed*.11)*.0007+pointer[1]*.002]:[0,0];drift=drift.map((v,i)=>v+(target[i]-v)*.1);}
  if(!state.paused&&!about.open)rainNow+=((state.rain?1:0)-rainNow)*.12;
  document.documentElement.style.setProperty('--room-night',state.mode==='photo'?0:night);
  document.documentElement.style.setProperty('--room-warm',state.mode==='photo'?.25:warm*(1.-night));
  roomRenderer?.draw({night:state.mode==='photo'?0:night,warm:state.mode==='photo'?.25:warm,drift});
  renderer.draw({animate:state.motion?1:0,panorama:state.custom?0:1,center:s.position,position:state.custom ? .5 : s.position,drift:state.room==='webgl'?drift.map(v=>v*.2):drift,time:elapsed,night,warm,rain:rainNow,original:state.mode==='photo'?1:0});state.frames++;
 }
 if(now-lastHud>1000){lastHud=now;if(state.mode==='cycle')setPressed();updateHud();}
}
window.worldWindow={getState:()=>({...state,roomStats:roomRenderer?.getStats(),elapsed,drift:[...drift],renderer:renderer?'webgl':'static',lost}),selectScene};setPressed();selectScene(3);requestAnimationFrame(tick);
