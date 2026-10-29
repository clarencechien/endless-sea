import * as THREE from 'three';

// A bounded world-space history: banking bends the wake instead of dragging a
// fixed streak with the camera. No particles or geometries accumulate over time.
export function createTrails(scene){
 const capacity=90,lifetime=2.8;
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{strength:{value:.22}},vertexShader:`attribute float fade;varying vec2 vUv;varying float vFade;void main(){vUv=uv;vFade=fade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;uniform float strength;varying vec2 vUv;varying float vFade;void main(){float soft=pow(max(0.,1.-abs(vUv.x*2.-1.)),2.);gl_FragColor=vec4(.87,.92,.94,soft*vFade*strength);}`});
 const streams=[-1,1].map(side=>{
  const geometry=new THREE.BufferGeometry(),position=new THREE.BufferAttribute(new Float32Array(capacity*6),3).setUsage(THREE.DynamicDrawUsage),fade=new THREE.BufferAttribute(new Float32Array(capacity*2),1).setUsage(THREE.DynamicDrawUsage);
  const uv=new Float32Array(capacity*4),indices=[];for(let i=0;i<capacity;i++){uv.set([0,i/(capacity-1),1,i/(capacity-1)],i*4);if(i<capacity-1){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
  geometry.setAttribute('position',position);geometry.setAttribute('fade',fade);geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);geometry.setDrawRange(0,0);
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);return {side,mesh,geometry,position,fade,history:[],last:-1};
 });
 const point=new THREE.Vector3(),tangent=new THREE.Vector3(),view=new THREE.Vector3(),across=new THREE.Vector3(),center=new THREE.Vector3();
 let clock=0;
 return {
  reset(){clock=0;for(const s of streams){s.history.length=0;s.last=-1;s.geometry.setDrawRange(0,0);}},
  update(plane,camera,dt,bank,mood){clock+=dt;plane.updateMatrixWorld();material.uniforms.strength.value=(.17+Math.min(Math.abs(bank),.6)*.15)*(1-Math.max(0,mood-1)*.13);
   for(const s of streams){
    point.set(s.side*4.52,.66,3.45).applyMatrix4(plane.matrixWorld);
    if(clock-s.last>=1/35){const sample=s.history.length===capacity?s.history.pop():{point:new THREE.Vector3(),time:0};sample.point.copy(point);sample.time=clock;s.history.unshift(sample);s.last=clock;}
    const count=s.history.length;
    for(let i=0;i<count;i++){
     const sample=s.history[i],age=clock-sample.time,progress=age/lifetime;
     center.copy(i===0?point:sample.point);center.y-=age*.18;center.x+=Math.sin(age*2.7+s.side)*age*.09;
     tangent.copy(s.history[Math.min(i+1,count-1)].point).sub(s.history[Math.max(0,i-1)].point);view.copy(camera.position).sub(center);across.crossVectors(tangent,view).normalize().multiplyScalar(.055+age*.16);
     s.position.setXYZ(i*2,center.x-across.x,center.y-across.y,center.z-across.z);s.position.setXYZ(i*2+1,center.x+across.x,center.y+across.y,center.z+across.z);
     const opacity=Math.max(0,1-progress)**2*Math.min(1,age/.09);s.fade.setX(i*2,opacity);s.fade.setX(i*2+1,opacity);
    }
    s.geometry.setDrawRange(0,Math.max(0,count-1)*6);s.position.needsUpdate=true;s.fade.needsUpdate=true;
   }
  },
  snapshot(){return {samples:streams.map(s=>s.history.length),capacity,segments:streams.reduce((n,s)=>n+Math.max(0,s.history.length-1),0)};}
 };
}
