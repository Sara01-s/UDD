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
