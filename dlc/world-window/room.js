import * as T from './vendor/three.module.min.js';

// The photograph lies at z=0. An off-axis camera keeps that plane fixed while
// the real joinery and objects in front of it acquire small, correct parallax.
export function alignCamera(camera,width,height,eye){
 const distance=height/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
 camera.aspect=width/height;camera.position.set(eye[0],eye[1],distance);
 camera.updateProjectionMatrix();
 camera.projectionMatrix.elements[8]=-eye[0]/(width/2);
 camera.projectionMatrix.elements[9]=-eye[1]/(height/2);
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 camera.updateMatrixWorld();
}

function surface(kind){
 const c=document.createElement('canvas');c.width=512;c.height=256;
 const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);let seed=49317;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(y*c.width+x)*4,n=random()-.5;
  let rgb;
  if(kind==='wood'){
   const grain=Math.sin(y*.8+Math.sin(x*.012)*2.8+Math.sin(x*.027+y*.03))*.5+.5;
   const pores=Math.pow(grain,14)*19,slow=Math.sin(y*.058+Math.sin(x*.007))*6;
   rgb=[190+slow-pores+n*9,161+slow-pores+n*8,119+slow-pores*.8+n*7];
  }else if(kind==='linen'){
   const weave=(x%3===0?-7:1)+(y%3===0?-5:1);rgb=[222+n*9+weave,215+n*9+weave,197+n*9+weave];
  }else{const v=229+n*17;rgb=[v,v-4,v-12];}
  for(let k=0;k<3;k++)im.data[i+k]=rgb[k];im.data[i+3]=255;
 }
 ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
 tex.repeat.set(kind==='wood'?2:3,kind==='wood'?1:3);return tex;
}

function roundedBoard(width,depth,thickness){
 const x=-width/2,y=-depth/2,r=2,s=new T.Shape();
 s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
 s.lineTo(x+width,y+depth-r);s.quadraticCurveTo(x+width,y+depth,x+width-r,y+depth);
 s.lineTo(x+r,y+depth);s.quadraticCurveTo(x,y+depth,x,y+depth-r);
 s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelSize:1,bevelThickness:1,bevelSegments:2,steps:1,curveSegments:3});
 g.rotateX(-Math.PI/2);
 const pos=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+width/2)/width,Math.abs(normal.getY(i))>.5?(pos.getZ(i)+depth/2)/depth:pos.getY(i)/thickness*.18);
 return g;
}

export function createRoom(canvas,container,aperture,onState){
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,1,5000),group=new T.Group();scene.add(group);
 const textures=[surface('plaster'),surface('wood'),surface('linen')];
 const paint=new T.MeshStandardMaterial({color:0xe9e4d7,roughness:.84,map:textures[0],bumpMap:textures[0],bumpScale:.12});
 const wall=new T.MeshStandardMaterial({color:0xe5dfd0,roughness:1,map:textures[0],bumpMap:textures[0],bumpScale:.22});
 const oak=new T.MeshStandardMaterial({color:0xffffff,roughness:.62,map:textures[1],bumpMap:textures[1],bumpScale:.12});
 const cloth=new T.MeshStandardMaterial({color:0xfff9e9,roughness:1,map:textures[2],bumpMap:textures[2],bumpScale:.18,side:T.DoubleSide});
 const ceramic=new T.MeshStandardMaterial({color:0x82927c,roughness:.29,metalness:0});
 const tea=new T.MeshStandardMaterial({color:0x30271b,roughness:.15});
 const seal=new T.MeshStandardMaterial({color:0x514e43,roughness:.92});
 const sky=new T.HemisphereLight(0xe2ecff,0xb1a28c,2.1);scene.add(sky);
 const bounce=new T.DirectionalLight(0xffead0,1.2);bounce.position.set(250,200,900);scene.add(bounce);
 const sun=new T.DirectionalLight(0xffedca,2.8);sun.castShadow=true;
 sun.shadow.mapSize.set(768,768);sun.shadow.bias=-.0002;sun.shadow.normalBias=.6;sun.shadow.radius=2;
 scene.add(sun,sun.target);
 let layout='',lastLight=-1,lost=false,disposed=false,frames=0,drawKey='';
 const add=(geometry,material,x,y,z,shadow=true)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;group.add(m);return m;};
 const box=(w,h,d,x,y,z,mat)=>{
  let geometry=new T.BoxGeometry(w,h,d);
  if(mat===paint&&Math.min(w,h,d)>6){geometry.dispose();geometry=roundedBoard(w-2,h-2,d-2);geometry.rotateX(Math.PI/2);geometry.translate(0,0,-(d-2)/2);}
  return add(geometry,mat,x,y,z);
 };
 function rebuild(r,p){
  for(const child of [...group.children]){child.traverse(o=>o.geometry?.dispose());group.remove(child);}
  const w=p.width,h=p.height,cx=p.left-r.left+w/2-r.width/2,cy=r.height/2-(p.top-r.top+h/2);
  const unit=r.width<600?.64:1,trim=12*unit,recess=38*unit;
  // Painted frame at the back of the wall opening; no central mullion.
  for(const side of [-1,1]){
   box(trim,h+trim*2,16*unit,cx+side*(w/2+trim/2),cy,8*unit,paint);
   box(w,trim,16*unit,cx,cy+side*(h/2+trim/2),8*unit,paint);
   box(1.6,h,2,cx+side*(w/2+.8),cy,1,seal);
   box(w,1.6,2,cx,cy+side*(h/2+.8),1,seal);
   box(recess-trim,h+recess*2,48*unit,cx+side*(w/2+trim+(recess-trim)/2),cy,24*unit,wall);
   box(w+trim*2,recess-trim,48*unit,cx,cy+side*(h/2+trim+(recess-trim)/2),24*unit,wall);
  }
  // Four solid wall segments leave a real opening, with the photo visible through it.
  const edge=w/2+recess,top=h/2+recess,far=r.width*1.1;
  box(far,h+top*2,10,cx-edge-far/2,cy,48*unit,wall);
  box(far,h+top*2,10,cx+edge+far/2,cy,48*unit,wall);
  box(w+recess*2,r.height,10,cx,cy+top+r.height/2,48*unit,wall);
  box(w+recess*2,r.height,10,cx,cy-top-r.height/2,48*unit,wall);
  // A softly bevelled oak sill, with geometry extending towards the viewer.
  const sillY=cy-h/2-16*unit,sillTop=sillY+12*unit;
  add(roundedBoard(w+102*unit,115*unit,12*unit),oak,cx,sillY,45*unit);
  // Glazed ceramic cup, inner wall, tea surface and a true curved handle.
  const cup=new T.Group();cup.position.set(cx+w*.32,sillTop+1,70*unit);cup.scale.setScalar(unit);group.add(cup);
  const profile=[[0,0],[13,0],[17,2],[19,7],[20,32],[19.5,36],[18,37],[16.8,35],[16.5,8],[0,8]].map(a=>new T.Vector2(...a));
  const mug=new T.Mesh(new T.LatheGeometry(profile,40),ceramic);mug.castShadow=mug.receiveShadow=true;cup.add(mug);
  const handle=new T.Mesh(new T.TorusGeometry(10,3,10,28),ceramic);handle.position.set(21,21,0);handle.scale.x=.8;handle.castShadow=true;cup.add(handle);
  const drink=new T.Mesh(new T.CircleGeometry(16.5,40),tea);drink.rotation.x=-Math.PI/2;drink.position.y=29;cup.add(drink);
  // Folds are mesh depth, not painted stripes. Coarse cloth, fine weave normal variation.
  const curtainWidth=(r.width<600?43:102),curtainTop=r.height/2-(r.width<600?42:60),curtainBottom=sillY-42*unit;
  const rod=add(new T.CylinderGeometry(1.8*unit,1.8*unit,w+recess*2+curtainWidth*1.6,12),seal,cx,curtainTop+7*unit,80*unit);rod.rotation.z=Math.PI/2;
  for(const side of [-1,1]){
   add(new T.SphereGeometry(3.5*unit,12,8),seal,cx+side*(w/2+recess+curtainWidth*.8),curtainTop+7*unit,80*unit);
   const g=new T.PlaneGeometry(curtainWidth,curtainTop-curtainBottom,36,48),pos=g.attributes.position;
   for(let i=0;i<pos.count;i++){
    const u=(pos.getX(i)+curtainWidth/2)/curtainWidth,v=(curtainTop-curtainBottom)/2-pos.getY(i),t=v/(curtainTop-curtainBottom);
    pos.setXYZ(i,pos.getX(i)+side*Math.sin(t*Math.PI)*7*unit,pos.getY(i)+Math.sin(u*6*Math.PI)*1.7*Math.pow(t,6),Math.sin(u*6*Math.PI)*9*unit+Math.sin(u*14*Math.PI+t)*2*unit);
   }
   g.computeVertexNormals();add(g,cloth,cx+side*(w/2+recess+curtainWidth*.26),(curtainTop+curtainBottom)/2,78*unit);
  }
  sun.position.set(cx-w*.33,cy+h*.8,-380);sun.target.position.set(cx,cy-h/2,80);
  const extent=Math.max(r.width,r.height)*.85;Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:3000});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;container.classList.remove('has-room3d');onState('css');});
 canvas.addEventListener('webglcontextrestored',()=>{lost=false;layout='';drawKey='';});
 return {
  draw({night=0,warm=0,drift=[0,0]}={}){
   if(lost||disposed)return;
   const r=container.getBoundingClientRect(),p=aperture.getBoundingClientRect();if(!r.width||!r.height)return;
   const key=[r.width,r.height,p.left-r.left,p.top-r.top,p.width,p.height].map(v=>v.toFixed(1)).join(',');
   if(key!==layout){layout=key;const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1500000/(r.width*r.height)));renderer.setPixelRatio(scale);renderer.setSize(r.width,r.height,false);rebuild(r,p);drawKey='';}
   const eye=[drift[0]*14000,drift[1]*14000],next=[...eye,night,warm].map(v=>v.toFixed(3)).join(',');if(next===drawKey)return;drawKey=next;
   alignCamera(camera,r.width,r.height,eye);
   if(lastLight!==`${night}:${warm}`){lastLight=`${night}:${warm}`;sky.intensity=2.1-night*1.2;bounce.intensity=1.2+night*.25;sun.intensity=2.8*(1-night);sun.color.setRGB(1,.94-warm*.13,.80-warm*.2);}
   renderer.render(scene,camera);frames++;container.classList.add('has-room3d');onState('webgl');
  },
  getStats:()=>({frames,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixels:canvas.width*canvas.height}),
  dispose(){disposed=true;container.classList.remove('has-room3d');group.traverse(o=>o.geometry?.dispose());for(const m of [paint,wall,oak,cloth,ceramic,tea,seal])m.dispose();textures.forEach(t=>t.dispose());sun.shadow.dispose();renderer.dispose();}
 };
}
