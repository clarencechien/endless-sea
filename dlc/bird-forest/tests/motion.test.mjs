import test from 'node:test';
import assert from 'node:assert/strict';
import {tiltAxes,MotionControl} from '../src/motion.js';
test('tilt maps portrait and both landscape orientations to consistent flight axes',()=>{
 const n={beta:45,gamma:0};assert.deepEqual(tiltAxes(n,n),{turn:0,lift:0});
 const p=tiltAxes({beta:65,gamma:20},n);assert.ok(p.turn>.7&&p.lift>.7);
 const right=tiltAxes({beta:65,gamma:-20},n,90),left=tiltAxes({beta:25,gamma:20},n,-90);assert.ok(right.turn>.7&&right.lift>.7&&left.turn>.7&&left.lift>.7);
 assert.equal(tiltAxes({beta:-179,gamma:0},{beta:179,gamma:0}).lift,0);
 assert.deepEqual(tiltAxes({beta:46,gamma:2},n),{turn:0,lift:0});
});
test('stale sensor output clears safely and recenter discards old neutral',()=>{
 const m=new MotionControl();m.enabled=true;m.neutral={beta:45,gamma:0};m.sample={beta:70,gamma:30};m.lastSample=performance.now();m.angle=0;
 for(let i=0;i<60;i++)m.read(1/60);assert.ok(m.output.turn>.9);
 m.lastSample=-2000;assert.deepEqual(m.read(),{turn:0,lift:0});assert.equal(m.status,'stale');assert.equal(m.active,false);
 m.recenter();assert.equal(m.neutral,null);assert.equal(m.sample,null);assert.deepEqual(m.output,{turn:0,lift:0});
});
