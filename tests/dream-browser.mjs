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
 const frames=async(count)=>page.evaluate(n=>new Promise(resolve=>{function frame(){if(--n<=0)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);}),count);
 let baseline;
 for(const [chapter,phase,settle] of [[1,'golden',12],[2,'morning',45],[3,'morning',12],[4,'night',60],[5,'night',12]]){
  await page.locator('#chapter-select').selectOption(String(chapter));await page.locator(`[data-time="${phase}"]`).click();await frames(settle);
  assert.ok(await page.evaluate(()=>window.endlessSea.getRenderer().triangles)>2000,'Curved paper must render');
  const resources=await page.evaluate(()=>window.endlessSea.getResources());assert.ok(resources.textures<=7,'Paper reuses one fibre map and terrain disposes old maps');
  if(chapter===2)baseline=resources.geometries;if(chapter>2)assert.ok(resources.geometries<=baseline);
  await page.screenshot({path:`${artifacts}/dream-${chapter}-${phase}.png`});console.log(`Chapter ${chapter} ${phase}: rendered without shader errors`);
  assert.deepEqual(errors,[]);
 }
 assert.equal(await page.evaluate(()=>window.endlessSea.getState().dream.particles),96);
 await page.emulateMedia({reducedMotion:'reduce'});await frames(2);assert.equal(await page.evaluate(()=>window.endlessSea.getState().dream.visible),false);
 await page.emulateMedia({reducedMotion:'no-preference'});await frames(2);assert.equal(await page.evaluate(()=>window.endlessSea.getState().dream.visible),true);
 await page.setViewportSize({width:390,height:844});await page.locator('#chapter-select').selectOption('4');await frames(5);await page.screenshot({path:`${artifacts}/dream-mobile.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);assert.deepEqual(errors,[]);
 console.log('PASS: refined paper and five chapter materials, daylight/night magic, fixed particle budget, reduced-motion preference, mobile render and stable GPU resources.');
}finally{await browser.close();}
