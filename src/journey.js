import { TEMPO } from './score.js';
export function createJourney(){return {seconds:0,startHour:17,baseChapter:1,chapterStarted:0};}
export function advanceJourney(journey,seconds){journey.seconds+=Math.max(0,seconds);return journey;}
export function journeyState(journey){const total=journey.startHour+journey.seconds/60,beats=journey.seconds*TEMPO/60;return {hours:((total%24)+24)%24,day:Math.floor(journey.seconds/1440)+1,beats:Math.floor(beats),beatPhase:beats%1,elapsed:journey.seconds,chapter:((journey.baseChapter-1+Math.floor((journey.seconds-journey.chapterStarted)/1440))%5)+1,chapterElapsed:(journey.seconds-journey.chapterStarted)%1440};}
export function setJourneyHour(journey,hour){journey.startHour=hour-journey.seconds/60;}
export function moodAtHour(hour){if(hour<5)return 3;if(hour<7)return 3-(hour-5)*1.5;if(hour<16)return 0;if(hour<18)return (hour-16)*.5;if(hour<20)return 1+(hour-18);return 3;}

export function selectJourneyChapter(journey,chapter){journey.baseChapter=Math.min(5,Math.max(1,Math.trunc(chapter)));journey.chapterStarted=journey.seconds;}
