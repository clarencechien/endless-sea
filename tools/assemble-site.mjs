import {prepareWindow} from './prepare-window.mjs';
import {cpSync,existsSync,mkdirSync} from 'node:fs';
const source='dlc/bird-forest/dist';
if(!existsSync(`${source}/index.html`)||!existsSync(`${source}/upstream/index.html`))throw new Error('Build the Bird Forest DLC and pinned upstream comparison before assembling Pages');
cpSync(source,'dist/forest',{recursive:true});
mkdirSync('dist/window',{recursive:true});
for(const file of ['index.html','credits.html','room.js','app.js','renderer.js','solar.js','scenes.js','style.css','window.svg','assets'])cpSync(`dlc/world-window/${file}`,`dist/window/${file}`,{recursive:true});
prepareWindow('dist/window/vendor');
console.log('Pages routes: / (ocean), /forest/ (bird DLC), /forest/upstream/ (pinned baseline), /window/ (World Window)');
