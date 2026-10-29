import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Keep the musical clock controllable without altering native animation timing.
 await page.addInitScript(()=>{let real=performance.now.bind(performance);window.counterTime=0;window.realtime=real;Object.defineProperty(performance,'now',{value:()=>window.counterTime});});
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#dream-beats').dataset.value==='0');
 const setBeat=async n=>{await page.evaluate(n=>window.counterTime=n*60000/68+1,n);await page.waitForFunction(n=>document.querySelector('#dream-beats').dataset.value===String(n),n);};
 await setBeat(9);
 assert.equal(await page.locator('.beat-digit').count(),4);
 await setBeat(10);
 assert.equal(await page.locator('#dream-beats').getAttribute('aria-label'),'10');
 const reels=await page.locator('.beat-reel').evaluateAll(els=>els.map(el=>({value:el.style.transform,frames:el.getAnimations().map(a=>a.effect.getKeyframes().map(k=>k.transform))})));
 assert.equal(reels[2].value,'translateY(-1em)');assert.equal(reels[3].value,'translateY(0em)');
 assert.ok(reels[3].frames.some(frames=>frames.includes('translateY(-10em)')),'9→0 should roll forward to the duplicate zero');
 await page.emulateMedia({reducedMotion:'reduce'});await setBeat(11);
 assert.equal(await page.locator('.beat-reel').evaluateAll(els=>els.reduce((n,el)=>n+el.getAnimations().length,0)),0);
 await setBeat(9999);await setBeat(10000);assert.equal(await page.locator('.beat-digit').count(),5);
 assert.equal(await page.locator('#dream-beats').getAttribute('aria-label'),'10000');
 assert.deepEqual(errors,[]);console.log('PASS: fixed-width digit reels, 9→10 carry, accessible count, reduced motion and 9999→10000 growth.');
}finally{await browser.close();}
