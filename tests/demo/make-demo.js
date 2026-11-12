// Builds the DEMO folder: a made-up company, one full week of reports (week 46, Mon 09.11 – Fri 13.11.2026),
// the customer master, fixed routes and a users file. Everything is invented, so it is safe to commit and share.
// Usage: node make-demo.js [outputFolder]   (default: ../../demo/Route_planning)
const XLSX=require('xlsx'), fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..','..','demo','Route_planning'));
let seed=46; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };   // repeatable "random"
const pick=a=>a[Math.floor(rnd()*a.length)];
// a second generator for the check sheets, products, uplifts and POD: it doesn't touch the first one, so the plans and customers stay identical
let seed2=2046; const rnd2=()=>{ seed2=(seed2*1103515245+12345)%2147483648; return seed2/2147483648; };
const pick2=a=>a[Math.floor(rnd2()*a.length)];
const {checkSheetPdf, makeLines, JDE_NAMES, CATALOGUE}=require('../lib/checksheet');
// a third generator for the uplift reports (raised dates, products): the plans, PDFs and other reports stay identical
let seed3=3046; const rnd3=()=>{ seed3=(seed3*1103515245+12345)%2147483648; return seed3/2147483648; };
const write=(rel,sheet,rows)=>{ const f=path.join(OUT,rel); fs.mkdirSync(path.dirname(f),{recursive:true}); const wb=XLSX.utils.book_new(); const ws=XLSX.utils.aoa_to_sheet(rows); ws['!cols']=rows[0].map(()=>({wch:16})); XLSX.utils.book_append_sheet(wb,ws,sheet); XLSX.writeFile(wb,f); };
fs.rmSync(path.join(OUT,'MASTER_DATA'),{recursive:true,force:true}); fs.rmSync(path.join(OUT,'REPORTS'),{recursive:true,force:true}); fs.rmSync(path.join(OUT,'CHECK_SHEETS'),{recursive:true,force:true});

// ---- customers: 6 bays around a fictional depot (coordinates near Dublin so the map has streets)
const BAYS=[{bay:'BAY 01',area:'City Centre',lat:53.347,lng:-6.262,r:.018},{bay:'BAY 02',area:'North Side',lat:53.392,lng:-6.250,r:.025},{bay:'BAY 03',area:'South Side',lat:53.300,lng:-6.250,r:.025},
  {bay:'BAY 04',area:'West',lat:53.345,lng:-6.390,r:.03},{bay:'BAY 05A',area:'Meath',lat:53.600,lng:-6.650,r:.05},{bay:'BAY 05B',area:'Kildare',lat:53.200,lng:-6.680,r:.05},{bay:'BAY 06',area:'Wicklow',lat:53.050,lng:-6.150,r:.05}];
const N1=['Copper','Harbour','Old Mill','Green Lane','Riverside','Corner','Station','Market','Bridge','Hilltop','Oak Tree','Lantern','Quayside','Meadow','Foxglove','Granary','Anchor','Willow','Chapel','Castle'];
const N2=['Bar','Inn','Hotel','Café','Tavern','Lounge','Bistro','Stores','Social Club','Kitchen'];
const TW=['','','08:00-12:00','09:00-17:00','10:00-15:00','07:00-11:00','12:00-16:00'];
const DAYSETS=[[0,2,4],[1,3],[0,3],[1,4],[2],[0,1,2,3,4],[0,2],[3,4]];
const customers=[]; let id=91000001; const used=new Set();
BAYS.forEach((b,bi)=>{ const n=bi<4?10:6; for(let i=0;i<n;i++){ let name; do{ name=`${pick(N1)} ${pick(N2)}`.toUpperCase(); }while(used.has(name)); used.add(name);
  const noLoc = customers.length%23===7;   // a few without coordinates, to show "missing location"
  customers.push({id:id++, name, pc:`DMO ${String(100+customers.length).slice(-3)}`, addr:`${1+Math.floor(rnd()*90)} ${pick(['Main St','Mill Rd','Quay Lane','Church St','Park Ave','High St'])}, ${b.area}`,
    lat:noLoc?'':+(b.lat+(rnd()-.5)*b.r*2).toFixed(6), lng:noLoc?'':+(b.lng+(rnd()-.5)*b.r*2.6).toFixed(6), bay:b.bay, days:pick(DAYSETS), tw:pick(TW)}); } });
const DN=['Monday','Tuesday','Wednesday','Thursday','Friday'];
write('MASTER_DATA/MASTER_DEL_DETAILS.xlsx','Sheet1',[['Ship To','Name','Postal Code','Address','latitude','longitude','BAYS',...DN,'Time Window']]
  .concat(customers.map(c=>[c.id,c.name,c.pc,c.addr,c.lat,c.lng,c.bay,...DN.map((_,i)=>c.days.includes(i)?'Y':''),c.tw])));

// ---- fixed routes: BAY 07 runs Mon / Wed / Fri even when the planning file has no load for it
// Day pattern as in DIPS: 7 characters, Sunday first (".M.W.F." = Mon, Wed, Fri)
write('MASTER_DATA/FIXED_ROUTES_DIPSDATA.xlsx','Sheet1',[['Route Id','Driver','Trip Tag','Vehicle','Day'],
  ['FR01','Driver 21','BAY 07','TRK-21','.M.W.F.'],['FR02','Driver 22','BAY 06','TRK-22','..T.T..'],['FR03','Driver 23','BAY 01','TRK-23','.MTWTF.']]);

// ---- users file (fake people) — see docs/users-config.md.
// "shareComputers": true is a DEMO setting so one presenter can switch users on one laptop. The company file leaves it out:
// then each laptop is registered to one person the first time they get in, and nobody else can use it.
const P=n=>`C:\\Users\\${n.toLowerCase()}\\OneDrive - Demo Transport\\Transport\\Route_planning`;
fs.writeFileSync(path.join(OUT,'MASTER_DATA','users.json'),JSON.stringify({company:'Demo Transport Ltd', shareComputers:true, users:[
  {name:'Alex',role:'MASTER',path:P('alex')},
  {name:'Sam',role:'MANAGER',path:P('sam')},
  {name:'Jordan',role:'USER',path:''},   // no folder yet: blocked until a Master/Manager sets it
  {name:'Casey',role:'USER',path:P('casey')},
  {name:'Warehouse',role:'VIEWER',path:P('warehouse')}]},null,2));

// ---- one week of reports: week 46, Mon 09.11 – Fri 13.11.2026
const WEEK=[['Mon','09/11/2026'],['Tue','10/11/2026'],['Wed','11/11/2026'],['Thu','12/11/2026'],['Fri','13/11/2026']];
let load=74600001, order=5600001;
const SHEETS={};   // orders per weekday, for the fake check-sheet PDFs
const UPL=[];      // uplifts (pick-ups of empty kegs or damaged stock), with the day they are collected (k, 0 = Mon)
WEEK.forEach(([wd,date],di)=>{
  const plan=[['Load Number','Order Number','Address Number Ship To','Ship To Name','Address Line 2','Address Line 3','Date Promised Shipment','Weight','Route Code']];
  const res=[['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM','General Area','Drops','Kgs']];
  const prod=[['Order Number','Product','Description','Quantity','Unit']];
  const loads={};
  customers.filter(c=>c.days.includes(di)).forEach(c=>{
    const b=BAYS.find(x=>x.bay===c.bay); const lk=c.bay; if(!loads[lk]) loads[lk]={id:load++, bay:c.bay, area:b.area, drops:0, kg:0};
    const L=loads[lk]; L.drops++; const n=1+Math.floor(rnd()*3);
    for(let i=0;i<n;i++){ const w=Math.round(40+rnd()*460); L.kg+=w; const o=order++;
      plan.push([L.id,o,c.id,c.name,c.addr.split(', ')[0],c.addr.split(', ')[1],date,w,'R'+c.bay.slice(4)]);
      const lines=makeLines(rnd2,w);
      (SHEETS[wd]=SHEETS[wd]||[]).push({load:String(L.id), order:String(o), name:c.name, customerNo:String(c.id), addrLines:[...(rnd2()<.35?[`${pick2(N1).toUpperCase()} ${pick2(['TRADING','HOSPITALITY','HOLDINGS'])} LTD`]:[]), ...c.addr.split(', ').map(a=>a.toUpperCase())], po:rnd2()<.8?String(10600000+Math.floor(rnd2()*99999)):'', empties:rnd2()<.6, lines, date, orderDate:(()=>{ const [dd,mm,yy]=date.split('/').map(Number); const od=new Date(Date.UTC(yy,mm-1,dd-3)); const z=n=>String(n).padStart(2,'0'); return z(od.getUTCDate())+'/'+z(od.getUTCMonth()+1)+'/'+od.getUTCFullYear(); })()});
      for(let q=0;q<4;q++) rnd();   // the old random products drew 4 numbers here; kept so the plans stay identical
      lines.forEach(l=>prod.push([o,l.sku,l.desc,l.qty,l.uom])); }
    if(rnd()<.15) UPL.push({c, k:di, qty:1+Math.floor(rnd()*3), reason:pick(['Empty kegs','Damaged stock'])});
  });
  Object.values(loads).forEach((L,i)=>res.push([L.id,L.bay,`Driver ${String(i+1+di*10).padStart(2,'0')}`,i%2?`Helper ${String(i+1+di*10).padStart(2,'0')}`:'',`TRK-${String(i+1).padStart(2,'0')}`,Math.ceil(L.kg/400),Math.round(30+rnd()*120),L.area,L.drops,L.kg]));
  write(`REPORTS/week_46/DIPS_Plan_${wd}.xlsx`,'Sheet1',plan); write(`REPORTS/week_46/RES_${wd}.xlsx`,'Sheet1',res);
  // every day has at least one uplift to collect (a pick-up of empty kegs or damaged stock)
  if(!UPL.some(u=>u.k===di)){ const c=pick2(customers.filter(x=>x.days.includes(di))); UPL.push({c, k:di, qty:1+Math.floor(rnd2()*3), reason:pick2(['Empty kegs','Damaged stock'])}); }
  // proof of delivery: one row per order, as the drivers hand them back (a few short or refused, to show exceptions)
  const pod=[['Order Number','Ship To','Customer Name','Delivery Date','Delivered At','Received By','Status','Notes']];
  SHEETS[wd].forEach(x=>{ const r=rnd2(), t=450+Math.floor(rnd2()*540), z=n=>String(n).padStart(2,'0');
    pod.push([x.order,x.customerNo,x.name,date,`${z(Math.floor(t/60))}:${z(t%60)}`,pick2(['J. Murphy','A. Byrne','K. Walsh','M. Doyle','Manager on duty']),r<.04?'Refused':r<.12?'Delivered short':'Delivered',r<.04?'Customer closed':r<.12?'2 cases not on the truck':'']); });
  write(`REPORTS/week_46/PROD_${wd}.xlsx`,'Sheet1',prod); write(`REPORTS/week_46/POD_${wd}.xlsx`,'Sheet1',pod);
});
// ---- uplifts outstanding: the report of the uplifts not collected yet, exported twice a day (UPLIFTS_<wd>_AM before the trucks leave,
// UPLIFTS_<wd>_PM after they are back). An uplift is raised on a working day (x, 0 = Mon 09.11, negative = week 45) and collected with the
// customer's first delivery after that day (k). Three are raised after the customer's last delivery of the week, so nobody collects them:
// they stay outstanding and show how a planner allocates one by hand.
{ const delivered=(c,x)=>c.days.includes(((x%5)+5)%5);
  const dateOf=x=>{ const d=new Date(Date.UTC(2026,10,9+Math.floor(x/5)*7+((x%5)+5)%5)); const z=n=>String(n).padStart(2,'0'); return z(d.getUTCDate())+'/'+z(d.getUTCMonth()+1)+'/'+d.getUTCFullYear(); };
  const CS=CATALOGUE.filter(p=>p[2]==='CS'), KEGS=CATALOGUE.filter(p=>p[2]==='EA');
  UPL.forEach(u=>{ let prev=u.k-1; while(!delivered(u.c,prev)) prev--; u.r=prev+Math.floor(rnd3()*(u.k-prev)); });
  const late=customers.filter(c=>Math.max(...c.days)<=2 && !UPL.some(u=>u.c===c)); for(let i=0;i<3 && late.length;i++){ const c=late.splice(Math.floor(rnd3()*late.length),1)[0];
    UPL.push({c, k:Infinity, r:Math.max(...c.days)+1+Math.floor(rnd3()*(4-Math.max(...c.days))), qty:1+Math.floor(rnd3()*4), reason:'Empty kegs'}); }
  UPL.sort((a,b)=>a.r-b.r||a.c.id-b.c.id).forEach((u,i)=>{ u.no=String(7700101+i); const p=u.reason==='Empty kegs'?KEGS[Math.floor(rnd3()*KEGS.length)]:CS[Math.floor(rnd3()*CS.length)]; u.sku=p[0]; u.desc=p[1]+(u.reason==='Empty kegs'?' (empty)':''); });
  // the layout of the JDE CU report (the CU_Rep sheet of the Uplift control workbook): one row per order LINE, a totals row at the bottom
  const head=['Order Number','Shipment Number','Ship To','Ship To Name','Customer PO','Scheduled Pick','Ln Ty','Last Status','Next Status','Extended Amount','2nd Item Number','Description 1'];
  const serial=x=>{ const [dd,mm,yy]=dateOf(x).split('/').map(Number); return Math.round((Date.UTC(yy,mm-1,dd)-Date.UTC(1899,11,30))/864e5); };
  UPL.forEach((u,i)=>{ u.ship=String(10575600+i*7); u.po=rnd3()<.6?'YA0'+(61000+Math.floor(rnd3()*900)):''; const amt=-(40+Math.round(rnd3()*20000)/100);
    u.lines=[['CU','550',i===4?'540':'560',amt,u.sku,(u.reason==='Empty kegs'?'ULLAGE ':'RB CREDIT ')+u.desc.replace(' (empty)','').toUpperCase()]];
    if(u.reason==='Empty kegs' && rnd3()<.5) u.lines.push(['CG','910','573',null,'OTH712','50L KEG DEPOSIT ITEM']); });
  const rows=list=>{ const out=[head]; let tot=0; list.forEach(u=>u.lines.forEach(l=>{ out.push([+u.no,+u.ship,u.c.id,u.c.name,u.po,serial(u.r),l[0],l[1],l[2],l[3],l[4],l[5]]); tot+=l[3]||0; }));
    out.push([null,null,null,null,null,null,null,null,null,Math.round(tot*100)/100,null,null]); return out; };
  WEEK.forEach(([wd],d)=>{ write(`REPORTS/week_46/UPLIFTS_${wd}_AM.xlsx`,'CU_Rep',rows(UPL.filter(u=>u.r<d && u.k>=d)));
    write(`REPORTS/week_46/UPLIFTS_${wd}_PM.xlsx`,'CU_Rep',rows(UPL.filter(u=>u.r<=d && u.k>d))); });
  console.log(`Uplifts: ${UPL.length} (${UPL.filter(u=>u.k===Infinity).length} with no delivery after them), in 10 reports UPLIFTS_<wd>_AM / _PM`); }
console.log(`Demo data written to ${OUT}: ${customers.length} customers, ${order-5600001} orders, ${load-74600001} loads over 5 days`);
// ---- fake check-sheet PDFs (JDE Offloading Sheet layout), one per day, in CHECK_SHEETS/JDE/week_46 (the Printing tab imports them).
// The file names do NOT say the day: the app reads the day from the first pages of each PDF.
// Pages come in load order, as JDE prints them; one signature-only page is added to show the blank-page check.
(async()=>{
  for(const wd of Object.keys(SHEETS)){ const list=SHEETS[wd].slice().sort((a,b)=>a.load.localeCompare(b.load)||a.order.localeCompare(b.order));
    const f=path.join(OUT,'CHECK_SHEETS','JDE','week_46',JDE_NAMES[wd]); fs.mkdirSync(path.dirname(f),{recursive:true}); let opt={blankAfter:[2]};
    if(wd==='Thu'){   // Thursday shows the Printing edge cases: a load that is not in Resources (UNASSIGNED) and a page nobody can read (REVIEW)
      list.splice(4,0,{load:'74699999', order:'5699999', name:'LATE CALL BISTRO', customerNo:'91009999', addrLines:['1 NEW ROAD','CITY CENTRE'], po:'', empties:false, date:SHEETS.Thu[0].date, orderDate:SHEETS.Thu[0].orderDate, lines:makeLines(rnd2,180)});
      opt={blankAfter:[2],reviewAfter:[6]}; }
    fs.writeFileSync(f, await checkSheetPdf(list,opt)); }
  console.log('Check-sheet PDFs written: '+Object.keys(SHEETS).map(w=>'CHECK_SHEETS/JDE/week_46/'+JDE_NAMES[w]).join(', '));
})();
