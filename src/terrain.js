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
const fract=n=>n-Math.floor(n);
function hash(x,z){return fract(Math.sin(x*127.1+z*311.7)*43758.5453);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let a=x-ix,b=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);return (hash(ix,iz)*(1-a)+hash(ix+1,iz)*a)*(1-b)+(hash(ix,iz+1)*(1-a)+hash(ix+1,iz+1)*a)*b;}
function fbm(x,z){return noise(x,z)*.57+noise(x*2.07+19,z*2.07-7)*.28+noise(x*4.13-11,z*4.13+23)*.15;}
export function islandHeight(x,z,island){
 const px=(x-island.x)/island.rx,pz=(z-island.z)/island.rz;
 const angle=Math.atan2(pz,px),radius=Math.hypot(px,pz);
 const coast=1+.075*Math.sin(angle*5)+.045*Math.sin(angle*9+.8);
 const d=radius/coast,mound=Math.max(0,1-d*d),seed=island.x*.031+island.z*.017;
 const hills=fbm(px*4.6+seed,pz*4.6-seed),detail=fbm(px*14-seed,pz*14+seed);
 const ridge=1-Math.abs(fbm(px*8+seed,pz*7-seed)*2-1);
 if(island.kind===3){const spine=.64+.22*fbm(px*3+seed,pz*5)+.19*ridge;return island.height*Math.pow(mound,.48)*spine+Math.pow(mound,.4)*(detail-.5)*43-8;}
 if(island.kind===4){const shelf=Math.min(1,mound*(5.5+hills*3));return island.height*shelf*(.69+.2*hills)+mound*(detail-.5)*14-5;}
 if(island.kind===5){const craterRadius=Math.hypot(px+.035*Math.sin(seed),pz+.045*Math.cos(seed));const cone=Math.max(0,1-d),crater=Math.exp(-craterRadius*craterRadius/.025)*.59;return island.height*(cone*.96-crater)*(.91+hills*.18)+mound*(detail-.5)*22-5;}
 return island.height*Math.pow(mound,1.45)*(.42+.48*hills+.3*ridge)+Math.pow(mound,1.3)*(detail-.5)*22-5;
}
export function terrainHeight(x,z,chapter=2){if(chapter===1)return 0;const origin=terrainOrigin(x,z);return Math.max(0,...islandsForChapter(chapter).map(i=>islandHeight(x-origin.x,z-origin.z,i)));}
export function keepAboveTerrain(flight,chapter=2){flight.y=Math.max(flight.y,terrainHeight(flight.x,flight.z,chapter)+24);return flight;}
