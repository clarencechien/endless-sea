import * as THREE from 'three/webgpu';
import {positionLocal,positionWorld,attribute,mix,vec2,vec3,smoothstep,texture,sin,pow,color} from 'three/tsl';
import {floorHeight,corridor,random,makeGrid,nearby} from './world.js';
import {groundTexture,barkTexture} from './textures.js';
import {createBird} from './bird.js';
export function createScene(trees=[]){
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xb6c7be,40,135);
 const hemi=new THREE.HemisphereLight(0xcadce6,0x4b5140,2.0),sun=new THREE.DirectionalLight(0xffe4b9,3.1);sun.position.set(-50,85,40);scene.add(hemi,sun,sun.target);
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-29,right:29,top:29,bottom:-29,near:1,far:180});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;
 const skyMaterial=new THREE.MeshBasicNodeMaterial({side:THREE.BackSide,depthWrite:false,fog:false}),dir=positionLocal.normalize();
 const skyColor=mix(color(0xb6c7be),color(0x719aaf),smoothstep(-.05,.85,dir.y));
 const glow=pow(dir.dot(vec3(-.46,.81,.36)).max(0),32).mul(.22);skyMaterial.colorNode=skyColor.add(vec3(1,.72,.38).mul(glow));
 const sky=new THREE.Mesh(new THREE.SphereGeometry(500,24,12),skyMaterial);sky.frustumCulled=false;scene.add(sky);
 const geometry=new THREE.PlaneGeometry(500,500,140,140).rotateX(-Math.PI/2),p=geometry.attributes.position;
 const grid=makeGrid(trees),occlusion=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,floorHeight(x,z));let shade=1;for(const t of nearby(grid,x,z))shade=Math.min(shade,.4+.6*(1-Math.exp(-((x-t.x)**2+(z-t.z)**2)/9)));occlusion.push(shade,shade,shade);}geometry.setAttribute('color',new THREE.Float32BufferAttribute(occlusion,3));geometry.computeVertexNormals();
 const groundMap=groundTexture(),groundMat=new THREE.MeshStandardNodeMaterial({roughness:1,bumpMap:groundMap,bumpScale:.065});groundMap.repeat.set(80,80);
 // Two world-space scales and a rotated layer break the repeating texture grid.
 const uv1=positionWorld.xz.mul(.16),uv2=vec2(positionWorld.x.mul(.71).sub(positionWorld.z.mul(.7)),positionWorld.x.mul(.7).add(positionWorld.z.mul(.71))).mul(.071);
 const base=mix(texture(groundMap,uv1).rgb,texture(groundMap,uv2).rgb,.35),path=pow(positionWorld.x.sub(sin(positionWorld.z.mul(.027)).mul(19)).div(3.2),2).negate().exp();
 groundMat.colorNode=base.mul(mix(vec3(.66,.84,.56),vec3(1.19,1.07,.83),path)).mul(attribute('color','vec3'));
 const ground=new THREE.Mesh(geometry,groundMat);ground.receiveShadow=true;scene.add(ground);
 const rand=random(886),dummy=new THREE.Object3D(),rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardNodeMaterial({color:0x69756a,roughness:1}),150);
 for(let i=0;i<150;i++){const x=(rand()-.5)*380,z=(rand()-.5)*380;dummy.position.set(x,floorHeight(x,z)-.1,z);dummy.scale.set(.3+rand()*.9,.2+rand()*.4,.3+rand()*.7);dummy.rotation.set(0,rand()*6,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.receiveShadow=true;scene.add(rocks);
 const logs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.36,3.8,8).rotateZ(Math.PI/2),new THREE.MeshStandardNodeMaterial({map:barkTexture(),color:0x777b65,roughness:1}),60);
 for(let i=0;i<60;i++){const z=(rand()-.5)*370,x=corridor(z)+(i%2?1:-1)*(8+rand()*22);dummy.position.set(x,floorHeight(x,z)+.2,z);dummy.scale.setScalar(.7+rand()*.6);dummy.rotation.set(0,rand()*6,.08);dummy.updateMatrix();logs.setMatrixAt(i,dummy.matrix);}logs.receiveShadow=true;scene.add(logs);
 const model=createBird();scene.add(model.bird);
 return {scene,...model,sun,sky,update(state,quality){model.update(state);sky.position.copy(model.bird.position);scene.fog.far=quality.far;scene.fog.near=quality.far*.30;sun.castShadow=quality.shadows;sun.position.set(state.x-50,state.y+85,state.z+40);sun.target.position.set(state.x,state.y,state.z);}};
}
