import * as THREE from 'three/webgpu';
import {positionLocal,uniform,sin,vec3,smoothstep,positionWorld,distance,screenCoordinate,fract,dot,vec2} from 'three/tsl';
import {random,floorHeight,corridor} from './world.js';
import {shaftTexture} from './textures.js';
export function createUnderstory(scene,trees){
 const p=[],indices=[];
 // Six curled fern fronds, made from narrow leaflets; no alpha overdraw.
 for(let k=0;k<6;k++){const angle=k*Math.PI/3;for(let j=1;j<9;j++)for(const side of [-1,1]){const t=j/9,r=t*.95,y=Math.sin(t*Math.PI*.85)*.65,w=Math.sin(t*Math.PI)*.28;const point=(rad,tangent,h)=>[Math.cos(angle)*rad-Math.sin(angle)*tangent,h,Math.sin(angle)*rad+Math.cos(angle)*tangent];const n=p.length/3;p.push(...point(r,0,y),...point(r+.12,side*w,y+.015),...point(r+.20,side*w*.25,y-.02));indices.push(n,n+1,n+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();
 const time=uniform(0),eye=uniform(new THREE.Vector3()),reach=uniform(42),m=new THREE.MeshStandardNodeMaterial({color:0x405b2e,roughness:.9,side:THREE.DoubleSide});
 m.positionNode=positionLocal.add(vec3(sin(time.add(positionLocal.x.mul(4))).mul(positionLocal.y.mul(.045)),0,0));
 const noise=fract(fract(dot(screenCoordinate.xy,vec2(.06711056,.00583715))).mul(52.9829189));m.maskNode=noise.greaterThanEqual(smoothstep(reach.sub(9),reach,distance(positionWorld,eye)));
 const ferns=new THREE.InstancedMesh(g,m,420);ferns.frustumCulled=false;ferns.receiveShadow=true;ferns.count=0;scene.add(ferns);
 const rand=random(787),points=trees.flatMap(t=>[0,1].map(()=>({x:t.x+(rand()-.5)*5,z:t.z+(rand()-.5)*5,s:.45+rand()*.65,a:rand()*6.28}))).filter(t=>Math.abs(t.x-corridor(t.z))>3);
 const dummy=new THREE.Object3D(),tint=new THREE.Color();let last=-Infinity;
 const rays=new THREE.Group(),rayMat=new THREE.MeshBasicNodeMaterial({map:shaftTexture(),color:0xffecc3,transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 for(let i=0;i<18;i++){const z=-170+i*20,x=corridor(z)+(i%2?9:-9),ray=new THREE.Mesh(new THREE.PlaneGeometry(2.5,23),rayMat);ray.position.set(x,floorHeight(x,z)+11,z);ray.rotation.set(0,.55,-.37);rays.add(ray);}scene.add(rays);
 const dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.025,0),new THREE.MeshBasicNodeMaterial({color:0xffeac5,transparent:true,opacity:.36,depthWrite:false}),72),seeds=Array.from({length:72},()=>({x:rand()*32,y:rand()*18,z:rand()*40,s:.4+rand()}));dust.frustumCulled=false;scene.add(dust);
 const wrap=(v,n)=>((v%n)+n)%n;
 return {update(state,camera,quality,elapsed){
  time.value=state.time;eye.value.copy(camera.position);reach.value=quality.profile==='Battery-Saver'?26:quality.scale<.7?32:46;
  rays.visible=quality.scale>=.75&&quality.profile!=='Low';dust.visible=quality.profile!=='Battery-Saver';
  for(let i=0;i<seeds.length;i++){const s=seeds[i];dummy.position.set(state.x+wrap(s.x-state.x+state.time*.13+16,32)-16,state.y+wrap(s.y-state.y+state.time*.07+9,18)-9,state.z+wrap(s.z-state.z+20,40)-20);dummy.scale.setScalar(s.s);dummy.rotation.set(0,0,0);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);}dust.instanceMatrix.needsUpdate=true;
  if(elapsed-last<.35)return;last=elapsed;let count=0;const cap=quality.profile==='Battery-Saver'?100:quality.scale<.7?180:420;
  // Select nearest candidates so the cap cannot erase an entire side of the forest.
  const nearby=[];for(const t of points){const d=(t.x-state.x)**2+(t.z-state.z)**2;if(d<(reach.value+3)**2)nearby.push({t,d});}nearby.sort((a,b)=>a.d-b.d);
  for(const {t} of nearby){if(count>=cap)break;dummy.position.set(t.x,floorHeight(t.x,t.z),t.z);dummy.rotation.set(0,t.a,0);dummy.scale.setScalar(t.s);dummy.updateMatrix();ferns.setMatrixAt(count,dummy.matrix);tint.setRGB(.8+t.s*.17,.9,.75+t.s*.17);ferns.setColorAt(count++,tint);}ferns.count=count;ferns.instanceMatrix.needsUpdate=true;if(ferns.instanceColor)ferns.instanceColor.needsUpdate=true;
 },stats:()=>({ferns:ferns.count,pollen:dust.visible?72:0,lightShafts:rays.visible?18:0})};
}
