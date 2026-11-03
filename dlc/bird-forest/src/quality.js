export const PROFILES={
 'Battery-Saver':{scale:.6,far:85,lod:1.8,shadows:false},
 Low:{scale:.7,far:105,lod:1.4,shadows:false},
 Medium:{scale:.85,far:135,lod:1,shadows:false},
 High:{scale:1,far:160,lod:.8,shadows:true}
};
// Bound 3D fill cost independently of CSS size / display DPR. Presentation stays native.
export function renderSize(width,height,dpr,scale){
 const ratio=Math.min(dpr,1.5),output=[Math.round(width*ratio),Math.round(height*ratio)];
 const factor=Math.min(1,Math.sqrt(1400000/(output[0]*output[1])))*scale;
 return {output,internal:output.map(n=>Math.max(1,Math.floor(n*factor))),factor};
}
export class Quality {
 constructor(){this.profile='Auto';this.scale=.8;this.far=125;this.lod=1;this.shadows=false;this.reset();}
 reset(){this.samples=[];this.elapsed=0;this.cooldown=4;this.clean=0;}
 set(profile){this.profile=profile;Object.assign(this,profile==='Auto'?{scale:.8,far:125,lod:1,shadows:false}:PROFILES[profile]);this.reset();}
 observe(ms,gpu=null){
  if(!['Auto','High'].includes(this.profile)||!Number.isFinite(ms)||ms<=0||ms>10000)return false;
  this.elapsed+=ms/1000;this.cooldown-=ms/1000;this.samples.push(Math.max(ms,gpu||0));
  if(this.elapsed<2)return false;
  const sorted=this.samples.toSorted((a,b)=>a-b),p90=sorted[Math.floor((sorted.length-1)*.9)];
  this.samples=[];this.elapsed=0;if(this.cooldown>0)return false;
  // High keeps its near detail, view range and shadows, but need not stay
  // GPU-bound at native scale. Recover slowly to avoid resolution pumping.
  if(this.profile==='High'){
   let changed=false;
   if(p90>21){this.clean=0;if(this.scale>.65){this.scale=Math.max(.65,+(this.scale-(p90>28?.1:.05)).toFixed(2));changed=true;}}
   else if(p90<17.5){if(++this.clean>=3){if(this.scale<1){this.scale=Math.min(1,+(this.scale+.05).toFixed(2));changed=true;}this.clean=0;}}
   else this.clean=0;
   if(changed)this.cooldown=4;return changed;
  }
  let changed=false;
  if(p90>21){this.clean=0;
   if(this.scale>.55){this.scale=Math.max(.55,+(this.scale-(p90>30?.1:.05)).toFixed(2));changed=true;}
   else if(this.far>85){this.far-=10;this.lod=Math.min(1.6,this.lod+.1);changed=true;}
  }else if(p90<17.5){this.clean++;if(this.clean>=3){if(this.far<125){this.far+=10;this.lod=Math.max(1,this.lod-.1);changed=true;}else if(this.scale<1){this.scale=Math.min(1,+(this.scale+.05).toFixed(2));changed=true;}this.clean=0;}}
  else this.clean=0;
  if(changed)this.cooldown=4;return changed;
 }
 snapshot(){return {profile:this.profile,scale:this.scale,minScale:this.profile==='High'?.65:.55,maxScale:1,far:this.far,lod:this.lod,shadows:this.shadows,adaptiveResolution:['Auto','High'].includes(this.profile)};}
}
