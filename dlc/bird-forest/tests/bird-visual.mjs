import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ARTIFACTS_DIR||'/workspace/artifacts/bird-model';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.MODEL_REVIEW_URL||'http://127.0.0.1:5180/tests/bird-preview.html');await page.waitForFunction(()=>window.birdReview);
 const stats=await page.evaluate(()=>window.birdReview.stats());assert.ok(stats.triangles<15000&&stats.meshes<=14,'Single-bird geometry and draw-call budget');
 for(const view of ['chase','front','top','side']){await page.evaluate(v=>window.birdReview.pose(v),view);await page.screenshot({path:`${out}/${view}.png`});}
 // Same model in distinct articulated poses: catch detached wrists or feathers.
 for(const [name,time,pitch,bank] of [['upstroke',2,.2,.25],['downstroke',2.55,-.15,-.3]]){await page.evaluate(([t,p,b])=>window.birdReview.pose('chase',t,p,b),[time,pitch,bank]);await page.screenshot({path:`${out}/${name}.png`});}
 assert.deepEqual(errors,[]);await writeFile(`${out}/model-stats.json`,JSON.stringify({...stats,errors,environment:'Software WebGL2 visual review; not a phone performance measurement'},null,2));console.log('PASS bird review',stats);
}finally{await browser.close();}
