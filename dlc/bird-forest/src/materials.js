import * as THREE from 'three/webgpu';
import {attribute,uniform,vec2,positionWorld,screenCoordinate,sin,dot,fract,distance,smoothstep,float} from 'three/tsl';
export function leafTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const g=canvas.getContext('2d');
 g.fillStyle='#567b3c';
 for(const [x,y,r,a] of [[64,64,37,-.4],[34,44,22,-.9],[88,40,21,.6],[34,83,25,.5],[90,83,24,-.5]]){
  g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.ellipse(0,0,r*.55,r,0,0,Math.PI*2);g.fill();g.strokeStyle='#b4be76';g.lineWidth=1;g.beginPath();g.moveTo(0,-r);g.lineTo(0,r);g.stroke();g.restore();
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t;
}
export function barkTexture(){
 const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');g.fillStyle='#716a50';g.fillRect(0,0,64,128);
 for(let x=0;x<64;x++){g.fillStyle=`rgba(25,28,19,${.1+Math.sin(x*2.3)**2*.22})`;g.fillRect(x,0,1,128);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
export function createMaterials(){
 const leaves=leafTexture(),bark=barkTexture(),viewer=uniform(new THREE.Vector3()),ranges=uniform(new THREE.Vector3(24,56,105)),far=uniform(125);
 function material(kind,level,map){
  const m=kind==='impostor'?new THREE.MeshBasicNodeMaterial({map,alphaTest:.25,side:THREE.DoubleSide}):new THREE.MeshLambertNodeMaterial({map:kind==='leaf'?leaves:bark,side:kind==='leaf'?THREE.DoubleSide:THREE.FrontSide,alphaTest:kind==='leaf'?.45:0,color:kind==='leaf'?0xcedca1:0xbac2ac});
  const d=distance(attribute('root','vec3'),viewer),cut=[ranges.x,ranges.y,ranges.z];
  const noise=fract(sin(dot(screenCoordinate.xy,vec2(12.9898,78.233))).mul(43758.5453));
  const lower=level===0?float(1):smoothstep(cut[level-1].sub(4),cut[level-1].add(4),d);
  const upper=level===3?float(0):smoothstep(cut[level].sub(4),cut[level].add(4),d);
  m.maskNode=noise.lessThan(lower).and(noise.greaterThanEqual(upper)).and(noise.greaterThanEqual(smoothstep(far.sub(14),far,d)));
  // Decorative foliage yields around the chase camera instead of filling the lens.
  if(kind==='leaf')m.maskNode=m.maskNode.and(noise.lessThan(smoothstep(float(.7),float(2.8),distance(positionWorld,viewer))));
  return m;
 }
 return {leaves,bark,viewer,ranges,far,material};
}
