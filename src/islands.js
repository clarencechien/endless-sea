import * as THREE from 'three';
import { islandsForChapter, islandHeight } from './terrain.js';
export function createIslands(chapter=2){
 const group=new THREE.Group();
 const material=new THREE.ShaderMaterial({uniforms:{mood:{value:1},chapter:{value:chapter}},vertexShader:`
 varying vec3 world;varying vec3 norm;varying vec2 localXZ;
 void main(){localXZ=position.xz;world=(modelMatrix*vec4(position,1.)).xyz;norm=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}
 `,fragmentShader:`
 precision highp float;varying vec3 world;varying vec3 norm;varying vec2 localXZ;uniform float mood;uniform float chapter;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
 if(world.y<.4)discard;
 float tex=noise(world.xz*.035)*.55+noise(world.xz*.14)*.3+noise(world.xz*.6)*.15;
 vec3 grass=mix(vec3(.075,.16,.085),vec3(.23,.32,.13),tex);
 vec3 rock=mix(vec3(.26,.27,.23),vec3(.43,.41,.33),tex);
 vec3 sand=mix(vec3(.61,.55,.37),vec3(.85,.78,.57),tex);
 vec3 color=mix(sand,grass,smoothstep(5.,20.,world.y));
 color=mix(color,rock,smoothstep(.25,.65,1.-norm.y)*smoothstep(15.,55.,world.y));
 vec3 emission=vec3(0.);
 if(chapter>2.5&&chapter<3.5){color=mix(vec3(.13,.19,.19),vec3(.39,.43,.39),tex);color=mix(color,vec3(.16,.24,.13),smoothstep(.7,.96,norm.y)*.5);color*=.91+.09*sin(world.y*.07+noise(world.xz*.006)*9.);}
 if(chapter>3.5&&chapter<4.5){color=mix(vec3(.19,.43,.53),vec3(.84,.93,.94),smoothstep(.35,.95,norm.y));float cracks=pow(1.-abs(sin(world.x*.035+sin(world.z*.019)*3.)),22.)*noise(world.xz*.013);color=mix(color,vec3(.10,.29,.37),cracks*.46);}
 if(chapter>4.5){color=mix(vec3(.065,.055,.055),vec3(.22,.16,.13),tex);float channels=pow(.5+.5*sin(atan(localXZ.y,localXZ.x)*17.+length(localXZ)*.008+noise(localXZ*.012)*5.),30.);float hot=smoothstep(60.,190.,world.y)*channels*smoothstep(.22,.65,noise(localXZ*.021));emission=vec3(.68,.13,.018)*hot;color+=vec3(.16,.035,.008)*smoothstep(120.,230.,world.y);}
 float sun=max(dot(normalize(norm),normalize(vec3(.52,.45,-1.))),0.);
 color*=.64+sun*.65;color*=mix(vec3(1.03,1.02,.94),vec3(1.04,.91,.79),min(mood,1.));color*=1.-max(mood-1.,0.)*.32;
 float dist=length(cameraPosition-world);vec3 haze=mix(vec3(.70,.81,.80),vec3(.85,.68,.49),min(mood,1.));haze=mix(haze,vec3(.46,.41,.52),clamp(mood-1.,0.,1.));haze=mix(haze,vec3(.035,.05,.09),clamp(mood-2.,0.,1.));
 color+=emission;
 color=mix(color,haze,1.-exp(-dist*.00017));gl_FragColor=vec4(color,1.);
 }`});
 for(const island of islandsForChapter(chapter)){
  const geometry=new THREE.PlaneGeometry(island.rx*2.3,island.rz*2.3,160,160);geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  for(let v=0;v<pos.count;v++)pos.setY(v,islandHeight(pos.getX(v)+island.x,pos.getZ(v)+island.z,island));
  geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.position.set(island.x,0,island.z);group.add(mesh);
 }
 group.visible=false;group.userData.material=material;return group;
}

export function disposeIslands(group){for(const mesh of group.children)mesh.geometry.dispose();group.userData.material.dispose();}
