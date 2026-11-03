import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return [k,v.join('=')||true];}));
if(args.help){console.log('node tools/harness.mjs --url=http://127.0.0.1:5181/ --backend=webgl2|auto --profile=Auto|Low|Medium|High|Battery-Saver --path=ground|dense|turn|canopy|speed|pause-resume --duration=60 --warmup=15 --mobile --out=test-results');process.exit(0);}
const out=args.out||'test-results';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--disable-gpu-watchdog']});
try{
 const mobile=!!args.mobile,page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:Number(args.width||1100),height:Number(args.height||760)},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),errors=[];
 page.setDefaultTimeout(60000);if(args.debug)page.on('console',m=>console.log(m.type(),m.text()));page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const url=new URL(args.url||'http://127.0.0.1:5181/');if(args.backend!=='auto')url.searchParams.set('backend',args.backend||'webgl2');
 await page.goto(url.href,{waitUntil:'networkidle'});await page.screenshot({path:`${out}/welcome-${mobile?'mobile':'desktop'}.png`});
 if(args.profile){await page.locator('#boot-settings').click();await page.locator(`[data-profile="${args.profile}"]`).click();await page.locator('#close-panel').click();}
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.birdForest?.getState().frame>2||!document.querySelector('#error').hidden,null,{timeout:120000});
 if(await page.locator('#error').isVisible()){console.log('Startup errors:',errors,await page.evaluate(()=>window.birdForest?.report()));throw new Error(await page.locator('#error-message').textContent());}
 await page.screenshot({path:`${out}/forest-${mobile?'mobile':'desktop'}.png`});
 console.log('Started:',await page.evaluate(()=>window.birdForest.getStats()));
 const duration=Number(args.duration||5),warmup=Number(args.warmup||2),path=args.path||'ground';
 await page.evaluate(({path,duration,warmup})=>window.birdForest.benchmark(path,{duration,warmup}),{path,duration,warmup});
 await page.waitForFunction(()=>window.birdForest.report().run?.complete,null,{timeout:(duration+warmup+60)*1000});
 const report=await page.evaluate(()=>window.birdForest.report());report.testEnvironment='Headless Chromium with SwiftShader software rendering; NOT real phone/laptop validation';report.consoleErrors=errors;
 await writeFile(`${out}/${path}-${mobile?'mobile':'desktop'}-${report.backend}.json`,JSON.stringify(report,null,2));
 assert.ok(report.run.summary.frames>0);assert.deepEqual(errors,[]);assert.ok(report.run.route.length>0);
 console.log('PASS:',report.backend,path,JSON.stringify(report.run.summary));
}finally{await browser.close();}
