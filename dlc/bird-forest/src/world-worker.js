import {plantForest,SEED} from './world.js';
self.onmessage=async e=>{
 try{
  const response=await fetch(e.data.url);if(!response.ok)throw new Error(`Trees: HTTP ${response.status}`);
  const buffer=await response.arrayBuffer(),headerSize=new DataView(buffer).getUint32(0,true),start=4+headerSize;
  const metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,headerSize)));
  const read=b=>b.kind==='uint'?new Uint32Array(buffer,start+b.offset,b.length):new Float32Array(buffer,start+b.offset,b.length);
  const types=metadata.map(t=>{const common={pos:read(t.pos),nrm:read(t.nrm),uv:read(t.uv)};return {...t,cuts:t.cuts.map(c=>({bark:{...common,idx:read(c.bark)},leaves:{...common,idx:read(c.leaves)}}))};}),transfer=[buffer];
  self.postMessage({trees:plantForest(e.data.seed??SEED),types},transfer);
 }catch(error){self.postMessage({error:String(error)});}
};
