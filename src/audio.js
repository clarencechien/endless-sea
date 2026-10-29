import { createScore, TEMPO, LOOP_BEATS, midiFrequency } from './score.js';
export class Soundscape {
 constructor() {
  this.context=new AudioContext();const c=this.context;
  this.master=c.createGain();this.master.gain.value=0;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=6;this.master.connect(limiter).connect(c.destination);
  this.analyser=c.createAnalyser();this.analyser.fftSize=256;limiter.connect(this.analyser);
  this.levels={music:.65,engine:.35,wind:.55,sea:.6};this.buses={};
  for(const [name,level] of Object.entries(this.levels)){const gain=c.createGain();gain.gain.value=level;gain.connect(this.master);this.buses[name]=gain;}
  this.enabled=false;this.chapter=1;this.voices=new Set();this.notesPlayed=0;
  const impulse=c.createBuffer(2,c.sampleRate*2.8,c.sampleRate);
  for(let ch=0;ch<2;ch++){const a=impulse.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3)*.35;}
  const reverb=c.createConvolver();reverb.buffer=impulse;const wet=c.createGain();wet.gain.value=.28;reverb.connect(wet).connect(this.buses.music);this.reverb=reverb;
  this.windFilter=this.noise('wind',920,.24,'bandpass',.055);
  this.seaFilter=this.noise('sea',650,.48,'lowpass',.11);
  const oceanLfo=c.createOscillator(),oceanDepth=c.createGain();oceanLfo.frequency.value=.095;oceanDepth.gain.value=420;oceanLfo.connect(oceanDepth).connect(this.seaFilter.frequency);oceanLfo.start();
  this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=45;
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=165;const engineLevel=c.createGain();engineLevel.gain.value=.11;this.engine.connect(filter).connect(engineLevel).connect(this.buses.engine);this.engine.start();
  this.score=createScore(1);this.index=0;this.loopStart=c.currentTime+.15;
  this.timer=setInterval(()=>this.schedule(),40);
 }
 noise(bus,frequency,level,type,rate) {
  const c=this.context,buffer=c.createBuffer(2,c.sampleRate*7,c.sampleRate);
  for(let ch=0;ch<2;ch++){const a=buffer.getChannelData(ch);let brown=0;for(let i=0;i<a.length;i++){brown=(brown+(Math.random()*2-1)*.06)/1.025;a[i]=brown;}}
  const source=c.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=c.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=.6;
  const gain=c.createGain();gain.gain.value=level;source.connect(filter).connect(gain).connect(this.buses[bus]);source.start();
  const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=rate;depth.gain.value=level*.55;lfo.connect(depth).connect(gain.gain);lfo.start();return filter;
 }
 note(n,when) {
  const c=this.context,duration=n.duration*60/TEMPO,g=c.createGain(),pad=n.voice==='pad';
  g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(n.velocity/127*(pad?.055:.15),when+(pad?.45:.014));g.gain.exponentialRampToValueAtTime(.0001,when+duration);g.connect(this.buses.music);g.connect(this.reverb);
  const osc=c.createOscillator();osc.type=pad?'sine':'triangle';osc.frequency.value=midiFrequency(n.midi);osc.connect(g);osc.start(when);osc.stop(when+duration+.05);this.voices.add(osc);this.notesPlayed++;
  osc.onended=()=>{osc.disconnect();g.disconnect();this.voices.delete(osc);};
 }
 schedule(){
  const c=this.context;if(!this.enabled||c.state!=='running')return;
  if(this.loopStart+this.score[this.index].beat*60/TEMPO<c.currentTime-.25){this.loopStart=c.currentTime+.08;this.index=0;}
  while(this.loopStart+this.score[this.index].beat*60/TEMPO<c.currentTime+.18){this.note(this.score[this.index],this.loopStart+this.score[this.index].beat*60/TEMPO);if(++this.index===this.score.length){this.index=0;this.loopStart+=LOOP_BEATS*60/TEMPO;}}
 }
 async setEnabled(value){await this.context.resume();this.enabled=value;this.master.gain.setTargetAtTime(value?.7:0,this.context.currentTime,.2);if(value){this.loopStart=this.context.currentTime+.08;this.index=0;this.schedule();}}
 setLevel(name,value){this.levels[name]=value;this.buses[name].gain.setTargetAtTime(value,this.context.currentTime,.1);}
 setChapter(chapter){this.chapter=chapter;this.score=createScore(chapter);this.index=0;this.loopStart=this.context.currentTime+.2;for(const osc of this.voices)osc.stop(this.context.currentTime+.05);}
 update(flight,wind){const c=this.context;this.engine.frequency.setTargetAtTime(29+flight.speed*.19,c.currentTime,.2);this.windFilter.frequency.setTargetAtTime(500+flight.speed*5+wind*300,c.currentTime,.5);this.seaFilter.Q.setTargetAtTime(this.chapter===2?.85:.5,c.currentTime,1);}
 async visibility(hidden){if(hidden)await this.context.suspend();else if(this.enabled)await this.context.resume();}
 snapshot(){const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);return {enabled:this.enabled,state:this.context.state,chapter:this.chapter,notesPlayed:this.notesPlayed,voices:this.voices.size,levels:{...this.levels},rms:Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length)};}
}
