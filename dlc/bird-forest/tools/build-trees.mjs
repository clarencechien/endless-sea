import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildDag} from '../vendor/nanite-lib/dag/build.ts';
import {dagCut} from '../vendor/nanite-lib/dag/cut.ts';
import {random} from '../src/world.js';
const source=g=>({pos:Float32Array.from(g.attributes.position.array),nrm:Float32Array.from(g.attributes.normal.array),uv:Float32Array.from(g.attributes.uv.array),idx:Uint32Array.from(g.index.array)});
const packed=[];
for(let variant=0;variant<2;variant++){
 const rand=random(190+variant),geometries=[];
 const branch=(a,b,r1,r2)=>{const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r2,r1,delta.length(),8,3);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5));geometries.push(g);};
 branch(new THREE.Vector3(),new THREE.Vector3(.3,15,0),.44,.09);
 const pos=[],nrm=[],uv=[];
 for(let limb=0;limb<18;limb++){
  const angle=limb*2.399+variant,h=6+limb*.48,spread=(3.7+rand()*1.6)*(1-(h-6)/16);
  const start=new THREE.Vector3(.02*h,h,0),tip=new THREE.Vector3(Math.cos(angle)*spread,h+2.6,Math.sin(angle)*spread);
  branch(start,tip,.10,.025);
  for(let j=0;j<42;j++){
   const center=tip.clone().add(new THREE.Vector3((rand()-.5)*4,(rand()-.5)*3.3,(rand()-.5)*4));
   const direction=new THREE.Vector3(rand()-.5,.25+rand(),rand()-.5).normalize();
   const right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,0,1)).normalize().multiplyScalar(.5+rand()*.35);
   const up=new THREE.Vector3().crossVectors(right,direction).normalize().multiplyScalar(.55+rand()*.35);
   for(const [x,y,u,v] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){
    const p=center.clone().addScaledVector(right,x).addScaledVector(up,y);pos.push(...p);nrm.push(...direction);uv.push(u,v);
   }
  }
 }
 const geometry=mergeGeometries(geometries),bark=source(geometry),leaves={pos:new Float32Array(pos),nrm:new Float32Array(nrm),uv:new Float32Array(uv),vpl:4};
 const dag=await buildDag({id:variant,bark,leaves});
 const cuts=[.012,.13,.55].map(err=>dagCut(dag,err));
 packed.push({name:variant?'銀葉樹':'青楓',height:18,radius:11,stats:dag.stats,cuts});
 console.log(variant,dag.stats,cuts.map(c=>({bark:c.bark.idx.length/3,leaves:c.leaves.idx.length/3})));
}
// Shared vertex arrays are stored once per variant; only the DAG cut indices differ.
const blocks=[],metadata=[];let offset=0;
function block(array){const entry={offset,length:array.length,kind:array instanceof Uint32Array?'uint':'float'};blocks.push(Buffer.from(array.buffer,array.byteOffset,array.byteLength));offset+=array.byteLength;return entry;}
for(const t of packed){const p=t.cuts[0].bark;metadata.push({name:t.name,height:t.height,radius:t.radius,stats:{...t.stats,ms:0},pos:block(p.pos),nrm:block(p.nrm),uv:block(p.uv),cuts:t.cuts.map(c=>({bark:block(c.bark.idx),leaves:block(c.leaves.idx)}))});}
const header=Buffer.from(JSON.stringify(metadata)),padded=Math.ceil(header.length/4)*4,prefix=Buffer.alloc(4+padded,32);prefix.writeUInt32LE(padded,0);header.copy(prefix,4);
const file=Buffer.concat([prefix,...blocks]),name=`trees-${createHash('sha256').update(file).digest('hex').slice(0,12)}.bin`;
const dir=new URL('../public/',import.meta.url);await mkdir(dir,{recursive:true});
for(const old of await readdir(dir))if(/^trees.*\.(bin|json)$/.test(old))await unlink(new URL(old,dir));
await writeFile(new URL(name,dir),file);await writeFile(new URL('../src/tree-asset.js',import.meta.url),`export const TREE_ASSET=${JSON.stringify(name)};\n`);
console.log('Offline DAG asset:',name,file.byteLength,'bytes');
