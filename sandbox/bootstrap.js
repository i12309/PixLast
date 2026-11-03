const message=document.getElementById('loading');
const fatal=document.getElementById('fatal');
function loadScript(url){return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;script.async=true;
  script.onload=()=>window.Phaser?resolve():reject(new Error('Phaser global is missing'));
  script.onerror=()=>{script.remove();reject(new Error('Could not load '+url));};
  document.head.appendChild(script);
});}
try{
  if(!window.Phaser)try{await loadScript('../vendor/phaser.min.js');}
  catch {try{await loadScript('https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js');}
    catch {await loadScript('https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js');}}
  await import('./editor.mjs');
}catch(e){console.error('Sandbox boot failed',e);message.hidden=true;fatal.hidden=false;}
document.getElementById('retryBtn').addEventListener('click',()=>location.reload());
