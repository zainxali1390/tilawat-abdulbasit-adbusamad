import os
import json, subprocess, random
SP=os.environ.get('EVAL_DIR','eval-work').rstrip('/')+'/'
L=json.load(open(SP+'fpaud/list.json'));CP=json.load(open(SP+'eval_copies.json'));random.seed(77);D=SP+'evalclips/'
def ff(a): subprocess.run(['ffmpeg','-y','-loglevel','error']+a,check=True)
music='sine=f=220:d=40,volume=0.05[m1];sine=f=277:d=40,volume=0.04[m2];sine=f=330:d=40,volume=0.04[m3];[m1][m2][m3]amix=inputs=3[mu]'
V=[('fast125',20,1.25,'atempo=1.25'),('slow080',20,0.8,'atempo=0.8'),('music20',20,1,None),('intro25',25,1,None)]
cases=json.load(open(D+'cases.json'))
cases=[c for c in cases if not c['variant'] in [v[0] for v in V]]
for i,it in enumerate(L):
    code='e:%s:%s'%(it['key'],it['name'])
    for vn,d,k,af in [V[i%4],V[(i+1)%4]]:
        st=round(random.uniform(30,it['len']-60),2);out=D+'r%02d-%s.mp4'%(i,vn)
        if vn=='music20':
            ff(['-ss',str(st),'-t',str(d),'-i',SP+it['file'],'-f','lavfi','-i','color=c=black:s=320x240:r=10','-filter_complex',music+';[0:a][mu]amix=inputs=2:duration=first:normalize=0[a]','-map','1:v','-map','[a]','-shortest','-c:v','libx264','-c:a','aac','-b:a','96k',out]);cst=st
        elif vn=='intro25':
            ff(['-f','lavfi','-i','anoisesrc=c=brown:a=0.08:d=3','-ss',str(st),'-t',str(d-3),'-i',SP+it['file'],'-f','lavfi','-i','color=c=black:s=320x240:r=10','-filter_complex','[0:a]aresample=44100,aformat=channel_layouts=mono[n];[1:a]aresample=44100,aformat=channel_layouts=mono[r];[n][r]concat=n=2:v=0:a=1[a]','-map','2:v','-map','[a]','-shortest','-c:v','libx264','-c:a','aac',out]);cst=st
        else:
            ff(['-ss',str(st),'-t',str(d*k),'-i',SP+it['file'],'-f','lavfi','-i','color=c=black:s=320x240:r=10','-af',af,'-map','1:v','-map','0:a','-shortest','-c:v','libx264','-c:a','aac','-b:a','96k',out]);cst=st
        cases.append(dict(file=out,name='r%02d-%s'%(i,vn),variant=vn,code=code,copies=list(CP.get(code,{}).keys()),start=cst,title=it['title']))
json.dump(cases,open(D+'cases.json','w'),ensure_ascii=False,indent=0);print(len(cases))
