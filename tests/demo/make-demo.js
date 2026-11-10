// Builds the DEMO folder: a made-up company, one full week of reports (week 46, Mon 09.11 – Fri 13.11.2026),
// the customer master, fixed routes and a users file. Everything is invented, so it is safe to commit and share.
// Usage: node make-demo.js [outputFolder]   (default: ../../demo/Route_planning)
const XLSX=require('xlsx'), fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..','..','demo','Route_planning'));
let seed=46; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };   // repeatable "random"
const pick=a=>a[Math.floor(rnd()*a.length)];
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
WEEK.forEach(([wd,date],di)=>{
  const plan=[['Load Number','Order Number','Address Number Ship To','Ship To Name','Address Line 2','Address Line 3','Date Promised Shipment','Weight','Route Code']];
  const res=[['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM','General Area','Drops','Kgs']];
  const prod=[['Order Number','Product','Description','Quantity','Unit']], upl=[['Ship To','Name','Product','Quantity','Reason']];
  const loads={};
  customers.filter(c=>c.days.includes(di)).forEach(c=>{
    const b=BAYS.find(x=>x.bay===c.bay); const lk=c.bay; if(!loads[lk]) loads[lk]={id:load++, bay:c.bay, area:b.area, drops:0, kg:0};
    const L=loads[lk]; L.drops++; const n=1+Math.floor(rnd()*3);
    for(let i=0;i<n;i++){ const w=Math.round(40+rnd()*460); L.kg+=w; const o=order++;
      plan.push([L.id,o,c.id,c.name,c.addr.split(', ')[0],c.addr.split(', ')[1],date,w,'R'+c.bay.slice(4)]);
      (SHEETS[wd]=SHEETS[wd]||[]).push({load:String(L.id), order:String(o), name:c.name, addr:c.addr, date});
      prod.push([o,pick(['KEG50','CS24','EA1']),pick(['Cider keg 50L','Cider case 24x500ml','Point of sale pack']),1+Math.floor(rnd()*8),pick(['KEGS','CS','EA'])]); }
    if(rnd()<.15) upl.push([c.id,c.name,'KEG50',1+Math.floor(rnd()*3),pick(['Empty kegs','Damaged stock'])]);
  });
  Object.values(loads).forEach((L,i)=>res.push([L.id,L.bay,`Driver ${String(i+1+di*10).padStart(2,'0')}`,i%2?`Helper ${String(i+1+di*10).padStart(2,'0')}`:'',`TRK-${String(i+1).padStart(2,'0')}`,Math.ceil(L.kg/400),Math.round(30+rnd()*120),L.area,L.drops,L.kg]));
  write(`REPORTS/week_46/DIPS_Plan_${wd}.xlsx`,'Sheet1',plan); write(`REPORTS/week_46/RES_${wd}.xlsx`,'Sheet1',res);
  write(`REPORTS/week_46/PROD_${wd}.xlsx`,'Sheet1',prod); if(upl.length>1) write(`REPORTS/week_46/UPLIFTS_${wd}.xlsx`,'Sheet1',upl);
});
console.log(`Demo data written to ${OUT}: ${customers.length} customers, ${order-5600001} orders, ${load-74600001} loads over 5 days`);
// ---- fake check-sheet PDFs (JDE Offloading Sheet layout), one per day, in CHECK_SHEETS/JDE/week_46 (the Printing tab imports them).
// The file names do NOT say the day: the app reads the day from the first pages of each PDF.
// Pages come in load order, as JDE prints them; one signature-only page is added to show the blank-page check.
(async()=>{ const {checkSheetPdf, JDE_NAMES}=require('../lib/checksheet');
  for(const wd of Object.keys(SHEETS)){ const list=SHEETS[wd].slice().sort((a,b)=>a.load.localeCompare(b.load)||a.order.localeCompare(b.order));
    const f=path.join(OUT,'CHECK_SHEETS','JDE','week_46',JDE_NAMES[wd]); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f, await checkSheetPdf(list,{blankAfter:[2]})); }
  console.log('Check-sheet PDFs written: '+Object.keys(SHEETS).map(w=>'CHECK_SHEETS/JDE/week_46/'+JDE_NAMES[w]).join(', '));
})();
