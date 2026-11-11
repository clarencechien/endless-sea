// Reproduce the shipped derivatives. Requires root npm dependencies + Python Pillow/numpy.
// Downloads are offline preparation only: the published app has no external requests.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{execFileSync}from'node:child_process';import{resolve}from'node:path';import{createHash}from'node:crypto';import{RGBELoader}from'three/addons/loaders/RGBELoader.js';import{FloatType}from'three';
const root=resolve(import.meta.dirname,'..'),scratch=process.argv[2]||'/tmp/world-window-assets';mkdirSync(scratch,{recursive:true});
for(const entry of JSON.parse(readFileSync(resolve(root,'assets/sources.json'))).filter(e=>e.provider==='Poly Haven')){
 const path=resolve(scratch,entry.id+'.hdr');execFileSync('python3',['-c','import urllib.request,sys;open(sys.argv[2],"wb").write(urllib.request.urlopen(sys.argv[1],timeout=60).read())',entry.downloadURL,path]);
 const b=readFileSync(path);if(createHash('sha256').update(b).digest('hex')!==entry.sourceSHA256)throw Error('Source hash mismatch: '+entry.id);
 const d=new RGBELoader().setDataType(FloatType).parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));if(d.width!==1024||d.height!==512)throw Error('Unexpected source dimensions');writeFileSync(resolve(scratch,entry.id+'.rgba'),Buffer.from(d.data.buffer));
}
execFileSync('python3',[resolve(import.meta.dirname,'pack-assets.py'),scratch,resolve(root,'assets')],{stdio:'inherit'});
