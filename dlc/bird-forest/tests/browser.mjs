import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out=process.env.ARTIFACTS_DIR||'/workspace/artifacts/bird';await mkdir(out,{recursive:true});
const base=process.env.APP_URL||'http://127.0.0.1:5181/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-watchdog']});
const errors=[];function watch(p){p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
async function start(page){await page.locator('#start').click();await page.waitForFunction(()=>window.birdForest?.getState().frame>2,null,{timeout:120000});assert.equal(await page.locator('#error').isVisible(),false);}
async function frames(page,n=3){const f=await page.evaluate(()=>window.birdForest.getState().frame);await page.waitForFunction(f=>window.birdForest.getState().frame>=f, f+n);}
try{
 const p=await browser.newPage({viewport:{width:640,height:480}});watch(p);
 // Controlled no-WebGPU environment: Auto must still open a playable WebGL2 scene.
 await p.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true}));
 await p.goto(base);await p.locator('#boot-settings').click();await p.locator('[data-profile=Low]').click();await p.locator('#close-panel').click();await start(p);
 assert.equal(await p.evaluate(()=>window.birdForest.getState().backend),'webgl2');
 await p.locator('#forest-world').click({position:{x:300,y:250}});const original=await p.evaluate(()=>window.birdForest.getState());
 await p.keyboard.down('KeyD');await p.keyboard.down('KeyW');await frames(p,5);await p.keyboard.up('KeyD');await p.keyboard.up('KeyW');
 let s=await p.evaluate(()=>window.birdForest.getState());assert.ok(s.yaw<original.yaw&&s.y>original.y);
 await p.keyboard.down('ShiftLeft');await p.waitForFunction(()=>window.birdForest.getState().speed>17&&window.birdForest.getState().cameraFOV>72);await p.keyboard.up('ShiftLeft');assert.ok(await p.evaluate(()=>window.birdForest.getState().speed)>16);assert.ok(await p.evaluate(()=>window.birdForest.getState().cameraFOV)>72);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#panel').evaluate(e=>e.open),true);const paused=await p.evaluate(()=>window.birdForest.getState());await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.birdForest.getState().time),paused.time);
 await p.locator('[data-profile="Battery-Saver"]').click();assert.equal(await p.evaluate(()=>window.birdForest.getStats().quality.scale),.6);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#panel').evaluate(e=>e.open),false);await frames(p,2);
 assert.equal(await p.evaluate(()=>document.activeElement.id),'forest-world');
 // Repeat the reported sequence: quality switch, location switch, then control
 // immediately, without clicking the canvas to repair keyboard focus.
 for(const profile of ['High','Low']){
  await p.locator('#settings').click();await p.locator(`[data-profile="${profile}"]`).click();await p.locator('#resume').click();await frames(p,2);
  assert.equal(await p.evaluate(()=>document.activeElement.id),'forest-world');
  const before=await p.evaluate(()=>window.birdForest.getState());await p.keyboard.down('KeyD');await frames(p,3);await p.keyboard.up('KeyD');assert.ok((await p.evaluate(()=>window.birdForest.getState())).yaw<before.yaw);
 }
 await p.locator('#settings').click();await p.locator('#benchmark summary').click();await p.locator('#route').selectOption('canopy');await p.locator('#visit').click();await frames(p,2);
 assert.equal(await p.evaluate(()=>window.birdForest.getState().mode),'manual');assert.ok(await p.evaluate(()=>window.birdForest.getState().y)>20);
 assert.equal(await p.evaluate(()=>document.activeElement.id),'forest-world');
 const visit=await p.evaluate(()=>window.birdForest.getState());await p.keyboard.down('ArrowRight');await p.keyboard.down('Space');await frames(p,4);await p.keyboard.up('ArrowRight');await p.keyboard.up('Space');
 assert.ok(await p.evaluate(yaw=>window.birdForest.getState().yaw<yaw,visit.yaw));assert.ok(await p.evaluate(y=>window.birdForest.getState().y>y,visit.y));
 await p.locator('#settings').click();await p.locator('#route').selectOption('speed');await p.locator('#run').click();await frames(p,2);
 assert.equal(await p.evaluate(()=>window.birdForest.getState().mode),'benchmark');
 await p.keyboard.down('KeyA');await frames(p,3);await p.keyboard.up('KeyA');
 assert.equal(await p.evaluate(()=>window.birdForest.getState().mode),'manual');assert.equal(await p.evaluate(()=>window.birdForest.report().run.reason),'manual input');
 assert.equal(await p.locator('#takeover').isVisible(),false);
 await p.evaluate(()=>window.birdForest.benchmark('dense'));await p.locator('#takeover').click();
 assert.equal(await p.evaluate(()=>window.birdForest.getState().mode),'manual');assert.equal(await p.evaluate(()=>document.activeElement.id),'forest-world');
 await p.evaluate(()=>window.birdForest.benchmark('ground'));await p.locator('#settings').click();await p.locator('[data-profile="Battery-Saver"]').click();await p.locator('#close-panel').click();await frames(p,2);
 assert.equal(await p.evaluate(()=>window.birdForest.getState().mode),'manual');
 await p.evaluate(()=>window.birdForest.benchmark('turn',{warmup:1,duration:3}));await p.waitForFunction(()=>window.birdForest.report().run?.complete,null,{timeout:60000});
 await p.locator('#settings').click();
 const downloadPromise=p.waitForEvent('download');await p.locator('#download').click();const download=await downloadPromise;const report=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(report.seed,73129);assert.equal(report.run.path,'turn');assert.equal(report.run.complete,true);assert.ok(report.run.summary.frames>0);
 await writeFile(`${out}/smoke-report.json`,JSON.stringify({...report,testEnvironment:'Software GPU functional test; not a physical target device'},null,2));
 await p.locator('#close-panel').click();await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});const beforeHidden=await p.evaluate(()=>window.birdForest.getState());await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.birdForest.getState().time),beforeHidden.time);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await frames(p,2);assert.ok(await p.evaluate(()=>window.birdForest.getState().time)-beforeHidden.time<.3);
 await p.screenshot({path:`${out}/desktop-controls.png`});
 assert.deepEqual(errors,[]);
 await p.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await p.waitForFunction(()=>!document.querySelector('#error').hidden);assert.equal(await p.evaluate(()=>window.birdForest.getState().paused),true);assert.equal(errors.length,1);assert.match(errors.pop(),/WebGL Device Lost/);await p.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});watch(mobile);
 await mobile.addInitScript(()=>{window.sensor={beta:45,gamma:0};window.sensorAngle=0;window.permissionRequests=0;DeviceOrientationEvent.requestPermission=async()=>{window.permissionRequests++;window.permissionInGesture=navigator.userActivation.isActive;return 'granted';};Object.defineProperty(screen.orientation,'angle',{get:()=>window.sensorAngle});setInterval(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',window.sensor)),50);});
 await mobile.goto(`${base}?backend=webgl2`);await start(mobile);await mobile.waitForFunction(()=>window.birdForest.getState().motion.calibrated);
 assert.equal(await mobile.evaluate(()=>window.permissionRequests),1);assert.equal(await mobile.evaluate(()=>window.permissionInGesture),true);assert.equal(await mobile.locator('#stick,#up,#down').count(),0);
 const state=await mobile.evaluate(()=>window.birdForest.getState());await mobile.evaluate(()=>window.sensor={beta:65,gamma:20});await frames(mobile,5);
 s=await mobile.evaluate(()=>window.birdForest.getState());assert.ok(s.yaw<state.yaw&&s.y>state.y,'Tilt turns and climbs');assert.ok(s.motion.turn>.4&&s.motion.lift>.4);
 await mobile.evaluate(()=>window.sensor={beta:25,gamma:-20});await mobile.waitForFunction(before=>{const s=window.birdForest.getState();return s.yaw>before.yaw+.03&&s.y<before.y-.02;},s);
 await mobile.locator('#settings').tap();await mobile.locator('#motion-center').tap();await mobile.locator('#close-panel').tap();await frames(mobile,2);assert.ok(Math.abs(await mobile.evaluate(()=>window.birdForest.getState().motion.turn))<.05);
 const gust=await mobile.locator('#gust').boundingBox(),touchCDP=await mobile.context().newCDPSession(mobile);await touchCDP.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gust.x+gust.width/2,y:gust.y+gust.height/2,id:1}]});await mobile.waitForFunction(()=>window.birdForest.getState().speed>17);await touchCDP.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.locator('#gust').getAttribute('aria-pressed'),'false');
 await mobile.screenshot({path:`${out}/mobile-controls.png`});
 for(const [width,height,angle] of [[320,568,0],[844,390,90],[568,320,-90]]){await mobile.evaluate(a=>window.sensorAngle=a,angle);await mobile.setViewportSize({width,height});await frames(mobile,2);assert.ok(Math.abs(await mobile.evaluate(()=>window.birdForest.getState().motion.turn))<.05);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth),width);for(const selector of ['#gust','header','footer','#telemetry']){const b=await mobile.locator(selector).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${selector} in ${width}×${height}`);}}
 await mobile.locator('#settings').tap();await mobile.locator('#benchmark summary').tap();await mobile.locator('#download').scrollIntoViewIfNeeded();const d=mobile.waitForEvent('download');await mobile.locator('#download').tap();assert.ok((await d).suggestedFilename().endsWith('.json'));await mobile.close();
 const denied=await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true});watch(denied);await denied.addInitScript(()=>{DeviceOrientationEvent.requestPermission=async()=>'denied';});await denied.goto(`${base}?backend=webgl2`);await start(denied);
 assert.equal(await denied.evaluate(()=>window.birdForest.getState().motion.status),'denied');const beforeDrag=await denied.evaluate(()=>window.birdForest.getState());const cdp=await denied.context().newCDPSession(denied);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:350,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:290,id:1}]});await frames(denied,4);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const afterDrag=await denied.evaluate(()=>window.birdForest.getState());assert.ok(afterDrag.yaw<beforeDrag.yaw&&afterDrag.y>beforeDrag.y);assert.equal(await denied.locator('#stick,#up,#down').count(),0);await denied.close();
 const bad=await browser.newPage();watch(bad);await bad.goto(`${base}?backend=unsupported`);await bad.locator('#start').click();await bad.waitForFunction(()=>!document.querySelector('#error').hidden);assert.match(await bad.locator('#error-message').textContent(),/停用/);assert.ok(await bad.locator('#error-report').isVisible());await bad.close();
 assert.deepEqual(errors,[]);console.log('PASS: Auto→WebGL2, keyboard/tilt permission+calibration+denied drag fallback, climb/turn, pause/resume, runtime profiles, benchmark JSON download, rotation, context-loss UI, unsupported UI.');
}finally{await browser.close();}
