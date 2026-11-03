export function createControls({onPause,onReset}){
 const keys=new Set(),stick={x:0,y:0},held={up:false,down:false},look={yaw:0,pitch:0};let stickPointer=null,lookPointer=null,origin=null;
 const joystick=document.querySelector('#stick'),nub=joystick.querySelector('i'),lookZone=document.querySelector('#look-zone');
 function clear(){keys.clear();look.yaw=look.pitch=0;stick.x=stick.y=0;held.up=held.down=false;nub.style.transform='translate(0,0)';stickPointer=lookPointer=null;}
 window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&document.querySelector('dialog[open]'))return;
  if(e.code==='Escape'){e.preventDefault();clear();onPause();return;}
  if(e.target.closest('input,select,textarea,dialog'))return;
  if((e.code==='Space'||e.code==='Enter')&&e.target.closest('button'))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='KeyR')onReset();keys.add(e.code);
 });
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);
 joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);move(e);});
 function move(e){if(e.pointerId!==stickPointer)return;const r=joystick.getBoundingClientRect(),x=(e.clientX-r.x-r.width/2)/38,y=(e.clientY-r.y-r.height/2)/38,n=Math.max(1,Math.hypot(x,y));stick.x=x/n;stick.y=y/n;nub.style.transform=`translate(${stick.x*30}px,${stick.y*30}px)`;}
 joystick.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stickPointer){stickPointer=null;stick.x=stick.y=0;nub.style.transform='translate(0,0)';}});
 for(const name of ['up','down']){const b=document.querySelector(`#${name}`);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);held[name]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>held[name]=false);}
 lookZone.addEventListener('pointerdown',e=>{if(lookPointer!==null)return;lookPointer=e.pointerId;origin={x:e.clientX,y:e.clientY};lookZone.setPointerCapture(e.pointerId);});
 lookZone.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;look.yaw=Math.max(-.8,Math.min(.8,(e.clientX-origin.x)*.004));look.pitch=Math.max(-.35,Math.min(.35,(e.clientY-origin.y)*.003));});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])lookZone.addEventListener(event,e=>{if(e.pointerId===lookPointer){lookPointer=null;look.yaw=look.pitch=0;}});
 return {clear,look,read(){return {turn:Math.max(-1,Math.min(1,Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x)),lift:Math.max(-1,Math.min(1,Number(keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp')||held.up)-Number(keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyS')||keys.has('ArrowDown')||held.down)-stick.y)),boost:keys.has('ShiftLeft')||keys.has('ShiftRight')};}};
}
