#!/usr/bin/env python3
"""Build a browser-openable, single HTML: inline JS/CSS and 9 data-URI images."""
from pathlib import Path
from base64 import b64encode
import re
root=Path(__file__).parent
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
js=(root/'js/game.js').read_text()
# Replace local image URLs with base64 data URIs (no file:// fetch/CORS problems).
assets=['sky','midcity','street','npc','chip','drone','glow','lamp-post','hero-walk']
data={name:'data:image/png;base64,'+b64encode((root/'assets'/f'{name}.png').read_bytes()).decode() for name in assets}
js=js.replace("this.load.setPath('assets/');", "this.load.setPath('');")
for name in assets:
    js=js.replace(f"'{name}.png'",repr(data[name]))
assert 'this.load.setPath(\'\');' in js
# Any local vendor will be unavailable in one-file mode, so prefer CDN for PixelFX.
js=js.replace("try{return await fetchFX('../vendor/pixelfx');}\n  catch{return fetchFX(FX_ROOT);}","return fetchFX(FX_ROOT);")
html=html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+css+'\n</style>')
boot='''
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }
  try { await loadScript('https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js'); }
  catch { try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js'); } catch {} }
'''
html=html.replace('  <script type="module" src="js/bootstrap.js"></script>', '<script type="module">'+boot+js+'</script>')
# The onefile version references no local js/css/png assets.
assert 'src="js/' not in html and 'href="style.css"' not in html
(root/'NEON_0419_onefile.html').write_text(html,encoding='utf-8')
print('Wrote self-contained HTML:',len(html),'characters')
