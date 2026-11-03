import {defineConfig} from 'vite';
import {execFileSync} from 'node:child_process';
let sha='unknown',dirty=true;try{sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();dirty=!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();}catch{}
export default defineConfig({base:'./',define:{__BUILD_SHA__:JSON.stringify(sha),__BUILD_DIRTY__:JSON.stringify(dirty)},worker:{format:'es'},build:{target:'es2022'}});
