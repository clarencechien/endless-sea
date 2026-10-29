import test from 'node:test';
import assert from 'node:assert/strict';
import { createScore, encodeMidi, midiFrequency, LOOP_BEATS } from '../src/score.js';
import { ISLANDS, terrainHeight, keepAboveTerrain } from '../src/terrain.js';
test('both MIDI scores fit the loop with valid pitches and distinct arrangements',()=>{
 for(const chapter of [1,2])for(const n of createScore(chapter)){assert.ok(n.midi>=0&&n.midi<=127);assert.ok(n.velocity>0&&n.velocity<=127);assert.ok(n.beat>=0&&n.beat+n.duration<=LOOP_BEATS);}
 assert.notDeepEqual(createScore(1),createScore(2));assert.equal(midiFrequency(69),440);
});
test('MIDI export has a valid track length and matching note-on/note-off events',()=>{
 for(const chapter of [1,2]){
 const b=encodeMidi(chapter);assert.equal(new TextDecoder().decode(b.slice(0,4)),'MThd');assert.equal(new TextDecoder().decode(b.slice(14,18)),'MTrk');assert.equal(new DataView(b.buffer).getUint32(18),b.length-22);
 let i=22,on=0,off=0,ended=false;const readVar=()=>{let n=0,v;do{v=b[i++];n=n*128+(v&127);}while(v&128);return n;};
 while(i<b.length){readVar();const status=b[i++];if(status===255){const type=b[i++],length=readVar();i+=length;if(type===47)ended=true;}else if((status&240)===192)i++;else{if((status&240)===144)on++;if((status&240)===128)off++;i+=2;}}
 assert.equal(on,createScore(chapter).length);assert.equal(off,on);assert.ok(ended);
 }
});
test('terrain clearance protects every island summit and leaves high flight untouched',()=>{
 assert.equal(terrainHeight(0,1000),0);
 for(const island of ISLANDS){assert.ok(terrainHeight(island.x,island.z)>50);const f={x:island.x,z:island.z,y:18};keepAboveTerrain(f);assert.equal(f.y,terrainHeight(f.x,f.z)+24);f.y=2000;keepAboveTerrain(f);assert.equal(f.y,2000);}
});
