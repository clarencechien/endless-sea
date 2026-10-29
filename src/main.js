import './style.css';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from './ocean.js';
import { createPlane } from './plane.js';
import { Soundscape } from './audio.js';
import { encodeMidi } from './score.js';
import { createIslands } from './islands.js';
import { ISLANDS, keepAboveTerrain } from './terrain.js';
import { createFlight, updateFlight, headingDegrees } from './flight.js';

const $ = s => document.querySelector(s);
const canvas = $('#world');
let renderer;
try {
 renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
} catch {
 $('#error').hidden=false;
 $('#error').textContent='這片海需要瀏覽器的 3D 圖形加速。請使用新版 Chrome、Edge 或 Safari，並開啟硬體加速後重新整理。';
 throw new Error('WebGL 2 is required');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.autoClear=false;
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,15000);
const scene=new THREE.Scene();
const ambient=new THREE.HemisphereLight(0xd9e8ed,0x40626c,2.25);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffd9a3,3.2);sun.position.set(600,300,-1000);scene.add(sun);
const plane=createPlane();scene.add(plane);
const islands=createIslands();scene.add(islands);
const backgroundScene=new THREE.Scene();
const uniforms={uTime:{value:0},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},uCamera:{value:new THREE.Vector3()},uRotation:{value:new THREE.Matrix3()},uFov:{value:Math.tan(THREE.MathUtils.degToRad(26))},uMood:{value:1},uWind:{value:.8},uChapter:{value:1},uIslands:{value:ISLANDS.map(i=>new THREE.Vector4(i.x,i.z,i.rx,i.rz))}};
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthTest:false,depthWrite:false}));ocean.frustumCulled=false;backgroundScene.add(ocean);
const backgroundCamera=new THREE.Camera();
let flight=createFlight();
const keys=new Set();
let targetMood=1,quality=1.5;
let soundscape,soundOn=false,chapter=1;
let initialized=false;
const cameraOffset=new THREE.Vector3(),lookTarget=new THREE.Vector3();
const yawQuaternion=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
const clock=new THREE.Clock();
let frames=0,fpsTime=0;
function updateMode(){
 $('#autopilot').classList.toggle('active',flight.autopilot);
 $('#autopilot').setAttribute('aria-pressed',String(flight.autopilot));
 $('#mode-label').firstChild.textContent=!flight.flying?'等待起飛':flight.autopilot?'自在巡航':'手動飛行';
 $('#mode-sub').textContent=!flight.flying?'THE SKY IS YOURS':flight.autopilot?'FOLLOW THE HORIZON':'YOU HAVE THE CONTROLS';
}
function takeFlight(){flight.flying=true;document.body.classList.add('flying');$('#flying-note').hidden=false;$('#intro').inert=true;$('#guide').close();if(matchMedia('(pointer: coarse)').matches)$('#touch-controls').hidden=false;updateMode();}
$('#fly').onclick=takeFlight;
$('#guide-fly').onclick=takeFlight;
$('#help').onclick=()=>$('#guide').showModal();
$('#close-guide').onclick=()=>$('#guide').close();
$('#guide').addEventListener('click',e=>{if(e.target===$('#guide')){const b=$('#guide').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('#guide').close();}});
$('#settings').onclick=()=>{$('#settings-panel').hidden=!$('#settings-panel').hidden;};
$('.close-panel').onclick=()=>$('#settings-panel').hidden=true;
$('#quality').onchange=e=>{quality=Number(e.target.value);resize();};
$('#wind').oninput=e=>uniforms.uWind.value=Number(e.target.value);
$('#autopilot').onclick=()=>{if(!flight.flying)takeFlight();flight.autopilot=!flight.autopilot;updateMode();};
for(const button of document.querySelectorAll('[data-time]'))button.onclick=()=>{
 const mood=button.dataset.time;targetMood={morning:0,golden:1,blue:2}[mood];
 document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('selected',b===button));
 $('#time-label').textContent={morning:'MORNING LIGHT',golden:'GOLDEN HOUR',blue:'BLUE HOUR'}[mood];
};
function toggleUI(){document.body.classList.toggle('ui-hidden');}
$('#hide-ui').onclick=toggleUI;
$('#restore-ui').onclick=toggleUI;
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||$('#guide').open)return;
 const k=e.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(e.repeat){keys.add(k);return;}
 if(k==='h')toggleUI();
 if(k==='p')$('#autopilot').click();
 if(k==='r'){resetFlight();}
 keys.add(k);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();clock.getDelta();if(soundscape)soundscape.visibility(document.hidden);});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));
}
$('#sound').onclick=async()=>{
 try{
 if(!soundscape){soundscape=new Soundscape();soundscape.setChapter(chapter);for(const input of document.querySelectorAll('[data-mix]'))soundscape.setLevel(input.dataset.mix,Number(input.value));}
 await soundscape.setEnabled(!soundOn);soundOn=soundscape.enabled;
 $('#sound').setAttribute('aria-label',soundOn?'關閉環境音':'開啟環境音');
 $('#sound').setAttribute('aria-pressed',String(soundOn));
 $('#sound-status').textContent=soundOn?'配樂與環境音播放中':'點右上喇叭，開啟配樂與環境音';
 $('#sound').innerHTML=soundOn?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6"/></svg>';
 }catch{$('#sound-status').textContent='聲音未能啟動，請再次點擊喇叭。';}
};
for(const input of document.querySelectorAll('[data-mix]'))input.oninput=()=>soundscape?.setLevel(input.dataset.mix,Number(input.value));
$('#download-midi').onclick=()=>{const url=URL.createObjectURL(new Blob([encodeMidi(chapter)],{type:'audio/midi'}));const a=document.createElement('a');a.href=url;a.download=`endless-sea-chapter-${chapter}.mid`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function resetFlight(){const flying=flight.flying;flight=createFlight();flight.flying=flying;if(chapter===2)flight.y=190;keys.clear();initialized=false;updateMode();}
$('#chapter-select').onchange=e=>{
 chapter=Number(e.target.value);uniforms.uChapter.value=chapter;islands.visible=chapter===2;resetFlight();soundscape?.setChapter(chapter);
 $('#intro h1').innerHTML=chapter===2?'海的另一邊，<br><em>藏著一座島。</em>':'把世界留在身後。<br><em>向海平線飛去。</em>';
 $('#intro > p').innerHTML=chapter===2?'沿著淺藍色的岸線，飛過層疊的青山。<br>讓每一座島，成為路過的風景。':'沒有目的地，也不必趕路。<br>一架小飛機，一片無邊的海，和剛剛好的自由。';
 $('.scene-label > div').innerHTML=chapter===2?'THE QUIET ISLANDS<small>CHAPTER 02 · 沿著海岸飛行</small>':'THE OPEN WATER<small>25° 03′ N &nbsp; 121° 33′ E</small>';
 $('#flying-note').innerHTML=chapter===2?'沿著海岸，遇見另一種藍。<span>EVERY ISLAND HOLDS A LITTLE WONDER.</span>':'放慢一點，世界很遼闊。<span>LET THE HORIZON FIND YOU.</span>';
 $('[data-time="'+(chapter===2?'morning':'golden')+'"]').click();
};
const fullscreenButton=$('#fullscreen');
function syncFullscreen(){const active=!!document.fullscreenElement;fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenButton.setAttribute('aria-label',active?'退出全螢幕':'進入全螢幕');fullscreenButton.title=active?'退出全螢幕（Esc）':'進入全螢幕';}
fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();syncFullscreen();}catch{$('#sound-status').textContent='此瀏覽器無法進入全螢幕，可用 H 隱藏介面。';$('#settings-panel').hidden=false;}};
if(!document.fullscreenEnabled){fullscreenButton.disabled=true;fullscreenButton.title='此瀏覽器不支援全螢幕，可使用隱藏介面';}
document.addEventListener('fullscreenchange',syncFullscreen);syncFullscreen();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality));renderer.setSize(innerWidth,innerHeight);uniforms.uResolution.value.set(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#error').textContent='圖形連線暫時中斷，請重新整理以繼續飛行。';});
function animate(){
 requestAnimationFrame(animate);
 if(document.hidden)return;
 const dt=Math.min(clock.getDelta(),.05);
 updateFlight(flight,keys,dt);if(chapter===2)keepAboveTerrain(flight);updateMode();
 plane.position.set(flight.x,flight.y+Math.sin(flight.elapsed*1.2)*.13,flight.z);
 plane.rotation.set(flight.pitch,flight.heading,flight.bank,'YXZ');
 plane.userData.propeller.rotation.z+=dt*(flight.speed+20);
 yawQuaternion.setFromAxisAngle(up,flight.heading);
 cameraOffset.set(innerWidth<600?-1:-7.5,4.8,innerWidth<600?29:19).applyQuaternion(yawQuaternion).add(plane.position);
 lookTarget.set(0,3.8,-55).applyQuaternion(yawQuaternion).add(plane.position);
 if(!initialized){camera.position.copy(cameraOffset);initialized=true;}
 camera.position.lerp(cameraOffset,1-Math.exp(-dt*2.4));
 camera.up.set(Math.sin(flight.bank*.13),1,0);camera.lookAt(lookTarget);camera.updateMatrixWorld();
 uniforms.uTime.value=flight.elapsed;
 uniforms.uCamera.value.copy(camera.position);
 uniforms.uRotation.value.setFromMatrix4(camera.matrixWorld);
 uniforms.uMood.value+=(targetMood-uniforms.uMood.value)*(1-Math.exp(-dt*1.5));
 islands.userData.material.uniforms.mood.value=uniforms.uMood.value;
 const mood=uniforms.uMood.value;sun.color.setRGB(1,.91-Math.min(mood,1)*.12,.76-Math.min(mood,1)*.19);sun.intensity=3.2-Math.max(0,mood-1)*2;ambient.intensity=2.25-Math.max(0,mood-1)*.8;
 renderer.clear();renderer.render(backgroundScene,backgroundCamera);renderer.clearDepth();renderer.render(scene,camera);
 $('#altitude').innerHTML=`${Math.round(flight.y)} <small>M</small>`;
 $('#heading').textContent=`${String(Math.round(headingDegrees(flight.heading))%360).padStart(3,'0')}°`;
 $('#airspeed').innerHTML=`${Math.round(flight.speed)} <small>KT</small>`;
 if(soundscape&&soundOn)soundscape.update(flight,uniforms.uWind.value);
 frames++;fpsTime+=dt;
 if(fpsTime>1.5){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}
 canvas.dataset.ready='true';
}
updateMode();animate();
// Expose a read-only snapshot for diagnostics and functional browser checks.
window.endlessSea={getState:()=>({...flight,chapter,audio:soundscape?.snapshot()??null,renderer:'WebGL 2',mood:targetMood,wind:uniforms.uWind.value}),getRenderer:()=>renderer.info.render};
