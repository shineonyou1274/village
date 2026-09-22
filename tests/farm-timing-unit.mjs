import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('dist/farm3d.js','utf8');
const prefix=source.slice(source.indexOf('function frame(now){'),source.indexOf('focus.lerp(',source.indexOf('function frame(now){')));
function run(interval,hidden=false){
 const steps=[];
 const context={requestAnimationFrame(){},last:0,lastSync:0,window:{gamePreferences:{}},document:{hidden,querySelector:()=>({open:false})},viewport:{dataset:{webgl:'ready'}},farmView:true,previousFarmView:true,villageRoot:{},syncBeds(){},updateFarmer(dt){steps.push(dt)}};
 vm.createContext(context);vm.runInContext(prefix+'}',context);
 for(let now=interval;now<=10000;now+=interval)context.frame(now);
 return steps;
}
for(const interval of [50,100,500,1000,2000]){
 const steps=run(interval);
 assert(Math.abs(steps.reduce((a,b)=>a+b,0)-10)<.00001,`elapsed time lost at ${interval}ms/frame`);
 assert(steps.every(n=>n>0&&n<=.1),'unsafe movement step');
}
assert.equal(run(1000,true).length,0,'hidden page must not perform farming');
console.log('PASS: 20/10/2/1/0.5 FPS preserve real work time; steps <=100ms; hidden page paused');
