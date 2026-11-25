"""Same audio or not, for given pairs of recordings: all shared landmarks from the index (fp/), one straight time line
(RANSAC) over most of the shorter recording; the rule of tools/library/same_audio_library.py.
   python3 samefit.py PAIRS.json OUT.json      or   from samefit import fit_pairs"""
import json, os, sys
import numpy as np
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..')); FP=os.path.join(ROOT,'fp')
man=json.load(open(os.path.join(FP,'manifest.json'))); codes=[r[0] for r in man['recs']]; dur=[r[1] for r in man['recs']]; tunit=man.get('tunit',1)
ci={c:i for i,c in enumerate(codes)}
def fit_pairs(pairs):
    pairs=[p for p in pairs if p[0] in ci and p[1] in ci]
    if not pairs: return []
    need=sorted({ci[x] for p in pairs for x in p})
    needset=np.zeros(len(codes)+1,bool); needset[need]=True
    H={r:([],[]) for r in need}
    for d in sorted(os.listdir(os.path.join(FP,'s'))):
        for f in sorted(os.listdir(os.path.join(FP,'s',d))):
            b=open(os.path.join(FP,'s',d,f),'rb').read()
            cnt=np.frombuffer(b[:32],'<u2').astype(np.int64); ent=np.frombuffer(b[32:],'<u4')
            rec=(ent>>18).astype(np.int64); sel=needset[rec]
            if not sel.any(): continue
            lo=np.searchsorted(np.cumsum(cnt),np.nonzero(sel)[0],side='right')
            base=(int(d,16)<<8|int(f[:2],16))<<4
            for r,h,t in zip(rec[sel],base+lo,(ent[sel]&262143).astype(np.int64)*tunit):
                H[int(r)][0].append(int(h)); H[int(r)][1].append(int(t))
    for r in H: H[r]=(np.array(H[r][0],np.int64),np.array(H[r][1],np.float64)*0.032)
    rng=np.random.default_rng(1)
    def fit(a,b):
        ha,ta=H[a]; hb,tb=H[b]
        ua,ia,ca=np.unique(ha,return_index=True,return_counts=True); ub,ib,cb=np.unique(hb,return_index=True,return_counts=True)
        ua,ia=ua[ca==1],ia[ca==1]; ub,ib=ub[cb==1],ib[cb==1]
        com,xa,xb=np.intersect1d(ua,ub,return_indices=True)
        if len(com)<20: return len(com),(0,None)
        P=np.c_[ta[ia[xa]],tb[ib[xb]]]; best=(0,None)
        for _ in range(2500):
            i,j=rng.choice(len(P),2,replace=False)
            if abs(P[j,0]-P[i,0])<15: continue
            k=(P[j,1]-P[i,1])/(P[j,0]-P[i,0])
            if not 0.85<k<1.18: continue
            c=P[i,1]-k*P[i,0]; inl=np.abs(P[:,1]-(k*P[:,0]+c))<0.3
            if inl.sum()>best[0]: best=(int(inl.sum()),(float(k),float(c),float(P[inl,0].min()),float(P[inl,0].max())))
        return len(P),best
    out=[]
    for a0,b0 in pairs:
        a,b=ci[a0],ci[b0]; n,(inl,p)=fit(a,b)
        o=dict(u=a0,other=b0,shared=n,inliers=inl,u_len=round(dur[a]),other_len=round(dur[b]))
        if p:
            k,c,t0,t1=p; o.update(speed=round(k,4),offset=round(c,1),span_s=round(t1-t0),same=bool(inl>=60 and t1-t0>=min(120,0.5*min(dur[a],dur[b]))))
        else: o['same']=False
        out.append(o); print(o['same'],inl,o.get('span_s'),a0[:60],'|',b0[:60],flush=True)
    return out

if __name__=='__main__':
    json.dump(fit_pairs(json.load(open(sys.argv[1]))),open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
