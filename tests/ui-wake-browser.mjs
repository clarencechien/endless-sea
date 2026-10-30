import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const artifacts=process.env.ARTIFACTS_DIR||'/tmp/endless-sea-artifacts';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 async function checkLayout(selectors,label){
  const collisions=await page.evaluate(selectors=>{
   const boxes=selectors.map(s=>{const el=document.querySelector(s),style=getComputedStyle(el),r=el.getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height,visible:r.width&&r.height&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&!el.hidden};}).filter(b=>b.visible);
   const collisions=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1)collisions.push([a.s,b.s]);}return collisions;
  },selectors);assert.deepEqual(collisions,[],label);
 }
 const hud=['.brand','nav','.chapter','.time-picker','.journey-panel','footer','.bottom-line'];
 for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,568],[844,390],[568,320]]){
  await page.setViewportSize({width,height});
  for(const chapter of ['1','3','4','5']){await page.locator('#chapter-select').selectOption(chapter);await checkLayout([...hud,'.intro'],`Intro chapter ${chapter} at ${width}x${height}`);}
  if(width===568||width===320)await page.screenshot({path:`${artifacts}/layout-intro-${width}.png`});
 }
 await page.locator('#fly').click();
 for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390],[568,320]]){
  await page.setViewportSize({width,height});await page.locator('#chapter-select').selectOption('2');await checkLayout([...hud,'.flying-note'],`Flight at ${width}x${height}`);
 }
 assert.ok(await page.evaluate(()=>window.endlessSea.getResources().textures)<=7,'Old elevation textures must be disposed across chapters');
 await page.setViewportSize({width:960,height:640});await page.locator('#chapter-select').selectOption('1');
 // Keep the real renderer running at lower resolution while filling the bounded
 // history on software GPUs; layout checks and screenshots use the full viewport.
 await page.locator('#world').evaluate(c=>{c.style.width='440px';c.style.height='300px';});
 await page.waitForFunction(()=>window.endlessSea.getState().wake.samples.every(n=>n===90),{},{timeout:60000});
 await page.keyboard.down('a');await page.waitForFunction(()=>window.endlessSea.getState().bank>.3);await page.keyboard.up('a');
 await page.locator('#world').evaluate(c=>{c.style.removeProperty('width');c.style.removeProperty('height');});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:`${artifacts}/paper-wake.png`});
 const wake=await page.evaluate(()=>window.endlessSea.getState().wake);assert.equal(wake.segments,178);
 await page.keyboard.press('r');await page.waitForFunction(()=>window.endlessSea.getState().wake.samples.every(n=>n<20));
 assert.deepEqual(errors,[]);console.log('PASS: no text-block overlap at six desktop/mobile sizes across chapter titles; flying copy layout; bounded turning wake; reset clears trails; no shader errors.');
}finally{await browser.close();}
