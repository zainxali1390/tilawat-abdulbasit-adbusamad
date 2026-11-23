/* Saved settings and progress (localStorage key "abq"; keep this key so nobody loses their data) */
/* state */
const DEF = {area:0,lang:null,theme:"dark",bgc:"green",bg:true,autoNext:true,hq:true,notifDaily:false,notifNew:true,favs:[],recent:[],trMode:"both",mPage:1,recId:null,shuffle:false,repeat:false,pos:{},last:null,mMode:"read",bm:[],trSize:1,vStyle:"Murattal",trSu:0};
let S;
try{S=Object.assign({},DEF,JSON.parse(localStorage.getItem("abq")||"{}"))}catch(e){S=Object.assign({},DEF)}
function save(){try{localStorage.setItem("abq",JSON.stringify(S))}catch(e){}}
