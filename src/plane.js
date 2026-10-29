import * as THREE from 'three';

// A single sheet, folded into a broad dart. The nose points down -Z.
export function createPlane() {
 const plane=new THREE.Group();plane.name='dream-paper-plane';
 let seed=731;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const pixels=new Uint8Array(128*128*4);
 for(let i=0;i<pixels.length;i+=4){const fiber=247+Math.floor(random()*9);pixels.set([fiber,fiber,fiber,255],i);}
 const grain=new THREE.DataTexture(pixels,128,128,THREE.RGBAFormat);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(4,4);grain.needsUpdate=true;
 const paper=new THREE.MeshStandardMaterial({color:0xf7efd9,map:grain,roughness:.96,metalness:0});
 const folded=new THREE.MeshStandardMaterial({color:0xe6dbc0,map:grain,roughness:1,metalness:0});
 const edge=new THREE.MeshStandardMaterial({color:0xfff7e7,roughness:1,metalness:0});
 const pencil=new THREE.LineBasicMaterial({color:0x9a8866,transparent:true,opacity:.18});
 const wings=[];
 function facet(parent,points,material){
  // Give the sheet a fine cut edge, with separate normals for each fold.
  const a=new THREE.Vector3(...points[0]),b=new THREE.Vector3(...points[1]),c=new THREE.Vector3(...points[2]);
  if(b.clone().sub(a).cross(c.clone().sub(a)).y<0)[points[1],points[2]]=[points[2],points[1]];
  const vertices=[...points,...points.map(([x,y,z])=>[x,y-.022,z])];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap(([x,,z])=>[x*.15,z*.15]),2));
  geometry.setIndex([0,1,2,5,4,3,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);
  geometry.clearGroups();geometry.addGroup(0,3,0);geometry.addGroup(3,3,1);geometry.addGroup(6,18,2);
  const flat=geometry.toNonIndexed();flat.computeVertexNormals();geometry.dispose();
  const mesh=new THREE.Mesh(flat,[material,folded,edge]);parent.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
  const wing=new THREE.Group();wing.name=side<0?'left-paper-wing':'right-paper-wing';plane.add(wing);wings.push({wing,side});
  const nose=[0,.2,-5.5],root=[side*.56,.06,3.1],fold=[side*2.62,.32,.85],tip=[side*4.75,.75,3.55];
  facet(wing,[nose,root,fold],folded);
  facet(wing,[nose,fold,tip],paper);
  facet(wing,[fold,root,tip],paper);
  const crease=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...nose).add(new THREE.Vector3(0,.006,0)),new THREE.Vector3(...fold).add(new THREE.Vector3(0,.006,0)),new THREE.Vector3(...root).add(new THREE.Vector3(0,.006,0))]);wing.add(new THREE.Line(crease,pencil));
  // The tucked center fold is visible from behind and gives the dart its spine.
  facet(plane,[nose,[0,-.95,2.45],root],folded);
  if(side===-1){
   // A small, imperfect gold star, like a wish drawn on the paper before folding.
   const center=new THREE.Vector3(-3.25,.54,2.65),points=[];
   for(let n=0;n<10;n++){const angle=n*Math.PI/5-.3,r=n%2?.12:.29;points.push(new THREE.Vector3(center.x+Math.cos(angle)*r,center.y,center.z+Math.sin(angle)*r));}
   points.push(points[0].clone());const star=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xba9861,transparent:true,opacity:.65}));wing.add(star);
  }
 }
 plane.userData.animate=time=>{for(const {wing,side} of wings)wing.rotation.z=side*Math.sin(time*1.4)*.008;};
 return plane;
}
