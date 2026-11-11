// Shared-folder check: a fake "Planning app" folder laid out as in File_Arch (MASTER_DATA, REPORTS/week_XX, PLANS/week_XX).
// The File System Access API is mocked in the page; all spreadsheets are made-up data.
const {chromium}=require('playwright'); const XLSX=require('xlsx'); const path=require('path');
const APP=path.resolve(process.argv[2]||path.join(__dirname,'..','Route Planner.html'));
const libs={'leaflet.js':require.resolve('leaflet/dist/leaflet.js'),'leaflet.css':require.resolve('leaflet/dist/leaflet.css'),'xlsx.full.min.js':require.resolve('xlsx/dist/xlsx.full.min.js'),
  'pdf.min.js':require.resolve('pdfjs-dist/build/pdf.min.js'),'pdf.worker.min.js':require.resolve('pdfjs-dist/build/pdf.worker.min.js'),'pdf-lib.min.js':require.resolve('pdf-lib/dist/pdf-lib.min.js')};
const book=(sheet,rows)=>{ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),sheet); return XLSX.write(wb,{type:'base64',bookType:'xlsx'}); };
const master=book('Sheet1',[['Ship To','Name','Postal Code','Address','latitude','longitude','BAYS','Monday','Tuesday','Wednesday','Thursday','Friday','Time Window'],
  [90000001,'TEST PUB ONE','D01 AA11','1 Main St',53.35,-6.26,'BAY 01','','Y','','Y','',''],[90000002,'TEST PUB TWO','D02 BB22','2 High St',53.33,-6.25,'BAY 02','Y','','Y','','','10:00-15:00']]);
const plan=d=>book('Plan',[['Load Number','Order Number','Address Number Ship To','Ship To Name','Date Promised Shipment','Weight','Route Code'],[70000001,5000001,90000001,'TEST PUB ONE',d,120,'R1'],[70000002,5000002,90000002,'TEST PUB TWO',d,80,'R2']]);
const res=book('Sheet1',[['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM'],[70000001,'BAY 01','Test Driver A','','TRK1',4,120],[70000002,'BAY 02','Test Driver B','','TRK2',6,90]]);
const T=(b,m)=>({b64:b,mod:Date.parse(m)});
const TREE={
  'MASTER_DATA':{'MASTER_DEL_DETAILS.xlsx':T(master,'2026-10-25'),'Manifest_v2.xlsm':T(master,'2026-11-05'),
    'users.json':{text:JSON.stringify({company:'Test Co',users:[{name:'Tester',role:'MASTER',path:'C:\\Users\\t\\OneDrive\\Planning app'}]}),mod:Date.parse('2026-11-01')}},
  'REPORTS':{
    'week_45':{'Notes.xlsx':T(res,'2026-11-02T10:00'),'DIPS_Plan_Tue.xlsx':T(plan('03/11/2026'),'2026-11-02T16:00'),'RES_Tue.xlsx':T(res,'2026-11-02T16:10'),'PROD_Tue.xlsx':T(res,'2026-11-02T16:20'),'RES_Wed.xlsx':T(res,'2026-11-03T16:00')},
    'week_44':{'DIPS_Plan_Thu.xlsx':T(plan('29/10/2026'),'2026-10-28T15:00'),'RES_Thu.xlsx':T(res,'2026-10-28T15:10')}},
  'PLANS':{'Week_45':{'v0.9.0 - 2026-11-05 10.40.json':{text:JSON.stringify({app:'route-planner',fmt:1,version:'0.9.0',state:{log:[]},uploads:[],savedAt:'2026-11-05T10:40:00Z'}),mod:Date.parse('2026-11-05T10:40')}}},
  '_ARCHIVE':{'DIPS_Plan_Mon.xlsx':T(plan('02/11/2026'),'2026-11-05T17:00')},
  'Route Planner BETA v0.9.0.html':{text:'<html></html>',mod:Date.parse('2026-11-04')}
};
const MOCK=`(()=>{ const TREE=window.__TREE;
  const b2u=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
  const fileH=(name,node)=>({kind:'file',name,async getFile(){ const data=node.b64?b2u(node.b64):new TextEncoder().encode(node.text||''); return new File([data],name,{lastModified:node.mod||Date.now()}); },
    async createWritable(){ const parts=[]; return {async write(b){ parts.push(b); }, async close(){ node.text=await new Blob(parts).text(); node.mod=Date.now(); }}; }});
  const dirH=(name,node)=>({kind:'directory',name,
    async *entries(){ for(const k of Object.keys(node)) yield [k, node[k].b64!==undefined||node[k].text!==undefined?fileH(k,node[k]):dirH(k,node[k])]; },
    async *values(){ for await (const [,h] of this.entries()) yield h; },
    async getFileHandle(n,o){ if(!node[n]){ if(!(o&&o.create)) throw new DOMException('nf','NotFoundError'); node[n]={text:''}; } return fileH(n,node[n]); },
    async getDirectoryHandle(n,o){ if(!node[n]){ if(!(o&&o.create)) throw new DOMException('nf','NotFoundError'); node[n]={}; } return dirH(n,node[n]); },
    async queryPermission(){ return 'granted'; }, async requestPermission(){ return 'granted'; }});
  window.showDirectoryPicker=async()=>dirH('Planning app',TREE); window.showSaveFilePicker=undefined; })();`;
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{
  const b=await chromium.launch(); const c=await b.newContext(); const errs=[];
  await c.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue(); const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); return k?r.fulfill({path:libs[k]}):r.abort(); });
  // the tree lives in sessionStorage so it survives the reload after loading the master
  await c.addInitScript(t=>{ let s=sessionStorage.getItem('__tree'); if(!s){ s=t; sessionStorage.setItem('__tree',s); } window.__TREE=JSON.parse(s);
    window.addEventListener('beforeunload',()=>sessionStorage.setItem('__tree',JSON.stringify(window.__TREE))); }, JSON.stringify(TREE));
  await c.addInitScript(MOCK);
  const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  // the start window: link the company folder, pick the user, pass the folder check (the app may reload once for the customer master)
  const link=async()=>{ const done=()=>p.evaluate(()=>{ const b=document.getElementById('userBtn'); return !!b && b.textContent.includes('Planning app') && !document.body.classList.contains('gated'); }).catch(()=>false);
    const settled=async()=>{ if(!(await done())) return false; await p.waitForTimeout(1200); return await done(); };
    for(let i=0;i<40 && !(await settled());i++){
      if(await p.isVisible('#modal [data-act=link]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=link]').catch(()=>{})]);
      else if(await p.isVisible('#modal [data-act="u:Tester"]').catch(()=>false)) await p.click('#modal [data-act="u:Tester"]').catch(()=>{});
      else if(await p.isVisible('#modal [data-act=go]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=go]').catch(()=>{})]);
      await p.waitForTimeout(300); } };
  await p.goto('file://'+APP); await link();
  ok(true,'user linked the shared folder');
  ok((await p.textContent('#cBay')).includes('All bays (2)'),'customer master read from MASTER_DATA as soon as the folder is linked');
  await p.evaluate(()=>document.getElementById('uploadBtn').click()); await p.waitForSelector('input[name=fb]');
  let m=await p.textContent('#modal');
  ok(/Week 45[\s\S]*Week 44/.test(m),'week chips, newest week first');
  ok(m.includes('DIPS_Plan_Tue.xlsx') && m.includes('REPORTS/week_45') && !m.includes('DIPS_Plan_Thu.xlsx'),'Week 45 shows REPORTS/week_45 files only');
  ok(m.includes('Tue 03.11') && m.includes('Wed 04.11'),'dates worked out from week folder + weekday (Tue 03.11, Wed 04.11)');
  ok(!m.includes('DIPS_Plan_Mon') && !m.includes('Manifest') && !m.includes('Notes.xlsx') && !m.includes('BETA v0.9.0'),'only files in their folders are listed (no _ARCHIVE, manifest, unknown names or main-folder files)');
  ok(await p.isDisabled('input[value="REPORTS/week_45/PROD_Tue.xlsx"]'),'Products listed but not selectable yet');
  await p.click('[data-act="m:master"]'); { const mm=await p.textContent('#modal'); ok(mm.includes('MASTER_DEL_DETAILS.xlsx') && mm.includes('MASTER_DATA'),'MASTER_DATA listed (Reports › Master Data)'); await p.check('input[value="MASTER_DATA/MASTER_DEL_DETAILS.xlsx"]'); await p.click('[data-act="m:data"]'); }
  for(const v of ['REPORTS/week_45/DIPS_Plan_Tue.xlsx','REPORTS/week_45/RES_Tue.xlsx','REPORTS/week_45/RES_Wed.xlsx']) await p.check(`input[value="${v}"]`);
  await p.click('#fbOk'); await p.waitForSelector('[data-act=add]');
  m=await p.textContent('#modal');
  ok(!/no matching RESOURCES/.test(m),'RES_Tue matched to DIPS_Plan_Tue (no "no matching RESOURCES" warning)');
  ok(/RESOURCES only[\s\S]*Wed 04\.11/.test(m),'RES_Wed alone creates Wed 04.11 (date from week_45)');
  await Promise.all([p.waitForEvent('load'), p.click('[data-act=add]')]); await link();
  const days=await p.textContent('#pDay'); ok(days.includes('Tue 03.11') && days.includes('Wed 04.11'),'both days in the planner: '+days.replace(/\s+/g,' ').trim());
  ok((await p.textContent('#cBay')).includes('All bays (2)'),'customer master loaded from MASTER_DATA');
  await p.evaluate(()=>document.getElementById('uploadBtn').click()); await p.waitForSelector('input[name=fb]');
  ok(/DIPS_Plan_Tue\.xlsx\s*✓ loaded/.test(await p.textContent('#modal')) && /DIPS_Plan_Thu\.xlsx/.test(await p.textContent('#modal'))===false,'loaded files are tagged “✓ loaded”');
  await p.click('#modal [data-act=close]');
  // week 44
  await p.evaluate(()=>document.getElementById('uploadBtn').click()); await p.waitForSelector('[data-act="w:44"]'); await p.click('[data-act="w:44"]');
  m=await p.textContent('#modal'); ok(m.includes('DIPS_Plan_Thu.xlsx') && m.includes('Thu 29.10') && !m.includes('DIPS_Plan_Tue'),'Week 44 chip shows week_44 files (Thu 29.10)');
  await p.click('#modal [data-act=close]');
  // save into PLANS/week_45
  await p.selectOption('#pDay',{label:/Tue 03\.11/}).catch(()=>{});
  await p.click('#saveBtn'); await p.click('[data-act=json]'); await p.waitForTimeout(800);
  const saved=await p.evaluate(()=>Object.keys(window.__TREE.PLANS.Week_45));
  const mine=saved.find(n=>/^v\d+\.\d+\.\d+_\d{4}-\d{2}-\d{2}_\d{2}\.\d{2}_Tester\.json$/.test(n));
  ok(!!mine,'plan saved into the existing PLANS/Week_45 as version_date_time_user: '+mine);
  ok(!(await p.evaluate(()=>'PLANS ' in window.__TREE || 'week_45' in window.__TREE.PLANS)),'no duplicate folder created (matched Week_45 without case)');
  await p.click('#modal [data-act=close]').catch(()=>{});
  // open plan from the folder
  await p.click('#openBtn'); await p.waitForSelector('input[name=fb]'); m=await p.textContent('#modal');
  ok(m.includes(mine) && m.includes('v0.9.0 - 2026-11-05 10.40.json') && m.includes('PLANS/Week_45'),'Saved plans lists PLANS/Week_45');
  await p.check(`input[value="PLANS/Week_45/${mine}"]`); await p.click('#fbOk'); await p.waitForSelector('[data-act=ok]');
  ok((await p.textContent('#modal')).includes('Saved by'),'plan opens from the folder');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
})();
