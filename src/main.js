import './style.css';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from './ocean.js';
import { createDream } from './dream.js';
import { createTrails } from './trails.js';
import { createPlane } from './plane.js';
import { createJourney, advanceJourney, journeyState, setJourneyHour, selectJourneyChapter, moodAtHour } from './journey.js';
import { CHAPTERS } from './chapters.js';
import { RollingCounter, RollingInstrument } from './counter.js';
import { TiltController } from './tilt.js';
import { Soundscape } from './audio.js';
import { encodeMidi } from './score.js';
import { createIslands, disposeIslands } from './islands.js';
import { ISLANDS, islandsForChapter, terrainOrigin, keepAboveTerrain } from './terrain.js';
import { createFlight, updateFlight, headingDegrees } from './flight.js';

const $ = s => document.querySelector(s);
const canvas = $('#world');
const mobileInput=matchMedia('(pointer: coarse)').matches;
let steeringMode=mobileInput?'tilt':'keyboard';
const beatCounter=new RollingCounter($('#dream-beats'));
const altitudeDial=new RollingInstrument($('#altitude'));
const headingDial=new RollingInstrument($('#heading'),{digits:3,cycle:360});
const airspeedDial=new RollingInstrument($('#airspeed'));
if(mobileInput)document.body.classList.add('mobile-input');
const tilt=new TiltController(message=>{
 $('#tilt-status').textContent=message;
 $('#tilt-toggle').textContent=tilt.enabled?'關閉體感':'啟用體感';
 $('#tilt-toggle').setAttribute('aria-pressed',String(tilt.enabled));
 $('#tilt-calibrate').disabled=!tilt.neutral;
 if(flight.flying&&steeringMode==='tilt'){flight.autopilot=!(tilt.enabled&&tilt.neutral);updateMode();}
});
$('#tilt-toggle').onclick=async()=>{const button=$('#tilt-toggle');button.disabled=true;try{if(tilt.enabled){steeringMode='cruise';tilt.disable();flight.autopilot=true;updateMode();}else{steeringMode='tilt';await tilt.enable();}}finally{button.disabled=false;}};
$('#tilt-calibrate').onclick=()=>tilt.calibrate();
let renderer;
try {
 renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
} catch {
 $('#error').hidden=false;
 $('#error').textContent='這片海需要瀏覽器的 3D 圖形加速。請使用新版 Chrome、Edge 或 Safari，並開啟硬體加速後重新整理。';
 throw new Error('WebGL 2 is required');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight,false);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.autoClear=false;
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,15000);
const scene=new THREE.Scene();
const ambient=new THREE.HemisphereLight(0xd9e8ed,0x40626c,2.25);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffd9a3,3.2);sun.position.set(600,300,-1000);scene.add(sun);
const moonLight=new THREE.DirectionalLight(0xb5d5f5,0);scene.add(moonLight);
const plane=createPlane();scene.add(plane);
const trails=createTrails(scene);
const dream=createDream(scene);
let islands=createIslands();scene.add(islands);
const backgroundScene=new THREE.Scene();
const uniforms={uTime:{value:0},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},uCamera:{value:new THREE.Vector3()},uRotation:{value:new THREE.Matrix3()},uFov:{value:Math.tan(THREE.MathUtils.degToRad(26))},uMood:{value:1},uWind:{value:.8},uDayHours:{value:17},uChapter:{value:1},uIslands:{value:ISLANDS.map(i=>new THREE.Vector4(i.x,i.z,i.rx,i.rz))}};
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthTest:false,depthWrite:false}));ocean.frustumCulled=false;backgroundScene.add(ocean);
const backgroundCamera=new THREE.Camera();
let flight=createFlight();
const journey=createJourney();
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
 $('#mode-label').firstChild.textContent=!flight.flying?'準備出發':flight.autopilot?'自在巡航':tilt.enabled?'隨你傾斜':'自由飛行';

}
let noteTimer;
function showFlightNote(){clearTimeout(noteTimer);$('#flying-note').hidden=false;$('#flying-note').classList.remove('note-faded');noteTimer=setTimeout(()=>$('#flying-note').classList.add('note-faded'),6500);}
function startFlight(){if(flight.flying)return;flight.flying=true;document.body.classList.add('flying');showFlightNote();$('#intro').inert=true;$('#guide').close();updateMode();}
async function takeFlight(){startFlight();if(mobileInput){steeringMode='tilt';await tilt.enable();}}
$('#fly').onclick=takeFlight;
$('#guide-fly').onclick=()=>{if(flight.flying)$('#guide').close();else takeFlight();};
$('#help').onclick=()=>$('#guide').showModal();
$('#close-guide').onclick=()=>$('#guide').close();
$('#guide').addEventListener('click',e=>{if(e.target===$('#guide')){const b=$('#guide').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('#guide').close();}});
$('#settings').onclick=()=>{$('#settings-panel').hidden=!$('#settings-panel').hidden;};
$('.close-panel').onclick=()=>$('#settings-panel').hidden=true;
$('#quality').onchange=e=>{quality=Number(e.target.value);resize();};
$('#wind').oninput=e=>uniforms.uWind.value=Number(e.target.value);
$('#autopilot').onclick=async()=>{
 if(!flight.flying){steeringMode='cruise';startFlight();flight.autopilot=true;updateMode();return;}
 if(!flight.autopilot){steeringMode='cruise';flight.autopilot=true;tilt.pause();}
 else if(mobileInput){steeringMode='tilt';if(tilt.enabled){tilt.calibrate();flight.autopilot=!tilt.neutral;}else await tilt.enable();}
 else {steeringMode='keyboard';flight.autopilot=false;}
 updateMode();
};
for(const button of document.querySelectorAll('[data-time]'))button.onclick=()=>{
 const mood=button.dataset.time;setJourneyHour(journey,{morning:8,golden:17,blue:19.5,night:0}[mood]);targetMood={morning:0,golden:1,blue:2,night:3}[mood];
 document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('selected',b===button));
 $('#time-label').textContent={morning:'晨光',golden:'夕照',blue:'暮色',night:'星夜'}[mood];
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
window.addEventListener('blur',()=>{keys.clear();tilt.pause();});
document.addEventListener('visibilitychange',()=>{keys.clear();tilt.pause();clock.getDelta();if(soundscape)soundscape.visibility(document.hidden);});
$('#sound').onclick=async()=>{
 try{
 if(!soundscape){soundscape=new Soundscape(()=>journeyState(journey).elapsed);soundscape.setChapter(chapter);for(const input of document.querySelectorAll('[data-mix]'))soundscape.setLevel(input.dataset.mix,Number(input.value));}
 await soundscape.setEnabled(!soundOn);soundOn=soundscape.enabled;
 $('#sound').setAttribute('aria-label',soundOn?'關閉環境音':'開啟環境音');
 $('#sound').setAttribute('aria-pressed',String(soundOn));
 $('#sound-status').textContent=soundOn?'聲音已開啟':'點喇叭，聽聽海。';
 $('#sound').innerHTML=soundOn?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6"/></svg>';
 }catch{$('#sound-status').textContent='請再點一次喇叭。';}
};
for(const input of document.querySelectorAll('[data-mix]'))input.oninput=()=>soundscape?.setLevel(input.dataset.mix,Number(input.value));
$('#download-midi').onclick=()=>{const url=URL.createObjectURL(new Blob([encodeMidi(chapter)],{type:'audio/midi'}));const a=document.createElement('a');a.href=url;a.download=`endless-sea-chapter-${chapter}.mid`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function resetFlight(){const flying=flight.flying;flight=createFlight();flight.flying=flying;flight.y=CHAPTERS[chapter-1].altitude;keys.clear();tilt.pause();trails.reset();initialized=false;updateMode();}
let chapterNoticeTimer;
function applyChapter(next,automatic=false){
 if(!automatic){clearTimeout(chapterNoticeTimer);$('#chapter-notice').hidden=true;}
 chapter=next;const info=CHAPTERS[chapter-1];uniforms.uChapter.value=chapter;
 scene.remove(islands);disposeIslands(islands);islands=createIslands(chapter);islands.visible=chapter>1;scene.add(islands);
 resetFlight();soundscape?.setChapter(chapter);$('#chapter-select').value=String(chapter);
 $('#intro h1').innerHTML=info.title;$('#intro > p').innerHTML=info.description;
 $('#flying-note').textContent=info.note;if(flight.flying&&!automatic)showFlightNote();if(automatic){clearTimeout(noteTimer);$('#flying-note').hidden=true;}
 if(automatic){$('#chapter-notice').textContent=`0${chapter} · ${info.name}`;$('#chapter-notice').hidden=false;clearTimeout(chapterNoticeTimer);chapterNoticeTimer=setTimeout(()=>$('#chapter-notice').hidden=true,6500);}
}
$('#chapter-select').onchange=e=>{selectJourneyChapter(journey,Number(e.target.value));applyChapter(Number(e.target.value));};
const fullscreenButton=$('#fullscreen');
function syncFullscreen(){const active=!!document.fullscreenElement;fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenButton.setAttribute('aria-label',active?'退出全螢幕':'進入全螢幕');fullscreenButton.title=active?'退出全螢幕（Esc）':'進入全螢幕';}
fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();syncFullscreen();}catch{$('#sound-status').textContent='此瀏覽器無法進入全螢幕，可用 H 隱藏介面。';$('#settings-panel').hidden=false;}};
if(!document.fullscreenEnabled){fullscreenButton.disabled=true;fullscreenButton.title='此瀏覽器不支援全螢幕，可使用隱藏介面';}
document.addEventListener('fullscreenchange',syncFullscreen);syncFullscreen();
function resize(){
 const bounds=canvas.getBoundingClientRect(),width=Math.max(1,Math.round(bounds.width)),height=Math.max(1,Math.round(bounds.height));
 camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality));renderer.setSize(width,height,false);uniforms.uResolution.value.set(width,height);
}
window.addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
document.addEventListener('fullscreenchange',resize);
new ResizeObserver(resize).observe(canvas);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#error').textContent='圖形連線暫時中斷，請重新整理以繼續飛行。';});
function animate(){
 requestAnimationFrame(animate);
 if(document.hidden)return;
 const elapsed=clock.getDelta();const dt=Math.min(elapsed,.05);
 advanceJourney(journey,elapsed);const day=journeyState(journey);uniforms.uDayHours.value=day.hours;targetMood=moodAtHour(day.hours);
 if(day.chapter!==chapter)applyChapter(day.chapter,true);
 updateFlight(flight,keys,dt,flight.flying&&tilt.enabled&&steeringMode==='tilt'&&!flight.autopilot?tilt.output:{});if(chapter>1)keepAboveTerrain(flight,chapter);updateMode();
 if(chapter>1){const origin=terrainOrigin(flight.x,flight.z);islands.position.set(origin.x,0,origin.z);islandsForChapter(chapter).forEach((i,index)=>uniforms.uIslands.value[index].set(i.x+origin.x,i.z+origin.z,i.rx,i.rz));}
 plane.position.set(flight.x,flight.y+Math.sin(flight.elapsed*1.2)*.13,flight.z);
 plane.rotation.set(flight.pitch,flight.heading,flight.bank,'YXZ');

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
 const mood=uniforms.uMood.value;sun.position.set(-Math.cos((day.hours-6)/24*Math.PI*2)*680,Math.sin((day.hours-6)/24*Math.PI*2)*550,-1000);sun.color.setRGB(1,.91-Math.min(mood,1)*.12,.76-Math.min(mood,1)*.19);sun.intensity=Math.max(.08,3.2-Math.max(0,mood-1)*1.55);ambient.intensity=Math.max(.28,2.25-Math.max(0,mood-1)*.98);
 moonLight.position.set(-sun.position.x,-sun.position.y*.72,-1000);moonLight.intensity=THREE.MathUtils.clamp(mood-1.4,0,1)*.9;
 islands.userData.material.uniforms.sunlight.value.copy(sun.position).normalize();
 islands.userData.material.uniforms.time.value=flight.elapsed;
 plane.userData.animate(flight.elapsed,sun.position,mood);
 trails.update(plane,camera,dt,flight.bank,mood);
 dream.update(camera,flight.elapsed,chapter,mood,renderer.getPixelRatio());
 renderer.clear();renderer.render(backgroundScene,backgroundCamera);renderer.clearDepth();renderer.render(scene,camera);
 beatCounter.update(day.beats);
 const hour=Math.floor(day.hours),minute=Math.floor((day.hours-hour)*60);
 $('#world-time').textContent=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} · 第 ${day.day} 日`;
 const phase=day.hours<5||day.hours>=20?'night':day.hours<7?'blue':day.hours<16?'morning':day.hours<18?'golden':'blue';
 document.querySelectorAll('[data-time]').forEach(button=>button.classList.toggle('selected',button.dataset.time===phase));
 $('#time-label').textContent=day.hours<5||day.hours>=20?'星夜':day.hours<7?'曙光':day.hours<16?'日光':day.hours<18?'夕照':'暮色';
 altitudeDial.update(flight.y,elapsed);
 headingDial.update(headingDegrees(flight.heading),elapsed);
 airspeedDial.update(flight.speed,elapsed);
 if(soundscape&&soundOn)soundscape.update(flight,uniforms.uWind.value);
 frames++;fpsTime+=dt;
 if(fpsTime>1.5){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}
 canvas.dataset.ready='true';
}
resize();updateMode();animate();
// Expose a read-only snapshot for diagnostics and functional browser checks.
window.endlessSea={getState:()=>({...flight,chapter,steeringMode,wake:trails.snapshot(),dream:dream.snapshot(),journey:journeyState(journey),tilt:tilt.snapshot(),audio:soundscape?.snapshot()??null,renderer:'WebGL 2',mood:targetMood,wind:uniforms.uWind.value}),getRenderer:()=>renderer.info.render,getResources:()=>({...renderer.info.memory})};
