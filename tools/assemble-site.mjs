import {cpSync,existsSync} from 'node:fs';
const source='dlc/bird-forest/dist';
if(!existsSync(`${source}/index.html`)||!existsSync(`${source}/upstream/index.html`))throw new Error('Build the Bird Forest DLC and pinned upstream comparison before assembling Pages');
cpSync(source,'dist/forest',{recursive:true});
console.log('Pages routes: / (ocean), /forest/ (bird DLC), /forest/upstream/ (pinned baseline)');
