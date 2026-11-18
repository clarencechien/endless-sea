// Express the device's current screen normal in its initial local frame.
// Z-X-Y intrinsic rotations follow the Device Orientation event convention.
function basis({alpha, beta, gamma}) {
  const rad = Math.PI / 180;
  const [a,b,g] = [alpha ?? 0,beta,gamma].map(v => v * rad);
  const A=Math.cos(a), B=Math.cos(b), G=Math.cos(g);
  const x=Math.sin(a), y=Math.sin(b), z=Math.sin(g);
  return [
    [A*G-x*y*z, x*G+A*y*z, -B*z],
    [-x*B, A*B, y],
    [A*z+x*y*G, x*z-A*y*G, B*G]
  ];
}
const limit = v => Math.max(-1, Math.min(1,v));

export function mobileView(canvas, button, feedback, enableMotion) {
  let pose=[0,0], start=null, reference=null, angle=null, listening=false, timeout;
  const hint='在窗景上左右拖曳，移動視點。';
  const available=window.isSecureContext && 'DeviceOrientationEvent' in window;
  button.hidden=!available;
  function stop() {
    clearTimeout(timeout);
    window.removeEventListener('deviceorientation', sensor);
    reference=null; listening=false; pose=[0,0];
    button.setAttribute('aria-pressed','false');
    feedback.textContent=hint;
  }
  function sensor(event) {
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    clearTimeout(timeout);
    const frame=basis(event);
    const rotation=screen.orientation?.angle ?? window.orientation ?? 0;
    if (!reference || angle!==rotation) {
      reference=frame; angle=rotation;
      feedback.textContent='輕輕傾斜手機；再點一次可關閉。';
    }
    const dot=axis=>axis.reduce((sum,v,i)=>sum+v*frame[2][i],0);
    const x=dot(reference[0]), y=dot(reference[1]), r=rotation*Math.PI/180;
    pose=[limit((x*Math.cos(r)+y*Math.sin(r))*3),
          limit((-x*Math.sin(r)+y*Math.cos(r))*3)];
  }
  button.onclick=async()=>{
    if(listening){stop();return;}
    button.disabled=true;
    try {
      const api=window.DeviceOrientationEvent;
      if(api.requestPermission && await api.requestPermission()!=='granted') throw Error();
      enableMotion(); listening=true; reference=null;
      button.setAttribute('aria-pressed','true');
      feedback.textContent='請以舒適姿勢握住手機。';
      window.addEventListener('deviceorientation',sensor);
      timeout=setTimeout(()=>{stop();feedback.textContent='未收到感測資料，可拖曳窗景。';},3000);
    } catch {stop();feedback.textContent='可直接拖曳窗景，也可稍後再開啟傾斜。';}
    finally {button.disabled=false;}
  };
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'||!e.isPrimary)return;
    if(listening)stop();
    start={id:e.pointerId,x:e.clientX,y:e.clientY,base:pose};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(start?.id!==e.pointerId)return;
    // Wait for a horizontal drag so a normal page scroll does not start motion.
    if (!start.dragging) {
      const dx=Math.abs(e.clientX-start.x),dy=Math.abs(e.clientY-start.y);
      if(dx<5 || dx<dy)return;
      start.dragging=true;
      enableMotion();
    }
    const scale=Math.max(80,canvas.clientWidth*.38);
    pose=[limit(start.base[0]+(e.clientX-start.x)/scale),
          limit(start.base[1]-(e.clientY-start.y)/scale)];
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
    canvas.addEventListener(type,()=>{start=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reference=null;});
  return {pose:()=>pose,reset:stop};
}
