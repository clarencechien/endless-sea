import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const artifacts=process.env.ARTIFACTS_DIR||'/tmp/endless-sea-artifacts';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1100,height:760}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.__testTimeAdvance=0;const now=performance.now.bind(performance);Object.defineProperty(performance,'now',{value:()=>now()+window.__testTimeAdvance});});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.endlessSea?.getState());await page.locator('#fly').click();
 const before=await page.evaluate(()=>window.endlessSea.getState().journey.beats);
 await page.evaluate(()=>window.__testTimeAdvance+=1440001);
 await page.waitForFunction(()=>window.endlessSea.getState().chapter===2);
 assert.ok(await page.locator('#chapter-notice').isVisible());console.log('Automatic chapter 2 verified');
 assert.ok(await page.evaluate(()=>window.endlessSea.getState().journey.beats)>=before+1632);
 const baseline=await page.evaluate(()=>window.endlessSea.getResources().geometries);
 for(const chapter of [3,4,5]){
  await page.evaluate(()=>window.__testTimeAdvance+=1440001);await page.waitForFunction(c=>window.endlessSea.getState().chapter===c,chapter);
  assert.equal(await page.locator('#chapter-select').inputValue(),String(chapter));console.log(`Automatic chapter ${chapter} verified`);
  await page.locator('[data-time="morning"]').click();

  assert.ok(await page.evaluate(()=>window.endlessSea.getRenderer().triangles)>100000);
  assert.ok(await page.evaluate(()=>window.endlessSea.getResources().geometries)<=baseline+2);
 }
 await page.evaluate(()=>window.__testTimeAdvance+=1440001);await page.waitForFunction(()=>window.endlessSea.getState().chapter===1);
 await page.locator('#chapter-select').selectOption('4');
 await page.evaluate(()=>window.__testTimeAdvance+=1440001);await page.waitForFunction(()=>window.endlessSea.getState().chapter===5);
 await page.close();
 console.log('Cycle, manual interval and resource bounds verified');
 const visual=await browser.newPage({viewport:{width:1100,height:760}});
 visual.on('pageerror',e=>errors.push(e.message));visual.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await visual.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 await visual.locator('#fly').click();await visual.locator('[data-time="morning"]').click();
 for(const chapter of [3,4,5]){await visual.locator('#chapter-select').selectOption(String(chapter));await visual.waitForFunction(c=>window.endlessSea.getState().chapter===c,chapter);await visual.screenshot({path:`${artifacts}/chapter-${chapter}.png`});}
 assert.deepEqual(errors,[]);
 console.log('PASS: five automatic 24-minute transitions, wraparound, manual chapter interval, beat continuity, all terrain renders and bounded geometry resources.');
}finally{await browser.close();}
