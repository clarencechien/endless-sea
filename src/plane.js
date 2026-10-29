import * as THREE from 'three';

// Folded washi: one shared fibre texture, curved panels, and fine exposed edges.
export function createPlane() {
 const plane=new THREE.Group();plane.name='dream-paper-plane';
 let seed=731;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const size=256,field=Float32Array.from({length:size*size},()=>random());
 // Short directional strands, rather than independent white-noise pixels.
 const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let strand=0;for(let k=-5;k<=5;k++)strand+=field[((y+size+Math.round(k*.22))%size)*size+(x+k+size)%size];
  const value=Math.round(203+strand/11*32+field[y*size+x]*19);
  pixels.set([value,value,value,255],(y*size+x)*4);
 }
 const grain=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(1,1);grain.generateMipmaps=true;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.magFilter=THREE.LinearFilter;grain.anisotropy=4;grain.needsUpdate=true;
 const light={value:new THREE.Vector3(-.5,.3,-1).normalize()},night={value:0};
 function paperMaterial(color,bumpScale){
  const material=new THREE.MeshStandardMaterial({color,map:grain,bumpMap:grain,bumpScale,roughness:.87,metalness:0});
  material.onBeforeCompile=shader=>{
   shader.uniforms.paperSun=light;shader.uniforms.paperNight=night;
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 paperPosition;varying vec3 paperNormal;');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npaperPosition=position;paperNormal=normalize(mat3(modelMatrix)*normal);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 paperPosition;varying vec3 paperNormal;uniform vec3 paperSun;uniform float paperNight;
    float foldDistance(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec2 sheet=vec2(abs(paperPosition.x),paperPosition.z);
    float fold=min(foldDistance(sheet,vec2(0.,-5.5),vec2(2.62,.85)),foldDistance(sheet,vec2(2.62,.85),vec2(.56,3.1)));
    float crease=exp(-fold*24.);float shoulder=exp(-fold*7.);
    diffuseColor.rgb*=1.-crease*.14-shoulder*.045;
    diffuseColor.rgb+=vec3(.024,.018,.008)*exp(-abs(fold-.07)*28.);
    diffuseColor.rgb*=.97+.03*smoothstep(-.5,4.,paperPosition.z);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float throughLight=pow(max(dot(-normalize(paperNormal),paperSun),0.),2.);
    float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
    totalEmissiveRadiance+=vec3(1.,.72,.36)*(throughLight*.09*(1.-paperNight)+rim*.018)+vec3(.035,.043,.060)*paperNight;`);
  };
  material.customProgramCacheKey=()=> 'washi-fold-v1';return material;
 }
 const paper=paperMaterial(0xfff2d6,.045),folded=paperMaterial(0xe9ddc4,.035);
 const edge=new THREE.MeshStandardMaterial({color:0xfff5db,roughness:.8,emissive:0xc3a970,emissiveIntensity:.035});
 const pencil=new THREE.LineBasicMaterial({color:0x92734e,transparent:true,opacity:.13});
 const wings=[];
 function facet(parent,points,material){
  const [a,b,c]=points.map(p=>new THREE.Vector3(...p));
  if(b.clone().sub(a).cross(c.clone().sub(a)).y<0)[points[1],points[2]]=[points[2],points[1]];
  const positions=[],uvs=[],indices=[],divisions=12;
  function vertex(u,v,under){
   const w=1-u-v,x=points[0][0]*w+points[1][0]*u+points[2][0]*v,z=points[0][2]*w+points[1][2]*u+points[2][2]*v;
   const camber=27*u*v*w*(material===paper?.12:.045);
   positions.push(x,points[0][1]*w+points[1][1]*u+points[2][1]*v+camber-(under?.025:0),z);uvs.push(x*.25,z*.25);
   return positions.length/3-1;
  }
  const rows=[];for(let i=0;i<=divisions;i++){rows[i]=[];for(let j=0;j<=divisions-i;j++)rows[i][j]=vertex(i/divisions,j/divisions,false);}
  for(let i=0;i<divisions;i++)for(let j=0;j<divisions-i;j++){indices.push(rows[i][j],rows[i+1][j],rows[i][j+1]);if(j<divisions-i-1)indices.push(rows[i+1][j],rows[i+1][j+1],rows[i][j+1]);}
  const topCount=indices.length,vertexCount=positions.length/3;
  for(let i=0;i<=divisions;i++)for(let j=0;j<=divisions-i;j++)vertex(i/divisions,j/divisions,true);
  for(let i=0;i<topCount;i+=3)indices.push(indices[i+2]+vertexCount,indices[i+1]+vertexCount,indices[i]+vertexCount);
  const boundary=[...rows[0],...rows.slice(1).map(row=>row.at(-1)),...rows.slice(1,-1).reverse().map(row=>row[0])];
  // Separate edge vertices prevent the sheet's normals blending into its cut edge.
  for(let i=0;i<boundary.length;i++){
   const a=boundary[i],b=boundary[(i+1)%boundary.length],start=positions.length/3;
   for(const index of [a,b,b+vertexCount,a+vertexCount]){positions.push(...positions.slice(index*3,index*3+3));uvs.push(...uvs.slice(index*2,index*2+2));}
   indices.push(start,start+1,start+2,start,start+2,start+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.addGroup(0,topCount,0);geometry.addGroup(topCount,topCount,1);geometry.addGroup(topCount*2,indices.length-topCount*2,2);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,[material,folded,edge]);parent.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
  const wing=new THREE.Group();wing.name=side<0?'left-paper-wing':'right-paper-wing';plane.add(wing);wings.push({wing,side});
  const nose=[0,.2,-5.5],root=[side*.56,.06,3.1],fold=[side*2.62,.32,.85],tip=[side*4.75,.75,3.55];
  facet(wing,[nose,root,fold],folded);facet(wing,[nose,fold,tip],paper);facet(wing,[fold,root,tip],paper);
  const crease=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...nose).add(new THREE.Vector3(0,.008,0)),new THREE.Vector3(...fold).add(new THREE.Vector3(0,.008,0)),new THREE.Vector3(...root).add(new THREE.Vector3(0,.008,0))]);wing.add(new THREE.Line(crease,pencil));
  facet(plane,[nose,[0,-.95,2.45],root],folded);
  if(side===-1){
   // Hand-drawn foil star, raised just above the curved sheet.
   const center=new THREE.Vector3(-3.25,.61,2.65),points=[];
   for(let n=0;n<10;n++){const angle=n*Math.PI/5-.3,r=n%2?.12:.29;points.push(new THREE.Vector3(center.x+Math.cos(angle)*r,center.y,center.z+Math.sin(angle)*r));}
   points.push(points[0].clone());wing.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xc4a16a,transparent:true,opacity:.75})));
  }
 }
 plane.userData.animate=(time,sun,mood=1)=>{for(const {wing,side} of wings)wing.rotation.z=side*(Math.sin(time*1.4)*.008+Math.sin(time*.53)*.003);if(sun)light.value.copy(sun).normalize();night.value=THREE.MathUtils.clamp(mood-2,0,1);};
 return plane;
}
