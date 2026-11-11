import {cpSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function prepareWindow(target=resolve(root,'dlc/world-window/vendor')){
 mkdirSync(target,{recursive:true});
 for(const name of ['three.module.min.js','three.core.min.js'])cpSync(resolve(root,'node_modules/three/build',name),resolve(target,name));
 cpSync(resolve(root,'node_modules/three/LICENSE'),resolve(target,'THREE-LICENSE.txt'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareWindow();
