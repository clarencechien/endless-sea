const VS=`attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}`;
const FS=`precision highp float;varying vec2 uv;
uniform sampler2D photo,depth;uniform vec4 fit;uniform vec2 drift,resolution;uniform float time,night,warm,rain,original;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=uv*fit.xy+fit.zw;float d=texture2D(depth,p).r;
 p+=drift*(d-.3);vec3 source=texture2D(photo,p).rgb;
 float sky=1.-smoothstep(.02,.15,texture2D(depth,p).g);
 vec3 tint=mix(vec3(1.),vec3(.35,.48,.72),night*.8);
 vec3 c=source*tint*mix(1.,.5,night);
 c=mix(c,c*vec3(1.1,.94,.83)+vec3(.035,.009,0.),warm*.35);
 // Keep original clouds and highlights. This is an ambient relight, not a new sky.
 c+=sky*night*vec3(.018,.025,.045);c=mix(c,source,original);
 if(rain>.5){
  vec2 grid=uv*vec2(resolution.x/resolution.y*24.,24.);vec2 cell=floor(grid),local=fract(grid)-.5;float seed=hash(cell);
  local.y+=sin(time*.35+seed*30.)*.08;float drop=length(local*vec2(1.,.65));
  float bead=(1.-smoothstep(.035,.065,drop))*step(.62,seed);
  vec3 refracted=texture2D(photo,p+local*.018).rgb*tint*mix(1.,.5,night);c=mix(c,refracted,bead*.65);
  c+=vec3(.12)*bead*(1.-night*.5);c*=.96;
 }
 c*=1.-dot(uv-.5,uv-.5)*.17;gl_FragColor=vec4(c,1.);
}`;
export function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,VS),fs=shader(gl.FRAGMENT_SHADER,FS);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const u=Object.fromEntries(['photo','depth','fit','drift','resolution','time','night','warm','rain','original'].map(k=>[k,gl.getUniformLocation(program,k)]));let textures=[],aspect=2;
 function texture(image,unit){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 return {load(photo,depth){const next=[texture(photo,0),texture(depth,1)];textures.forEach(t=>gl.deleteTexture(t));textures=next;aspect=photo.width/photo.height;gl.uniform1i(u.photo,0);gl.uniform1i(u.depth,1);},draw(s){
  if(!textures.length)return;const r=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1300000/(r.width*r.height)));const w=Math.max(2,Math.round(r.width*scale)),h=Math.max(2,Math.round(r.height*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
  const ca=w/h;let x=ca<aspect?ca/aspect:1,y=ca>aspect?aspect/ca:1;x/=1.025;y/=1.025;
  gl.uniform4f(u.fit,x,y,Math.max(0,Math.min(1-x,s.position-x/2)),(1-y)/2);gl.uniform2f(u.drift,...s.drift);gl.uniform2f(u.resolution,w,h);for(const k of ['time','night','warm','rain','original'])gl.uniform1f(u[k],s[k]);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 },dispose(){textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
