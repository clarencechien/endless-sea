export function summarize(samples){
 if(!samples.length)return {frames:0,averageFPS:null,onePercentLow:null,medianMS:null,p95MS:null,droppedFrames:null};
 const a=samples.toSorted((a,b)=>a-b),sum=a.reduce((a,b)=>a+b,0),tail=a.slice(-Math.max(1,Math.ceil(a.length*.01)));
 return {frames:a.length,averageFPS:1000*a.length/sum,onePercentLow:1000/(tail.reduce((a,b)=>a+b,0)/tail.length),medianMS:a[Math.floor((a.length-1)*.5)],p95MS:a[Math.ceil((a.length-1)*.95)],droppedFrames:a.reduce((n,ms)=>n+Math.max(0,Math.round(ms/(1000/60))-1),0)};
}
export class Telemetry {
 constructor(){this.recent=[];this.run=null;this.lastRun=null;this.errors=[];this.peakHeap=null;this.refreshSamples=[];}
 add(time,ms,cpu,gpu,settings={}){
  if(ms<=0||ms>10000)return;
  const row={time,ms,cpu,gpu,...settings};this.recent.push(row);while(this.recent[0]?.time<time-15000)this.recent.shift();
  const heap=performance.memory?.usedJSHeapSize;if(heap)this.peakHeap=Math.max(this.peakHeap||0,heap);
  if(this.run){const elapsed=(time-this.run.started)/1000;if(elapsed>=this.run.warmup)this.run.samples.push(row);if(elapsed>=this.run.warmup+this.run.duration){this.lastRun=this.run;this.run=null;}}
 }
 start(path,time,{warmup=15,duration=60}={}){this.run={path,started:time,warmup,duration,samples:[],route:[],interrupted:false};}
 cancel(reason){if(this.run){this.run.interrupted=true;this.run.reason=reason;this.lastRun=this.run;this.run=null;}}
 snapshot(){const s=summarize(this.recent.map(x=>x.ms)),gpu=this.recent.map(x=>x.gpu).filter(Number.isFinite);return {...s,cpuJSMS:this.recent.length?this.recent.reduce((n,x)=>n+x.cpu,0)/this.recent.length:null,gpuMS:gpu.length?gpu.reduce((a,b)=>a+b,0)/gpu.length:null};}
 report(context){const run=this.run||this.lastRun;return {...context,timestamp:new Date().toISOString(),windowSeconds:15,definitions:{onePercentLow:'1000 / mean of slowest ceil(1% * N) frame intervals',droppedFrames:'estimated missed 60Hz intervals; not measured compositor drops',cpuJS:'synchronous simulation, culling and render submission; excludes asynchronous GPU work',gpu:'backend timestamp queries when available; null otherwise'},live:this.snapshot(),peakJSHeapBytes:this.peakHeap,errors:this.errors,run:run?{...run,summary:summarize(run.samples.map(x=>x.ms)),complete:!this.run&&!run.interrupted}:null};}
}
