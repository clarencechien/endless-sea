import { skyShader } from './sky.js';
import { waveShader } from './waves.js';

export const vertexShader = /* glsl */`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.999999,1.0);}
`;
export const fragmentShader = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamera;
uniform mat3 uRotation;
uniform float uFov;
uniform float uMood;
uniform float uDayHours;
uniform float uWind;
uniform float uChapter;
uniform vec4 uIslands[6];
const float PI=3.14159265;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
${skyShader}
${waveShader}
void main(){
 vec2 uv=(vUv-.5)*2.;uv.x*=uResolution.x/uResolution.y;
 vec3 rd=normalize(uRotation*vec3(uv*uFov,-1.));
 vec3 color;
 if(rd.y>-.0004){color=sky(rd,true);}else{
  float t=-uCamera.y/rd.y;vec3 p;
  for(int i=0;i<5;i++){p=uCamera+rd*t;float h=sea(p.xz)/(1.+pow(t*.0007,2.));t=max(0.,(h-uCamera.y)/rd.y);}
  p=uCamera+rd*t;
  float dist=length(p.xz-uCamera.xz);
  float footprint=seaFootprint(dist);vec3 swell=swellSurface(p.xz,footprint);
  vec3 n=normalSea(p.xz,footprint,swell);vec3 v=-rd;
  vec3 refl=reflect(rd,n);refl.y=abs(refl.y);
  float fresnel=.025+.975*pow(1.-max(dot(n,v),0.),5.);
  vec3 reflected=sky(refl,false);
  float blue=clamp(uMood-1.,0.,1.);
  vec3 water=mix(vec3(.028,.145,.17),vec3(.008,.025,.047),blue);
  water+=vec3(.018,.07,.063)*(swell.x*.13+.4);
  float shore=10000.;
  if(uChapter>1.5){for(int i=0;i<6;i++){vec2 q=(p.xz-uIslands[i].xy)/uIslands[i].zw;float angle=atan(q.y,q.x);float coast=1.+.075*sin(angle*5.)+.045*sin(angle*9.+.8);shore=min(shore,(length(q)/coast-(uChapter<2.5?.94:uChapter<4.5?.996:.985))*min(uIslands[i].z,uIslands[i].w));}}
  float shallow=exp(-max(shore,0.)*.012)*step(-15.,shore);
  vec3 coastColor=vec3(.065,.40,.36);
  if(uChapter>2.5&&uChapter<3.5)coastColor=vec3(.055,.23,.25);
  if(uChapter>3.5&&uChapter<4.5){water=mix(water,vec3(.035,.14,.21),.3);coastColor=vec3(.18,.43,.51);}
  if(uChapter>4.5)coastColor=vec3(.075,.16,.17);
  water=mix(water,coastColor,shallow*.8);
  float caustic=pow(max(0.,1.-abs(oceanNoise(p.xz*.09-oceanWind*uTime*.04).x)*3.),6.)*smoothstep(-.2,.4,oceanNoise(p.xz*.043+17.).x);
  water+=vec3(.10,.17,.12)*caustic*shallow*.34*exp(-dist*.001)*smoothstep(0.,.2,sunDir().y);
  color=mix(water,reflected,fresnel*.88+.07);
  float surf=pow(.5+.5*sin(shore*.28-uTime*.95+oceanNoise(p.xz*.045-oceanWind*uTime*.018).x*2.5),12.)*exp(-abs(shore-8.)*.038)*step(0.,shore);
  color=mix(color,vec3(.78,.85,.77),surf*.48*smoothstep(-.15,.6,oceanNoise(p.xz*.16-oceanWind*uTime*.06).x));
  vec3 halfVec=normalize(sunDir()+v);
  float nh=max(dot(n,halfVec),0.);float nv=max(dot(n,v),.001);float nl=max(dot(n,sunDir()),.001);
  float rough=.042+.025*smoothstep(250.,2600.,dist);float a2=rough*rough;
  float den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den);
  float k=.025;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
  float F=.025+.975*pow(1.-max(dot(v,halfVec),0.),5.);
  float spec=min(5.,D*G*F/(4.*nv*nl+.001))*nl;
  vec3 sunColor=mix(vec3(1.,.87,.61),vec3(1.,.70,.37),clamp(uMood,0.,1.));
  color+=sunColor*(spec/(1.+spec*.35))*.95*(1.-blue*.7)*smoothstep(-.05,.08,sunDir().y);
  float glint=pow(max(dot(refl,sunDir()),0.),180.);
  color+=sunColor*glint*.20*smoothstep(-.05,.08,sunDir().y);
  vec3 moonDir=normalize(vec3(-sunDir().x,-sunDir().y*.72,-1.));
  color+=vec3(.19,.29,.43)*pow(max(dot(refl,moonDir),0.),140.)*(1.-smoothstep(-.14,.10,sunDir().y));
  float foam=smoothstep(.018,.07,1.-n.y)*smoothstep(.10,.55,oceanNoise(p.xz*.19-oceanWind*uTime*.08).x);
  color=mix(color,vec3(.60,.72,.70),foam*.14*exp(-dist*.0005));
  float nightGlow=1.-smoothstep(-.12,.08,sunDir().y);
  float plankton=smoothstep(.18,.62,oceanNoise(p.xz*.027-oceanWind*uTime*.013).x);
  float lace=smoothstep(.10,.60,oceanNoise(p.xz*.19-oceanWind*uTime*.08).x)*smoothstep(.002,.025,1.-n.y);
  vec3 glowColor=uChapter>4.5?vec3(.20,.055,.015):vec3(.025,.19,.22);
  color+=glowColor*plankton*lace*nightGlow*exp(-dist*.0007)*(.25+shallow*.75);
  float fog=1.-exp(-dist*.000033);color=mix(color,sky(vec3(rd.x,.001,rd.z),false),fog*.87);
 }
 color=clamp(color,0.,1.);
 color=pow(color,vec3(.94));
 float vignette=1.-.12*pow(length((vUv-.5)*1.25),2.);color*=vignette;
 // Static triangular dithering softens 8-bit sky banding without temporal sparkle.
 color+=(hash(gl_FragCoord.xy)+hash(gl_FragCoord.xy+vec2(17.73,91.31))-1.)/255.;
 gl_FragColor=vec4(color,1.);
}
`;
