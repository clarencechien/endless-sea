const VS=`attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}`;
const FS=`precision highp float;varying vec2 uv;
uniform sampler2D photo,depth;uniform vec4 fit;uniform vec2 drift,resolution;uniform float time,night,warm,rain,original,panorama,center,animate;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 project(vec2 screen){
 if(panorama<.5)return screen*fit.xy+fit.zw;
 vec3 ray=normalize(vec3((screen.x-.5)*1.02*resolution.x/resolution.y,(.5-screen.y)*1.02+.025,1.));
 return vec2(fract(center+atan(ray.x,ray.z)/6.2831853),acos(clamp(ray.y,-1.,1.))/3.14159265);
}
vec2 parallax(vec2 screen){vec2 base=project(screen),p=base;for(int i=0;i<3;i++){float d=texture2D(depth,p).r;p=base+drift*(d-.3);}return p;}
// Random centers and radii in two independent layers prevent an aligned bead grid.
vec3 beads(vec2 q,float scale,float salt){
 vec2 g=q*scale,id=floor(g),f=fract(g);float a=hash(id+salt),b=hash(id+salt+19.);
 vec2 pos=vec2(.22+.56*a,.20+.60*b),v=(f-pos)/vec2(.10+.11*b,.13+.14*a);
 float r=length(v),mask=(1.-smoothstep(.7,1.,r))*step(.57,hash(id+salt+47.));
 return vec3(v*mask*.0035,mask);
}
vec3 rivulet(vec2 q){
 float col=floor(q.x*13.),seed=hash(vec2(col,43.)),cycle=time*(.065+seed*.065)+seed*17.;
 float head=fract(cycle)*1.5-.25;
 float x=(col+.22+.56*seed)/13.+sin(q.y*28.+seed*45.)*.0018;
 vec2 v=vec2((q.x-x)/(.0035+seed*.0018),(q.y-head)/.012);
 float drop=(1.-smoothstep(.55,1.,length(v)))*step(.28,seed);
 float behind=head-q.y,width=.001+(.0012*exp(-max(0.,behind)*28.));
 float trail=(1.-smoothstep(width*.3,width,abs(q.x-x)))*smoothstep(0.,.016,behind)*(1.-smoothstep(.09,.20,behind))*step(.28,seed);
 return vec3(v*drop*.006+vec2((q.x-x)*trail*2.,0.),max(drop,trail*.20));
}
// A conservative, painted water mask keeps the shore, trees and rocks still.
vec2 waterOffset(vec2 p){float water=texture2D(depth,p).b*animate;if(water<.001)return vec2(0.);return vec2(sin(p.y*740.+time*.65)+sin(p.x*493.-time*.4),sin(p.x*620.+time*.7))*.00016*water;}
vec3 lighting(vec3 source){
 vec3 c=source*mix(vec3(1.),vec3(.35,.48,.72),night*.8)*mix(1.,.5,night);
 c=mix(c,c*vec3(1.1,.94,.83)+vec3(.035,.009,0.),warm*.35);return mix(c,source,original);
}
void main(){
 vec2 p=parallax(uv),ripple=waterOffset(p);p+=ripple;vec3 source=texture2D(photo,p).rgb;vec3 c=lighting(source);
 if(rain>.001){
  vec2 q=uv*vec2(resolution.x/resolution.y,1.);vec3 a=beads(q,22.,3.),b=beads(q+vec2(.017,.009),39.,79.),r=rivulet(q);
  vec2 bend=a.xy+b.xy*.4+r.xy;float wet=clamp(a.z+b.z*.55+r.z,0.,1.);
  vec2 offset=vec2(bend.x*resolution.y/resolution.x,bend.y);
  vec2 rp=parallax(uv+offset)+ripple;vec3 refract=texture2D(photo,rp).rgb;
  vec2 blur=vec2(.00032,.00032);vec3 softened=(source*6.+texture2D(photo,p+blur).rgb+texture2D(photo,p-blur).rgb)*.125;
  vec3 rainColor=lighting(mix(softened,refract,wet));
  float glint=clamp(-bend.y*27.-bend.x*12.,-.09,.12);
  rainColor=rainColor*vec3(.92,.96,.98)+vec3(glint)*(1.-night*(1.-original)*.65);
  c=mix(c,rainColor,rain);
 }
 c*=1.-dot(uv-.5,uv-.5)*.12;gl_FragColor=vec4(c,1.);
}`;
export function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,VS),fs=shader(gl.FRAGMENT_SHADER,FS);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const u=Object.fromEntries(['photo','depth','fit','drift','resolution','time','night','warm','rain','original','panorama','center','animate'].map(k=>[k,gl.getUniformLocation(program,k)]));let textures=[],aspect=2;
 function texture(image,unit){const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(Math.max(image.width,image.height)>limit){const copy=document.createElement('canvas'),scale=limit/Math.max(image.width,image.height);copy.width=Math.max(1,Math.floor(image.width*scale));copy.height=Math.max(1,Math.floor(image.height*scale));const ctx=copy.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,copy.width,copy.height);image=copy;}const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 return {load(photo,depth){const next=[texture(photo,0),texture(depth,1)];textures.forEach(t=>gl.deleteTexture(t));textures=next;aspect=photo.width/photo.height;gl.uniform1i(u.photo,0);gl.uniform1i(u.depth,1);},draw(s){
  if(!textures.length)return;const r=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2,Math.sqrt(2100000/(r.width*r.height)));const w=Math.max(2,Math.round(r.width*scale)),h=Math.max(2,Math.round(r.height*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
  const ca=w/h;let x=ca<aspect?ca/aspect:1,y=ca>aspect?aspect/ca:1;x/=1.025;y/=1.025;
  gl.uniform4f(u.fit,x,y,Math.max(0,Math.min(1-x,s.position-x/2)),(1-y)/2);gl.uniform2f(u.drift,...s.drift);gl.uniform2f(u.resolution,w,h);for(const k of ['time','night','warm','rain','original','panorama','center','animate'])gl.uniform1f(u[k],s[k]);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 },dispose(){textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
