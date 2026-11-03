import './style.css';
import './boot-timing.js';
let app=null,profile='Auto',loading=false;
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
if(params.get('backend')==='webgl2')$('#backend').value='webgl2';
function panel(open){if(open){app?.pause(true);$('#panel').showModal();}else $('#panel').close();}
$('#settings').onclick=$('#boot-settings').onclick=()=>panel(true);
$('#close-panel').onclick=$('#resume').onclick=()=>{panel(false);app?.pause(false);};
$('#panel').addEventListener('cancel',()=>app?.pause(false));
$('#perf-toggle').onclick=()=>{const hidden=$('#telemetry').hidden=!$('#telemetry').hidden;$('#perf-toggle').setAttribute('aria-expanded',String(!hidden));};
for(const b of document.querySelectorAll('[data-profile]'))b.onclick=()=>{profile=b.dataset.profile;document.querySelectorAll('[data-profile]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));app?.quality(profile);};
$('#backend').onchange=e=>{const url=new URL(location.href);if(e.target.value==='auto')url.searchParams.delete('backend');else url.searchParams.set('backend',e.target.value);location.href=url;};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$(app?'#run-status':'#boot-status').textContent='此瀏覽器不支援全螢幕，旋轉手機也能橫向飛行。';}};
$('#pause').onclick=()=>panel(true);$('#reset').onclick=()=>{app?.reset();panel(false);app?.pause(false);};
$('#run').onclick=()=>{if(!app){$('#export-status').textContent='請先展翅，再開始測試。';return;}panel(false);app.pause(false);app.benchmark($('#route').value);};
function report(){let capabilities=null;try{capabilities=JSON.parse($('#device-info').textContent);}catch{}return app?.report()||{timestamp:new Date().toISOString(),build:__BUILD_SHA__,userAgent:navigator.userAgent,error:$('#error-message').textContent,stage:'startup',capabilities};}
function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`bird-forest-${new Date().toISOString().replaceAll(':','-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#download').onclick=$('#error-report').onclick=download;
$('#copy').onclick=async()=>{const text=JSON.stringify(report(),null,2);try{await navigator.clipboard.writeText(text);$('#export-status').textContent='報告已複製。';}catch{const t=$('#copy-fallback');t.hidden=false;t.value=text;t.focus();t.select();$('#export-status').textContent='請長按或使用 Ctrl/Cmd+C 複製。';}};
$('#retry').onclick=()=>{const url=new URL(location.href);url.searchParams.set('backend','webgl2');location.href=url;};
$('#start').onclick=async()=>{
 if(loading)return;loading=true;$('#start').disabled=true;$('#boot-status').textContent='正在喚醒森林…';
 try{const {startForest}=await import('./app.js');app=await startForest({profile,onPause:()=>panel(true),status:text=>$('#boot-status').textContent=text});document.body.classList.add('playing');$('#reticle').hidden=$('#pause').hidden=$('#flight-hint').hidden=false;$('#welcome').inert=true;app.pause($('#panel').open);}
 catch(error){$('#error').hidden=false;$('#error-message').textContent=String(error.message||error);$('#boot-status').textContent='啟動未完成，可下載診斷或改用 WebGL2。';}
 finally{loading=false;$('#start').disabled=false;}
};
