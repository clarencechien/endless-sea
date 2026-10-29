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

import { tiltAxes } from '../src/tilt.js';
import { createFlight, updateFlight } from '../src/flight.js';
test('tilt handles dead zone, left/right, climb/descent and landscape rotation',()=>{
 const neutral={beta:45,gamma:0};assert.deepEqual(tiltAxes({beta:46,gamma:2},neutral),{roll:0,pitch:0});
 assert.ok(tiltAxes({beta:70,gamma:25},neutral).roll>0);assert.ok(tiltAxes({beta:70,gamma:25},neutral).pitch>0);
 assert.ok(tiltAxes({beta:20,gamma:-25},neutral).roll<0);assert.ok(tiltAxes({beta:20,gamma:-25},neutral).pitch<0);
 const landscape=tiltAxes({beta:70,gamma:0},neutral,90);assert.ok(landscape.roll>.99);assert.equal(landscape.pitch,0);
 const f=createFlight();f.flying=true;for(let i=0;i<120;i++)updateFlight(f,new Set(),1/60,{roll:1,pitch:1});assert.equal(f.autopilot,false);assert.ok(f.x>0);assert.ok(f.y>128);
});

import { createJourney, advanceJourney, journeyState, setJourneyHour } from '../src/journey.js';
test('day advances one hour per real minute and counts musical beats independently of sky presets',()=>{
 const j=createJourney();advanceJourney(j,60);assert.equal(journeyState(j).hours,18);assert.equal(journeyState(j).beats,68);
 setJourneyHour(j,8);assert.equal(journeyState(j).hours,8);assert.equal(journeyState(j).beats,68);
 advanceJourney(j,1380);assert.equal(journeyState(j).hours,7);assert.equal(journeyState(j).day,2);assert.equal(journeyState(j).beats,1632);
});
