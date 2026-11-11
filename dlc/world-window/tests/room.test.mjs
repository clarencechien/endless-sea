import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from '../vendor/three.module.min.js';
import {alignCamera} from '../room.js';

test('off-axis room camera keeps the outdoor photo plane aligned across viewports and eye positions',()=>{
 for(const [w,h]of [[1240,802],[390,520],[844,410]])for(const eye of [[0,0],[84,-36],[-84,36]]){
  const camera=new PerspectiveCamera(34,1,1,5000);alignCamera(camera,w,h,eye);
  for(const [x,y]of [[0,0],[-w*.32,h*.3],[w*.32,-h*.3]]){
   const p=new Vector3(x,y,0).project(camera);
   assert.ok(Math.abs(p.x-x/(w/2))<1e-10);
   assert.ok(Math.abs(p.y-y/(h/2))<1e-10);
  }
 }
});
test('joinery in front of the photo acquires actual depth-dependent parallax',()=>{
 const camera=new PerspectiveCamera(34,1,1,5000),project=z=>new Vector3(240,80,z).project(camera).x;
 alignCamera(camera,1240,802,[0,0]);const far=project(0),near=project(100);
 alignCamera(camera,1240,802,[24,0]);assert.ok(Math.abs(project(0)-far)<1e-10);assert.ok(Math.abs(project(100)-near)>.001);
});
