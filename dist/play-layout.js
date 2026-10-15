// Layout only: move existing controls, retaining their handlers and state.
(()=>{
 const header=document.querySelector('header'),topline=document.querySelector('.compact-topline'),tabs=document.querySelector('.compact-tabs');
 if(!header||!topline||!tabs)return;
 const shell=document.createElement('div');shell.className='play-shell-bar';header.before(shell);shell.append(header,topline,tabs);
 const fit=()=>{const height=Math.ceil(shell.getBoundingClientRect().height);document.documentElement.style.setProperty('--shell-height',height+'px')};
 new ResizeObserver(fit).observe(shell);fit();
})();
