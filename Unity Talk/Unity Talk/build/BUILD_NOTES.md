# Rehearsal slide deck — build notes

How the "Shader Debugging Rehearsal Slides.html" deck is made, so a new chat can rebuild or extend it.

## Sources
- **Script:** Google Doc "Shader Debugging Techniques" — https://docs.google.com/document/d/1nWFqQZHUih0uyLVhfAlbICl1fm0MTrTVjD8ZUrsdpvY/edit (the .docx in the folder is an older copy; always read the Google Doc).
- Read it in the built-in browser: fetch `/document/d/<id>/export?format=html` from the open Docs tab with javascript_tool. Docs needs a Trusted Types policy, so parse with `trustedTypes.createPolicy(...)` + DOMParser.
- From the first table, take for each row the first paragraph of column 1 and all non-empty paragraphs of column 3 (Visuals). Save the result as rows.json: `[[col1FirstLine, [visualLines...]], ...]`.
- **Local folder:** `C:\Work\Claude\Unity Talk` — images in `graphics/`, code in `code/` (.txt). Stage these into the container to build.

## Slide rules
- One slide per non-empty Visuals line, in table order.
- Speaker comes from the first column's prefix: `H ` = Herman, `S ` = Sara. A row with no first-column text continues the previous section and speaker. Rows that have lost their prefix: Exaggerate → S, Animation and time → H.
- Sara's lines: remove the "Diapositiva:" prefix. A line without that prefix is appended to her previous slide.
- The intro row has no visuals, so it gets a title slide: "Shader Debugging Techniques — Herman Tulleken & Sara San Martín".
- **Material lines:** a line counts as material when it names files from graphics/ or code/. A name with an extension or an underscore always counts (`flow_blur_abs`, `hash.png`). A bare word that matches a file stem (`gradient`, `quantized`) only counts when every other word on the line is filler (Splitscreen, split, screen, code, map), so "float as bar / code" stays a text slide. Aliases: HLS→hsl, vidris→viridis, Encondig_half→encoding_half, Encoding_mouse→encoding_mouseposition. Names are case-insensitive, and a space before an extension (`dial .png`) is tolerated.
- A material line with other words on it (e.g. "Splitscreen: gradient / quantized") makes its own slide. A line with only file names attaches to the preceding text slide; if that slide already has material, a new slide is added.
- Videos (.mp4/.webm) are treated like images: embedded, autoplaying, looping and muted. File-only lines attach to the previous slide only within the same section and speaker.
- Layout depends on what the line names, in order: one 1920-wide image → full slide; image + code → image left, code right; two images → left and right halves; a named .txt that doesn't exist → image left, "name (missing)" placeholder right. Files in the folders that the doc doesn't name (e.g. golden1–6.png) are not used.

## Look
- Font: Poppins. Herman's slides are brand Coral `#FF716F` and Sara's are aqua `#17B3B3`, with white text. Section name at top left, speaker at top right, slide number at bottom right.
- **Image only:** the image fills the whole slide (images are 1920×1080) on black, with no text.
- **Image + code (split screen):** the image fills the exact left half (images are 960×1080) and the code the right half. Code: monospace on brand Indigo `#30287A`, tab size 4, font auto-shrunk so it fits with no scrolling. Lines between `// HIGHLIGHT_START` and `// HIGHLIGHT_END` get an solid brand Azure `#0297FE` highlight, and the marker lines themselves are hidden.
- Navigation: arrows, Space or click; F toggles fullscreen. Images are embedded as base64, so the HTML is self-contained.
- Check at a 1920×1080 viewport (Playwright): the split image's bounding box should be exactly 0,0,960,1080.

## Build
- The build also writes `slides_manifest.json` next to the deck, for other deck tools: one entry per slide with index, speaker, section, description, layout (text/full/split), ready, and assets (type image/video/code, path relative to the Unity Talk folder, position full/left/right, and for code the 1-based highlight_lines counted after the marker lines are removed).
- The build script and template are in the folder under `build/` (`build_deck.py`, `deck_template.html`), and are also copied below. Put rows.json next to them (the latest is saved in build/ too), stage graphics/ and code/ to `/mnt/user-data/uploads/Unity Talk/`, run the script, then commit the output to `C:\Work\Claude\Unity Talk\Shader Debugging Rehearsal Slides.html`.
- A second deck, "...Slides with Script.html" (slide on the left half, the section's script in small indigo `#3F2B96` on white on the right half), was built from the older docx and does not include the images.

## build_deck.py
```python
import json, base64, os, re, difflib, sys
ROOT=sys.argv[1] if len(sys.argv)>1 else '/mnt/user-data/uploads/Unity Talk'
OUT=sys.argv[2] if len(sys.argv)>2 else '/mnt/user-data/outputs/Shader Debugging Rehearsal Slides.html'
HERE=os.path.dirname(os.path.abspath(__file__))
IMG_EXT=('.png','.jpg','.jpeg','.gif','.mp4','.webm')
files={}
for sub in ('graphics','code'):
    d=os.path.join(ROOT,sub)
    if os.path.isdir(d):
        for f in os.listdir(d): files[f.lower()]=os.path.join(d,f)
stems={}
for k,p in files.items(): stems.setdefault(os.path.splitext(k)[0],p)
ALIASES={'hls':'hsl','vidris':'viridis','encondig_half':'encoding_half','encoding_mouse':'encoding_mouseposition'}
def resolve_named(name):
    n=name.lower(); stem,ext=os.path.splitext(n); stem=ALIASES.get(stem,stem)
    if stem+ext in files: return files[stem+ext]
    cands=[k for k in files if k.endswith(ext)]
    pref=[k for k in cands if k.startswith(stem)]
    if pref: return files[sorted(pref,key=len)[0]]
    m=difflib.get_close_matches(stem+ext,cands,1,0.85)
    return files[m[0]] if m else None
IGNORABLE={'splitscreen','split','screen','code','map','vs','and'}
def tokens(line):
    """Return (list of (kind,path_or_name,found), has_other_words).
    Names with an extension or an underscore always count as files. Bare words that match a file
    stem (e.g. 'gradient') only count when every other word on the line is ignorable."""
    line=re.sub(r'\s+\.(png|jpg|gif|mp4|txt)\b',r'.\1',line,flags=re.I)
    out=[]; bare=[]; words=[]
    for w in re.findall(r'[A-Za-z0-9_.\-]+',line):
        w=w.strip('.:-')
        if not w: continue
        lw=w.lower(); stem,ext=os.path.splitext(lw); key=ALIASES.get(lw,lw)
        if ext in IMG_EXT+('.txt',):
            p=resolve_named(w); out.append(('code' if ext=='.txt' else 'img',p or w,bool(p)))
        elif '_' in lw and key in stems:
            p=stems[key]; out.append(('code' if p.endswith('.txt') else 'img',p,True))
        elif key in stems:
            bare.append(stems[key]); out.append(('bare',stems[key],True))
        else: words.append(lw)
    keep=bare and all(w in IGNORABLE for w in words)
    out=[(('code' if p.endswith('.txt') else 'img') if k=='bare' else k,p,f) for k,p,f in out if k!='bare' or keep]
    if keep: bare=[]
    other=bool(words or bare)
    return out,other
def uri(p):
    ext=os.path.splitext(p)[1].lower().strip('.'); ext='jpeg' if ext=='jpg' else ext
    kind='video' if ext in ('mp4','webm') else 'image'
    return f'data:{kind}/{ext};base64,'+base64.b64encode(open(p,'rb').read()).decode()
rows=json.load(open(os.path.join(HERE,'rows.json')))
slides=[]; spk='H'; section=''; missing=[]
for c0,vis in rows:
    if c0:
        if c0[:2] in ('H ','S '): spk=c0[0]; section=c0[2:].strip()
        else: section=c0; spk={'Exaggerate':'S','Animation and time':'H'}.get(section,spk)
    lines=[l.strip() for l in vis if l.strip()]
    if not lines and c0.startswith('H Super'):
        lines=['Title: Shader Debugging Techniques — Herman Tulleken & Sara San Martín']
    for l in lines:
        toks,other=tokens(l)
        missing+=[os.path.basename(n) for k,n,f in toks if not f]
        if toks and any(f for _,_,f in toks):
            imgs=[uri(p) for k,p,f in toks if k=='img' and f]
            code=[open(p,encoding='utf-8',errors='replace').read() for k,p,f in toks if k=='code' and f]
            codemiss=[os.path.basename(p) for k,p,f in toks if k=='code' and not f]
            prev=slides[-1] if slides else None
            if other or prev is None or 'imgs' in prev or prev['sec']!=section or prev['s']!=spk: target=dict(s=spk,sec=section,t=l if (other or prev is None or prev['sec']!=section) else prev['t']); slides.append(target)
            else: target=prev
            target['imgs']=imgs
            target['_assets']=[p for k,p,f in toks if f]
            if code: target['code']=code[0]
            elif codemiss: target['codemiss']=codemiss[0]
            continue
        if spk=='S' and slides and slides[-1]['s']=='S' and slides[-1]['sec']==section and not l.lower().startswith('diapositiva'):
            slides[-1]['t']+=' '+l; continue
        if l.lower().startswith('diapositiva:'): l=l[12:].strip()
        slides.append(dict(s=spk,sec=section,t=l))
def rel(p): return os.path.relpath(p,ROOT).replace(os.sep,'/')
def layout(x):
    a=x.get('_assets',[])
    if not a: return 'text'
    n=len(a)+(1 if x.get('codemiss') else 0)
    return 'full' if n==1 else 'split'
manifest={'title':'Shader Debugging Techniques','speakers':{'H':'Herman Tulleken','S':'Sara San Martín'},
  'canvas':{'width':1920,'height':1080},'asset_root':'C:/Work/Claude/Unity Talk','slides':[]}
for i,x in enumerate(slides):
    a=x.get('_assets',[]); lay=layout(x)
    positions=['full'] if lay=='full' else ['left','right']
    assets=[]
    for j,p in enumerate(a):
        ext=os.path.splitext(p)[1].lower()
        kind='code' if ext=='.txt' else 'video' if ext in ('.mp4','.webm') else 'image'
        e={'type':kind,'path':rel(p),'position':positions[min(j,len(positions)-1)]}
        if kind=='code':
            src=open(p,encoding='utf-8',errors='replace').read().replace('\r','').split('\n')
            hl=[];ln=0;on=False;start=None
            for line in src:
                if 'HIGHLIGHT_START' in line: on=True; start=ln+1; continue
                if 'HIGHLIGHT_END' in line: on=False; hl.append([start,ln]); continue
                ln+=1
            e['highlight_lines']=hl; e['note']='Strip // HIGHLIGHT_START / // HIGHLIGHT_END marker lines; highlight_lines are 1-based, counted after stripping.'
        assets.append(e)
    if x.get('codemiss'): assets.append({'type':'code','path':'code/'+x['codemiss'],'position':'right','missing':True})
    manifest['slides'].append({'index':i+1,'speaker':x['s'],'speaker_name':manifest['speakers'][x['s']],'section':x['sec'],
        'description':x['t'],'layout':lay,'ready':bool(a),'assets':assets})
json.dump(manifest,open(os.path.join(os.path.dirname(OUT),'slides_manifest.json'),'w'),ensure_ascii=False,indent=2)
for x in slides: x.pop('_assets',None)
page=open(os.path.join(HERE,'deck_template.html')).read().replace('__DATA__',json.dumps(slides,ensure_ascii=False))
open(OUT,'w').write(page)
print(len(slides),'slides; missing:',sorted(set(missing)))
for i,x in enumerate(slides):
    if 'imgs' in x: print(f"{i+1:3} {x['s']} imgs={len(x['imgs'])} code={'code' in x} miss={x.get('codemiss','')}  {x['t'][:55]}")
```

## deck_template.html
```html
<!doctype html><html><head><meta charset="utf-8"><title>Shader Debugging Rehearsal</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
html,body{margin:0;height:100%;background:#111;font-family:Poppins,sans-serif;color:#fff;overflow:hidden}
#s{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:6vw 8vw;box-sizing:border-box;transition:background .2s}
.H{background:#FF716F}.S{background:#17B3B3}
#sec{position:absolute;top:4vh;left:8vw;font-size:2.2vw;font-weight:600;opacity:.85}
#who{position:absolute;top:4vh;right:8vw;font-size:2.2vw;font-weight:700}
#t{font-size:4.2vw;font-weight:600;line-height:1.25}
#n{position:absolute;bottom:4vh;right:8vw;font-size:1.6vw;opacity:.8}
#hint{position:absolute;bottom:4vh;left:8vw;font-size:1.3vw;opacity:.6}
#m{display:none;position:fixed;inset:0;background:#000;z-index:5}
#m.on{display:flex}
#m img{flex:none;width:100%;height:100%;object-fit:contain}
#m video{flex:none;width:100%;height:100%;object-fit:contain;background:#000}
#m.split img,#m.split video{width:50%}
#m pre{flex:none;width:50%;height:100%;margin:0;background:#30287A;color:#f5f5f5;padding:4vh 2vw;overflow:hidden;font:1.25vw/1.5 Consolas,'Cascadia Mono',monospace;white-space:pre;tab-size:4;box-sizing:border-box}
#n{z-index:6}
#m pre span{display:block}
#m pre span.hl{background:#0297FE;box-shadow:-2vw 0 0 #0297FE,2vw 0 0 #0297FE}
#s.media #n{opacity:.4;font-size:.8vw;bottom:.8vh;right:1vw}
#m .ph{flex:none;width:50%;height:100%;display:flex;align-items:center;justify-content:center;background:#30287A;color:rgba(255,255,255,.7);font:1.4vw Consolas,monospace;box-sizing:border-box;border:3px dashed rgba(255,255,255,.35)}
#cap{position:absolute;bottom:4vh;left:50%;transform:translateX(-50%);font-size:1.2vw;opacity:.85;max-width:60vw;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.media #t{display:none}.media #hint{display:none}
</style></head><body>
<div id="s"><div id="sec"></div><div id="who"></div><div id="t"></div><div id="m"></div><div id="cap"></div><div id="n"></div><div id="hint">← → / click to navigate · F for fullscreen</div></div>
<script>
const D=__DATA__;let i=0;
function show(){const x=D[i];s.className=x.s;sec.textContent=x.sec;who.textContent=x.s=='H'?'Herman':'Sara';t.textContent=x.t;const media=x.imgs&&x.imgs.length;s.classList.toggle('media',!!media);m.textContent='';cap.textContent='';
if(media){const panes=x.imgs.length+((x.code||x.codemiss)?1:0);m.className='on'+(panes>1?' split':'');
for(const src of x.imgs){let el;if(src.startsWith('data:video')){el=document.createElement('video');el.src=src;el.autoplay=true;el.loop=true;el.muted=true;el.playsInline=true}else{el=new Image();el.src=src}m.append(el)}
if(x.code){const pre=document.createElement('pre');let hl=false;for(const ln of x.code.replace(/\r/g,'').split('\n')){if(/HIGHLIGHT_START/.test(ln)){hl=true;continue}if(/HIGHLIGHT_END/.test(ln)){hl=false;continue}const sp=document.createElement('span');sp.className=hl?'hl':'';sp.textContent=ln+'\n';pre.append(sp)}m.append(pre);fitCode(pre)}
else if(x.codemiss){const p=document.createElement('div');p.className='ph';p.textContent=x.codemiss+' (missing)';m.append(p)}}else m.className='';
n.textContent=(i+1)+' / '+D.length;}
function fitCode(pre){let f=22;pre.style.fontSize=f+'px';while(f>8&&(pre.scrollWidth>pre.clientWidth||pre.scrollHeight>pre.clientHeight)){f-=0.5;pre.style.fontSize=f+'px'}}
addEventListener('resize',()=>{const pre=m.querySelector('pre');if(pre)fitCode(pre)});
function go(d){i=Math.max(0,Math.min(D.length-1,i+d));show();}
addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' ','Enter'].includes(e.key))go(1);else if(['ArrowLeft','PageUp','Backspace'].includes(e.key))go(-1);else if(e.key=='Home'){i=0;show()}else if(e.key=='End'){i=D.length-1;show()}else if(e.key=='f'||e.key=='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}});
addEventListener('click',e=>go(e.clientX<innerWidth/3?-1:1));
show();
</script></body></html>
```
