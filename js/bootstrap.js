/* Prefer a local Phaser vendor copy; otherwise load the exact tested Phaser 3 CDN release. */
const errorPanel=document.getElementById('fatal');
const loading=document.getElementById('loading');
function loadScript(url){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=url;script.async=true;
    script.onload=()=>window.Phaser?resolve():reject(new Error('Missing Phaser global'));
    script.onerror=()=>{script.remove();reject(new Error('Cannot load '+url));};
    document.head.appendChild(script);
  });
}
try{
  try{await loadScript('./vendor/phaser.min.js');}
  catch{
    try{await loadScript('https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js');}
    catch{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js');}
  }
  await import('./game.js');
}catch(error){
  console.error(error);
  loading.hidden=true;
  errorPanel.hidden=false;
}
