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
