// Solar calculation adapted from the user's 窗景 handoff (simplified NOAA).
export function sunPosition(date,lat,lon){
 const r=Math.PI/180,d=date.getTime()/86400000-10957.5;
 const g=(357.529+.98560028*d)*r,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.020*Math.sin(2*g))*r,e=(23.439-.00000036*d)*r;
 const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L)),gmst=((18.697374558+24.06570982441908*d)%24+24)%24;
 const H=(gmst*15+lon)*r-ra,phi=lat*r;
 return {elevation:Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H))/r};
}
export function phase(e){return e>6?'日光正好':e>0?'金色時分':e>-6?'藍調時刻':'夜色漸深';}
export function localTime(date,tz){return new Intl.DateTimeFormat('zh-TW',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);}
