"""Reproduce the CC BY-SA 3.0 lake adaptations from the author's pinned source.
Requires Pillow and numpy. No model inference, no upscaling; metadata in sources.json.
"""
from pathlib import Path
import hashlib,json,urllib.request,sys
from PIL import Image,ImageDraw,ImageFilter
import numpy as np
root=Path(__file__).resolve().parents[1]
assets=Path(sys.argv[2]) if len(sys.argv)>2 else root/'assets'
assets.mkdir(parents=True,exist_ok=True)
scratch=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/tmp/window-lake')
scratch.mkdir(parents=True,exist_ok=True)
entry=next(e for e in json.loads((root/'assets/sources.json').read_text()) if e['id']=='lake')
source=scratch/'examplepano.jpg'
if not source.exists():
    source.write_bytes(urllib.request.urlopen(entry['downloadURL'],timeout=60).read())
if hashlib.sha256(source.read_bytes()).hexdigest()!=entry['sourceSHA256']:
    raise RuntimeError('Source SHA-256 mismatch')
im=Image.open(source).convert('RGB')
assert list(im.size)==entry['sourceDimensions']
im.save(assets/'lake.webp',quality=93,method=6)
# Deliberately approximate distance. R soft, G sharp, B hand-painted water mask.
y=np.linspace(0,1,1024)[:,None];d=np.clip((y-.43)/.5,0,1)*.9+.02
depth=Image.fromarray((np.broadcast_to(d,(1024,2048))*255).astype('uint8')).copy()
water=Image.new('L',(2048,1024));draw=ImageDraw.Draw(water)
# Outlines traced on the 1200 x 600 preview, conservatively inset from shorelines.
for poly in [[(966,328),(1000,330),(1046,334),(1084,331),(1149,321),(1199,321),(1199,361),(1178,370),(1135,365),(1094,347),(1026,342)],[(0,325),(34,325),(56,322),(102,324),(119,321),(86,341),(48,353),(0,367)]]:
 draw.polygon([(round(x*2048/1200),round(y*1024/600)) for x,y in poly],fill=255)
Image.merge('RGB',(depth.filter(ImageFilter.GaussianBlur(7)),depth,water.filter(ImageFilter.GaussianBlur(2)))).save(assets/'lake-depth.png',optimize=True)
# Rectified static fallback; same direction and field of view as the shader.
w,h=1200,750;xx,yy=np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
rx=(xx-.5)*1.02*w/h;ry=(.5-yy)*1.02+.025
u=(.9+np.arctan2(rx,1)/(2*np.pi))%1;v=np.arccos(ry/np.sqrt(rx*rx+ry*ry+1))/np.pi
arr=np.asarray(im);ix=u*(im.width-1);iy=v*(im.height-1);x0=ix.astype(int);y0=iy.astype(int);fx=(ix-x0)[...,None];fy=(iy-y0)[...,None]
a=(arr[y0,x0]*(1-fx)+arr[y0,np.minimum(x0+1,im.width-1)]*fx)*(1-fy)+(arr[np.minimum(y0+1,im.height-1),x0]*(1-fx)+arr[np.minimum(y0+1,im.height-1),np.minimum(x0+1,im.width-1)]*fx)*fy
Image.fromarray(a.astype('uint8')).save(assets/'lake-still.webp',quality=91,method=6)
print('Reproduced lake photo, preview and approximate depth/water mask:', assets)
