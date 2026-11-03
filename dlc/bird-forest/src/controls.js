export function createControls({onPause,onReset,motion}){
 const keys=new Set(),drag={x:0,y:0},look={yaw:0,pitch:0};let pointer=null,origin=null,boost=false;
 const canvas=document.querySelector('#forest-world'),gust=document.querySelector('#gust');
 function clear(){keys.clear();look.yaw=look.pitch=drag.x=drag.y=0;pointer=null;boost=false;motion?.recenter();gust.setAttribute('aria-pressed','false');}
 window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&document.querySelector('dialog[open]'))return;
  if(e.code==='Escape'){e.preventDefault();clear();onPause();return;}
  if(document.querySelector('dialog[open]')||e.target.closest('input,select,textarea'))return;
  if((e.code==='Space'||e.code==='Enter')&&e.target.closest('button'))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='KeyR')onReset();keys.add(e.code);
 });
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);
 // No virtual stick or direction buttons. Drag remains available if permission is denied.
 canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});if(pointer!==null)return;pointer=e.pointerId;origin={x:e.clientX,y:e.clientY};canvas.setPointerCapture(pointer);});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const x=(e.clientX-origin.x)/90,y=(origin.y-e.clientY)/90;if(motion?.active){look.yaw=Math.max(-.8,Math.min(.8,-x*.35));look.pitch=Math.max(-.3,Math.min(.3,-y*.2));}else{drag.x=Math.max(-1,Math.min(1,x));drag.y=Math.max(-1,Math.min(1,y));}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;drag.x=drag.y=look.yaw=look.pitch=0;}});
 gust.addEventListener('pointerdown',e=>{gust.setPointerCapture(e.pointerId);boost=true;gust.setAttribute('aria-pressed','true');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])gust.addEventListener(event,()=>{boost=false;gust.setAttribute('aria-pressed','false');});
 return {clear,look,read(dt){const tilt=motion?.read(dt)||{turn:0,lift:0};return {turn:Math.max(-1,Math.min(1,Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+drag.x+tilt.turn)),lift:Math.max(-1,Math.min(1,Number(keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyS')||keys.has('ArrowDown'))+drag.y+tilt.lift)),boost:boost||keys.has('ShiftLeft')||keys.has('ShiftRight')};}};
}
