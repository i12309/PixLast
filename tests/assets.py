from pathlib import Path
from PIL import Image
import re,subprocess
root=Path(__file__).resolve().parent.parent
expected={
 'sky.png':(1400,360),'midcity.png':(2360,360),'street.png':(2800,360),
 'hero-walk.png':(240,52),'npc.png':(32,52),'chip.png':(24,32),'drone.png':(78,33),
 'lamp-post.png':(70,150),'glow.png':(128,128)
}
for name,size in expected.items():
 p=root/'assets'/name
 assert p.exists(),name
 with Image.open(p) as im:
  assert im.size==size,(name,im.size)
  assert im.getbbox(),name
html=(root/'index.html').read_text()
for x in ['style.css','js/bootstrap.js','id="game"','id="dialogue"','id="startBtn"','id="ending"']:
 assert x in html,x
for p in [root/'js/game.js',root/'js/bootstrap.js']:
 subprocess.run(['node','--check',str(p)],check=True)
stand=(root/'NEON_0419_onefile.html').read_text()
assert '<script type="module">' in stand and len(stand)>100000
assert 'data:image/png;base64,' in stand
assert '<link rel="stylesheet" href="style.css">' not in stand
print('PASS: nine valid art assets, linked HTML, standalone embed, JS syntax')
