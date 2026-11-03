// Smoke the assembled Pages tree; the upstream source is never patched for this test.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5174/';
const out=process.env.ARTIFACTS_DIR||'/workspace/artifacts/bird';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:640,height:420}}),errors=[],externalFontFailures=[];
 page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){const url=m.location().url;if(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)&&m.text().includes('ERR_TUNNEL_CONNECTION_FAILED'))externalFontFailures.push({url,message:m.text()});else errors.push(m.text());}});
 console.log('Checking ocean');await page.goto(base);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.ready==='true');
 await page.locator('#fly').click();assert.equal(await page.evaluate(()=>window.endlessSea.getState().flying),true);
 await page.locator('#help').click();assert.equal(await page.locator('.forest-link').getAttribute('href'),'./forest/');
 await page.locator('.forest-link').click();await page.locator('#start').waitFor();assert.ok(page.url().endsWith('/forest/'));
 const baseline=await (await page.request.get(`${base}forest/upstream/baseline.json`)).json();assert.equal(baseline.sha,'500113d7b651d2eb96392ce87c96330bdec25e15');
 // Small diagnostic workload, not a comparable performance benchmark.
 const query='harness=1&scene=forest&trees=30&bushes=0&statues=0&plaza=0&music=0&auto=0&pr=.5&outpr=1&shadows=0&grass=0&relief=0&webgl=1';
 console.log('Checking upstream');await page.goto(`${base}forest/upstream/?${query}`);
 await page.waitForFunction(()=>window.__demo?.ready||window.__demo?.error,null,{timeout:180000});
 assert.equal(await page.evaluate(()=>window.__demo.error),null);
 await page.evaluate(async()=>{await window.__demo.renderOnce();});
 console.log('Baseline ready');const info=await page.evaluate(()=>window.__demo.info());assert.equal(info.backend,'WebGL 2');
 await page.screenshot({path:`${out}/upstream-webgl2.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/site-smoke.json`,JSON.stringify({date:new Date().toISOString(),baseline,query,info,errors,externalFontFailures,testEnvironment:'Chromium + SwiftShader; functional route and baseline smoke only'},null,2));
 console.log('PASS: ocean flight, ocean→forest navigation, nested Pages assets, untouched pinned upstream WebGL2 render.',info);
}finally{await browser.close();}
