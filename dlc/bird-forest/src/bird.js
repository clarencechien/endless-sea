import * as THREE from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {featherTexture} from './textures.js';

function geometry(positions,uvs,indices){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tint(g,hex){const c=new THREE.Color(hex),colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
function merged(parts){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());return g;}
// A cambered feather with a raised rachis, asymmetric vanes and a narrow tip.
// Three vertices across the vane make its highlights follow the feather surface.
function feather(length,width,shade=0xffffff,segments=12){
 const p=[],uv=[],idx=[];
 for(let j=0;j<=segments;j++){
  const t=j/segments,w=Math.max(.001,Math.sin(Math.PI*(t*.98+.01))**.63*width),bend=Math.sin(t*Math.PI)*.027-t*t*.025;
  for(let k=0;k<3;k++){const across=k-1;p.push(across*w*(k===0?.83:1),bend+(k===1?.012*Math.sin(Math.PI*t):0),t*length);uv.push(k/2,t);}
 }
 for(let j=0;j<segments;j++)for(let k=0;k<2;k++){const a=j*3+k;idx.push(a,a+3,a+1,a+1,a+3,a+4);}return tint(geometry(p,uv,idx),shade);
}
function torso(){
 // The neck and head are part of one smooth surface, avoiding stacked spheres.
 const profiles=[[-.91,.006,.012,.13],[-.83,.084,.09,.16],[-.73,.138,.146,.17],[-.62,.137,.15,.15],[-.49,.124,.15,.10],[-.34,.19,.209,.02],[-.12,.234,.244,-.015],[.12,.22,.22,-.025],[.31,.157,.159,-.03],[.49,.073,.08,-.035],[.60,.006,.01,-.035]];
 const shape=new THREE.CatmullRomCurve3(profiles.map(a=>new THREE.Vector3(a[1],a[2],a[3]))),lengths=new THREE.CatmullRomCurve3(profiles.map(a=>new THREE.Vector3(0,0,a[0]))),p=[],uv=[],idx=[],colors=[];
 const back=new THREE.Color(0x899a92),breast=new THREE.Color(0xe3e4d9),head=new THREE.Color(0xd8e0d7),c=new THREE.Color(),rings=48,sides=28;
 for(let j=0;j<=rings;j++){const t=j/rings,s=shape.getPoint(t),z=lengths.getPoint(t).z;for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,top=Math.cos(a),x=Math.sin(a)*Math.max(.003,s.x),y=top*Math.max(.004,s.y)+s.z;p.push(x,y,z);uv.push(k/sides,t);c.copy(breast).lerp(back,Math.max(0,top)*.84);if(z<-.43)c.lerp(head,Math.min(1,(-z-.43)*4));colors.push(c.r,c.g,c.b);}}
 for(let j=0;j<rings;j++)for(let k=0;k<sides;k++){const a=j*(sides+1)+k;idx.push(a,a+sides+1,a+1,a+1,a+sides+1,a+sides+2);}
 const g=geometry(p,uv,idx);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const samples=Array.from({length:193},(_,i)=>({z:lengths.getPoint(i/192).z,s:shape.getPoint(i/192)}));
 g.userData.surface=(x,z)=>{let j=1;while(j<samples.length-1&&samples[j].z<z)j++;const a=samples[j-1],b=samples[j],f=THREE.MathUtils.clamp((z-a.z)/(b.z-a.z),0,1),s=a.s.clone().lerp(b.s,f);return s.z+s.y*Math.sqrt(Math.max(0,1-(x/Math.max(.01,s.x))**2));};return g;
}
function wingArm(side){
 const p=[],uv=[],idx=[],span=12,chord=5;
 for(let i=0;i<=span;i++){const t=i/span,x=t*.98,leading=-.11-Math.sin(t*Math.PI)*.18,trailing=.29-t*.08;for(let j=0;j<=chord;j++){const v=j/chord;p.push(side*x,Math.sin(v*Math.PI)*.07+Math.sin(t*Math.PI)*.018,leading+(trailing-leading)*v);uv.push(v,t);}}
 for(let i=0;i<span;i++)for(let j=0;j<chord;j++){const a=i*(chord+1)+j;const triangles=[a,a+1,a+chord+1,a+1,a+chord+2,a+chord+1];if(side<0)for(let k=0;k<triangles.length;k+=3)[triangles[k+1],triangles[k+2]]=[triangles[k+2],triangles[k+1]];idx.push(...triangles);}
 return tint(geometry(p,uv,idx),0xb6c5ba);
}
export function createBird(){
 const bird=new THREE.Group();bird.name='forest-bird';
 const map=featherTexture(),plumage=new THREE.MeshStandardNodeMaterial({map,vertexColors:true,side:THREE.DoubleSide,roughness:.78}),bodyMat=new THREE.MeshStandardNodeMaterial({vertexColors:true,roughness:.86}),dark=new THREE.MeshStandardNodeMaterial({color:0x111f1c,roughness:.18}),horn=new THREE.MeshStandardNodeMaterial({color:0x687b74,roughness:.5});
 const add=(g,m,parent=bird,name='')=>{const mesh=new THREE.Mesh(g,m);mesh.name=name;parent.add(mesh);return mesh;};
 const bodyGeometry=torso(),surface=bodyGeometry.userData.surface;delete bodyGeometry.userData.surface;add(bodyGeometry,bodyMat,bird,'continuous-body-neck-head');
 const back=[];
 // Scapulars overlap across the back and blend the shoulder into the wing root.
 for(const side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<5;i++){
  const f=feather(.28-row*.028,.046,0xbdcbc0,8);f.rotateY(side*(.22+row*.12));f.translate(side*(.045+row*.041),0,-.30+i*.068);
  const p=f.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k),z=p.getZ(k);p.setY(k,surface(x,z)+.012+(row*5+4-i)*.004+side*.001);}f.computeVertexNormals();back.push(f);
 }
 add(merged(back),plumage,bird,'layered-scapulars');
 const wings=[],tips=[];
 for(const side of [-1,1]){
  const root=new THREE.Group();root.position.set(side*.16,.045,-.17);root.name=side<0?'left-shoulder':'right-shoulder';bird.add(root);wings.push(root);
  const inner=[wingArm(side)];
  // Trailing secondaries, followed by two staggered rows of coverts.
  for(let i=0;i<9;i++){const f=feather(.61-i*.018,.078,0xaebdb4);f.rotateY(side*(.07+i*.016));f.translate(side*(.10+i*.087),.005+i*.006,-.12-i*.008);inner.push(f);}
  for(let row=0;row<2;row++)for(let i=0;i<12;i++){const f=feather(row?.19:.34,row?.048:.060,row?0xd3ddd0:0xc3cfc2,8);f.rotateY(side*.17);f.translate(side*(.045+i*.079+row*.018),.09+row*.05+i*.003,-.17-row*.035);inner.push(f);}
  add(merged(inner),plumage,root,'arm-secondaries-coverts');
  const wrist=new THREE.Group();wrist.position.set(side*.82,.015,-.20);wrist.name='flexing-wrist';root.add(wrist);tips.push(wrist);
  const primaries=[];
  for(let i=0;i<10;i++){const f=feather(.61+Math.sin(i/9*Math.PI)*.12-i*.004,.057,i>6?0x748c85:0x93aaa0);f.rotateY(side*(.30+i*.076));f.translate(side*(i*.027),.025+i*.006,i*.047);primaries.push(f);}
  for(let i=0;i<7;i++){const f=feather(.28,.052,0xb8c9bc,8);f.rotateY(side*(.32+i*.07));f.translate(side*(i*.032),.105+i*.005,i*.038);primaries.push(f);}
  add(merged(primaries),plumage,wrist,'separated-primary-feathers');
 }
 const tail=new THREE.Group();tail.position.set(0,-.045,.43);bird.add(tail);const rectrices=[];
 for(let i=-4;i<=4;i++){const f=feather(.56-Math.abs(i)*.025,.059,Math.abs(i)>2?0xb8c7bd:0xa2b6ae);f.rotateY(i*.095);f.translate(i*.021,.003*(4-Math.abs(i)),0);rectrices.push(f);}add(merged(rectrices),plumage,tail,'fan-tail');
 // Small eyes with ivory orbital rims and restrained catchlights.
 const eyes=[],rims=[],glints=[];
 for(const side of [-1,1]){
  const eye=new THREE.SphereGeometry(1,14,10);eye.scale(.025,.027,.026);eye.translate(side*.126,.201,-.765);eyes.push(eye);
  const rim=new THREE.SphereGeometry(1,14,10);rim.scale(.027,.030,.030);rim.translate(side*.121,.201,-.764);rims.push(rim);
  const glint=new THREE.SphereGeometry(.006,6,4);glint.translate(side*.145,.211,-.774);glints.push(glint);
 }
 add(merged(rims),new THREE.MeshStandardNodeMaterial({color:0xd2d4b2,roughness:.8}),bird,'orbital-rims');add(merged(eyes),dark,bird,'eyes');add(merged(glints),new THREE.MeshBasicNodeMaterial({color:0xe7eee9}),bird,'eye-catchlights');
 // Closed upper/lower beak, with a subtle seam instead of a cone point.
 const beak=new THREE.SphereGeometry(1,16,10);beak.scale(.039,.028,.108);beak.translate(0,.136,-.934);add(beak,horn,bird,'tapered-beak');
 const details=[];
 for(const side of [-1,1]){const nostril=new THREE.SphereGeometry(1,8,5);nostril.scale(.006,.005,.014);nostril.translate(side*.032,.15,-.924);details.push(nostril);const seam=new THREE.SphereGeometry(1,12,6);seam.scale(.003,.002,.080);seam.translate(side*.033,.13,-.94);details.push(seam);}
 add(merged(details),dark,bird,'beak-seam-nares');
 const feet=[];for(const side of [-1,1])for(let i=0;i<3;i++){const toe=new THREE.CapsuleGeometry(.009,.095,3,5);toe.rotateX(Math.PI/2);toe.translate(side*.07+(i-1)*.014,-.16,.34+i*.014);feet.push(toe);}add(merged(feet),horn,bird,'tucked-feet');
 bird.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return {bird,wings,update(state){
  bird.position.set(state.x,state.y,state.z);bird.rotation.set(state.pitch,state.yaw,state.bank,'YXZ');
  const rush=Math.max(0,Math.min(1,(state.speed-14)/8)),effort=Math.max(0,state.pitch)*1.4+rush*.4,burst=Math.max(0,Math.sin(state.time*.72))**6,amplitude=.045+burst*.34+effort*.17,phase=state.time*7;
  for(let i=0;i<2;i++){const side=i?1:-1;wings[i].rotation.z=side*(.10+Math.sin(phase)*amplitude);wings[i].rotation.y=-state.bank*.06+side*rush*.045;tips[i].rotation.z=side*(.045+Math.sin(phase-.55)*amplitude*.45);tips[i].rotation.x=-.025+Math.sin(phase-.7)*amplitude*.12;}
  tail.rotation.x=state.pitch*.4;tail.rotation.y=-state.bank*.16;tail.scale.x=1+Math.max(0,state.pitch)*.55+Math.abs(state.bank)*.2;
 }};
}
