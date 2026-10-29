import './style.css';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from './ocean.js';
import { createPlane } from './plane.js';
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
const backgroundScene=new THREE.Scene();
const uniforms={uTime:{value:0},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},uCamera:{value:new THREE.Vector3()},uRotation:{value:new THREE.Matrix3()},uFov:{value:Math.tan(THREE.MathUtils.degToRad(26))},uMood:{value:1},uWind:{value:.8}};
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthTest:false,depthWrite:false}));ocean.frustumCulled=false;backgroundScene.add(ocean);
const backgroundCamera=new THREE.Camera();
let flight=createFlight();
const keys=new Set();
let targetMood=1,quality=1.5;
let audioContext,audioGain,engineOsc,windGain,soundOn=false;
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
 if(k==='r'){const wasFlying=flight.flying;flight=createFlight();flight.flying=wasFlying;initialized=false;updateMode();}
 keys.add(k);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();clock.getDelta();if(audioContext)document.hidden?audioContext.suspend():audioContext.resume();});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));
}
function setupAudio(){
 audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
 const buffer=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate),data=buffer.getChannelData(0);let last=0;
 for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.015;data[i]=last*3;}
 const wind=audioContext.createBufferSource();wind.buffer=buffer;wind.loop=true;
 const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;windGain=audioContext.createGain();windGain.gain.value=.35;wind.connect(filter).connect(windGain).connect(audioGain);wind.start();
 engineOsc=audioContext.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=44;
 const engineFilter=audioContext.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=170;const engineGain=audioContext.createGain();engineGain.gain.value=.035;engineOsc.connect(engineFilter).connect(engineGain).connect(audioGain);engineOsc.start();
}
$('#sound').onclick=async()=>{
 try{
 if(!audioContext)setupAudio();await audioContext.resume();soundOn=!soundOn;audioGain.gain.setTargetAtTime(soundOn?.55:0,audioContext.currentTime,.5);
 $('#sound').setAttribute('aria-label',soundOn?'關閉環境音':'開啟環境音');
 $('#sound').innerHTML=soundOn?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6"/></svg>';
 }catch{$('#sound').title='此瀏覽器無法啟動環境音';}
};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,quality));renderer.setSize(innerWidth,innerHeight);uniforms.uResolution.value.set(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#error').textContent='圖形連線暫時中斷，請重新整理以繼續飛行。';});
function animate(){
 requestAnimationFrame(animate);
 if(document.hidden)return;
 const dt=Math.min(clock.getDelta(),.05);
 updateFlight(flight,keys,dt);updateMode();
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
 const mood=uniforms.uMood.value;sun.color.setRGB(1,.91-Math.min(mood,1)*.12,.76-Math.min(mood,1)*.19);sun.intensity=3.2-Math.max(0,mood-1)*2;ambient.intensity=2.25-Math.max(0,mood-1)*.8;
 renderer.clear();renderer.render(backgroundScene,backgroundCamera);renderer.clearDepth();renderer.render(scene,camera);
 $('#altitude').innerHTML=`${Math.round(flight.y)} <small>M</small>`;
 $('#heading').textContent=`${String(Math.round(headingDegrees(flight.heading))%360).padStart(3,'0')}°`;
 $('#airspeed').innerHTML=`${Math.round(flight.speed)} <small>KT</small>`;
 if(engineOsc&&soundOn)engineOsc.frequency.setTargetAtTime(30+flight.speed*.17,audioContext.currentTime,.2);
 frames++;fpsTime+=dt;
 if(fpsTime>1.5){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}
 canvas.dataset.ready='true';
}
updateMode();animate();
// Expose a read-only snapshot for diagnostics and functional browser checks.
window.endlessSea={getState:()=>({...flight,renderer:'WebGL 2',mood:targetMood,wind:uniforms.uWind.value}),getRenderer:()=>renderer.info.render};
