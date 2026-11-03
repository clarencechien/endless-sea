import * as THREE from 'three/webgpu';
import {createMaterials} from './materials.js';
function geometry(part){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(part.pos,3));g.setAttribute('normal',new THREE.BufferAttribute(part.nrm,3));g.setAttribute('uv',new THREE.BufferAttribute(part.uv,2));g.setIndex(new THREE.BufferAttribute(part.idx,1));return g;}
export async function createForest(renderer,scene,trees,types){
 const materials=createMaterials(),group=new THREE.Group(),batches=[],dummy=new THREE.Object3D(),targets=[];
 const previewMaterials=[new THREE.MeshLambertNodeMaterial({map:materials.bark,color:0xbac2ac}),new THREE.MeshLambertNodeMaterial({map:materials.leaves,color:0xcedca1,side:THREE.DoubleSide,alphaTest:.45})];
 const oldClear=new THREE.Color();renderer.getClearColor(oldClear);const oldAlpha=renderer.getClearAlpha(),oldTone=renderer.toneMapping;
 // A small, one-time bake from the very same DAG mesh. No external tree textures.
 for(let type=0;type<types.length;type++){
  const t=types[type],preview=new THREE.Scene(),h=new THREE.HemisphereLight(0xf5edcb,0x465d48,2.4),sun=new THREE.DirectionalLight(0xffe2a6,2);
  sun.position.set(-10,24,14);preview.add(h,sun);
  for(const [i,key] of ['bark','leaves'].entries())preview.add(new THREE.Mesh(geometry(t.cuts[1][key]),previewMaterials[i]));
  const cam=new THREE.OrthographicCamera(-9,9,10,-10,.1,80);cam.position.set(0,9,30);cam.lookAt(0,9,0);
  const target=new THREE.RenderTarget(256,320);targets.push(target);renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.NoToneMapping;renderer.render(preview,cam);renderer.setRenderTarget(null);
  preview.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  for(let level=0;level<4;level++)for(const kind of level===3?['impostor']:['bark','leaf']){
   const g=level===3?new THREE.PlaneGeometry(18,20).translate(0,9,0):geometry(t.cuts[level][kind==='leaf'?'leaves':'bark']);
   const roots=new THREE.InstancedBufferAttribute(new Float32Array(trees.length*3),3);roots.setUsage(THREE.DynamicDrawUsage);g.setAttribute('root',roots);
   const mesh=new THREE.InstancedMesh(g,materials.material(kind,level,target.texture),trees.length);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=level<2;mesh.receiveShadow=true;
   group.add(mesh);batches.push({type,level,kind,mesh,roots,count:0});
  }
 }
 renderer.setClearColor(oldClear,oldAlpha);renderer.toneMapping=oldTone;previewMaterials.forEach(m=>m.dispose());scene.add(group);
 const frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(),center=new THREE.Vector3();let visible=0,impostors=0,last=-Infinity;
 function update(camera,quality,time,force=false){
  materials.viewer.value.copy(camera.position);materials.ranges.value.set(24,54/quality.lod,90/quality.lod);materials.far.value=quality.far;
  if(!force&&time-last<.12)return;last=time;
  camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp,camera.coordinateSystem);
  const radii=[24,54/quality.lod,90/quality.lod];for(const batch of batches)batch.count=0;visible=0;impostors=0;
  for(const t of trees){
   center.set(t.x,t.y+8*t.scale,t.z);const d=center.distanceTo(camera.position);
   if(d>quality.far+15)continue;sphere.center.copy(center);sphere.radius=13*t.scale;if(!frustum.intersectsSphere(sphere))continue;visible++;
   for(let level=0;level<4;level++){
    if(level>0&&d<radii[level-1]-8||level<3&&d>radii[level]+8)continue;
    dummy.position.set(t.x,t.y,t.z);dummy.scale.setScalar(t.scale);dummy.rotation.set(0,level===3?Math.atan2(camera.position.x-t.x,camera.position.z-t.z):t.yaw,0);dummy.updateMatrix();
    if(level===3)impostors++;
    for(const b of batches){if(b.type!==t.type||b.level!==level)continue;b.mesh.setMatrixAt(b.count,dummy.matrix);b.roots.setXYZ(b.count,t.x,t.y+8*t.scale,t.z);b.count++;}
   }
  }
  for(const b of batches){b.mesh.count=b.count;b.mesh.instanceMatrix.needsUpdate=true;b.roots.needsUpdate=true;}
 }
 return {update,group,stats:()=>({visibleInstances:visible,impostors,total:trees.length,drawBatches:batches.filter(b=>b.count).length}),dispose(){for(const b of batches){b.mesh.geometry.dispose();b.mesh.material.dispose();b.mesh.dispose();}targets.forEach(t=>t.dispose());materials.leaves.dispose();materials.bark.dispose();scene.remove(group);}};
}
