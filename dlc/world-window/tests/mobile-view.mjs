// Exercise touch capture and browser permission paths that desktop pointer tests miss.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const page = await browser.newPage({
    viewport: {width:390,height:844}, deviceScaleFactor:1, hasTouch:true,
    isMobile:true, reducedMotion:'reduce'
  });
  await page.addInitScript(() => {
    DeviceOrientationEvent.requestPermission = async () => window.permissionResult;
    window.permissionResult = 'denied';
  });
  await page.goto(process.env.WINDOW_URL || 'http://127.0.0.1:5182/');
  await page.waitForFunction(() => window.worldWindow?.getState().ready);
  const tilt = page.locator('#tilt');
  await tilt.click();
  assert.match(await page.locator('#view-help').innerText(), /拖曳/);
  assert.equal(await page.evaluate(() => worldWindow.getState().motion), false);

  const bounds = await page.locator('#view').boundingBox();
  const session = await page.context().newCDPSession(page);
  for (const [type, dx] of [['touchStart',0],['touchMove',95],['touchEnd',0]]) {
    const point = {x:bounds.x+bounds.width*.35+dx, y:bounds.y+bounds.height*.65};
    await session.send('Input.dispatchTouchEvent', {type,touchPoints:type==='touchEnd'?[]:[point]});
  }
  await page.waitForFunction(() => worldWindow.getState().drift[0]*14000>18);

  await page.evaluate(() => window.permissionResult='granted');
  await tilt.click();
  async function orient(gamma) {
    await page.evaluate(g => dispatchEvent(new DeviceOrientationEvent('deviceorientation',
      {alpha:0,beta:40,gamma:g})), gamma);
  }
  await orient(0);
  await page.waitForFunction(() => Math.abs(worldWindow.getState().drift[0]*14000)<2);
  await orient(-18);
  await page.waitForFunction(() => worldWindow.getState().drift[0]*14000 < -20);
  await tilt.click();
  await page.waitForFunction(() => Math.abs(worldWindow.getState().drift[0]*14000)<2);
  await page.setViewportSize({width:844,height:390});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),844);
  console.log('PASS touch drag, reduced motion, sensor calibration, denial, disable and landscape layout');
} finally {
  await browser.close();
}
