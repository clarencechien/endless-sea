import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,updateFlight,headingDegrees} from '../src/flight.js';
test('automatic cruise advances over the ocean without losing altitude',()=>{const f=createFlight();for(let i=0;i<600;i++)updateFlight(f,new Set(),1/60);assert.ok(f.z < -400);assert.ok(f.y>120&&f.y<140);assert.equal(f.autopilot,true);});
test('manual bank takes control and changes the heading',()=>{const f=createFlight();f.flying=true;for(let i=0;i<180;i++)updateFlight(f,new Set(['d']),1/60);assert.equal(f.autopilot,false);assert.ok(headingDegrees(f.heading)>20);assert.ok(f.x>0);});
test('sustained descent remains above the ocean',()=>{const f=createFlight();f.flying=true;for(let i=0;i<5000;i++)updateFlight(f,new Set(['w']),1/60);assert.equal(f.y,18);});
test('throttle stays bounded and frame gaps cannot teleport the plane',()=>{const f=createFlight();f.flying=true;for(let i=0;i<1000;i++)updateFlight(f,new Set(['arrowup']),1/60);assert.equal(f.throttle,145);const z=f.z;updateFlight(f,new Set(),100);assert.ok(Math.abs(z-f.z)<4);});
