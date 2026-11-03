export const SEED=73129, WORLD_SIZE=420, TICK=1/60;
export function random(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export const floorHeight=(x,z)=>Math.sin(x*.025)*1.2+Math.sin(z*.031)*.9+Math.sin((x+z)*.018)*.6;
export const corridor=z=>Math.sin(z*.027)*19;
export function plantForest(seed=SEED){
 const rand=random(seed),trees=[];
 for(let z=-205;z<205;z+=7)for(let x=-205;x<205;x+=7){
  const px=x+(rand()-.5)*5,pz=z+(rand()-.5)*5;
  const distance=Math.abs(px-corridor(pz));
  if(distance<6.5||Math.abs(px-corridor(pz)-19)<2.3||Math.abs(Math.hypot(px,pz)-33)<2.2||Math.hypot(px-60,pz+70)<16||rand()<.12)continue;
  const scale=.72+rand()*.64;
  trees.push({x:px,y:floorHeight(px,pz),z:pz,scale,yaw:rand()*Math.PI*2,type:Math.floor(rand()*2),radius:.44*scale,height:17*scale});
 }
 return trees;
}
export function makeGrid(trees){const grid=new Map();for(const t of trees){const key=`${Math.floor(t.x/8)},${Math.floor(t.z/8)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(t);}return grid;}
export function nearby(grid,x,z){const out=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)out.push(...(grid.get(`${Math.floor(x/8)+dx},${Math.floor(z/8)+dz}`)||[]));return out;}
export function createBirdState(){return {x:corridor(100),y:floorHeight(corridor(100),100)+6,z:100,yaw:0,pitch:0,bank:0,speed:12,time:0,collisions:0,edgeAssist:0};}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function stepBird(s,input,grid,dt=TICK){
 const ease=1-Math.exp(-dt*5);
 // A broad, smooth turn before the finite forest edge. No position wrap, clamp,
 // or teleport: bank, heading and chase camera follow the same curved flight.
 const radius=Math.hypot(s.x,s.z),edge=clamp((radius-110)/45,0,1);
 s.edgeAssist=edge*edge*(3-2*edge);
 const inward=Math.atan2(s.x,s.z),error=Math.atan2(Math.sin(inward-s.yaw),Math.cos(inward-s.yaw));
 const turnRate=-input.turn*.95*(1-s.edgeAssist)+clamp(error*1.5,-1.35,1.35)*s.edgeAssist;
 s.bank+=(clamp(turnRate/.95*.62,-.7,.7)-s.bank)*ease;s.pitch+=(input.lift*.4-s.pitch)*ease;
 s.yaw+=turnRate*dt;s.speed+=((input.boost?20:12)+Math.max(0,-s.pitch)*5-s.speed)*dt*2;
 let nx=s.x-Math.sin(s.yaw)*s.speed*dt,nz=s.z-Math.cos(s.yaw)*s.speed*dt;
 let ny=s.y+Math.sin(s.pitch)*s.speed*dt;
 // The fixed-tick step travels at most .37 m; the bird's .65 m proxy cannot tunnel
 // through a trunk. Both renderer paths and every quality use these same colliders.
 for(const t of nearby(grid,nx,nz)){
  const d=Math.hypot(nx-t.x,nz-t.z),r=t.radius+.65;
  if(ny<t.y+t.height*.88&&d<r){const dx=(nx-t.x)/(d||1),dz=(nz-t.z)/(d||1);nx=t.x+(d?dx:1)*r;nz=t.z+dz*r;s.speed=Math.min(s.speed,4);s.collisions++;}
 }
 s.x=nx;s.z=nz;
 s.y=clamp(ny,floorHeight(s.x,s.z)+1.4,floorHeight(s.x,s.z)+35);s.time+=dt;
}
export const PATHS=['ground','dense','turn','canopy','speed','pause-resume'];
export function routePose(path,time){
 const speed=path==='speed'?16:8,progress=(time*speed)%560,returning=progress>280,z=returning?progress-420:140-progress,x=corridor(z);
 const y=path==='canopy'?29:path==='dense'?9:5;
 if(path==='turn'){
  const a=time*.24;return {x:Math.sin(a)*33,z:Math.cos(a)*33,y:12,yaw:a-Math.PI/2,pitch:0,bank:-.38,speed:33*.24};
 }
 const offset=path==='dense'?19:0;
 return {x:x+offset,z,y:floorHeight(x+offset,z)+y,yaw:Math.atan(Math.cos(z*.027)*19*.027)+(returning?Math.PI:0),pitch:0,bank:Math.sin(time*.5)*.08,speed};
}
