#!/usr/bin/env python3
"""Deterministic original pixel-art asset generation for the demo. Requires Pillow."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import random, math
OUT=Path(__file__).parent/'assets';OUT.mkdir(parents=True,exist_ok=True)
R=random.Random(419)
W,H=2800,360
NAVY=(6,12,29);CYAN=(41,238,233);PINK=(249,63,163);AMBER=(255,168,76)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
def font(n):return ImageFont.truetype(font_path,n)
def rect(d,box,fill,width=0):d.rectangle(tuple(int(v) for v in box),fill=fill,width=width)
def line(d,pts,fill,width=1):d.line(pts,fill=fill,width=width)
def glow_rect(im,xy,col,r=14,alpha=180):
    glow=Image.new('RGBA',im.size);gd=ImageDraw.Draw(glow)
    gd.rectangle(xy,fill=(*col,alpha))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(r)))
def text_glow(im,pos,string,col,sz,blur=6):
    tmp=Image.new('RGBA',im.size);d=ImageDraw.Draw(tmp)
    d.text(pos,string,font=font(sz),fill=(*col,220),stroke_width=0)
    im.alpha_composite(tmp.filter(ImageFilter.GaussianBlur(blur)))
    im.alpha_composite(tmp)

def save(im,name):im.save(OUT/name,optimize=True);print(name, im.size)

# SKY: a far horizon in a haze of old blue, mauve and sodium-orange.
w=1400
sky=Image.new('RGBA',(w,H));pix=sky.load()
for y in range(H):
    k=y/H
    c=(round(4+18*k),round(9+31*k),round(25+47*k))
    for x in range(w):
        wave=2.2*math.sin(x/113+y/42)+1.6*math.sin(x/47-y/87)
        pix[x,y]=(max(0,int(c[0]+wave*.5)),max(0,int(c[1]+wave)),max(0,int(c[2]+wave*1.4)),255)
d=ImageDraw.Draw(sky)
# distant planetary glow
fog=Image.new('RGBA',sky.size);fd=ImageDraw.Draw(fog);fd.ellipse((450,-15,980,500),fill=(57,117,147,65));sky.alpha_composite(fog.filter(ImageFilter.GaussianBlur(90)))
moon=(1040,79);fd=ImageDraw.Draw(fog);fd.ellipse((moon[0]-48,moon[1]-48,moon[0]+48,moon[1]+48),fill=(122,198,219,155));sky.alpha_composite(fog.filter(ImageFilter.GaussianBlur(42)))
d=ImageDraw.Draw(sky);d.ellipse((moon[0]-21,moon[1]-21,moon[0]+21,moon[1]+21),fill=(162,208,220,188))
d.ellipse((moon[0]-18,moon[1]-18,moon[0]+17,moon[1]+17),fill=(195,222,226,137))
for i in range(95):
 x=R.randrange(w);y=R.randrange(20,175);z=R.choice([1,1,1,2]);d.rectangle((x,y,x+z,y+z),fill=(127,172,204,R.randrange(38,140)))
# tapered distant buildings
x=-20
while x<w:
 bw=R.randrange(17,54);top=R.randrange(125,240)
 col=R.choice([(13,29,52,210),(19,37,59,230),(21,39,65,235),(12,27,48,230)])
 rect(d,(x,top,x+bw,300),col)
 if R.random()<.32:
  rect(d,(x+bw//2-1,top-15,x+bw//2+1,top),col)
 for yy in range(top+7,282,8):
  for xx in range(x+4,x+bw-3,7):
   if R.random()<.33:
    c=R.choice([(85,162,167,95),(255,188,114,77),(173,116,163,85)])
    rect(d,(xx,yy,xx+2,yy+3),c)
 x+=bw+R.randrange(2,10)
# horizon banks
fog=Image.new('RGBA',sky.size);fd=ImageDraw.Draw(fog)
for y in range(196,329,4):
 fd.line((0,y,w,y),fill=(38,105,122,max(0,int((y-188)*.53))),width=3)
sky.alpha_composite(fog.filter(ImageFilter.GaussianBlur(23)))
save(sky,'sky.png')

# MID CITY layer: architectural silhouettes and signed windows, long parallax.
w=2360
mid=Image.new('RGBA',(w,H));d=ImageDraw.Draw(mid)
x=-36
while x<w:
 bw=R.randint(73,162);top=R.randint(56,165)
 wall=R.choice([(10,24,41,245),(9,22,40,246),(17,30,48,255),(12,31,46,250)])
 rect(d,(x,top,x+bw,296),wall)
 rect(d,(x,top,x+bw,top+3),(29,55,72,255))
 for ix in range(x+6,x+bw-3,R.randint(10,16)):
  rect(d,(ix,top+5,ix+2,282),(24,47,65,175))
 for yy in range(top+16,283,14):
  for xx in range(x+9,x+bw-6,13):
   chance=R.random()
   if chance<.20: c=(255,172,112,R.randint(80,178))
   elif chance<.37:c=(61,201,209,R.randint(65,155))
   elif chance<.40:c=(221,100,164,125)
   else:continue
   rect(d,(xx,yy,xx+5,yy+7),c)
 if R.random()<.68:
  rx=x+R.randrange(8,bw-2);rect(d,(rx,top-14,rx+2,top),(27,53,70,230))
  if R.random()<.5:line(d,[(rx-6,top-13),(rx+10,top-13)],(33,81,91,225))
 if R.random()<.38:
  # suspended LED window
  bx=x+R.randrange(7,max(8,bw-35));by=top+R.randrange(12,42)
  rect(d,(bx,by,bx+33,by+17),(2,16,29,255));rect(d,(bx,by,bx+33,by+2),(25,160,163,200))
  for j in range(3):rect(d,(bx+5+j*9,by+6,bx+8+j*9,by+11),(46,212,198,180))
 x+=bw+R.randint(4,11)
# overhead tracks/cables
for yy in [32,41,52]:
 line(d,[(0,yy),(w,yy+R.randint(0,9))],(35,57,66,190))
for xx in range(12,w,180):
 line(d,[(xx,22),(xx+28,54),(xx+58,62)],(28,58,65,180),2)
# atmospheric low haze
fog=Image.new('RGBA',(w,H));fd=ImageDraw.Draw(fog);fd.rectangle((0,223,w,330),fill=(29,76,93,52))
mid.alpha_composite(fog.filter(ImageFilter.GaussianBlur(24)))
save(mid,'midcity.png')

# STREET: textured structures, animated-game-ready foreground, wet asphalt.
w=W
street=Image.new('RGBA',(w,H));d=ImageDraw.Draw(street)
# entire facade dark back strip
rect(d,(0,67,w,280),(7,15,28,245))
# district wall panels
for x0,x1,top,color in [
 (0,390,107,(12,27,41,255)),(392,755,73,(13,28,46,255)),(757,1034,100,(12,26,41,255)),
 (1036,1394,54,(11,24,39,255)),(1396,1736,93,(14,27,41,255)),
 (1738,2085,67,(10,27,45,255)),(2087,2390,110,(14,24,39,255)),(2392,2800,54,(13,29,46,255))]:
 rect(d,(x0,top,x1,283),color)
 rect(d,(x0,top,x1,top+3),(29,57,66,255))
 for xx in range(x0+11,x1,37):
  rect(d,(xx,top+4,xx+2,279),(22,45,55,235))
  if R.random()<.52:rect(d,(xx-3,179,xx+4,190),(45,67,72,255))
 for yy in range(top+14,264,31):
  line(d,[(x0,yy),(x1,yy)],(20,39,51,210))
 # windows upper strip
 for xx in range(x0+18,x1-18,46):
  for yy in range(top+14,198,42):
   if R.random()<.82:
    bright=R.random()
    if bright<.32:c=(46,173,182,210)
    elif bright<.6:c=(244,155,94,184)
    elif bright<.85:c=(126,74,127,190)
    else:c=(18,48,65,200)
    rect(d,(xx,yy,xx+23,yy+18),(5,17,29,250));rect(d,(xx+2,yy+2,xx+20,yy+15),c)
    rect(d,(xx+11,yy+1,xx+12,yy+16),(6,21,35,255))
    rect(d,(xx+1,yy+8,xx+22,yy+9),(7,28,42,220))
# skyline outline rooftop rail
for x in range(0,w,100):
 yy=[100,73,100,54,93,67,110,54][min(7,x//350)]
 line(d,[(x,yy-7),(x+40,yy-7)],(43,68,78,130),1)

# scene layout large set pieces: 1 noodle bar; 2 passage; 3 data lab; 4 gantry; 5 gate
# left section balcony / fire escapes
for xx in [38,95,165,265]:
 rect(d,(xx,177,xx+1,275),(33,61,67,255));line(d,[(xx-10,188),(xx+11,188)],(58,92,99,225))
# CAFE from 430 to 690
rect(d,(418,190,715,280),(19,19,29,255))
rect(d,(428,205,705,253),(50,32,38,255))
for i in range(7):
 x=433+i*39;rect(d,(x,209,x+28,244),(178,93,65,240));rect(d,(x+2,212,x+25,239),(253,169,98,125))
rect(d,(412,193,723,204),(118,36,60,255))
for i in range(18):
 x=417+i*16;rect(d,(x,193,x+8,203),(208,65,80,240) if i%2 else (155,41,62,230))
rect(d,(450,157,677,183),(11,21,34,255));rect(d,(452,158,675,160),(150,54,68,230))
# entrance vertical red lights
for xx in [425,712]:rect(d,(xx,212,xx+2,278),(245,61,91,240))
# right city billboard
rect(d,(808,132,968,204),(5,17,32,255));rect(d,(811,135,965,200),(25,74,87,245))
# dark service pipes, scattered gratings
for xx in [988,1023,1068,1404,1470,1912,1970,2090,2210,2440]:
 rect(d,(xx,89,xx+5,280),(29,54,62,245));rect(d,(xx+2,90,xx+3,277),(65,91,88,170))
for xx in range(1050,1390,49):
 rect(d,(xx,214,xx+35,273),(8,15,24,250));rect(d,(xx+2,216,xx+33,260),(25,45,56,255))
 for yy in range(220,259,9):line(d,[(xx+5,yy),(xx+31,yy)],(43,69,74,245))
# holographic arch
for xx in [1480,1800]:rect(d,(xx,110,xx+16,281),(14,37,53,250));rect(d,(xx+2,115,xx+4,276),(35,162,172,170))
rect(d,(1480,110,1816,130),(16,40,57,255));line(d,[(1487,127),(1812,127)],(52,166,175,235),3)
for xx in range(1487,1813,20):rect(d,(xx,114,xx+8,119),(52,181,190,120))
# utilities near x1900
for xx in [1884,1902,1920]:
 rect(d,(xx,239,xx+13,279),(9,17,29,255));rect(d,(xx+2,240,xx+10,245),(60,107,116,190))
# main neon kiosk / terminal facade near x2180
rect(d,(2162,171,2382,280),(5,20,30,255));rect(d,(2181,183,2358,263),(13,40,52,255))
for xx in range(2186,2356,13):
 rect(d,(xx,189,xx+5,250),(16,70,75,120))
rect(d,(2158,171,2384,183),(28,88,94,240));rect(d,(2160,173,2381,176),(73,204,204,225))
# final gate after x2540
rect(d,(2558,151,2765,278),(12,24,39,255));rect(d,(2603,193,2725,278),(3,10,23,255));rect(d,(2594,179,2732,197),(30,59,73,255))
for xx in [2587,2733]:rect(d,(xx,185,xx+7,278),(33,88,96,255));rect(d,(xx+2,187,xx+4,274),(72,207,206,230))
# high hanging signs / light windows
street.alpha_composite(Image.new('RGBA',street.size))
text_glow(street,(60,116),'N O I R',CYAN,26,12)
text_glow(street,(455,159),'RAMEN 24',AMBER,21,8)
text_glow(street,(826,143),'SYNTH',CYAN,22,8)
text_glow(street,(837,173),'CITY',PINK,19,7)
text_glow(street,(1090,104),'ARCHIVE',PINK,25,10)
text_glow(street,(1508,97),'DISTRICT 07',CYAN,22,9)
text_glow(street,(1948,139),'NO SIGNAL',PINK,16,8)
text_glow(street,(2195,133),'MEMORY',CYAN,23,10)
text_glow(street,(2630,165),'EXIT',AMBER,15,6)
# blue/magenta auras before foreground frame
for xx,yy,c,r in [(120,185,CYAN,32),(566,174,AMBER,45),(908,170,CYAN,42),(1155,110,PINK,45),(1635,125,CYAN,45),(2045,145,PINK,35),(2288,150,CYAN,35),(2680,176,AMBER,35)]:
 glow_rect(street,(xx-30,yy-6,xx+30,yy+6),c,r,105)
# hardline feature details on top of glow
sd=ImageDraw.Draw(street)
for xx in [110,360,475,690,840,930,1155,1380,1510,1790,1930,2165,2360,2630]:
 rect(sd,(xx,252,xx+3,282),(49,88,92,255));rect(sd,(xx-9,249,xx+11,252),(58,98,98,220))
for xx in range(0,w,140):
 rect(sd,(xx+8,270,xx+22,275),(5,12,22,255))
 for k in range(3):line(sd,[(xx+10+k*4,271),(xx+10+k*4,274)],(63,100,104,190))
# road + curb + pseudo reflection
rect(sd,(0,280,w,360),(7,15,26,255))
rect(sd,(0,280,w,283),(44,81,87,255));rect(sd,(0,283,w,285),(20,47,59,255))
for yy in [290,310,331,354]:
 line(sd,[(0,yy),(w,yy)],(19,35,47,255))
for xx in range(0,w,65):
 line(sd,[(xx,285),(xx-25,360)],(20,38,46,110),1)
for xx in range(0,w,110):
 rw=R.randint(16,95);y=R.randint(288,346)
 sd.ellipse((xx,y,xx+rw,y+R.randint(2,6)),fill=(23,65,76,R.randint(90,200)))
for xx,c in [(112,CYAN),(550,AMBER),(905,CYAN),(1149,PINK),(1650,CYAN),(2033,PINK),(2284,CYAN),(2680,AMBER)]:
 for i in range(36):
  y=287+i*2
  a=max(5,round(200*(1-i/37)**1.5))
  leng=R.randrange(6,max(8,30+i//2));wth=max(2,round(1+i*.05))
  x=xx+R.randrange(-12,14)
  rect(sd,(x-leng//2,y,x+leng//2,y+wth),(*c,a//3))
# ambient trash/crack lines
for i in range(280):
 x=R.randint(0,w-1);y=R.randint(286,358)
 cc=R.choice([(20,43,51,180),(32,61,67,180),(43,68,67,120)])
 line(sd,[(x,y),(x+R.randint(2,11),y)],cc)
save(street,'street.png')

# Decorative post in separate foreground layer
post=Image.new('RGBA',(70,150));pd=ImageDraw.Draw(post)
rect(pd,(32,8,38,149),(12,23,31,255));rect(pd,(33,8,35,147),(51,88,93,255))
rect(pd,(17,10,51,24),(12,26,39,255));rect(pd,(20,13,49,17),(105,204,200,240))
rect(pd,(24,21,44,27),(20,64,70,255))
for j in range(7):rect(pd,(34,32+j*14,36,38+j*14),(42,80,79,230))
save(post,'lamp-post.png')

# hero pixel animation frames 8 x 28 wide; each 52 high
SW,SH=30,52
strip=Image.new('RGBA',(SW*8,SH));ss=ImageDraw.Draw(strip)

def hero_frame(i):
 x=i*SW;phase=i*math.pi/4
 swing=round(math.sin(phase)*3)
 # shoe back and shoes
 rect(ss,(x+11-swing,45,x+17-swing,48),(7,12,19,255))
 rect(ss,(x+14+swing,45,x+22+swing,48),(7,12,19,255))
 # legs 
 rect(ss,(x+12-swing//2,30,x+17-swing//2,45),(24,31,42,255))
 rect(ss,(x+16+swing//2,30,x+21+swing//2,45),(13,19,29,255))
 rect(ss,(x+12-swing//2,43,x+17-swing//2,46),(38,64,71,255))
 # jacket body outline & fold
 rect(ss,(x+9,17,x+23,33),(6,13,24,255))
 rect(ss,(x+11,18,x+22,31),(42,47,62,255))
 rect(ss,(x+11,20,x+14,30),(46,169,173,255))
 rect(ss,(x+18,20,x+21,31),(55,45,67,255))
 # cross-strap and cuffs
 line(ss,[(x+14,18),(x+21,28)],(220,95,108,240),2)
 # arm shift
 rect(ss,(x+6,19+swing//3,x+10,29+swing//3),(14,23,36,255))
 rect(ss,(x+22,21-swing//3,x+26,30-swing//3),(20,32,47,255))
 rect(ss,(x+22,28-swing//3,x+24,30-swing//3),(108,186,178,255))
 # neck
 rect(ss,(x+14,16,x+19,20),(183,118,102,255))
 # face head/skin
 rect(ss,(x+12,6,x+21,17),(24,30,38,255))
 rect(ss,(x+13,8,x+20,15),(201,137,108,255))
 rect(ss,(x+12,6,x+21,10),(9,14,23,255))
 rect(ss,(x+10,8,x+14,13),(12,18,27,255))
 # visor
 rect(ss,(x+16,11,x+22,13),(62,236,227,255))
 rect(ss,(x+17,11,x+22,11),(172,250,244,255))
 # a dramatic hair tuft
 rect(ss,(x+13,5,x+19,7),(11,18,28,255))
 rect(ss,(x+11,7,x+14,8),(10,15,24,255))
 # glowing shoe tread
 rect(ss,(x+12-swing,47,x+17-swing,48),(36,145,144,255))
for i in range(8):hero_frame(i)
save(strip,'hero-walk.png')

# NPC with helmet & long amber overcoat
npc=Image.new('RGBA',(32,52));nd=ImageDraw.Draw(npc)
rect(nd,(9,43,15,49),(13,22,27,255));rect(nd,(20,43,26,49),(13,22,27,255))
rect(nd,(9,21,25,43),(67,35,47,255));rect(nd,(9,23,12,39),(249,119,93,255))
rect(nd,(12,23,24,43),(102,49,59,255));rect(nd,(11,34,22,35),(189,82,80,255))
rect(nd,(8,24,11,36),(37,36,46,255));rect(nd,(25,23,29,36),(42,34,48,255))
rect(nd,(14,15,21,22),(126,91,76,255))
rect(nd,(12,6,23,17),(12,18,28,255));rect(nd,(14,9,23,16),(156,115,94,255))
rect(nd,(12,7,25,11),(24,33,42,255));rect(nd,(13,12,25,14),(248,105,151,255))
rect(nd,(16,12,25,12),(255,175,197,255))
save(npc,'npc.png')

# data chip 24 x 32
chip=Image.new('RGBA',(24,32));cd=ImageDraw.Draw(chip)
cd.polygon([(12,2),(20,10),(17,23),(12,30),(4,23),(3,10)],fill=(14,64,71,255))
cd.polygon([(12,3),(17,11),(13,24),(12,29),(8,22),(6,12)],fill=(45,225,225,255))
cd.polygon([(12,4),(13,24),(8,21),(6,12)],fill=(93,241,225,255))
line(cd,[(12,3),(12,27)],(205,255,248,255));line(cd,[(7,12),(17,12)],(205,255,248,255))
save(chip,'chip.png')

# hovering drone with neon exhaust
_drone=Image.new('RGBA',(78,33));dr=ImageDraw.Draw(_drone)
dr.polygon([(5,14),(14,6),(59,6),(74,17),(62,23),(12,23)],fill=(8,18,27,255))
dr.polygon([(12,11),(58,11),(65,17),(55,20),(17,20)],fill=(32,53,63,255))
rect(dr,(22,12,54,16),(18,104,113,255));rect(dr,(43,13,54,14),(98,253,234,255))
for xx in [16,60]:
 rect(dr,(xx-4,4,xx+5,8),(49,75,82,255));rect(dr,(xx-3,7,xx+4,11),(10,20,29,255))
 rect(dr,(xx-6,21,xx+6,24),(37,163,180,255))
 rect(dr,(xx-3,24,xx+3,28),(66,203,225,170))
rect(dr,(3,15,9,18),(236,84,132,255))
save(_drone,'drone.png')

# actual neon-bloom sprite, added on top with ADD blending
G=128
gl=Image.new('RGBA',(G,G));px=gl.load()
for y in range(G):
 for x in range(G):
  r=math.hypot((x+0.5-G/2)/(G/2),(y+0.5-G/2)/(G/2))
  a=int(max(0,1-r)**2.4*155)
  px[x,y]=(255,255,255,a)
save(gl,'glow.png')

# Game preview composite using same scroll factors at x=0, screenshot deterministic.
preview=Image.new('RGBA',(640,360))
for fname in ['sky.png','midcity.png','street.png']:
 im=Image.open(OUT/fname).convert('RGBA');preview.alpha_composite(im.crop((0,0,640,360)))
preview.alpha_composite(Image.open(OUT/'hero-walk.png').convert('RGBA').crop((0,0,SW,SH)),(154,232))
preview.alpha_composite(Image.open(OUT/'npc.png').convert('RGBA'),(591,231))
preview.convert('RGB').save(Path(__file__).parent/'preview.jpg',quality=91)
