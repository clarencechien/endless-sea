export const ISLANDS = [
 {x:-510,z:-1300,rx:590,rz:690,height:245},
 {x:700,z:-2200,rx:660,rz:880,height:330},
 {x:-1400,z:-3200,rx:790,rz:690,height:410},
 {x:280,z:-4300,rx:850,rz:1000,height:470},
 {x:1650,z:-5100,rx:700,rz:850,height:350},
 {x:-900,z:-6200,rx:1000,rz:850,height:530}
];
export function islandHeight(x,z,island){
 const px=(x-island.x)/island.rx,pz=(z-island.z)/island.rz;
 const angle=Math.atan2(pz,px),radius=Math.hypot(px,pz);
 const coast=1+.075*Math.sin(angle*5)+.045*Math.sin(angle*9+.8);
 const d=radius/coast;
 const mound=Math.max(0,1-d*d);
 const ridge=.7+.18*Math.sin(px*9+pz*4)+.1*Math.sin(pz*13-px*3)+.06*Math.sin(px*27+pz*19);
 return island.height*Math.pow(mound,1.65)*ridge-5;
}
export function terrainHeight(x,z){return Math.max(0,...ISLANDS.map(i=>islandHeight(x,z,i)));}
export function keepAboveTerrain(flight){flight.y=Math.max(flight.y,terrainHeight(flight.x,flight.z)+24);return flight;}
