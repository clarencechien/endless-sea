import * as THREE from 'three/webgpu';
export async function probe(){
 const info={secureContext:isSecureContext,webgpuAPI:!!navigator.gpu,webgpuAdapter:false,webgl2API:typeof WebGL2RenderingContext!=='undefined',webgl2Context:null,gpu:null,adapter:null,deviceMemoryGB:navigator.deviceMemory??null,hardwareConcurrency:navigator.hardwareConcurrency??null,touch:matchMedia('(pointer: coarse)').matches,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],userAgent:navigator.userAgent,refreshRateEstimateHz:null};
 try{if(navigator.gpu){const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});info.webgpuAdapter=!!adapter;Object.defineProperty(info,'_adapter',{value:adapter,enumerable:false});info.adapter=adapter?.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,description:adapter.info.description}:null;}}catch(e){info.adapterError=String(e);}
 return info;
}
export async function createBackend(capabilities,forced,onLoss,errors){
 const candidates=forced==='webgl2'?['webgl2']:capabilities.webgpuAdapter?['webgpu','webgl2']:['webgl2'];
 if(forced==='unsupported')throw new Error('測試模式：停用所有 3D 後端。');
 for(const backend of candidates){
  if(backend==='webgl2'&&!capabilities.webgl2API)continue;
  const canvas=document.createElement('canvas');canvas.id='forest-world';canvas.setAttribute('aria-label','鳥在森林間飛行的 3D 場景');document.querySelector('#viewport').replaceChildren(canvas);
  let renderer,device;
  try{
   const options={canvas,forceWebGL:backend==='webgl2',antialias:false,powerPreference:'low-power',trackTimestamp:true};
   if(backend==='webgpu'){
    const adapter=capabilities._adapter;
    device=await adapter.requestDevice({requiredFeatures:['timestamp-query','core-features-and-limits','float32-filterable'].filter(feature=>adapter.features.has(feature))});
    options.device=device;
    // Validate work submission before creating Three pipelines/error scopes. Some
    // environments expose an adapter whose driver cannot execute even a clear.
    canvas.width=canvas.height=4;const context=canvas.getContext('webgpu');
    context.configure({device,format:navigator.gpu.getPreferredCanvasFormat()});
    const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
    pass.end();device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();context.unconfigure();capabilities.webgpuSubmission=true;
   }
   renderer=new THREE.WebGPURenderer(options);
   await renderer.init();if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend)throw new Error('WebGPU initialization fell back internally');
   if(backend==='webgl2'){capabilities.webgl2Context=true;const gl=renderer.backend.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');capabilities.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;}
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.setClearColor(0xa4b9a2,1);
   renderer.shadowMap.enabled=true;renderer.info.autoReset=false;
   let disposed=false;
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)onLoss('WebGL context lost');});
   renderer.backend.device?.lost.then(info=>{if(!disposed)onLoss(`WebGPU device lost: ${info.reason}`);});
   return {renderer,backend,canvas,dispose(){disposed=true;renderer.dispose();canvas.remove();}};
  }catch(error){errors.push({stage:`init-${backend}`,message:String(error)});try{renderer?.dispose();device?.destroy();}catch{}canvas.remove();}
 }
 throw new Error('此瀏覽器暫時無法啟動 3D。請開啟硬體加速，或試用新版 Chrome、Edge、Safari。');
}
