// Simplex kernel adapted from Ashima Arts / Stefan Gustavson, MIT.
// Copyright and permission notice: public/third-party-notices.txt.
// Continuous simplex fields avoid the square interpolation cells of value noise.
// Cloud depth is suggested by optical thickness and a directional light probe.
export const skyShader = /* glsl */`
vec3 skyMod289(vec3 x){return x-floor(x/289.)*289.;}
vec4 skyMod289(vec4 x){return x-floor(x/289.)*289.;}
vec4 skyPermute(vec4 x){return skyMod289((x*34.+1.)*x);}
float skyNoise(vec3 v){
 const vec2 C=vec2(1./6.,1./3.);
 vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz),l=1.-g;
 vec3 i1=min(g,l.zxy),i2=max(g,l.zxy);
 vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-.5;
 i=skyMod289(i);
 vec4 p=skyPermute(skyPermute(skyPermute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 vec4 j=p-49.*floor(p/49.),xx=floor(j/7.),yy=floor(j-7.*xx);
 vec4 x=(xx*2.+.5)/7.-1.,y=(yy*2.+.5)/7.-1.,h=1.-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.,sh=-step(h,vec4(0.));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy,a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y),p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
 vec4 inv=1.792842914-.853734721*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
 p0*=inv.x;p1*=inv.y;p2*=inv.z;p3*=inv.w;
 vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m*=m;
 return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float cloudField(vec3 p,float footprint){
 float value=0.,weight=.52;
 const mat3 rotation=mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64);
 for(int i=0;i<5;i++){
  float attenuation=1.-smoothstep(.28,.9,footprint);
  value+=skyNoise(p)*weight*attenuation;p=rotation*p*2.03+vec3(17.1,9.2,11.7);footprint*=2.03;weight*=.48;
 }
 return .5+value*.5;
}
vec3 sunDir(){float a=(uDayHours-6.)/24.*2.*PI;return normalize(vec3(-cos(a)*.68,sin(a)*.55,-1.));}
vec3 nightLights(vec3 rd,vec3 moonDir,float night,float pixelAngle,bool detailed){
 float h=max(rd.y,0.);
 vec3 color=mix(vec3(.055,.078,.13),vec3(.009,.018,.052),1.-exp(-h*3.));
 float moonDistance=length(rd-moonDir);
 color+=vec3(.10,.16,.25)*exp(-moonDistance*12.)*.34;
 color+=vec3(.11,.17,.22)*exp(-moonDistance*45.)*.16;
 float moonDisk=1.-smoothstep(.0135-pixelAngle,.0135+pixelAngle,moonDistance);
 float lunarGrain=moonDisk>0.?.92+.08*skyNoise(rd*155.):.92;
 color=mix(color,vec3(.78,.85,.85)*lunarGrain,moonDisk);
 if(detailed&&night>.001){
  // Jitter the stars within their cells; pixel filtering keeps them small and steady.
  vec2 stars=vec2(atan(rd.z,rd.x),asin(clamp(rd.y,-1.,1.)))*vec2(220.,180.);
  vec2 cell=floor(stars),offset=vec2(hash(cell+19.7),hash(cell+83.2))*.6+.2;
  float seed=hash(cell),radius=.055+.065*hash(cell+7.1),starWidth=max(radius,pixelAngle*180.*.65);
  float star=(1.-smoothstep(0.,starWidth,length(fract(stars)-offset)))*radius/starWidth;
  vec3 tint=mix(vec3(.64,.78,1.),vec3(1.,.87,.69),hash(cell+37.));
  color+=tint*step(.991,seed)*star*smoothstep(.02,.24,h)*(.88+.12*sin(uTime*.17+seed*81.));
  float galaxy=exp(-pow((rd.x*.4+rd.y*.7+rd.z*.2-.16)/.17,2.));
  float dust=cloudField(rd*6.+vec3(17.,0.,3.),pixelAngle*6.);
  color+=vec3(.055,.068,.105)*galaxy*dust*dust*smoothstep(.05,.35,h);
 }
 if(night>.001&&h>.025){
  float azimuth=atan(rd.x,-rd.z),polar=uChapter>3.5&&uChapter<4.5?1.:.20;
  vec3 ribbon=vec3(rd.x,0.,rd.z)/max(length(rd.xz),.001);
  float drift=uTime*.012;
  // Two overlapping, curved veils, with fine non-repeating rays instead of bars.
  for(int i=0;i<2;i++){
   float layer=float(i),arc=.19+layer*.095+.058*sin(azimuth*2.+drift+layer)+.025*sin(azimuth*5.-drift*.7);
   float bend=skyNoise(ribbon*3.+vec3(0.,drift,layer*9.))*.025;
   float height=h-arc-bend;
   float veil=exp(-abs(height)*29.)*.45+exp(-max(height,0.)*13.)*smoothstep(-.018,.025,height)*.55;
   float rays=.74;
   if(detailed)rays+=.14*skyNoise(ribbon*65.+vec3(0.,h*5.-drift,layer*13.))+.07*skyNoise(ribbon*149.+vec3(h*9.,drift,3.));
   vec3 hue=mix(vec3(.12,.40,.32),vec3(.25,.17,.37),smoothstep(-.015,.13,height));
   color+=hue*veil*rays*polar*(.32-layer*.10)*smoothstep(.025,.12,h);
  }
 }
 return color;
}
vec3 sky(vec3 rd,bool detailed){
 vec3 sunlight=sunDir();float golden=clamp(uMood,0.,1.),blue=clamp(uMood-1.,0.,1.);
 float h=max(rd.y,0.),night=1.-smoothstep(-.14,.10,sunlight.y);
 float pixelAngle=2.*uFov/uResolution.y;
 vec3 zenith=mix(vec3(.27,.52,.68),vec3(.29,.43,.55),golden);zenith=mix(zenith,vec3(.11,.16,.30),blue);
 vec3 horizon=mix(vec3(.79,.87,.87),vec3(.94,.76,.57),golden);horizon=mix(horizon,vec3(.61,.48,.57),blue);
 vec3 color=mix(horizon,zenith,1.-exp(-h*3.2));
 vec3 sunColor=mix(vec3(1.,.91,.73),vec3(1.,.72,.43),golden);
 float s=max(dot(rd,sunlight),0.);
 color+=sunColor*(pow(s,10.)*.12+pow(s,85.)*.12)*(1.-night);
 float sunDistance=length(rd-sunlight),sunDisk=1.-smoothstep(.009-pixelAngle,.009+pixelAngle,sunDistance);
 color=mix(color,vec3(1.,.96,.83),sunDisk*(1.-night));
 vec3 moonDir=normalize(vec3(-sunlight.x,-sunlight.y*.72,-1.));
 if(night>.001)color=mix(color,nightLights(rd,moonDir,night,pixelAngle,detailed),night);
 if(rd.y>.003){
  float depth=1./(h+.22);
  vec2 p=rd.xz*depth*1.45+uCamera.xz*.000045+vec2(uTime*.0015,0.);
  float footprint=pixelAngle*depth*1.45;
  vec2 warp=vec2(skyNoise(vec3(p*.55,2.1)),skyNoise(vec3(p*.55+13.,7.4)))*.32;
  vec3 samplePoint=vec3((p+warp)*1.45,3.7);
  float body;
  if(detailed)body=cloudField(samplePoint,footprint*1.45);
  else body=.5+.5*(skyNoise(samplePoint)*.52+skyNoise(mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64)*samplePoint*2.03+vec3(17.1,9.2,11.7))*.25);
  float density=smoothstep(.43,.72,body);
  float horizonFade=smoothstep(.006,.13,h);
  float alpha=(1.-exp(-density*2.4))*horizonFade*mix(1.,.62,night);
  vec3 light=normalize(mix(sunlight,moonDir,night));
  vec3 probePoint=samplePoint+vec3(light.x*.24,light.z*.24,.12);
  float probe=body;
  if(detailed)probe=.5+.5*(skyNoise(probePoint)*.68+skyNoise(mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64)*probePoint*2.03+vec3(17.1,9.2,11.7))*.32);
  float relief=clamp((body-probe)*1.5,-.18,.3);
  float transmission=exp(-density*2.8);
  vec3 shadow=mix(vec3(.43,.56,.65),vec3(.54,.48,.48),golden);
  vec3 lit=mix(vec3(.94,.96,.93),vec3(.99,.80,.59),golden);
  shadow=mix(shadow,vec3(.21,.23,.34),blue);lit=mix(lit,vec3(.64,.50,.59),blue);
  vec3 cloud=mix(shadow,lit,clamp(.35+transmission*.45+relief,0.,1.));
  cloud+=sunColor*pow(s,9.)*transmission*(1.-transmission)*.65;
  vec3 nightCloud=mix(vec3(.024,.037,.067),vec3(.12,.16,.21),transmission*.45+max(relief,0.));
  nightCloud+=vec3(.14,.20,.24)*pow(max(dot(rd,moonDir),0.),12.)*transmission*.32;
  cloud=mix(cloud,nightCloud,night);
  // Distance haze unifies the distant cloud bank with the horizon.
  cloud=mix(color,cloud,smoothstep(.008,.20,h)*.86+.14);
  color=mix(color,cloud,alpha);
  if(detailed){
  vec3 highPoint=vec3(p*.66+vec2(.0,uTime*.0007),21.);
  highPoint.x+=skyNoise(highPoint*.7)*.6;highPoint.y*=4.3;
  float cirrus=cloudField(highPoint,footprint*2.8);
  float wisps=smoothstep(.55,.78,cirrus)*smoothstep(.025,.25,h)*.27*(1.-alpha*.6);
  color=mix(color,mix(lit,vec3(.11,.14,.19),night),wisps);
  }
 }
 return color;
}
`;
