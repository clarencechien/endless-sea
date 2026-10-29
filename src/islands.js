import * as THREE from 'three';
import { islandsForChapter, islandHeight } from './terrain.js';
const vertexShader=`varying vec3 world;varying vec3 norm;varying vec2 localXZ;varying float shelter;attribute float occlusion;void main(){localXZ=position.xz;world=(modelMatrix*vec4(position,1.)).xyz;norm=normalize(mat3(modelMatrix)*normal);shelter=occlusion;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`;
const fragmentShader=`
precision highp float;
varying vec3 world;varying vec3 norm;varying vec2 localXZ;varying float shelter;
uniform float mood;uniform float chapter;uniform float time;uniform vec3 sunlight;uniform sampler2D elevation;uniform vec2 extent;uniform float peak;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.07+19.)*.28+noise(p*4.13-11.)*.15;}
float surface(vec3 p,vec3 weight){return dot(vec3(noise(p.zy),noise(p.xz),noise(p.xy)),weight);}
float fissures(vec2 p){vec2 cell=floor(p),f=fract(p);float a=9.,b=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 seed=vec2(hash(cell+g),hash(cell+g+31.));float d=length(g+seed-f);if(d<a){b=a;a=d;}else b=min(b,d);}return 1.-smoothstep(.018,.065,b-a);}
float shadow(vec3 light){if(light.y<.02)return 1.;float result=1.;for(int i=0;i<5;i++){float stepDistance=28.*pow(1.9,float(i));vec3 probe=vec3(localXZ.x,world.y,localXZ.y)+light*stepDistance;vec2 uv=probe.xz/extent+.5;if(all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.)))){float ground=texture2D(elevation,uv).r*peak;result=min(result,smoothstep(-7.,15.,probe.y+4.-ground));}}return .34+.66*result;}
void main(){
 if(world.y<.4)discard;
 float distanceToCamera=length(cameraPosition-world);vec3 n=normalize(norm),weights=pow(abs(n),vec3(4.));weights/=max(dot(weights,vec3(1.)),.001);
 float broad=surface(world*.012,weights),grain=surface(world*.13,weights),fine=surface(world*.67,weights);
 float textureValue=broad*.48+grain*.37+fine*.15;
 float slope=1.-n.y;vec3 rock=mix(vec3(.16,.18,.16),vec3(.42,.41,.33),textureValue);
 vec3 foliage=mix(vec3(.045,.115,.058),vec3(.23,.32,.13),broad);foliage*=.76+.34*grain;
 // Tiny rounded canopy highlights suggest tree clusters without expensive foliage meshes.
 float canopy=pow(max(0.,noise(world.xz*.18)),2.);foliage+=vec3(.025,.04,.009)*canopy;
 vec3 sand=mix(vec3(.49,.43,.29),vec3(.81,.75,.55),grain);
 vec3 color=mix(sand,foliage,smoothstep(5.,19.+broad*9.,world.y));
 color=mix(color,rock,smoothstep(.22,.56,slope)*smoothstep(12.,38.,world.y));
 vec3 emission=vec3(0.);
 if(chapter>2.5&&chapter<3.5){
  float strata=.88+.12*sin(world.y*.10+fbm(world.xz*.006)*14.);
  color=mix(vec3(.12,.16,.16),vec3(.43,.46,.43),textureValue)*strata;
  color=mix(color,foliage,smoothstep(.71,.96,n.y)*smoothstep(.28,.66,broad)*.72);
  float snow=smoothstep(580.,780.,world.y+broad*160.)*smoothstep(.3,.8,n.y);color=mix(color,vec3(.79,.84,.83),snow);
 }
 if(chapter>3.5&&chapter<4.5){
  float cracks=fissures(localXZ*.019+vec2(fbm(localXZ*.007)*2.));
  vec3 blueIce=mix(vec3(.10,.30,.40),vec3(.34,.58,.65),grain);
  vec3 snow=mix(vec3(.70,.83,.86),vec3(.91,.95,.93),fine);
  color=mix(blueIce,snow,smoothstep(.5,.94,n.y));color=mix(color,vec3(.07,.25,.34),cracks*.55);
  color+=vec3(.035,.075,.085)*pow(1.-max(dot(n,normalize(cameraPosition-world)),0.),3.);
 }
 if(chapter>4.5){
  color=mix(vec3(.045,.043,.043),vec3(.25,.19,.15),textureValue);
  float angle=atan(localXZ.y,localXZ.x),radial=length(localXZ/extent)*2.3;
  float branch=pow(.5+.5*sin(angle*13.+fbm(localXZ*.009)*9.+radial*8.),24.);
  float hot=branch*smoothstep(.35,.64,noise(localXZ*.019))*smoothstep(70.,200.,world.y);
  float crater=(1.-smoothstep(.11,.19,radial))*(.7+.3*noise(localXZ*.08));
  float pulse=.90+.10*sin(time*.6+world.x*.016);
  emission=(vec3(.85,.16,.015)*hot+vec3(.92,.24,.025)*crater)*pulse;
  color+=vec3(.10,.025,.008)*smoothstep(100.,220.,world.y)*broad;
 }
 // Wet rock at the waterline; fine detail fades naturally with distance.
 color*=mix(.66,1.,smoothstep(.5,6.,world.y));
 color*=1.-shelter*.4;
 vec3 sun=normalize(sunlight);float daylight=smoothstep(-.16,.14,sun.y);
 vec3 light=sun.y>0.?sun:normalize(vec3(-sun.x,-sun.y,-1.));
 float diffuse=max(dot(n,light),0.);float visibility=shadow(light);
 vec3 warmth=mix(vec3(1.,.84,.64),vec3(.94,1.,1.02),smoothstep(.05,.40,sun.y));
 vec3 lighting=mix(vec3(.075,.11,.18),vec3(.40,.48,.49),daylight)+warmth*diffuse*visibility*mix(.12,.72,daylight);
 color*=lighting;
 if(chapter>3.5&&chapter<4.5){vec3 halfway=normalize(light+normalize(cameraPosition-world));color+=vec3(.15,.20,.22)*pow(max(dot(n,halfway),0.),40.)*visibility*daylight;}
 color+=emission;
 vec3 haze=mix(vec3(.70,.81,.80),vec3(.86,.70,.52),clamp(mood,0.,1.));haze=mix(haze,vec3(.40,.39,.48),clamp(mood-1.,0.,1.));haze=mix(haze,vec3(.025,.045,.075),clamp(mood-2.,0.,1.));
 float fog=1.-exp(-distanceToCamera*(.00012+.00004*exp(-world.y*.006)));
 color=mix(color,haze,fog);gl_FragColor=vec4(color,1.);
}`;
export function createIslands(chapter=2){
 const group=new THREE.Group();
 const common={mood:{value:1},chapter:{value:chapter},time:{value:0},sunlight:{value:new THREE.Vector3(.52,.45,-1)}};
 for(const island of islandsForChapter(chapter)){
  const segments=160,count=segments+1,extent=new THREE.Vector2(island.rx*2.3,island.rz*2.3),peak=island.height*1.5;
  const geometry=new THREE.PlaneGeometry(extent.x,extent.y,segments,segments);geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position,heights=new Uint8Array(count*count),occlusion=new Float32Array(count*count);
  for(let v=0;v<pos.count;v++){const h=islandHeight(pos.getX(v)+island.x,pos.getZ(v)+island.z,island);pos.setY(v,h);heights[v]=Math.round(THREE.MathUtils.clamp(h/peak,0,1)*255);}
  for(let row=1;row<count-1;row++)for(let col=1;col<count-1;col++){const v=row*count+col;const curvature=(pos.getY(v-1)+pos.getY(v+1)+pos.getY(v-count)+pos.getY(v+count))*.25-pos.getY(v);occlusion[v]=THREE.MathUtils.clamp(curvature/(extent.x/segments)*.75,0,.8);}
  geometry.setAttribute('occlusion',new THREE.BufferAttribute(occlusion,1));geometry.computeVertexNormals();
  const elevation=new THREE.DataTexture(heights,count,count,THREE.RedFormat);elevation.minFilter=elevation.magFilter=THREE.LinearFilter;elevation.needsUpdate=true;
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{...common,elevation:{value:elevation},extent:{value:extent},peak:{value:peak}}});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(island.x,0,island.z);group.add(mesh);
 }
 group.visible=false;group.userData.material=group.children[0].material;return group;
}
export function disposeIslands(group){for(const mesh of group.children){mesh.geometry.dispose();mesh.material.uniforms.elevation.value.dispose();mesh.material.dispose();}}
