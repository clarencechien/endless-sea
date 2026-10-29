import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const artifacts=process.env.ARTIFACTS_DIR||'/tmp/endless-sea-artifacts';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.endlessSea?.getState());
 assert.ok((await page.locator('meta[name="viewport"]').getAttribute('content')).includes('viewport-fit=cover'));
 for(const [width,height] of [[1440,900],[390,844],[844,390],[320,568]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(({width,height})=>{const canvas=document.querySelector('#world'),r=canvas.getBoundingClientRect();return r.x===0&&r.y===0&&Math.round(r.width)===width&&Math.round(r.height)===height&&canvas.width===width&&canvas.height===height;},{width,height});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  for(const selector of ['#autopilot','.instruments','#fullscreen']){const r=await page.locator(selector).boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,`${selector} must fit ${width}x${height}`);}
  await page.screenshot({path:`${artifacts}/edge-to-edge-${width}.png`});
 }
 await page.setViewportSize({width:1000,height:700});await page.locator('#fly').click();
 await page.keyboard.down('s');await page.keyboard.down('ArrowUp');await page.keyboard.down('a');
 await page.waitForFunction(()=>['altitude','heading','airspeed'].every(id=>Array.from(document.querySelectorAll(`#${id} .beat-reel`)).some(el=>Math.abs(parseFloat(el.style.transform.match(/-([\d.]+)em/)?.[1]||0))>.02)));
 await page.keyboard.up('s');await page.keyboard.up('ArrowUp');await page.keyboard.up('a');
 const checks=await page.evaluate(async source=>{
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const {RollingInstrument}=await import(url);URL.revokeObjectURL(url);
  const node=document.createElement('span');const dial=new RollingInstrument(node);dial.update(128);dial.update(129,.11);const upward=dial.value;dial.update(127,10);dial.update(126,.11);const downward=dial.value;
  const headingNode=document.createElement('span');const heading=new RollingInstrument(headingNode,{cycle:360});heading.update(359.8);heading.update(.2,.11);const forward=heading.value;const upperDigit=headingNode.children[0].textContent;heading.update(.2,10);heading.update(359.8,.11);const backward=heading.value;
  window.testInstrument=dial;return {upward,downward,forward,backward,upperDigit};
 },await readFile('src/counter.js','utf8'));
 assert.ok(checks.upward>128&&checks.upward<129);assert.ok(checks.downward>126&&checks.downward<127);
 assert.ok(checks.forward>359.8||checks.forward<.2);assert.ok(checks.backward<.2||checks.backward>359.8);assert.equal(checks.upperDigit,'30');
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(()=>{window.testInstrument.update(42.7,.01);return {value:window.testInstrument.element.dataset.value,transforms:window.testInstrument.columns.map(c=>c.reel.style.transform)};});
 assert.equal(reduced.value,'43');assert.ok(reduced.transforms.every(t=>t==='translateY(0em)'));
 assert.deepEqual(errors,[]);console.log('PASS: canvas fills desktop/portrait/landscape/narrow viewports; controls remain visible; live instrument scrolling; bidirectional movement; north wrap; reduced-motion readouts.');
}finally{await browser.close();}
