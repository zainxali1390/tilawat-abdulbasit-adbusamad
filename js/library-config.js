/* Library configuration: full-Quran sets, riwayat, archive.org collection links, colour themes */
/* ==========================================================
   RECITATIONS: full-Quran sets (one audio file per surah).
   To add a set, push an object like this:
   {
     id: 'egypt-radio-mujawwad',
     title: 'Egyptian Radio · Mujawwad',
     style: 'Mujawwad', year: '1956', location: 'Cairo, Egypt', source: 'Radio',
     surahs: { 1: 'https://…/001.mp3', 2: 'https://…/002.mp3' }   // surah number → audio URL
   }
   Khatam sets can add: khatam: 'full' | 'rub' | 'nisf' | 'thalatha' | 'thumn' | 'other'
   ========================================================== */
const surahSet=base=>Object.fromEntries(Array.from({length:114},(_,i)=>[i+1,base+String(i+1).padStart(3,"0")+".mp3"]));
const RECITATIONS = [
 {id:"murattal",riwaya:"hafs",kind:"murattal",title:"Hafs · Murattal",titleAr:"حفص · مرتّل",style:"Murattal · Hafs ʿan ʿĀṣim",styleAr:"مرتّل · حفص عن عاصم",source:"mp3quran.net",surahs:surahSet("https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/")},
 {id:"mujawwad",riwaya:"hafs",kind:"mujawwad",title:"Hafs · Mujawwad",titleAr:"حفص · مجوّد",style:"Mujawwad · Hafs ʿan ʿĀṣim",styleAr:"مجوّد · حفص عن عاصم",source:"mp3quran.net",surahs:surahSet("https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/")},
 {id:"warsh",riwaya:"warsh",kind:"murattal",title:"Warsh · Murattal",titleAr:"ورش · مرتّل",style:"Murattal · Warsh ʿan Nāfiʿ",styleAr:"مرتّل · ورش عن نافع",source:"mp3quran.net",surahs:surahSet("https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r2/")}];
const RIWAYAT=[["hafs","Hafs ʿan ʿĀṣim","حفص عن عاصم"],["warsh","Warsh ʿan Nāfiʿ","ورش عن نافع"]];
/* Collections by area → sections → recordings: [base, file, surahs (ar), surahs (en), year, place (ar), place (en)] */
const EG_BASE={A:"https://archive.org/download/Tilawat-nadira_Adblbasset-abdssamad_quran/",B:"https://archive.org/download/ComprehensiveLibraryHeritageSheikhAbdulBasitAbdulSamadRecitationsSporadicRadio/",C:"https://archive.org/download/Abdel_Baset_Abd-Samad_uP_bY_mUSLEm/",K:"https://archive.org/download/1115125/",X1:"https://archive.org/download/x1-abdelbasset-orginal-baqaraa-to-hood/",X6:"https://archive.org/download/x6-saff-to-qesar/",X2:"https://archive.org/download/x2-abdelbasset-orginal-yossof-to-kahf_202308/",X3:"https://archive.org/download/x3-mariam-to-forkan/",X4:"https://archive.org/download/x4-shoraa-to-fath/",X5:"https://archive.org/download/x5-hograt-to-hashr_202308/",R:"https://archive.org/download/abdelbassetradiom3raj/",N1:"https://archive.org/download/NawaderGroup-1/",N2:"https://archive.org/download/NawaderGroup-2/",E:"https://archive.org/download/enregistrement_abdelbasset/"};
const rt=r=>r?(S.lang==="ar"&&r.titleAr?r.titleAr:r.title):"";
const rs=r=>r?(S.lang==="ar"&&r.styleAr?r.styleAr:r.style):"";

/* background colours: [id, dark bg, bg2, card, card2, light bg, bg2, card, card2]; gold accents stay the same */
const BGS = [
 ["green","#07140d","#0c1e14","#0f2419","#132c1f","#dfece2","#cde2d3","#f0f7f2","#e4f0e7"],
 ["teal","#061416","#0b1f22","#0e272b","#123035","#d9ecec","#c5e1e1","#eef7f7","#e0f0f0"],
 ["navy","#070d1a","#0c1426","#0f1a30","#14223b","#dde5f4","#c9d5ee","#eff3fb","#e3eaf7"],
 ["purple","#110a1a","#1a1026","#21142f","#2a1a3b","#e9def4","#d9c8ec","#f5f0fb","#ece2f7"],
 ["burgundy","#16070b","#220c12","#2a1017","#34141d","#f2dde1","#e7c7cd","#fbf0f2","#f4e3e6"],
 ["brown","#140e08","#1f160d","#271c11","#302315","#efe1cc","#e3cfb2","#f9f1e5","#f1e4d0"],
 ["black","#0a0a0a","#121212","#171717","#1e1e1e","#e4e4e4","#d3d3d3","#f4f4f4","#eaeaea"]];
