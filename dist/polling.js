// Completion-based schedules prevent overlapping polls and randomize each interval.
(function(root){
 const ranges={school:[4000,5000],campus:[10000,15000],growth:[30000,40000]};
 const delay=(kind,random=Math.random)=>{const [min,max]=ranges[kind];return min+Math.floor(random()*(max-min))};
 const growthNeeded=screen=>['activity','passport','market'].includes(screen);
 function start(callback,kind,enabled=()=>true){let timer,stopped=false;async function tick(){try{if(enabled())await callback()}catch(e){console.warn('Refresh deferred:',e.message)}finally{if(!stopped)timer=setTimeout(tick,delay(kind))}}timer=setTimeout(tick,delay(kind));return ()=>{stopped=true;clearTimeout(timer)}}
 root.ShinyPolling={delay,growthNeeded,start};
})(globalThis);
