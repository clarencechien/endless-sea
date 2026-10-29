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
 // Let atmosphere transitions settle at a small drawing size on software GPUs.
 // Restore the actual viewport before every visual check. This is not an FPS test.
 async function settle(){
  await page.locator('#world').evaluate(c=>{c.style.width='440px';c.style.height='300px';});await frames(65);
  await page.locator('#world').evaluate(c=>{c.style.removeProperty('width');c.style.removeProperty('height');});await frames(3);
 }
 const phases=process.env.SKY_PHASES?.split(',')||['morning','golden','blue','night'];
 for(const phase of phases){
  await page.locator(`[data-time="${phase}"]`).click();await settle();
  assert.ok(await page.evaluate(()=>window.endlessSea.getRenderer().triangles)>2000);
  assert.equal(await page.locator('#world').evaluate(c=>c.width),1100);
  await page.screenshot({path:`${artifacts}/sky-${phase}.png`});assert.deepEqual(errors,[]);console.log(`${phase}: full-size sky and sea reflection rendered`);
 }
 await page.locator('#chapter-select').selectOption('4');await settle();await page.screenshot({path:`${artifacts}/sky-aurora.png`});
 const baseline=await page.evaluate(()=>window.endlessSea.getResources());
 await page.setViewportSize({width:390,height:844});await frames(5);await page.screenshot({path:`${artifacts}/sky-mobile.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 await page.setViewportSize({width:844,height:390});await frames(5);await page.screenshot({path:`${artifacts}/sky-landscape.png`});
 assert.equal(await page.locator('#world').evaluate(c=>c.width),844);
 assert.deepEqual(await page.evaluate(()=>window.endlessSea.getResources()),baseline);
 assert.deepEqual(errors,[]);console.log(`PASS: ${phases.join(', ')} and polar sky compile/render; desktop and both mobile orientations; stable resources across resizes.`);
}finally{await browser.close();}
