// MIDI note numbers, beats and velocities are shared by the synthesizer and SMF export.
export const TEMPO = 68;
export const LOOP_BEATS = 32;
export function createScore(chapter = 1) {
  const chords = chapter === 2 ? [[50,57,62,66],[55,62,66,69],[52,59,64,67],[57,64,67,71]] : [[48,55,60,64],[45,52,57,60],[53,60,64,67],[55,62,65,69]];
  const notes = [];
  for (let bar=0;bar<8;bar++) {
    const chord=chords[bar%4];
    chord.forEach((midi,i)=>notes.push({beat:bar*4+i*.04,midi,duration:3.7,velocity:38,voice:'pad'}));
    const pattern=chapter===2?[0,2,1,3]:[0,2,3];
    pattern.forEach((index,i)=>notes.push({beat:bar*4+i*(chapter===2?1:1.25),midi:chord[index]+12,duration:1.9,velocity:chapter===2?62:54,voice:'piano'}));
  }
  return notes.map(n=>({...n,duration:Math.min(n.duration,LOOP_BEATS-n.beat-.05)})).sort((a,b)=>a.beat-b.beat);
}
export const midiFrequency = note => 440 * 2 ** ((note - 69) / 12);
export function encodeMidi(chapter=1) {
  const bytes=[], events=[], ticks=480;
  const variable=n=>{const a=[n&127];while((n>>=7)>0)a.unshift((n&127)|128);return a;};
  const tempo=Math.round(60000000/TEMPO);
  events.push({at:0,data:[0xff,0x51,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]});
  events.push({at:0,data:[0xc0,4]},{at:0,data:[0xc1,89]});
  for(const n of createScore(chapter)) {const ch=n.voice==='pad'?1:0;events.push({at:Math.round(n.beat*ticks),data:[0x90|ch,n.midi,n.velocity]},{at:Math.round((n.beat+n.duration)*ticks),data:[0x80|ch,n.midi,0]});}
  events.sort((a,b)=>a.at-b.at);let last=0;
  for(const e of events){bytes.push(...variable(e.at-last),...e.data);last=e.at;}
  bytes.push(...variable(Math.max(0,LOOP_BEATS*ticks-last)),0xff,0x2f,0);
  return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,(bytes.length>>>24)&255,(bytes.length>>>16)&255,(bytes.length>>>8)&255,bytes.length&255,...bytes]);
}
