export const ISLANDS = [
 {x:-510,z:-1300,rx:590,rz:690,height:245},
 {x:700,z:-2200,rx:660,rz:880,height:330},
 {x:-1400,z:-3200,rx:790,rz:690,height:410},
 {x:280,z:-4300,rx:850,rz:1000,height:470},
 {x:1650,z:-5100,rx:700,rz:850,height:350},
 {x:-900,z:-6200,rx:1000,rz:850,height:530}
];
export function islandsForChapter(chapter=2){
 if(chapter===3)return [
 {x:-650,z:-1500,rx:490,rz:1450,height:730,kind:3},{x:670,z:-2000,rx:480,rz:1700,height:850,kind:3},
 {x:-850,z:-3900,rx:650,rz:1300,height:970,kind:3},{x:900,z:-4900,rx:640,rz:1500,height:1000,kind:3},
 {x:-1700,z:-6200,rx:900,rz:1400,height:860,kind:3},{x:1800,z:-6500,rx:900,rz:1300,height:980,kind:3}];
 if(chapter===4)return ISLANDS.map((i,n)=>({...i,rx:i.rx*.76,rz:i.rz*.77,height:60+n*17,kind:4}));
 if(chapter===5)return ISLANDS.map((i,n)=>({...i,height:390+n*52,kind:5}));
 return ISLANDS;
}
export function terrainOrigin(x,z){return {x:Math.round(x/7000)*7000,z:-Math.floor((-z+1500)/9000)*9000};}
export function islandHeight(x,z,island){
 const px=(x-island.x)/island.rx,pz=(z-island.z)/island.rz;
 const angle=Math.atan2(pz,px),radius=Math.hypot(px,pz);
 const coast=1+.075*Math.sin(angle*5)+.045*Math.sin(angle*9+.8);
 const d=radius/coast;
 const mound=Math.max(0,1-d*d);
 const ridge=.7+.18*Math.sin(px*9+pz*4)+.1*Math.sin(pz*13-px*3)+.06*Math.sin(px*27+pz*19);
 if(island.kind===3)return island.height*Math.pow(mound,.48)*(.58+ridge*.43)-8;
 if(island.kind===4)return island.height*Math.min(1,mound*7)*(.75+ridge*.18)-5;
 if(island.kind===5){const cone=Math.max(0,1-d);const crater=Math.exp(-d*d/.026)*.6;return island.height*(cone*.96-crater)*(.92+ridge*.1)-5;}
 return island.height*Math.pow(mound,1.65)*ridge-5;
}
export function terrainHeight(x,z,chapter=2){if(chapter===1)return 0;const origin=terrainOrigin(x,z);return Math.max(0,...islandsForChapter(chapter).map(i=>islandHeight(x-origin.x,z-origin.z,i)));}
export function keepAboveTerrain(flight,chapter=2){flight.y=Math.max(flight.y,terrainHeight(flight.x,flight.z,chapter)+24);return flight;}
