// Wind-aligned swell packets and an analytic simplex slope field. The long waves
// share their height and derivatives; small ripples are shading-only detail.
export const waveShader = /* glsl */`
vec2 oceanGradient(vec2 cell){
 float x=hash(cell)*2.-1.;vec2 g=vec2(x-floor(x+.5),abs(x)-.5);
 return g*inversesqrt(max(dot(g,g),.001));
}
vec3 oceanCorner(vec2 cell,vec2 offset){
 vec2 gradient=oceanGradient(cell);float m=max(.5-dot(offset,offset),0.);
 float m2=m*m,m3=m2*m,m4=m2*m2,projection=dot(gradient,offset);
 return vec3(m4*projection,m4*gradient-8.*m3*projection*offset);
}
// Returns height and both spatial derivatives, without square interpolation cells.
vec3 oceanNoise(vec2 p){
 const float F=.366025404,G=.211324865;
 vec2 cell=floor(p+(p.x+p.y)*F),a=p-cell+(cell.x+cell.y)*G;
 vec2 stepCorner=a.x>a.y?vec2(1.,0.):vec2(0.,1.);
 return 70.*(oceanCorner(cell,a)+oceanCorner(cell+stepCorner,a-stepCorner+G)+oceanCorner(cell+1.,a-1.+2.*G));
}
const vec2 oceanWind=vec2(.819648,.572868);
float seaFootprint(float distanceToEye){return max(.15,distanceToEye*distanceToEye*2.*uFov/(max(uCamera.y,18.)*uResolution.y));}
vec3 swellSurface(vec2 p,float footprint){
 vec3 a=oceanNoise(p*.0053-oceanWind*uTime*.008);
 vec3 b=oceanNoise(p*.0071+vec2(37.1,19.7)-oceanWind*uTime*.006);
 vec2 q=p+vec2(a.x*14.,b.x*10.);
 vec2 dx=vec2(1.+a.y*.0053*14.,b.y*.0071*10.);
 vec2 dz=vec2(a.z*.0053*14.,1.+b.z*.0071*10.);
 vec3 result=vec3(0.);
 for(int i=0;i<4;i++){
  float index=float(i),seed=hash(vec2(index+8.3,17.9));
  float angle=.61+(seed-.5)*1.05;
  vec2 direction=vec2(cos(angle),sin(angle));
  float frequency=.023*pow(1.67,index)*(.86+.28*hash(vec2(index,31.7)));
  float amplitude=1.65*pow(.49,index)*(.82+.36*hash(vec2(index,4.1)));
  float phase=dot(q,direction)*frequency-uTime*sqrt(9.81*frequency)+seed*6.283185;
  float mixA=cos(seed*6.283185),mixB=sin(seed*6.283185);
  float envelope=.72+.28*(a.x*mixA+b.x*mixB);
  vec2 phaseGradient=vec2(dot(direction,dx),dot(direction,dz))*frequency;
  vec2 envelopeGradient=.28*(a.yz*.0053*mixA+b.yz*.0071*mixB);
  float shape=sin(phase)+.13*sin(phase*2.),slope=cos(phase)+.26*cos(phase*2.);
  float attenuation=exp(-frequency*footprint*.55);
  result+=vec3(envelope*shape,envelope*slope*phaseGradient+shape*envelopeGradient)*amplitude*attenuation*.28;
 }
 // Broad, wind-stretched patches interrupt the phase-coherent swell crests.
 vec2 acrossWind=vec2(-oceanWind.y,oceanWind.x);
 vec2 flow=vec2(dot(q,oceanWind),dot(q,acrossWind));
 float patchFrequency=.018,patchHeight=.9;
 for(int i=0;i<3;i++){
  float band=float(i),stretch=.55+band*.13;
  vec3 wavelet=oceanNoise(flow*vec2(patchFrequency,patchFrequency*stretch)-vec2(uTime*(.09+band*.08),uTime*.012)+vec2(band*41.3,band*29.7));
  vec2 qGradient=(oceanWind*wavelet.y+acrossWind*wavelet.z*stretch)*patchFrequency;
  result+=vec3(wavelet.x,dot(qGradient,dx),dot(qGradient,dz))*patchHeight*exp(-patchFrequency*footprint*.65);
  patchFrequency*=2.09;patchHeight*=.43;
 }
 return result*uWind;
}
float sea(vec2 p){return swellSurface(p,0.).x;}
vec3 normalSea(vec2 p,float footprint,vec3 swell){
 vec2 across=vec2(-oceanWind.y,oceanWind.x);
 vec2 windSpace=vec2(dot(p,oceanWind),dot(p,across));
 vec2 slope=swell.yz;
 float frequency=.23,amplitude=.07;
 for(int i=0;i<4;i++){
  // Different drift speeds and stretched, curved wavelets break long straight ridges.
  float band=float(i),stretch=.43+band*.08;
  vec2 samplePoint=windSpace*vec2(frequency,frequency*stretch)-vec2(uTime*(.24+band*.13),uTime*.025)+vec2(band*37.1,band*19.3);
  vec3 detail=oceanNoise(samplePoint);
  float attenuation=exp(-frequency*footprint*1.1);
  slope+=(oceanWind*detail.y+across*detail.z*stretch)*frequency*amplitude*attenuation*uWind;
  frequency*=2.31;amplitude*=.37;
 }
 return normalize(vec3(-slope.x,1.,-slope.y));
}
`;
