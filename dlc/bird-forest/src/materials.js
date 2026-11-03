import * as THREE from 'three/webgpu';
import {attribute,uniform,vec2,vec3,positionLocal,positionWorld,normalWorld,screenCoordinate,fract,dot,distance,smoothstep,float,texture,sin} from 'three/tsl';
import {leafTexture,barkTexture} from './textures.js';
export {leafTexture,barkTexture};
export function createMaterials(){
 const leaves=leafTexture(),bark=barkTexture(),viewer=uniform(new THREE.Vector3()),ranges=uniform(new THREE.Vector3(24,56,105)),far=uniform(125),windTime=uniform(0);
 function material(kind,level,map){
  const m=kind==='impostor'?new THREE.MeshBasicNodeMaterial({map,alphaTest:.3,side:THREE.DoubleSide}):new THREE.MeshStandardNodeMaterial({map:kind==='leaf'?leaves:bark,roughness:kind==='leaf'?.82:1,side:kind==='leaf'?THREE.DoubleSide:THREE.FrontSide,alphaTest:kind==='leaf'?.4:0,color:kind==='leaf'?0xc6cfac:0xc3beb1});
  const root=attribute('root','vec3'),d=distance(root,viewer),cut=[ranges.x,ranges.y,ranges.z];
  const noise=fract(fract(dot(screenCoordinate.xy,vec2(.06711056,.00583715))).mul(52.9829189));
  const lower=level===0?float(1):smoothstep(cut[level-1].sub(4),cut[level-1].add(4),d),upper=level===3?float(0):smoothstep(cut[level].sub(4),cut[level].add(4),d);
  m.maskNode=noise.lessThan(lower).and(noise.greaterThanEqual(upper)).and(noise.greaterThanEqual(smoothstep(far.sub(14),far,d)));
  if(kind==='leaf'){
   m.maskNode=m.maskNode.and(noise.lessThan(smoothstep(float(.8),float(2.5),distance(positionWorld,viewer))));
   const wave=sin(windTime.mul(1.3).add(root.x.mul(.19)).add(root.z.mul(.13)).add(positionLocal.y.mul(.4)));
   m.positionNode=positionLocal.add(vec3(wave.mul(.10),sin(windTime.mul(2.1).add(positionLocal.x.mul(2))).mul(.025),wave.mul(.045)).mul(smoothstep(4,16,positionLocal.y)));
   m.emissiveNode=texture(leaves).rgb.mul(normalWorld.dot(vec3(-.46,.81,.36)).negate().max(0).mul(.22).add(.055));
  }return m;
 }return {leaves,bark,viewer,ranges,far,windTime,material};
}
