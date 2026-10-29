const clamp=v=>Math.max(-1,Math.min(1,v));
const difference=(a,b)=>((a-b+540)%360)-180;
const axis=value=>Math.abs(value)<3?0:clamp(Math.sign(value)*(Math.abs(value)-3)/22);
export function tiltAxes(sample,neutral,screenAngle=0){
 const beta=difference(sample.beta,neutral.beta),gamma=difference(sample.gamma,neutral.gamma),angle=screenAngle*Math.PI/180;
 return {roll:axis(gamma*Math.cos(angle)+beta*Math.sin(angle)),pitch:axis(beta*Math.cos(angle)-gamma*Math.sin(angle))};
}
export class TiltController {
 constructor(onStatus){this.onStatus=onStatus;this.enabled=false;this.sample=null;this.neutral=null;this.output={roll:0,pitch:0};this.angle=0;this.receive=this.receive.bind(this);}
 async enable(){
  if(this.enabled){this.calibrate();return;}
  if(!window.isSecureContext||!window.DeviceOrientationEvent){this.onStatus('此裝置無法使用體感，已為你開啟巡航。');return;}
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){this.onStatus('未取得體感權限，先自在巡航。');return;}
   this.enabled=true;this.sample=null;this.neutral=null;this.output={roll:0,pitch:0};
   window.addEventListener('deviceorientation',this.receive);
   this.onStatus('握好手機，正在校準。');
   this.timeout=setTimeout(()=>{if(!this.sample){this.disable();this.onStatus('未收到體感訊號，先自在巡航。');}},5000);
  }catch{this.onStatus('體感暫時無法使用，先自在巡航。');}
 }
 receive(event){
  if(!this.enabled||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
  this.sample={beta:event.beta,gamma:event.gamma};
  const angle=screen.orientation?.angle??window.orientation??0;
  if(!this.neutral||angle!==this.angle){this.angle=angle;this.calibrate();}
  clearTimeout(this.timeout);
  const next=tiltAxes(this.sample,this.neutral,angle);
  this.output.roll+=(next.roll-this.output.roll)*.22;this.output.pitch+=(next.pitch-this.output.pitch)*.22;
  if(next.roll===0&&Math.abs(this.output.roll)<.02)this.output.roll=0;
  if(next.pitch===0&&Math.abs(this.output.pitch)<.02)this.output.pitch=0;
 }
 calibrate(){if(!this.sample)return;this.neutral={...this.sample};this.output={roll:0,pitch:0};this.onStatus('輕輕傾斜，就能轉向與升降。');}
 disable(){clearTimeout(this.timeout);window.removeEventListener('deviceorientation',this.receive);this.enabled=false;this.neutral=null;this.sample=null;this.output={roll:0,pitch:0};this.onStatus('體感已關閉，讓飛機帶你走。');}
 pause(){this.neutral=null;this.output={roll:0,pitch:0};}
 snapshot(){return {enabled:this.enabled,calibrated:!!this.neutral,...this.output};}
}
