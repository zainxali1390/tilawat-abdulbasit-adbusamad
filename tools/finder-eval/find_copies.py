import sys,json,os
import numpy as np
sys.path.insert(0,''+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')+'/tools/fingerprint')
from fpcore import load_audio
from match import Index
SP=os.environ.get('EVAL_DIR','eval-work').rstrip('/')+'/'
idx=Index(''+os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')+'/fp');codes=idx.codes
L=json.load(open(SP+'fpaud/list.json'))
out=json.load(open(SP+'eval_copies.json')) if os.path.exists(SP+'eval_copies.json') else {}
# already found by the first run
out.setdefault('e:X1:155-1-9 التوبه 128-129 الانفطار الشمس القدر -المرسى ابوالعباس- الاسكندريه.mp3',{})
def rs(x,f):
    n=int(len(x)/f);return np.interp(np.arange(n)*f,np.arange(len(x)),x).astype(np.float32)
F=[1,1/1.03,1/0.97,1/1.06,1/0.94]
for it in L:
    code='e:%s:%s'%(it['key'],it['name'])
    if code in out: continue
    me=codes.index(code);x=load_audio(SP+it['file']);n=len(x)//8000;hits={}
    for t in range(10,n-20,30):
        seg=x[t*8000:(t+15)*8000];got=set()
        for f in F:
            for mo,secs,rec,off in idx.search(rs(seg,f) if f!=1 else seg,exclude=me)[:4]:
                if mo>=8 and secs>=4 and rec not in got: got.add(rec);hits.setdefault(codes[rec],[]).append(t)
    out[code]={k:len(v) for k,v in hits.items() if len(v)>=2}
    json.dump(out,open(SP+'eval_copies.json','w'),ensure_ascii=False,indent=1)
    print(code[:45],{k[:42]:v for k,v in out[code].items()},flush=True)
print('ALLDONE')
