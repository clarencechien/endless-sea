import * as THREE from 'three';

// A fixed cloud of tiny lights. World-space wrapping keeps flight unbounded.
export function createDream(scene){
 const count=96,positions=new Float32Array(count*3),seeds=new Float32Array(count);
 let seed=8543;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){positions.set([(random()-.5)*440,(random()-.5)*180,(random()-.5)*500],i*3);seeds[i]=random();}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 const uniforms={time:{value:0},origin:{value:new THREE.Vector3()},color:{value:new THREE.Color()},strength:{value:.25},pixelRatio:{value:1}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms,vertexShader:`
  attribute float seed;uniform float time;uniform vec3 origin;uniform float pixelRatio;varying float light;
  void main(){vec3 span=vec3(440.,180.,500.);vec3 p=mod(position-origin+span*.5,span)-span*.5+origin;
   p+=vec3(sin(time*.13+seed*35.)*2.,sin(time*.19+seed*21.)*1.8,0.);
   vec3 delta=p-origin;float edge=1.-smoothstep(.32,.49,max(max(abs(delta.x)/span.x,abs(delta.y)/span.y),abs(delta.z)/span.z));
   vec4 view=modelViewMatrix*vec4(p,1.);float distanceToEye=length(view.xyz);
   light=edge*smoothstep(5.,22.,distanceToEye)*(1.-smoothstep(160.,260.,distanceToEye))*(.65+.35*sin(time*.26+seed*30.))*smoothstep(4.,20.,p.y);
   gl_Position=projectionMatrix*view;gl_PointSize=clamp((190.+seed*230.)/max(8.,-view.z),1.2,6.)*pixelRatio;
  }`,fragmentShader:`
  precision highp float;uniform vec3 color;uniform float strength;varying float light;
  void main(){float r=length(gl_PointCoord-.5)*2.;float glow=exp(-r*r*5.)*(1.-smoothstep(.65,1.,r));gl_FragColor=vec4(color,glow*light*strength);}`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=3;scene.add(points);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 return {update(camera,time,chapter,mood,pixelRatio){
  points.visible=!reduced.matches;uniforms.origin.value.copy(camera.position);uniforms.time.value=time;uniforms.pixelRatio.value=pixelRatio;
  uniforms.color.value.set(chapter===4?0xb7f2ed:chapter===5?0xffbd83:0xffe4b0);
  uniforms.strength.value=(chapter===5?.42:.36)+Math.max(0,mood-1)*.09;
 },snapshot:()=>({particles:count,visible:points.visible})};
}
