import * as THREE from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {featherTexture} from './textures.js';
function feather(length,width){
 const p=[],uv=[],idx=[];
 for(let j=0;j<=10;j++){const t=j/10,w=Math.max(.004,Math.sin(Math.PI*(t*.94+.02))**.65*width);for(const side of [-1,1]){p.push(side*w,Math.sin(t*Math.PI)*.045-t*t*.045,t*length);uv.push(side===-1?0:1,t);}}
 for(let j=0;j<10;j++){const a=j*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function createBird(){
 const bird=new THREE.Group(),wings=[],cream=new THREE.MeshStandardNodeMaterial({color:0xb8c1b7,roughness:.82}),feathers=new THREE.MeshStandardNodeMaterial({map:featherTexture(),color:0x9fa99d,side:THREE.DoubleSide,roughness:.9}),dark=new THREE.MeshStandardNodeMaterial({color:0x182520,roughness:.35});
 function body(scale,pos,mat=cream){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);m.scale.set(...scale);m.position.set(...pos);bird.add(m);return m;}
 body([.22,.24,.63],[0,0,0]);body([.20,.21,.28],[0,.1,-.52]);
 for(const side of [-1,1]){
  body([.028,.032,.027],[side*.174,.16,-.66],dark);
  const parts=[];for(let i=0;i<12;i++){const g=feather(.78-i*.019,.10+i*.001);g.rotateY(-side*(.12+i*.035));g.translate(side*(.18+i*.13),.012-i*.008,-.26+i*.055);parts.push(g);}for(let i=0;i<9;i++){const g=feather(.45,.105);g.rotateY(-side*.18);g.translate(side*(.22+i*.14),.05,-.3+i*.055);parts.push(g);}
  const wing=new THREE.Mesh(mergeGeometries(parts),feathers);bird.add(wing);wings.push(wing);
 }
 const beak=new THREE.Mesh(new THREE.ConeGeometry(.06,.21,10).rotateX(-Math.PI/2),new THREE.MeshStandardNodeMaterial({color:0x737767,roughness:.6}));beak.position.set(0,.09,-.79);bird.add(beak);
 const tailParts=[];for(let i=-3;i<=3;i++){const g=feather(.48,.075);g.rotateY(i*.11);g.translate(i*.045,-.03,.37);tailParts.push(g);}const tail=new THREE.Mesh(mergeGeometries(tailParts),feathers);bird.add(tail);
 bird.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return {bird,wings,update(state){
  bird.position.set(state.x,state.y,state.z);bird.rotation.set(state.pitch,state.yaw,state.bank,'YXZ');
  const effort=Math.max(0,state.pitch)*1.4+Math.max(0,Math.min(1,(state.speed-14)/8))*.4,burst=Math.max(0,Math.sin(state.time*.72))**6,flap=Math.sin(state.time*7)*(.07+burst*.38+effort*.18);
  wings[0].rotation.z=.08+flap;wings[1].rotation.z=-.08-flap;wings[0].rotation.y=-state.bank*.08;wings[1].rotation.y=-state.bank*.08;tail.rotation.x=state.pitch*.4;
 }};
}
