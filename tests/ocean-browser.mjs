import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const artifacts=process.env.ARTIFACTS_DIR||'/tmp/endless-sea-artifacts';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1100,height:760}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});await page.locator('#fly').click();
 const frames=n=>page.evaluate(n=>new Promise(resolve=>{function frame(){if(--n<=0)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),n);
 async function small(enabled){await page.locator('#world').evaluate((c,enabled)=>{if(enabled){c.style.width='440px';c.style.height='300px';}else{c.style.removeProperty('width');c.style.removeProperty('height');}},enabled);await frames(2);}
 async function phase(name){await page.locator(`[data-time="${name}"]`).click();await small(true);await frames(65);await small(false);}
 async function wind(value){await page.locator('#settings').click();await page.locator('#wind').fill(String(value));await page.locator('.close-panel').click();assert.equal(await page.evaluate(()=>window.endlessSea.getState().wind),value);await frames(3);}
 async function capture(name){await page.screenshot({path:`${artifacts}/ocean-${name}.png`});assert.deepEqual(errors,[]);console.log(`${name}: rendered without shader errors`);}
 const sample=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const canvas=document.querySelector('#world'),gl=canvas.getContext('webgl2'),pixels=new Uint8Array(32*32*4);gl.readPixels(Math.floor(canvas.width*.18),Math.floor(canvas.height*.2),32,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);resolve(Array.from(pixels));})));
 await frames(5);await capture('golden');const first=await sample();await frames(15);const second=await sample();
 const difference=first.reduce((sum,v,i)=>sum+Math.abs(v-second[i]),0)/first.length;assert.ok(difference>.05,'The rendered ocean surface must move');
 assert.ok(first.some((v,i)=>i%4!==3&&v>10),'The water shader must draw real color');
 await phase('morning');await wind(1.6);await capture('morning-wind');
 await small(true);await page.keyboard.down('w');await page.waitForFunction(()=>window.endlessSea.getState().y<=24,null,{timeout:120000});await page.keyboard.up('w');await frames(10);await small(false);await capture('low-flight-wind');
 assert.ok(await page.evaluate(()=>window.endlessSea.getState().y)>=18);
 await wind(.3);await capture('low-flight-calm');
 await phase('night');await capture('night');
 await page.locator('#chapter-select').selectOption('2');await phase('morning');await wind(.8);await capture('coast');
 const resources=await page.evaluate(()=>window.endlessSea.getResources());assert.ok(resources.textures<=7);
 await page.setViewportSize({width:390,height:844});await page.locator('#chapter-select').selectOption('1');await frames(5);await capture('mobile');
 assert.equal(await page.locator('#world').evaluate(c=>c.width),390);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);console.log('PASS: actual sea-pixel motion, high/low wind, near-water flight, day/night, shoreline and mobile render; no shader errors or extra texture allocations.');
}finally{await browser.close();}
