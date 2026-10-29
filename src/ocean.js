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
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.03+17.1;a*=.5;}return v;}
vec3 sunDir(){float a=(uDayHours-6.)/24.*2.*PI;return normalize(vec3(-cos(a)*.68,sin(a)*.55,-1.));}
vec3 sky(vec3 rd,bool clouds){
 float golden=clamp(uMood,0.,1.),blue=clamp(uMood-1.,0.,1.);
 vec3 zenith=mix(vec3(.28,.53,.66),vec3(.28,.43,.52),golden);zenith=mix(zenith,vec3(.10,.15,.29),blue);
 vec3 horizon=mix(vec3(.79,.87,.84),vec3(.93,.73,.51),golden);horizon=mix(horizon,vec3(.62,.48,.54),blue);
 float h=max(rd.y,0.);vec3 col=mix(horizon,zenith,1.-exp(-h*3.1));
 float s=max(dot(rd,sunDir()),0.);vec3 sun=mix(vec3(1.,.88,.63),vec3(1.,.67,.32),golden);sun=mix(sun,vec3(.91,.65,.58),blue);
 col+=sun*pow(s,10.)*.12+sun*pow(s,100.)*.19;
 float disk=smoothstep(.99978,.99991,s);col=mix(col,mix(vec3(1.,.96,.78),vec3(.95,.81,.78),blue),disk*(1.-blue*.4));
 if(clouds && rd.y>.005){
  vec2 p=rd.xz/(rd.y+.14)*1.65+vec2(uTime*.002,0.);
  float n=fbm(p*1.7+vec2(14,3));float n2=fbm(p*3.6-vec2(9,2));
  float c=smoothstep(.45,.72,n*.8+n2*.2)*smoothstep(.012,.16,rd.y);
  float wisps=smoothstep(.58,.8,fbm(p*vec2(.9,5.)+43.))*smoothstep(.03,.25,rd.y)*.25;
  vec3 cc=mix(vec3(.89,.88,.81),vec3(.86,.68,.53),golden);cc=mix(cc,vec3(.44,.39,.51),blue);
  cc*=.82+smoothstep(.4,.8,n2)*.34;
  col=mix(col,cc,clamp(c*.76+wisps,0.,.85));
 }
 float night=1.-smoothstep(-.14,.10,sunDir().y);
 vec3 moonDir=normalize(vec3(-sunDir().x,-sunDir().y*.72,-1.));
 vec3 nightSky=mix(vec3(.055,.075,.135),vec3(.008,.017,.055),smoothstep(0.,.7,h));
 float moon=max(dot(rd,moonDir),0.);nightSky+=vec3(.20,.27,.39)*pow(moon,45.)*.22;
 nightSky=mix(nightSky,vec3(.83,.87,.84),smoothstep(.99965,.99982,moon));
 if(clouds){vec2 sp=vec2(atan(rd.z,rd.x),asin(clamp(rd.y,-1.,1.)))*vec2(220.,180.);float star=step(.993,hash(floor(sp)))*(1.-smoothstep(.06,.35,length(fract(sp)-.5)));nightSky+=vec3(.67,.78,.91)*star*smoothstep(.025,.25,h)*(.7+.3*sin(uTime*.4+hash(floor(sp))*100.));}
 col=mix(col,nightSky,night);
 return col;
}
float sea(vec2 p){
 float t=uTime;float h=0.;float frequency=.026;float amp=1.55;float speed=.66;float angle=.3;
 for(int i=0;i<6;i++){
  vec2 d=vec2(sin(angle),cos(angle));float phase=dot(p,d)*frequency+t*speed;
  h+=sin(phase)*amp;
  frequency*=1.83;amp*=.49;speed*=1.31;angle+=2.17;
 }
 return h*uWind;
}
vec3 normalSea(vec2 p,float dist){
 vec2 deriv=vec2(0.);float frequency=.026,amp=1.55,speed=.66,angle=.3;
 for(int i=0;i<12;i++){
  vec2 d=vec2(sin(angle),cos(angle));float phase=dot(p,d)*frequency+uTime*speed;
  float footprint=max(1.,dist*dist/(max(uCamera.y,18.)*uResolution.y*2.));
  float attenuation=exp(-frequency*footprint*.6);
  deriv+=d*cos(phase)*amp*frequency*attenuation;
  frequency*=1.83;amp*=.52;speed*=1.31;angle+=2.17;
 }
 return normalize(vec3(-deriv.x*uWind,1.,-deriv.y*uWind));
}
void main(){
 vec2 uv=(vUv-.5)*2.;uv.x*=uResolution.x/uResolution.y;
 vec3 rd=normalize(uRotation*vec3(uv*uFov,-1.));
 vec3 color;
 if(rd.y>-.0004){color=sky(rd,true);}else{
  float t=-uCamera.y/rd.y;vec3 p;
  for(int i=0;i<5;i++){p=uCamera+rd*t;float h=sea(p.xz);t=max(0.,(h-uCamera.y)/rd.y);}
  p=uCamera+rd*t;
  float dist=length(p.xz-uCamera.xz);
  vec3 n=normalSea(p.xz,dist);vec3 v=-rd;
  vec3 refl=reflect(rd,n);refl.y=abs(refl.y);
  float fresnel=.025+.975*pow(1.-max(dot(n,v),0.),5.);
  vec3 reflected=sky(refl,false);
  float blue=clamp(uMood-1.,0.,1.);
  vec3 water=mix(vec3(.028,.145,.17),vec3(.008,.025,.047),blue);
  water+=vec3(.018,.07,.063)*(sea(p.xz)*.13+.4);
  float shore=10000.;
  if(uChapter>1.5){for(int i=0;i<6;i++){vec2 q=(p.xz-uIslands[i].xy)/uIslands[i].zw;float angle=atan(q.y,q.x);float coast=1.+.075*sin(angle*5.)+.045*sin(angle*9.+.8);shore=min(shore,(length(q)/coast-(uChapter<2.5?.94:uChapter<4.5?.996:.985))*min(uIslands[i].z,uIslands[i].w));}}
  float shallow=exp(-max(shore,0.)*.012)*step(-15.,shore);
  vec3 coastColor=vec3(.065,.40,.36);
  if(uChapter>2.5&&uChapter<3.5)coastColor=vec3(.055,.23,.25);
  if(uChapter>3.5&&uChapter<4.5){water=mix(water,vec3(.035,.14,.21),.3);coastColor=vec3(.18,.43,.51);}
  if(uChapter>4.5)coastColor=vec3(.075,.16,.17);
  water=mix(water,coastColor,shallow*.8);
  color=mix(water,reflected,fresnel*.88+.07);
  float surf=pow(.5+.5*sin(shore*.28-uTime*.95+noise(p.xz*.045)*3.),12.)*exp(-abs(shore-8.)*.038)*step(0.,shore);
  color=mix(color,vec3(.78,.85,.77),surf*.48*smoothstep(.18,.75,noise(p.xz*.16)));
  vec3 halfVec=normalize(sunDir()+v);
  float nh=max(dot(n,halfVec),0.);float nv=max(dot(n,v),.001);float nl=max(dot(n,sunDir()),.001);
  float rough=.034;float a2=rough*rough;
  float den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den);
  float k=.025;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
  float F=.025+.975*pow(1.-max(dot(v,halfVec),0.),5.);
  float spec=min(5.,D*G*F/(4.*nv*nl+.001))*nl;
  vec3 sunColor=mix(vec3(1.,.87,.61),vec3(1.,.70,.37),clamp(uMood,0.,1.));
  color+=sunColor*spec*1.1*(1.-blue*.7)*smoothstep(-.05,.08,sunDir().y);
  float glint=pow(max(dot(refl,sunDir()),0.),180.);
  color+=sunColor*glint*.20*smoothstep(-.05,.08,sunDir().y);
  vec3 moonDir=normalize(vec3(-sunDir().x,-sunDir().y*.72,-1.));
  color+=vec3(.19,.29,.43)*pow(max(dot(refl,moonDir),0.),140.)*(1.-smoothstep(-.14,.10,sunDir().y));
  float foam=smoothstep(.19,.33,1.-n.y)*smoothstep(.48,.72,noise(p.xz*.25+uTime*.07));
  color=mix(color,vec3(.60,.72,.70),foam*.19*exp(-dist*.0005));
  float fog=1.-exp(-dist*.000033);color=mix(color,sky(vec3(rd.x,.001,rd.z),false),fog*.87);
 }
 color=clamp(color,0.,1.);
 color=pow(color,vec3(.94));
 float vignette=1.-.12*pow(length((vUv-.5)*1.25),2.);color*=vignette;
 color+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/255.;
 gl_FragColor=vec4(color,1.);
}
`;
