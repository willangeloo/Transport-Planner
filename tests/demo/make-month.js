// Builds the DEMO folder: a made-up company and one whole month of reports (September 2026, Mon–Fri):
//   - 1,500 customers in 28 bays (+ 2 Donegal bays that only show on the Customers tab)
//   - 150–400 orders and 10–25 bays on every day
//   - Planning, Resources, Products and Uplifts for every working day (REPORTS/week_36 … week_40), plus POD for week 37
//   - fake JDE check sheets for two days (CHECK_SHEETS/JDE/week_37), to try Printing
// Everything is invented, so it is safe to commit and share. The plan files (PLANS/week_XX) are made by make-plans.js.
// Usage: node make-month.js [outputFolder]   (default: ../../demo/Route_planning)
const XLSX=require('xlsx'), fs=require('fs'), path=require('path');
const {checkSheetPdf, makeLines}=require('../lib/checksheet');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..','..','demo','Route_planning'));
let seed=9; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };   // repeatable "random"
let seed2=2009; const rnd2=()=>{ seed2=(seed2*1103515245+12345)%2147483648; return seed2/2147483648; };   // for the products, check sheets and POD
const pick=(a,r)=>a[Math.floor((r||rnd)()*a.length)];
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const write=(rel,rows)=>{ const f=path.join(OUT,rel); fs.mkdirSync(path.dirname(f),{recursive:true}); const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=rows[0].map(()=>({wch:16})); XLSX.utils.book_append_sheet(wb,ws,'Sheet1'); XLSX.writeFile(wb,f); };
for(const d of ['MASTER_DATA','REPORTS','CHECK_SHEETS']) fs.rmSync(path.join(OUT,d),{recursive:true,force:true});

// ---- bays: 28 around Dublin (first 8 run every day) and 2 in Donegal
const AREAS=['City Centre','North Side','South Side','West','Swords','Malahide','Howth','Clontarf','Tallaght','Lucan','Dundrum','Blackrock','Dun Laoghaire','Bray','Greystones','Maynooth','Naas','Newbridge','Kildare','Celbridge','Navan','Drogheda','Dunboyne','Ashbourne','Wicklow','Arklow','Athy','Trim'];
const POS=[[53.347,-6.262,.015],[53.392,-6.250,.02],[53.300,-6.250,.02],[53.345,-6.390,.025],[53.459,-6.218,.02],[53.451,-6.154,.015],[53.388,-6.066,.015],[53.363,-6.195,.012],[53.287,-6.373,.02],[53.356,-6.447,.015],[53.292,-6.245,.012],[53.301,-6.178,.012],[53.294,-6.134,.012],[53.200,-6.098,.02],[53.145,-6.063,.02],[53.381,-6.592,.02],[53.215,-6.667,.02],[53.180,-6.800,.02],[53.158,-6.910,.03],[53.339,-6.541,.015],[53.653,-6.681,.03],[53.717,-6.350,.03],[53.420,-6.470,.02],[53.512,-6.398,.02],[52.980,-6.045,.03],[52.800,-6.160,.03],[52.990,-7.000,.03],[53.558,-6.744,.03]];
const PATTERNS=[[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4],   // BAY 01–08: every day
  [0,2,4],[0,2,4],[1,3],[1,3],[0,3],[1,4],[0,2],[2,4],[0,2,4],[1,3],[0,1,2],[3,4],[0,3],[1,4],[2],[0],[1,3],[0,2,4],[1,2,3],[4]];
const BAYS=AREAS.map((area,i)=>({bay:'BAY '+String(i+1).padStart(2,'0'), area, lat:POS[i][0], lng:POS[i][1], r:POS[i][2], days:PATTERNS[i], donegal:false}));
BAYS.push({bay:'DONEGAL 01',area:'Letterkenny',lat:54.95,lng:-7.73,r:.05,days:[1,3],donegal:true},{bay:'DONEGAL 02',area:'Donegal Town',lat:54.65,lng:-8.11,r:.05,days:[0,2],donegal:true});

// ---- 1,500 customers: 60 in Donegal, the rest shared out between the 28 bays (the every-day bays are bigger)
const N1=['Copper','Harbour','Old Mill','Green Lane','Riverside','Corner','Station','Market','Bridge','Hilltop','Oak Tree','Lantern','Quayside','Meadow','Foxglove','Granary','Anchor','Willow','Chapel','Castle','Abbey','Beech','Birch','Blue Door','Brook','Cedar','Cherry','Cliff','Clover','Cobble','Crown','Daisy','Elm','Fern','Forge','Garden','Gate','Glen','Golden','Hazel','Heron','Holly','Ivy','Juniper','Kestrel','Larch','Maple','Orchard','Pebble','Pine','Poppy','Rowan','Salt','Silver','Swan','Thistle','Tower','Violet','Wren','Yew'];
const N2=['Bar','Inn','Hotel','Café','Tavern','Lounge','Bistro','Stores','Social Club','Kitchen','Grill','Arms','House','Cellar','Taproom','Deli','Diner','Brasserie','Eatery','Pub','Restaurant','Canteen','Pantry','Larder','Hall','Hostel'];
const names=[]; N1.forEach(a=>N2.forEach(b=>names.push(`${a} ${b}`.toUpperCase()))); shuffle(names);
const STREETS=['Main St','Mill Rd','Quay Lane','Church St','Park Ave','High St','Bridge St','Station Rd','Market Sq','Castle Rd'];
const TW=['','','08:00-12:00','09:00-17:00','10:00-15:00','07:00-11:00','12:00-16:00'];
const reg=BAYS.filter(b=>!b.donegal), don=BAYS.filter(b=>b.donegal);
const wts=reg.map((b,i)=>b.days.length===5?80+Math.floor(rnd()*30):25+Math.floor(rnd()*45)); const wsum=wts.reduce((a,b)=>a+b,0);
const sizes=wts.map(w=>Math.floor(w/wsum*1440)); let rest=1440-sizes.reduce((a,b)=>a+b,0); for(let i=0;rest>0;i=(i+1)%sizes.length,rest--) sizes[i]++;
const plan=[]; reg.forEach((b,i)=>{ for(let k=0;k<sizes[i];k++) plan.push(b); }); don.forEach(b=>{ for(let k=0;k<30;k++) plan.push(b); });
const customers=plan.map((b,i)=>{ const noLoc=i%47===5;   // some without coordinates, to show "missing location"
  const sub=shuffle(b.days.slice()); const nd=rnd()<.45?1:rnd()<.6?2:Math.min(sub.length,3); const days=sub.slice(0,Math.max(1,Math.min(nd,sub.length))).sort();
  return {id:91000001+i, name:names[i], pc:`DMO ${String(100+i%900)}`, addr:`${1+Math.floor(rnd()*90)} ${pick(STREETS)}, ${b.area}`,
    lat:noLoc?'':+(b.lat+(rnd()-.5)*b.r*2).toFixed(6), lng:noLoc?'':+(b.lng+(rnd()-.5)*b.r*2.6).toFixed(6), bay:b.bay, days, tw:pick(TW)}; });
const DN=['Monday','Tuesday','Wednesday','Thursday','Friday'];
write('MASTER_DATA/MASTER_DEL_DETAILS.xlsx',[['Ship To','Name','Postal Code','Address','latitude','longitude','BAYS',...DN,'Time Window']]
  .concat(customers.map(c=>[c.id,c.name,c.pc,c.addr,c.lat,c.lng,c.bay,...DN.map((_,i)=>c.days.includes(i)?'Y':''),c.tw])));

// ---- fixed routes (DIPS day pattern: 7 characters, Sunday first) and the users file (fake people)
const dayStr=days=>'.'+[0,1,2,3,4].map(i=>days.includes(i)?'MTWTF'[i]:'.').join('')+'.';
write('MASTER_DATA/FIXED_ROUTES_DIPSDATA.xlsx',[['Route Id','Driver','Trip Tag','Vehicle','Day']].concat(reg.map((b,i)=>['FR'+String(i+1).padStart(2,'0'),'Driver '+String(i+1).padStart(2,'0'),b.bay,'TRK-'+String(i+1).padStart(2,'0'),dayStr(b.days)])));
const P=n=>`C:\\Users\\${n.toLowerCase()}\\OneDrive - Demo Transport\\Transport\\Route_planning`;
fs.writeFileSync(path.join(OUT,'MASTER_DATA','users.json'),JSON.stringify({company:'Demo Transport Ltd', shareComputers:true, users:[
  {name:'Alex',role:'MASTER',path:P('alex')},{name:'Sam',role:'MANAGER',path:P('sam')},{name:'Jordan',role:'USER',path:''},
  {name:'Casey',role:'USER',path:P('casey')},{name:'Warehouse',role:'VIEWER',path:P('warehouse')}]},null,2));

// ---- the month: every working day of September 2026
const WD=['Mon','Tue','Wed','Thu','Fri'], z=n=>String(n).padStart(2,'0');
const isoWeek=d=>{ const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())); t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7)); return Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/864e5+1)/7); };
const byBay={}; customers.forEach(c=>{ (byBay[c.bay]=byBay[c.bay]||[]).push(c); });
const BASE=[330,260,300,240,200];   // typical orders on Mon … Fri; every day varies by ±20%
let load=74600001, order=5600001; const stats=[]; const SHEETS={};
for(let day=1;day<=30;day++){
  const dt=new Date(Date.UTC(2026,8,day)); const dow=dt.getUTCDay(); if(dow===0||dow===6) continue; const di=dow-1, wd=WD[di], wk=isoWeek(dt);
  const date=`${z(day)}/09/2026`, od=new Date(Date.UTC(2026,8,day-3)), orderDate=`${z(od.getUTCDate())}/${z(od.getUTCMonth()+1)}/2026`;
  const target=Math.max(150,Math.min(400,Math.round(BASE[di]*(.8+.4*rnd()))));
  let active=reg.filter(b=>b.days.includes(di)); active=active.filter(b=>b.days.length===5||rnd()>.2); if(active.length<10) active=reg.filter(b=>b.days.includes(di));
  const pools=active.map(b=>byBay[b.bay].filter(c=>c.days.includes(di))).map(a=>shuffle(a.slice()));
  const weight=pools.map(p=>Math.min(p.length,40)*(.6+.8*rnd())); const wsum2=weight.reduce((a,b)=>a+b,0);
  const plan=[['Load Number','Order Number','Address Number Ship To','Ship To Name','Address Line 2','Address Line 3','Date Promised Shipment','Weight','Route Code']];
  const res=[['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM','General Area','Drops','Kgs']];
  const prod=[['Order Number','Product','Description','Quantity','Unit']], upl=[['Ship To','Name','Product','Quantity','Reason']];
  const pod=[['Order Number','Ship To','Customer Name','Delivery Date','Delivered At','Received By','Status','Notes']]; let nOrders=0;
  active.forEach((b,bi)=>{
    const pool=pools[bi]; if(!pool.length) return; const want=Math.max(1,Math.round(target*weight[bi]/wsum2)); const L={id:load++,drops:0,kg:0}; let got=0;
    for(const c of pool){ if(got>=want) break; const n=Math.min(want-got,rnd()<.68?1:rnd()<.75?2:3); L.drops++;
      for(let i=0;i<n;i++){ const w=Math.round(40+rnd()*460), o=order++; L.kg+=w; got++; nOrders++;
        plan.push([L.id,o,c.id,c.name,c.addr.split(', ')[0],c.addr.split(', ')[1],date,w,'R'+b.bay.slice(4)]);
        const lines=makeLines(rnd2,w);
        (SHEETS[date]=SHEETS[date]||[]).push({load:String(L.id),order:String(o),name:c.name,customerNo:String(c.id),addrLines:[...(rnd2()<.35?[`${pick(N1,rnd2).toUpperCase()} ${pick(['TRADING','HOSPITALITY','HOLDINGS'],rnd2)} LTD`]:[]),...c.addr.split(', ').map(a=>a.toUpperCase())],
          po:rnd2()<.8?String(10600000+Math.floor(rnd2()*99999)):'',empties:rnd2()<.6,lines,date,orderDate});
        lines.forEach(l=>prod.push([o,l.sku,l.desc,l.qty,l.uom]));
        const r=rnd2(), t=450+Math.floor(rnd2()*540);
        pod.push([o,c.id,c.name,date,`${z(Math.floor(t/60))}:${z(t%60)}`,pick(['J. Murphy','A. Byrne','K. Walsh','M. Doyle','Manager on duty'],rnd2),r<.04?'Refused':r<.12?'Delivered short':'Delivered',r<.04?'Customer closed':r<.12?'2 cases not on the truck':'']); }
      if(rnd2()<.08) upl.push([c.id,c.name,'KEG501',1+Math.floor(rnd2()*3),pick(['Empty kegs','Damaged stock'],rnd2)]); }
    res.push([L.id,b.bay,`Driver ${z((bi+di*5)%40+1)}`,bi%2?`Helper ${z((bi+di*5)%40+1)}`:'',`TRK-${z(reg.indexOf(b)+1)}`,Math.ceil(L.kg/400),Math.round(30+rnd()*130),b.area,L.drops,L.kg]); });
  if(upl.length<2){ const c=pick(customers.filter(x=>x.days.includes(di)&&!/DONEGAL/.test(x.bay)),rnd2); upl.push([c.id,c.name,'KEG501',1,'Empty kegs']); }
  const dir=`REPORTS/week_${wk}/`;
  write(`${dir}DIPS_Plan_${wd}.xlsx`,plan); write(`${dir}RES_${wd}.xlsx`,res); write(`${dir}PROD_${wd}.xlsx`,prod); write(`${dir}UPLIFTS_${wd}.xlsx`,upl); if(wk===37) write(`${dir}POD_${wd}.xlsx`,pod);
  stats.push({date,wk,orders:nOrders,bays:res.length-1});
}
const mm=a=>`${Math.min(...a)}–${Math.max(...a)} (average ${Math.round(a.reduce((x,y)=>x+y,0)/a.length)})`;
console.log(`Demo month written to ${OUT}: ${customers.length} customers, ${stats.length} working days, ${stats.reduce((a,s)=>a+s.orders,0)} orders`);
console.log(`  orders per day ${mm(stats.map(s=>s.orders))}; bays per day ${mm(stats.map(s=>s.bays))}`);
// ---- fake JDE check sheets for two days of week 37 (Mon 07.09 and Thu 10.09): the day is read from the pages, not from the file name
(async()=>{
  for(const [date,name] of [['07/09/2026','Offloading_Sheet_Report_2.pdf'],['10/09/2026','Offloading_Sheet_Report_5.pdf']]){
    const list=SHEETS[date].slice().sort((a,b)=>a.load.localeCompare(b.load)||a.order.localeCompare(b.order)); let opt={blankAfter:[2]};
    if(date==='10/09/2026'){   // Thursday shows the Printing exceptions: a load that is not in Resources (UNASSIGNED) and a page nobody can read (REVIEW)
      list.splice(4,0,{load:'74699999',order:'5699999',name:'LATE CALL BISTRO',customerNo:'91009999',addrLines:['1 NEW ROAD','CITY CENTRE'],po:'',empties:false,date,orderDate:list[0].orderDate,lines:makeLines(rnd2,180)});
      opt={blankAfter:[2],reviewAfter:[6]}; }
    const f=path.join(OUT,'CHECK_SHEETS','JDE','week_37',name); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,await checkSheetPdf(list,opt)); }
  console.log('Check-sheet PDFs written to CHECK_SHEETS/JDE/week_37 (Mon 07.09 and Thu 10.09)');
})();
