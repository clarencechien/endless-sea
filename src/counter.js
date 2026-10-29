export function counterDigits(value){return String(Math.max(0,Math.floor(value))).padStart(4,'0').split('').map(Number);}
export class RollingCounter {
 constructor(element){this.element=element;this.previous=null;this.columns=[];this.motion=matchMedia('(prefers-reduced-motion: reduce)');}
 update(value){
  value=Math.max(0,Math.floor(value));if(value===this.previous)return;
  const digits=counterDigits(value),sequential=this.previous!==null&&value===this.previous+1;
  if(this.columns.length!==digits.length){
   this.element.replaceChildren();this.columns=digits.map(()=>{const window=document.createElement('span');window.className='beat-digit';window.setAttribute('aria-hidden','true');const strip=document.createElement('span');strip.className='beat-reel';for(let n=0;n<=10;n++){const row=document.createElement('span');row.textContent=n%10;strip.append(row);}window.append(strip);this.element.append(window);return {strip,value:0,animation:null};});
  }
  digits.forEach((digit,i)=>{
   const column=this.columns[i],old=column.value;column.animation?.cancel();
   column.strip.style.transform=`translateY(-${digit}em)`;
   if(sequential&&old!==digit&&!this.motion.matches){const target=old===9&&digit===0?10:digit;column.animation=column.strip.animate([{transform:`translateY(-${old}em)`},{transform:`translateY(-${target}em)`}],{duration:650,easing:'cubic-bezier(.22,.6,.3,1)'});}
   column.value=digit;
  });
  this.element.setAttribute('aria-label',String(value));this.element.dataset.value=String(value);this.previous=value;
 }
}

// Two adjacent numerals per wheel let instruments move smoothly in either
// direction, including the compass crossing 359°/000° without spinning backward.
export class RollingInstrument {
 constructor(element,{digits=3,cycle=null}={}){this.element=element;this.digits=digits;this.cycle=cycle;this.value=null;this.columns=[];this.motion=matchMedia('(prefers-reduced-motion: reduce)');}
 update(target,seconds=1/60){
  if(!Number.isFinite(target))return;
  target=Math.max(0,target);
  let delta=this.value===null?0:target-this.value;
  if(this.cycle)delta=((delta+this.cycle/2)%this.cycle+this.cycle)%this.cycle-this.cycle/2;
  if(this.value===null||this.motion.matches)this.value=target;
  else this.value+=delta*(1-Math.exp(-Math.max(0,seconds)/.22));
  if(Math.abs(delta)<.0001)this.value=target;
  if(this.cycle)this.value=((this.value%this.cycle)+this.cycle)%this.cycle;
  const value=this.motion.matches?Math.round(this.value):this.value;
  const lower=Math.floor(value),fraction=value-lower;
  const current=this.cycle?lower%this.cycle:lower,next=this.cycle?(lower+1)%this.cycle:lower+1;
  const length=Math.max(this.digits,String(current).length,String(next).length);
  const first=String(current).padStart(length,'0'),second=String(next).padStart(length,'0');
  if(this.columns.length!==length){this.element.replaceChildren();this.columns=Array.from({length},()=>{const cell=document.createElement('span');cell.className='beat-digit';cell.setAttribute('aria-hidden','true');const reel=document.createElement('span');reel.className='beat-reel';const a=document.createElement('span'),b=document.createElement('span');reel.append(a,b);cell.append(reel);this.element.append(cell);return {reel,a,b};});}
  this.columns.forEach(({reel,a,b},i)=>{if(a.textContent!==first[i])a.textContent=first[i];if(b.textContent!==second[i])b.textContent=second[i];reel.style.transform=`translateY(-${first[i]===second[i]?0:fraction}em)`;});
  const displayed=this.cycle?Math.round(this.value)%this.cycle:Math.round(this.value);
  this.element.dataset.value=String(displayed);this.element.setAttribute('aria-label',String(displayed));
 }
}
