const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8835';
assert.equal(new URL(base).hostname,'127.0.0.1');

(async()=>{
 fs.mkdirSync('test-output/market-3d',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const [width,height] of [[1366,768],[390,844]]){
   const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
   assert(response.ok);
   const {token}=await response.json();
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<600});
   await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/#market');
   await page.locator('#marketSquare').waitFor();
   await page.waitForFunction(()=>document.querySelector('.market-plaza.market-3d canvas')&&document.querySelector('.market-plaza').dataset.asset==='ready'&&Number(document.querySelector('.market-plaza').dataset.actors)>=2,null,{timeout:12000});
   const scene=await page.evaluate(()=>{
    const root=document.querySelector('.market-plaza'),canvas=root.querySelector('canvas'),rect=root.getBoundingClientRect();
    return {actors:Number(root.dataset.actors),stalls:Number(root.dataset.stalls),canvasWidth:canvas.width,sceneWidth:rect.width,sceneHeight:rect.height,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,legacyVisible:getComputedStyle(root.querySelector('.market-person')).display!=='none'};
   });
   assert(scene.actors>=2,'Practice friend and player should both have 3D avatars');
   assert(scene.stalls>=3,'Market stalls should be 3D');
   assert(scene.canvasWidth>0&&scene.sceneWidth>0);
   assert.equal(scene.legacyVisible,false,'Flat avatar artwork should be hidden in 3D mode');
   assert(scene.scrollWidth<=scene.viewportWidth,'No horizontal overflow');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`test-output/market-3d/${width}.png`});
   await page.locator('.market-practice-visitor .visitor-name').click();
   await page.waitForFunction(()=>document.querySelector('.market-detail')?.textContent.includes('연습 친구'),null,{timeout:5000});
   assert.match(await page.locator('.market-detail').innerText(),/연습 친구/);
   const before=await page.locator('#marketHero').boundingBox();
    await page.locator('.market-plaza canvas').click({position:{x:scene.sceneWidth*.82,y:scene.sceneHeight*.7},force:true});
   await page.waitForFunction(left=>Math.abs(document.querySelector('#marketHero').getBoundingClientRect().left-left)>8,before.x,{timeout:5000});
   await context.close();
   console.log(`PASS ${width}x${height}: market models, shared avatar style, no overflow`);
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
