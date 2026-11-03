import * as THREE from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {positionLocal,mix,vec3,smoothstep} from 'three/tsl';
import {floorHeight,corridor,random} from './world.js';
export function createScene(){
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xa4b9a2,45,135);
 const hemi=new THREE.HemisphereLight(0xe5efd6,0x38472a,2.3),sun=new THREE.DirectionalLight(0xffe5b1,2.5);sun.position.set(-50,80,40);scene.add(hemi,sun,sun.target);
 sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:180});sun.shadow.bias=-.0004;
 const skyMaterial=new THREE.MeshBasicNodeMaterial({side:THREE.BackSide,depthWrite:false});
 skyMaterial.colorNode=mix(vec3(.64,.73,.65),vec3(.23,.44,.47),smoothstep(-.05,.8,positionLocal.y.div(500)));
 const sky=new THREE.Mesh(new THREE.SphereGeometry(500,24,12),skyMaterial);sky.frustumCulled=false;scene.add(sky);
 const geometry=new THREE.PlaneGeometry(500,500,100,100).rotateX(-Math.PI/2),p=geometry.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);p.setY(i,floorHeight(x,z));
  const path=Math.exp(-Math.pow((x-corridor(z))/3.4,2)),grain=(Math.sin(x*.3+z*.7)+Math.cos(x*1.3-z*.6))*.016;
  const color=new THREE.Color().setRGB(.14+path*.14+grain,.20+path*.09+grain,.075+path*.08+grain);colors.push(...color);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const ground=new THREE.Mesh(geometry,new THREE.MeshLambertNodeMaterial({vertexColors:true}));ground.receiveShadow=true;scene.add(ground);
 const rand=random(886),rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshLambertNodeMaterial({color:0x68785a}),150),dummy=new THREE.Object3D();
 for(let i=0;i<150;i++){const x=(rand()-.5)*380,z=(rand()-.5)*380;dummy.position.set(x,floorHeight(x,z)-.1,z);dummy.scale.set(.3+rand()*.9,.2+rand()*.4,.3+rand()*.7);dummy.rotation.set(0,rand()*6,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}scene.add(rocks);
 const bird=new THREE.Group(),cream=new THREE.MeshLambertNodeMaterial({color:0xe9ddba}),feather=new THREE.MeshLambertNodeMaterial({color:0x8c7755}),dark=new THREE.MeshLambertNodeMaterial({color:0x263b30});
 const ellipsoid=(r,scale,position,material)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,10),material);m.scale.set(...scale);m.position.set(...position);bird.add(m);return m;};
 ellipsoid(1,[.27,.3,.68],[0,0,0],cream);ellipsoid(1,[.24,.25,.3],[0,.15,-.52],cream);
 const eyes=new THREE.InstancedMesh(new THREE.SphereGeometry(.038,8,5),dark,2);for(let i=0;i<2;i++){dummy.position.set((i?1:-1)*.2,.22,-.65);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();eyes.setMatrixAt(i,dummy.matrix);}bird.add(eyes);
 const beak=new THREE.Mesh(new THREE.ConeGeometry(.085,.26,6).rotateX(-Math.PI/2),new THREE.MeshLambertNodeMaterial({color:0xc89e51}));beak.position.set(0,.12,-.86);bird.add(beak);
 const wings=[];
 for(const side of [-1,1]){
  const parts=[];
  for(let i=0;i<10;i++){const g=new THREE.SphereGeometry(1,8,5);g.scale(.13,.035,.62-i*.015);g.rotateY(side*(.15+i*.07));g.translate(side*(.28+i*.15),.02, .08+i*.06);parts.push(g);}
  const wing=new THREE.Mesh(mergeGeometries(parts),feather);bird.add(wing);wings.push(wing);
 }
 const tail=new THREE.Mesh(new THREE.ConeGeometry(.32,.65,4).rotateX(Math.PI/2),feather);tail.position.set(0,0,.7);bird.add(tail);scene.add(bird);
 return {scene,bird,sun,sky,wings,update(state,quality){bird.position.set(state.x,state.y,state.z);bird.rotation.set(state.pitch,state.yaw,state.bank,'YXZ');const flap=Math.sin(state.time*7)*.22;wings[0].rotation.z=flap;wings[1].rotation.z=-flap;sky.position.copy(bird.position);scene.fog.far=quality.far;scene.fog.near=quality.far*.35;sun.castShadow=quality.shadows;sun.position.set(state.x-50,80,state.z+40);sun.target.position.set(state.x,0,state.z);}};
}
