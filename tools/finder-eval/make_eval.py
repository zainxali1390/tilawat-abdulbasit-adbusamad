import os
import json, subprocess, random
SP=os.environ.get('EVAL_DIR','eval-work').rstrip('/')+'/'
L=json.load(open(SP+'fpaud/list.json'));CP=json.load(open(SP+'eval_copies.json'));random.seed(2026);D=SP+'evalclips/'
def ff(a): subprocess.run(['ffmpeg','-y','-loglevel','error']+a,check=True)
V=[('clean15',15,['-b:a','96k'],'mp3',1),('mid10',10,['-b:a','64k'],'mp3',1),
   ('noise20',20,['-filter_complex','anoisesrc=c=pink:a=0.12:d=20[n];[0:a][n]amix=inputs=2:duration=first:normalize=0'],'mp3',1),
   ('phone15',15,['-af','highpass=f=300,lowpass=f=3400,aecho=0.8:0.5:40:0.3,volume=0.6','-c:a','aac','-b:a','32k'],'m4a',1),
   ('video15',15,None,'mp4',1),('tempo105',20,['-af','atempo=1.05'],'mp3',1.05),('short7',7,['-b:a','64k'],'mp3',1),
   ('echo15',15,['-af','aecho=0.8:0.7:60|120:0.4|0.25'],'mp3',1)]
cases=[]
for i,it in enumerate(L):
    code='e:%s:%s'%(it['key'],it['name'])
    for j,(vn,d,args,ext,k) in enumerate(V):
        st=round(random.uniform(30,it['len']-60),2);out=D+'r%02d-%s.%s'%(i,vn,ext)
        if ext=='mp4': ff(['-f','lavfi','-i','color=c=black:s=320x240:r=10','-ss',str(st),'-t',str(d),'-i',SP+it['file'],'-shortest','-map','0:v','-map','1:a','-c:v','libx264','-c:a','aac','-b:a','96k',out])
        else: ff(['-ss',str(st),'-t',str(d*k),'-i',SP+it['file'],'-vn','-ac','1']+args+[out])
        cases.append(dict(file=out,name='r%02d-%s'%(i,vn),variant=vn,code=code,copies=list(CP.get(code,{}).keys()),start=st,title=it['title']))
json.dump(cases,open(D+'cases.json','w'),ensure_ascii=False,indent=0);print(len(cases))
