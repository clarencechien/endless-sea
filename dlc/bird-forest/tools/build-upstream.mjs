// Pin the untouched comparison application independently of the DLC's renderer.
import {execFileSync} from 'node:child_process';
import {mkdirSync,existsSync,cpSync,rmSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const sha='500113d7b651d2eb96392ce87c96330bdec25e15';
const root=resolve(import.meta.dirname,'..'),source=process.env.BIRD_UPSTREAM_DIR||resolve(root,'test-results/upstream-source');
const run=(command,args)=>execFileSync(command,args,{cwd:source,stdio:'inherit'});
if(!existsSync(resolve(source,'.git'))){mkdirSync(source,{recursive:true});run('git',['init']);run('git',['remote','add','origin','https://github.com/VictorZakharov/threejs-nanites.git']);run('git',['fetch','--depth','1','origin',sha]);run('git',['checkout','--detach','FETCH_HEAD']);}
const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();if(actual!==sha)throw new Error(`Baseline SHA mismatch: ${actual}`);
if(execFileSync('git',['diff','--name-only','HEAD'],{cwd:source,encoding:'utf8'}).trim())throw new Error('Baseline tracked sources must remain unmodified');
if(!process.env.BIRD_UPSTREAM_PREBUILT){run('npm',['ci','--cache','/tmp/bird-npm-cache']);run('npm',['run','typecheck']);run('npm',['run','build']);run('npm',['run','harness','--','--help']);}
const target=resolve(root,'dist/upstream');rmSync(target,{recursive:true,force:true});cpSync(resolve(source,'dist'),target,{recursive:true});
cpSync(resolve(source,'LICENSE'),resolve(target,'LICENSE.txt'));cpSync(resolve(source,'README.md'),resolve(target,'UPSTREAM_README.md'));
writeFileSync(resolve(target,'baseline.json'),JSON.stringify({repository:'https://github.com/VictorZakharov/threejs-nanites',sha,sourceModified:false,comparisonQuery:'scene=forest&trees=2000&bushes=0.5&statues=0&plaza=0&music=0&auto=0&pr=1&outpr=1&shadows=0&grass=0&relief=0',note:'Original upstream app. Its public/models/README.md contains separate non-commercial Stanford Lucy asset terms; the Bird Forest DLC does not load these assets.'},null,2));
console.log('Pinned upstream baseline:',sha,target);
