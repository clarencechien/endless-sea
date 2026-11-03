import * as THREE from 'three/webgpu';
import {texture} from 'three/tsl';
import {createBackend,probe} from './backend.js';
import {createScene} from './scene.js';
import {createUnderstory} from './understory.js';
import {createForest} from './forest.js';
import {createControls} from './controls.js';
import {Quality,renderSize} from './quality.js';
import {TREE_ASSET} from './tree-asset.js';
import {refreshEstimate} from './boot-timing.js';
import {Telemetry} from './telemetry.js';
import {SEED,TICK,createBirdState,makeGrid,nearby,floorHeight,stepBird,routePose,PATHS} from './world.js';
const $=s=>document.querySelector(s);
async function loadWorld(){
 const worker=new Worker(new URL('./world-worker.js',import.meta.url),{type:'module'});
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{worker.terminate();reject(new Error('森林載入逾時，請重試。'));},30000);worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data);};worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(new Error(e.message));};worker.postMessage({seed:SEED,url:new URL(TREE_ASSET,location.href).href});});
}
export async function startForest({profile,onPause,status,motion}){
 const bootStart=performance.now(),telemetry=new Telemetry(),quality=new Quality();quality.set(profile);
 const capabilities=await probe();$('#device-info').textContent=JSON.stringify(capabilities,null,2);
 const params=new URLSearchParams(location.search),forced=params.get('backend');
 let paused=true,lost=false,simulation=0,state=createBirdState(),cameraReady=false,benchmarkPath=null,routeTime=0,lastRouteSample=0;
 const onLoss=message=>{if(lost)return;lost=true;paused=true;telemetry.errors.push({stage:'device-lost',message});telemetry.cancel(message);$('#error').hidden=false;$('#error-message').textContent='圖形連線中斷，飛行已暫停。可以先下載診斷，再重新啟動。';};
 status('整理枝葉與光線…');const world=await loadWorld(),grid=makeGrid(world.trees);
 let backend=await createBackend(capabilities,forced,onLoss,telemetry.errors);
 let view=createScene(world.trees),forest;
 try{forest=await createForest(backend.renderer,view.scene,world.trees,world.types);}
 catch(error){if(backend.backend!=='webgpu')throw error;telemetry.errors.push({stage:'gpu-scene',message:String(error)});backend.dispose();lost=false;$('#error').hidden=true;backend=await createBackend(capabilities,'webgl2',onLoss,telemetry.errors);view=createScene(world.trees);forest=await createForest(backend.renderer,view.scene,world.trees,world.types);}
 const {renderer}=backend,camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.15,720);
 const target=new THREE.RenderTarget(1,1,{type:THREE.UnsignedByteType}),present=new THREE.QuadMesh(new THREE.MeshBasicNodeMaterial({colorNode:texture(target.texture)}));
 const controls=createControls({onPause,onReset:reset,motion}),touch=capabilities.touch||params.get('touch')==='1',understory=createUnderstory(view.scene,world.trees),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const output=new THREE.Vector2(),internal=new THREE.Vector2(),desired=new THREE.Vector3(),aim=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 let qualityEpoch=0,last=0,frame=0,lastHud=0,elapsed=0,gpuMS=null,pendingGPU=false,firstFrameMS=null;
 const gpuAvailable=renderer.hasFeature('timestamp-query');
 function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(w,h,false);renderer.getDrawingBufferSize(output);internal.set(...renderSize(w,h,devicePixelRatio,quality.scale).internal);target.setSize(internal.x,internal.y);forest.update(camera,quality,elapsed,true);}
 function reset(){state=createBirdState();simulation=0;cameraReady=false;controls.clear();telemetry.cancel('reset');benchmarkPath=null;}
 function focus(){if(!$('#panel').open)backend.canvas.focus({preventScroll:true});}
 function stopBenchmark(reason='manual takeover'){telemetry.cancel(reason);benchmarkPath=null;$('#takeover').hidden=true;}
 function pause(value){paused=value;controls.clear();last=0;simulation=0;if(value)stopBenchmark('user pause');else focus();}
 function visit(path){if(!PATHS.includes(path))throw new Error('Unknown flight location');stopBenchmark('location change');state={...createBirdState(),...routePose(path,6)};cameraReady=false;pause(false);}
 function setQuality(p){stopBenchmark('quality change');quality.set(p);qualityEpoch++;gpuMS=null;telemetry.recent=[];last=0;resize();}

 function benchmark(path,options={}){if(!PATHS.includes(path))throw new Error('Unknown benchmark route');controls.clear();state=createBirdState();benchmarkPath=path;routeTime=0;lastRouteSample=0;cameraReady=false;telemetry.start(path,performance.now(),options);paused=false;last=0;simulation=0;$('#takeover').hidden=false;focus();}
 function dimensions(){return {viewportCSS:[innerWidth,innerHeight],dpr:devicePixelRatio,outputPixels:[output.x,output.y],internalPixels:[internal.x,internal.y],effectiveScale:internal.x/output.x,pixelBudget:1400000,upscaling:'bilinear spatial upscale; no TAA'};}
 function report(){return telemetry.report({buildSHA:__BUILD_SHA__,buildDirty:__BUILD_DIRTY__,upstreamSHA:'500113d7b651d2eb96392ce87c96330bdec25e15',seed:SEED,deviceCategory:touch?'touch device (unverified class)':'keyboard device (unverified class)',capabilities,backend:backend.backend,pipeline:'offline upstream cluster DAG cuts + instancing + side-view impostors',quality:quality.snapshot(),resolution:dimensions(),scene:{...forest.stats(),...understory.stats()},input:motion?.snapshot(),flight:{paused,mode:telemetry.run?'benchmark':'manual',route:benchmarkPath,position:{x:state.x,y:state.y,z:state.z},edgeAssist:state.edgeAssist,focusedElement:document.activeElement?.id||null},render:{...renderer.info.render},initialLoad:{startToFirstFrameSubmitMS:firstFrameMS,navigationToStartMS:bootStart},features:{gpuDrivenClusterCulling:false,HZB:false,softwareRasterizer:false,TAA:false,grass:false,understory:true,wind:true,lightShafts:quality.scale>=.75&&quality.profile!=='Low',relief:false,shadows:quality.shadows,treeShadowRange:24},performanceGate:'This revision needs a fresh physical-device benchmark; prior phone trace documented in reports' });}
 function updateCamera(dt){
  rotation.setFromAxisAngle(up,state.yaw+controls.look.yaw);position.set(state.x,state.y,state.z);
  const rush=Math.max(0,Math.min(1,(state.speed-11)/11));
  const fov=reducedMotion?72:70+rush*12;camera.fov+=(fov-camera.fov)*(1-Math.exp(-dt*3));camera.updateProjectionMatrix();
  desired.set(0,1.25+controls.look.pitch*4,5.0+rush*1.2).applyQuaternion(rotation).add(position);
  desired.y=Math.max(desired.y,floorHeight(desired.x,desired.z)+.8);
  // Sweep the chase camera toward its desired point; shorten the boom at trunks.
  for(let i=1;i<=7;i++){const p=position.clone().lerp(desired,i/7);if(nearby(grid,p.x,p.z).some(t=>p.y<t.y+t.height*.88&&Math.hypot(p.x-t.x,p.z-t.z)<t.radius+.4)){desired.copy(position).lerp(desired,Math.max(0,(i-1)/7));desired.y+=.5;break;}}
  if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,1-Math.exp(-dt*7));
  aim.set(0,.7,-8).applyQuaternion(rotation).add(position);camera.lookAt(aim);if(!reducedMotion)camera.rotateZ(-state.bank*.12);camera.updateMatrixWorld();
 }
 function hud(now){
  const s=telemetry.snapshot(),f=v=>v===null?'N/A':v.toFixed(1);
  $('#fps').textContent=s.averageFPS===null?'—':Math.round(s.averageFPS);$('#frame-stats').textContent=`1% low ${f(s.onePercentLow)} · median ${f(s.medianMS)} · p95 ${f(s.p95MS)} ms`;
  $('#gpu-stats').textContent=`GPU ${f(s.gpuMS)} · JS ${f(s.cpuJSMS)} ms`;
  $('#render-stats').textContent=`${backend.backend==='webgpu'?'WebGPU':'WebGL2'} · ${quality.profile} · ${Math.round(internal.x/output.x*100)}% · ${internal.x}×${internal.y}`;
  const st=forest.stats();$('#scene-stats').textContent=`${st.visibleInstances} 樹 · ${st.impostors} 遠景 · ${Math.round(renderer.info.render.triangles/1000)}k 三角面`;
  $('#flight-state').textContent=`${Math.round(state.y-floorHeight(state.x,state.z))} M · ${Math.round(state.speed)} M/S · ${String(Math.round(((-state.yaw*180/Math.PI)%360+360)%360)).padStart(3,'0')}°`;
  const run=telemetry.run;$('#run-status').textContent=run?`自動試飛 · ${(now-run.started)/1000<run.warmup?'暖機':'記錄'} ${Math.max(0,Math.ceil(run.warmup+run.duration-(now-run.started)/1000))} 秒`:state.edgeAssist>.1?'風把你帶回林間':telemetry.lastRun?(telemetry.lastRun.interrupted?'測試已中止':'測試完成 · 設定中可匯出'):'';
 }
 function tick(now){
  requestAnimationFrame(tick);if(lost||document.hidden){last=0;return;}
  const interval=last?now-last:0;last=now;if(paused)return;
  const begin=performance.now(),dt=Math.min(interval/1000,.1);elapsed+=dt;
  const input=controls.read(dt||TICK);if(telemetry.run&&(Math.abs(input.turn)>.15||Math.abs(input.lift)>.15||input.boost))stopBenchmark('manual input');
  if(benchmarkPath&&telemetry.run){
   routeTime=(now-telemetry.run.started)/1000;
   const t=benchmarkPath==='pause-resume'?Math.max(0,routeTime-(routeTime>25?Math.min(2,routeTime-25):0)):routeTime;
   Object.assign(state,routePose(benchmarkPath,t));state.time=t;if(benchmarkPath==='pause-resume'&&routeTime>25&&routeTime<27)state.speed=0;
   if(routeTime-lastRouteSample>=.2){lastRouteSample=routeTime;telemetry.run.route.push({t:routeTime,x:state.x,y:state.y,z:state.z,yaw:state.yaw});}
  }else{benchmarkPath=null;simulation+=dt;let steps=0;while(simulation>=TICK&&steps++<6){stepBird(state,input,grid);simulation-=TICK;}}
  view.update(state,quality);updateCamera(dt||TICK);forest.update(camera,quality,elapsed);understory.update(state,camera,quality,elapsed);renderer.info.reset();
  try{renderer.setRenderTarget(target);renderer.render(view.scene,camera);renderer.setRenderTarget(null);present.render(renderer);}
  catch(error){onLoss(String(error));return;}
  if(firstFrameMS===null){firstFrameMS=performance.now()-bootStart;status('森林已就緒。');}
  if(gpuAvailable&&!pendingGPU&&frame%15===0){pendingGPU=true;const epoch=qualityEpoch;renderer.resolveTimestampsAsync('render').then(ms=>{if(epoch===qualityEpoch)gpuMS=Number.isFinite(ms)&&ms>0?ms:null;}).catch(()=>{if(epoch===qualityEpoch)gpuMS=null;}).finally(()=>pendingGPU=false);}
  if(interval>0){telemetry.add(now,interval,performance.now()-begin,gpuMS,{scale:quality.scale,far:quality.far});if(quality.observe(interval,gpuMS)){resize();}}
  if(!telemetry.run){benchmarkPath=null;$('#takeover').hidden=true;}
  frame++;
  if(now-lastHud>400){lastHud=now;hud(now);}
 }
 function changed(){resize();controls.clear();last=0;simulation=0;quality.reset();}
 window.addEventListener('resize',changed);window.visualViewport?.addEventListener('resize',changed);
 document.addEventListener('visibilitychange',()=>{controls.clear();last=0;simulation=0;quality.reset();if(document.hidden)stopBenchmark('background visibility change');});
 document.addEventListener('fullscreenchange',changed);
 window.addEventListener('error',e=>telemetry.errors.push({stage:'window',message:e.message}));
 resize();updateCamera(TICK);forest.update(camera,quality,0,true);paused=false;
 window.birdForest={getState:()=>({...state,paused,backend:backend.backend,frame,mode:telemetry.run?'benchmark':'manual',motion:motion?.snapshot(),cameraFOV:camera.fov}),getStats:()=>({...forest.stats(),...understory.stats(),...dimensions(),quality:quality.snapshot(),resources:{...renderer.info.memory}}),report,benchmark,pause,reset,visit,stopBenchmark,quality:setQuality};
 refreshEstimate.then(hz=>{capabilities.refreshRateEstimateHz=hz;$('#device-info').textContent=JSON.stringify(capabilities,null,2);});
 requestAnimationFrame(tick);
 return {pause,reset,benchmark,report,visit,stopBenchmark,focus,quality:setQuality};
}
