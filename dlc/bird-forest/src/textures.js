import * as THREE from 'three/webgpu';
import {random} from './world.js';
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return [c,c.getContext('2d')];}
function finish(c,repeat=false){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
export function leafTexture(){
 const [c,g]=canvas(256),rand=random(55);g.lineCap='round';g.strokeStyle='#777947';g.lineWidth=2;g.beginPath();g.moveTo(128,243);g.quadraticCurveTo(120,130,135,15);g.stroke();
 function leaf(x,y,angle,length){
  g.save();g.translate(x,y);g.rotate(angle);const w=length*.29,gradient=g.createLinearGradient(-w,0,w,0);gradient.addColorStop(0,'#344c27');gradient.addColorStop(.48,'#66854a');gradient.addColorStop(.52,'#779651');gradient.addColorStop(1,'#456634');g.fillStyle=gradient;
  g.beginPath();g.moveTo(0,3);g.bezierCurveTo(-w*1.3,-length*.28,-w,-length*.72,0,-length);g.bezierCurveTo(w,-length*.72,w*1.3,-length*.28,0,3);g.fill();g.strokeStyle='#b3bb7270';g.lineWidth=.8;g.beginPath();g.moveTo(0,0);g.lineTo(0,-length*.95);for(let i=1;i<6;i++){const y=-length*i/7;g.moveTo(0,y);g.lineTo(-w*Math.sin(Math.PI*i/7),y-length*.13);g.moveTo(0,y);g.lineTo(w*Math.sin(Math.PI*i/7),y-length*.13);}g.stroke();g.restore();
 }
 for(let i=0;i<6;i++){const y=210-i*31,x=127+i*.6,length=43+rand()*17;for(const side of [-1,1]){g.strokeStyle='#85915b';g.lineWidth=1;g.beginPath();g.moveTo(x,y+7);g.lineTo(x+side*16,y-6);g.stroke();leaf(x+side*12,y,side*(.72+rand()*.23),length);}}
 leaf(132,42,.08,36);return finish(c);
}
export function barkTexture(){
 const [c,g]=canvas(256),rand=random(99);g.fillStyle='#756e60';g.fillRect(0,0,256,256);
 for(let i=0;i<1800;i++){const x=rand()*256,y=rand()*256,w=.4+rand()*3,len=3+rand()*36;g.fillStyle=i%3?`rgba(36,35,27,${.08+rand()*.24})`:`rgba(195,185,157,${rand()*.3})`;g.fillRect(x,y,w,len);if(y+len>256)g.fillRect(x,y-256,w,len);}
 for(let i=0;i<18;i++){g.strokeStyle='#2f302d55';g.lineWidth=.8+rand();const x=rand()*256,y=rand()*256;g.beginPath();g.ellipse(x,y,2+rand()*5,7+rand()*15,.1,0,Math.PI*2);g.stroke();}return finish(c,true);
}
export function groundTexture(){
 const [c,g]=canvas(512),rand=random(91),data=g.createImageData(512,512),grids=[8,32,128].map(n=>({n,a:Float32Array.from({length:n*n},()=>rand())}));
 function noise(x,y,{n,a}){x=x/512*n;y=y/512*n;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),at=(a1,b)=>a[((b+n)%n)*n+(a1+n)%n];return (at(ix,iy)*(1-u)+at(ix+1,iy)*u)*(1-v)+(at(ix,iy+1)*(1-u)+at(ix+1,iy+1)*u)*v;}
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const n=noise(x,y,grids[0])*.5+noise(x,y,grids[1])*.3+noise(x,y,grids[2])*.2,grain=rand()*13,moss=noise(x+31,y+41,grids[0]),i=(y*512+x)*4;data.data.set([42+n*57+grain,40+n*51+moss*18+grain,26+n*32+grain,255],i);}g.putImageData(data,0,0);
 for(let i=0;i<1200;i++){const x=rand()*512,y=rand()*512;g.save();g.translate(x,y);g.rotate(rand()*6.28);g.fillStyle=['#8c7b5138','#c8b78325','#33482e60','#66553e60'][i%4];g.beginPath();g.ellipse(0,0,1+rand()*2,2+rand()*5,0,0,6.28);g.fill();g.restore();}return finish(c,true);
}
export function featherTexture(){
 const [c,g]=canvas(256);g.fillStyle='#b5ae9a';g.fillRect(0,0,256,256);for(let y=0;y<256;y++){g.strokeStyle=`rgba(58,61,53,${.1+Math.sin(y*.7)*.06})`;g.beginPath();g.moveTo(0,y+24);g.lineTo(128,y);g.lineTo(256,y+24);g.stroke();}const tip=g.createLinearGradient(0,0,0,256);tip.addColorStop(0,'#28332c00');tip.addColorStop(.72,'#28332c00');tip.addColorStop(1,'#28332caa');g.fillStyle=tip;g.fillRect(0,0,256,256);g.fillStyle='#e1d9bb77';g.fillRect(127,0,2,256);return finish(c);
}
export function shaftTexture(){const [c,g]=canvas(128),a=g.createLinearGradient(0,0,128,0);a.addColorStop(0,'#fff0');a.addColorStop(.5,'#fff9');a.addColorStop(1,'#fff0');g.fillStyle=a;g.fillRect(0,0,128,128);g.globalCompositeOperation='destination-in';const b=g.createLinearGradient(0,0,0,128);b.addColorStop(0,'#fff0');b.addColorStop(.25,'#ffff');b.addColorStop(.8,'#fffa');b.addColorStop(1,'#fff0');g.fillStyle=b;g.fillRect(0,0,128,128);return finish(c);}
