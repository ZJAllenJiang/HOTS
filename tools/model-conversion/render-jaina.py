#!/usr/bin/env python3
"""CPU orthographic texture QA from Three-loaded GLB poses; no WebGL claim."""
from pathlib import Path
import json, numpy as np
from PIL import Image, ImageDraw, ImageFont
BASE=Path(__file__).resolve().parent
texture=np.array(Image.open(BASE/'jaina-body-texture.png').convert('RGB'))/255
W,H=640,780

def render(name,eye):
    pose=json.loads((BASE/name).read_text()); meshes=pose['meshes']
    allp=np.concatenate([np.array(m['positions']).reshape(-1,3) for m in meshes]); low,high=allp.min(0),allp.max(0);center=(low+high)/2
    forward=np.array(eye,dtype=float);forward/=np.linalg.norm(forward)
    right=np.cross([0,1,0],forward);right/=np.linalg.norm(right);up=np.cross(forward,right)
    basis=np.stack([right,up,forward],axis=1);pp=(allp-center)@basis
    scale=min((W-100)/(pp[:,0].max()-pp[:,0].min()),(H-140)/(pp[:,1].max()-pp[:,1].min()))
    canvas=np.zeros((H,W,3),float); canvas[:]=[.065,.085,.13]; depth=np.full((H,W),-np.inf)
    light=np.array([-.4,.65,.8]);light/=np.linalg.norm(light)
    for mesh in meshes:
        world=np.array(mesh['positions']).reshape(-1,3);p=(world-center)@basis;p[:,:2]*=scale;p[:,0]+=W/2;p[:,1]=H/2+15-p[:,1]
        uv=np.array(mesh['uv']).reshape(-1,2);idx=np.array(mesh['indices']).reshape(-1,3)
        for tri in idx:
            v=p[tri];minx=max(0,int(v[:,0].min()));maxx=min(W-1,int(np.ceil(v[:,0].max())));miny=max(0,int(v[:,1].min()));maxy=min(H-1,int(np.ceil(v[:,1].max())))
            if minx>maxx or miny>maxy:continue
            a,b,c=v;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
            if abs(den)<1e-8:continue
            xx,yy=np.meshgrid(np.arange(minx,maxx+1)+.5,np.arange(miny,maxy+1)+.5)
            wa=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
            wb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;wc=1-wa-wb
            zz=wa*a[2]+wb*b[2]+wc*c[2];section=depth[miny:maxy+1,minx:maxx+1];mask=(wa>=0)&(wb>=0)&(wc>=0)&(zz>section)
            if not mask.any():continue
            coords=wa[...,None]*uv[tri[0]]+wb[...,None]*uv[tri[1]]+wc[...,None]*uv[tri[2]]
            tx=np.clip((coords[...,0]*(texture.shape[1]-1)).astype(int),0,texture.shape[1]-1);ty=np.clip((coords[...,1]*(texture.shape[0]-1)).astype(int),0,texture.shape[0]-1)
            n=np.cross(world[tri[1]]-world[tri[0]],world[tri[2]]-world[tri[0]]);norm=np.linalg.norm(n);n=n/norm if norm else np.array([0,1,0]);shade=.6+.4*abs(n@light)
            rgb=texture[ty,tx]*shade;canvas[miny:maxy+1,minx:maxx+1][mask]=rgb[mask];section[mask]=zz[mask]
    return Image.fromarray(np.uint8(np.clip(canvas,0,1)*255)),pose

panels=[('pose-0.json',[0,.08,1],'Stand · front (+Z)'),('pose-0.json',[.7,.22,1],'Stand · three-quarter'),('pose-6.json',[.7,.22,1],'Walk · midpoint')]
out=Image.new('RGB',(W*3,H+90),'#111a2a');d=ImageDraw.Draw(out)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=ImageFont.truetype(fontpath,20);small=ImageFont.truetype(fontpath,15)
for i,(name,eye,label) in enumerate(panels):
    im,pose=render(name,eye);out.paste(im,(i*W,55));d.text((i*W+24,20),label,font=font,fill='#f2f5fc');d.text((i*W+24,H+60),f"{pose['clip']} at {pose['time']:.3f}s",font=small,fill='#aabbd7')
out.save(BASE/'jaina-hots-body-cpu-qa.png')
print(BASE/'jaina-hots-body-cpu-qa.png')
