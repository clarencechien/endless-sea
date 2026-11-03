const clamp=v=>Math.max(-1,Math.min(1,v));
const difference=(a,b)=>((a-b+540)%360)-180;
const axis=v=>Math.abs(v)<2.5?0:clamp(Math.sign(v)*(Math.abs(v)-2.5)/22);
export function tiltAxes(sample,neutral,angle=0){
 const b=difference(sample.beta,neutral.beta),g=difference(sample.gamma,neutral.gamma),r=angle*Math.PI/180;
 return {turn:axis(g*Math.cos(r)+b*Math.sin(r)),lift:axis(b*Math.cos(r)-g*Math.sin(r))};
}
// Permission is requested directly from the start/retry click, before loading 3D.
export class MotionControl {
 constructor(onStatus=()=>{}){this.onStatus=onStatus;this.enabled=false;this.neutral=null;this.sample=null;this.status='idle';this.output={turn:0,lift:0};this.receive=this.receive.bind(this);}
 tell(status,text){this.status=status;this.onStatus(text,status);}
 async enable(){
  if(this.enabled){this.recenter();return;}
  if(!isSecureContext||!window.DeviceOrientationEvent){this.tell('unavailable','體感暫不可用，拖曳畫面也能飛。');return;}
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){this.tell('denied','未開啟體感，拖曳畫面轉向與升降。');return;}
   this.enabled=true;this.recenter();window.addEventListener('deviceorientation',this.receive);
   this.tell('waiting','握得舒服，輕輕傾斜。');
   clearTimeout(this.timeout);this.timeout=setTimeout(()=>{if(!this.sample){this.disable();this.tell('unavailable','未收到體感，拖曳畫面也能飛。');}},4000);
  }catch{this.tell('denied','體感暫不可用，拖曳畫面也能飛。');}
 }
 receive(e){
  if(!this.enabled||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
  if(this.lastSample&&performance.now()-this.lastSample>1200)this.neutral=null;this.sample={beta:e.beta,gamma:e.gamma};this.lastSample=performance.now();
  const angle=screen.orientation?.angle??window.orientation??0;
  if(!this.neutral||angle!==this.angle){this.neutral={...this.sample};this.angle=angle;this.output={turn:0,lift:0};this.tell('active','輕輕傾斜，隨風轉向。');}
  clearTimeout(this.timeout);
 }
 read(dt=1/60){
  if(!this.enabled||!this.neutral||performance.now()-this.lastSample>1200){this.output={turn:0,lift:0};if(this.enabled&&this.neutral&&this.status!=='stale')this.tell('stale','體感訊號暫停，拖曳畫面也能飛。');return this.output;}
  const next=tiltAxes(this.sample,this.neutral,this.angle),ease=1-Math.exp(-dt*9);
  this.output.turn+=(next.turn-this.output.turn)*ease;this.output.lift+=(next.lift-this.output.lift)*ease;return this.output;
 }
 recenter(){this.neutral=null;this.sample=null;this.output={turn:0,lift:0};}
 disable(){clearTimeout(this.timeout);window.removeEventListener('deviceorientation',this.receive);this.enabled=false;this.recenter();}
 get active(){return this.enabled&&!!this.neutral&&performance.now()-this.lastSample<=1200;}
 snapshot(){return {enabled:this.enabled,calibrated:!!this.neutral,status:this.status,...this.output};}
}
