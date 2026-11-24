import os
import json,sys
from collections import Counter,defaultdict
CP=json.load(open(''+os.environ.get('EVAL_DIR','eval-work').rstrip('/')+'/eval_copies.json'))
def score(f):
    R=[json.loads(l) for l in open(f)]
    for r in R: r['copies']=sorted(set(r['copies'])|set(CP.get(r['code'],{})))
    P=[r for r in R if not r['hide']];N=[r for r in R if r['hide']]
    pc=Counter();bad=[]
    for r in P:
        ok={r['code'],*r['copies']};L=r['list']
        top=L[0] if L else None
        if not top: pc['no answer']+=1;continue
        allc={top['code'],*top['copies']}
        right=bool(ok&allc)
        if right:
            # time check against the source recording itself
            st=top['start'] if top['code']==r['code'] else None
            pc['right '+top['level']]+=1
            if st is not None and abs(st-r['start'])>0.6: pc['right but time off >0.6 s']+=1
        else:
            ws=not(set(top['sur'])&set(r['truth']))
            pc['WRONG recording %s%s'%(top['level'],' (wrong surah)' if ws else ' (same surah)')]+=1;bad.append((r['name'],top['code'][:40],top['level'],top['sur'],r['truth']))
    nc=Counter()
    for r in N:
        L=r['list']
        if not L: nc['no answer (correct)']+=1;continue
        top=L[0];ws=not(set(top['sur'])&set(r['truth']))
        if {top['code'],*top['copies']}&set(r['copies']): nc['copy that was not hidden (not an error)']+=1;continue
        nc['FALSE %s%s'%(top['level'],' (wrong surah)' if ws else ' (same surah, other performance)')]+=1;bad.append(('HIDDEN '+r['name'],top['code'][:40],top['level'],top['sur'],r['truth']))
    fc=Counter()
    for r in N+[x for x in P if not x['list']]:
        for v in r.get('nf') or []:
            if isinstance(v,dict): fc['not-found screen names %s surah (%s)'%('the RIGHT' if v['s'] in r['truth'] else 'a WRONG','confirmed' if v['l']=='c' else 'possible')]+=1
    vc=Counter()
    for r in R:
        for x in r['list'][:1]:
            v=x.get('verse')
            if v: vc['verse %s %s'%(v['l'],'right surah' if (v['s'] in r['truth'] or v['s2'] in r['truth']) else 'WRONG surah')]+=1
    vc.update(fc)
    return len(P),pc,len(N),nc,vc,bad
for f in sys.argv[1:]:
    n,pc,m,nc,vc,bad=score(f);print('==',f.split('/')[-1]);print('  in library (%d):'%n,dict(pc));print('  hidden (%d):'%m,dict(nc));
    if vc: print('  verses shown:',dict(vc))
    for b in bad: print('    x',b)
