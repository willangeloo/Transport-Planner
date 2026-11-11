// Full-feature walkthrough on the DEMO folder (made-up data). It is both the regression test for every feature
// and the source of the demo plan files (PLANS/week_46) and of the screenshots in docs/img.
// Usage: node walkthrough.js [app.html] [demoFolder] [screenshotFolder]
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const APP=path.resolve(process.argv[2]||path.join(__dirname,'..','..','Route Planner.html'));
const DEMO=path.resolve(process.argv[3]||path.join(__dirname,'..','..','demo','Route_planning'));
const IMG=process.argv[4]===undefined?path.join(__dirname,'..','..','docs','img'):(process.argv[4]?path.resolve(process.argv[4]):null);
const libs={'leaflet.js':require.resolve('leaflet/dist/leaflet.js'),'leaflet.css':require.resolve('leaflet/dist/leaflet.css'),'xlsx.full.min.js':require.resolve('xlsx/dist/xlsx.full.min.js'),
  'pdf.min.js':require.resolve('pdfjs-dist/build/pdf.min.js'),'pdf.worker.min.js':require.resolve('pdfjs-dist/build/pdf.worker.min.js'),'pdf-lib.min.js':require.resolve('pdf-lib/dist/pdf-lib.min.js')};
// ---- the demo folder as an in-memory tree (PLANS starts empty; what the app saves is written back at the end)
const readTree=d=>Object.fromEntries(fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='PLANS').map(e=>{ const q=path.join(d,e.name);
  return [e.name, e.isDirectory()?readTree(q):{b64:fs.readFileSync(q).toString('base64'),mod:Math.floor(fs.statSync(q).mtimeMs)}]; }));
const TREE=readTree(DEMO);
const MOCK=`(()=>{ const b2u=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
  const fileH=(name,node)=>({kind:'file',name,async getFile(){ const data=node.b64!=null?b2u(node.b64):new TextEncoder().encode(node.text||''); return new File([data],name,{lastModified:node.mod||Date.now()}); },
    async createWritable(){ const parts=[]; return {async write(b){ parts.push(b); }, async close(){ node.text=await new Blob(parts).text(); delete node.b64; node.mod=Date.now(); }}; }});
  const isFile=n=>n.b64!==undefined||n.text!==undefined;
  const dirH=(name,node)=>({kind:'directory',name,
    async *entries(){ for(const k of Object.keys(node)) yield [k, isFile(node[k])?fileH(k,node[k]):dirH(k,node[k])]; },
    async *values(){ for await (const [,h] of this.entries()) yield h; },
    async getFileHandle(n,o){ if(!node[n]){ if(!(o&&o.create)) throw new DOMException('nf','NotFoundError'); node[n]={text:''}; } return fileH(n,node[n]); },
    async getDirectoryHandle(n,o){ if(!node[n]){ if(!(o&&o.create)) throw new DOMException('nf','NotFoundError'); node[n]={}; } return dirH(n,node[n]); },
    async queryPermission(){ return 'granted'; }, async requestPermission(){ return 'granted'; }});
  window.showDirectoryPicker=async()=>dirH('Route_planning',window.__TREE); window.showSaveFilePicker=undefined; })();`;
let fails=0, n=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c){ fails++; process.exitCode=1; } };
(async()=>{
  if(IMG) fs.mkdirSync(IMG,{recursive:true});
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1360,height:800},acceptDownloads:true}); const errs=[];
  await c.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue(); const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); return k?r.fulfill({path:libs[k]}):r.abort(); });
  await c.addInitScript(t=>{ let s=null; try{ s=sessionStorage.getItem('__tree'); }catch(e){ return; } if(!s){ s=t; } window.__TREE=JSON.parse(s);
    window.addEventListener('beforeunload',()=>{ try{ sessionStorage.setItem('__tree',JSON.stringify(window.__TREE)); }catch(e){} }); }, JSON.stringify(TREE));
  await c.addInitScript(MOCK);
  const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  const shot2=async(pg,name)=>{ if(!IMG) return; n++; await pg.waitForTimeout(250); await pg.screenshot({path:path.join(IMG,`${String(n).padStart(2,'0')}-${name}.png`)}); };
  const shot=async name=>{ if(!IMG) return; n++; await p.waitForTimeout(250); await p.screenshot({path:path.join(IMG,`${String(n).padStart(2,'0')}-${name}.png`)}); };
  const modalText=async()=>(await p.textContent('#modal')).replace(/\s+/g,' ');
  const closeModal=async()=>{ if(await p.isVisible('#scrim.on')) await p.evaluate(()=>{ const x=document.querySelector('#modal [data-act=close]'); if(x) x.click(); }); };
  // the start window: link the company folder (when the browser asks), pick the user, pass the computer / path / files check
  const enter=async (name,opts)=>{ const keep=!!(opts&&opts.keepStart); const done=()=>p.evaluate(n=>{ const b=document.getElementById('userBtn'); return !!b && b.textContent.includes(n) && !document.body.classList.contains('gated'); },name).catch(()=>false);
    const settled=async()=>{ if(!(await done())) return false; if(keep && await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) return true; if(await p.isVisible('#modal [data-act=dgo]').catch(()=>false) || await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) return false; await p.waitForTimeout(1200); if(await p.waitForSelector('#modal [data-act=dgo], #modal [data-act=sskip]',{timeout:5000}).then(()=>true).catch(()=>false)) return keep && await p.isVisible('#modal [data-act=sskip]').catch(()=>false); return await done(); };   // the app may reload itself once (new customer master)
    for(let i=0;i<40 && !(await settled());i++){
      if(await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) await p.click('#modal [data-act=sskip]').catch(()=>{});   // start window: load a plan / new week
      else if(await p.isVisible('#modal [data-act=dgo]').catch(()=>false)) await p.click('#modal [data-act=dgo]').catch(()=>{});
      else if(await p.isVisible('#modal [data-act=allow]').catch(()=>false)) await p.click('#modal [data-act=allow]').catch(()=>{});
      else if(await p.isVisible('#modal [data-act=link]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=link]').catch(()=>{})]);
      else if(await p.isVisible(`#modal [data-act="u:${name}"]`).catch(()=>false)) await p.click(`#modal [data-act="u:${name}"]`).catch(()=>{});
      else if(await p.isVisible('#modal [data-act=go]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=go]').catch(()=>{})]);
      await p.waitForTimeout(300); }
    ok(await done(), `${name} passed the start window`); };
  const switchTo=async name=>{ await p.click('#userBtn'); await p.click('#modal [data-act=switch]'); await enter(name); };
  const planTab=async()=>{ await p.click('nav [data-tab=plan]'); await p.click('#expAll'); };

  // 1. START WINDOW: the tool is locked until a user from MASTER_DATA/users.json passes the folder check
  await p.goto('file://'+APP);
  await p.waitForSelector('#modal [data-act=link]'); await shot('start-link-folder');
  ok(await p.evaluate(()=>document.querySelector('header').inert && document.querySelector('main').inert),'locked: header and page are inert');
  await p.keyboard.press('Escape'); await p.mouse.click(5,790); await p.waitForTimeout(200);
  ok(await p.isVisible('#modal [data-act=link]'),'locked: Escape and clicking outside do not close the start window');
  await p.click('#modal [data-act=link]'); await p.waitForSelector('[data-act="u:Alex"]');
  const home=await modalText(); ok(home.includes('Demo Transport Ltd') && home.includes('users.json') && /Master\s*👤 Alex/.test(home) && /Viewer\s*👤 Warehouse/.test(home),'users listed from MASTER_DATA › users.json, by role'); await shot('start-users');
  ok(!(await p.isVisible('text=Continue without a user')),'no way in without a user');
  await p.click('[data-act="u:Alex"]'); await p.waitForSelector('#modal [data-act=go]'); const chk=await modalText();
  ok(chk.includes('Ready') && chk.indexOf('Your folder')<chk.indexOf('MASTER_DATA folder'),'checks in order: path → files; all passed for Alex'); await shot('start-folder-check');
  ok(/Demo Transport Ltd/.test(await p.textContent('#coName')) && /Demo Transport Ltd/.test(chk),'company name shown next to the version (top left) and on the start windows');
  await Promise.all([p.waitForEvent('load',{timeout:8000}).catch(()=>null), p.click('#modal [data-act=go]')]);
  // right after choosing the user: master data (left) and reports (right), each compared with the folder
  for(let i=0;i<40 && !(await p.isVisible('#modal [data-act=dgo]').catch(()=>false));i++){ if(await p.isVisible('#modal [data-act=link]').catch(()=>false)) await p.click('#modal [data-act=link]').catch(()=>{}); await p.waitForTimeout(300); }   // the app reloads once (customer master); the mock folder is linked again
  await p.waitForSelector('#modal [data-act=dgo]',{timeout:30000}); await p.waitForTimeout(500); const dw=await modalText();
  ok(dw.includes('Demo Transport Ltd') && dw.includes('Master data') && dw.includes('Reports') && /MASTER_DEL_DETAILS\.xlsx\s*✓ loaded/.test(dw) && /FIXED_ROUTES_DIPSDATA\.xlsx\s*✓ loaded/.test(dw) && dw.includes('master data in the planner is the version found in the folder'),'after choosing the user: master data window, both files ✓ loaded (same as the folder)');
  ok(/DIPS_Plan_Mon\.xlsx\s*not loaded/.test(dw) && /0 of 10 loaded/.test(dw),'reports side lists week 46 (nothing loaded yet)'); await shot('data-window');
  await p.click('#modal [data-act=dgo]'); await p.waitForSelector('#modal [data-act=sskip]'); { const sw=await modalText(); ok(/Load a saved plan/.test(sw) && /New week/.test(sw),'after the master data window: a window to load a saved plan or start a new week'); } await shot('start-window');
  await enter('Alex');
  ok((await p.textContent('#cBay')).includes('All bays (58)'),'customer master read from MASTER_DATA automatically (58 customers)');
  ok(/Alex\s*Master/.test(await p.textContent('#userBtn')),'header shows user and role');
  ok((await p.$$eval('header nav button',b=>b.map(x=>x.textContent.replace(/\s*\d+$/,'').trim()))).join('|')==='Planning|Resources|Change report|Printing|Options|Customers' && await p.evaluate(()=>document.getElementById('tab-plan').classList.contains('on')),'tab order: Plan the day (home), Resources, Change report, Check Sheet Print, Options, Customers');
  ok((await p.$$eval('nav button.hl',b=>b.map(x=>x.dataset.tab).join()))==='report,print','Change report and Printing tabs are highlighted in the header');
  await p.click('nav [data-tab=customers]'); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>{ const m=__rpMaps.cMap(); const b=m.getBounds(); return m.getSize().x>200 && b.contains([53.6,-6.65]) && b.contains([53.05,-6.15]) && b.contains([53.347,-6.262]); }),'Customers: the map opens fitted to all the customers (not blank)');
  await shot('customers');

  // the customer master is updated in the folder: the window flags it (same rule as the reports) and loading asks first
  await p.evaluate(()=>{ const t=window.__TREE.MASTER_DATA['FIXED_ROUTES_DIPSDATA.xlsx']; const wb=XLSX.read(t.b64,{type:'base64'}); const n=wb.SheetNames[0]; const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1}); rows.push(['FR04','Driver 24','BAY 05A','TRK-24','..T.T..']); wb.Sheets[n]=XLSX.utils.aoa_to_sheet(rows); t.b64=XLSX.write(wb,{type:'base64',bookType:'xlsx'}); t.mod=Date.now(); });
  await p.click('#userBtn'); await p.click('#modal [data-act=data]'); await p.waitForSelector('#modal [data-act=dmaster]'); const dw2=await modalText();
  ok(/FIXED_ROUTES_DIPSDATA\.xlsx\s*⚠ the folder has a different version/.test(dw2) && /MASTER_DEL_DETAILS\.xlsx\s*✓ loaded/.test(dw2),'master data changed in the folder → “⚠ the folder has a different version”'); await shot('data-window-changed');
  await p.click('#modal [data-act=dmaster]'); await p.waitForSelector('#modal [data-act=load]'); await p.click('#modal [data-act=load]'); await p.waitForSelector('#modal [data-act=dgo]');
  ok(/FIXED_ROUTES_DIPSDATA\.xlsx\s*✓ loaded/.test(await modalText()),'after loading the new fixed routes the window shows ✓ loaded'); await p.click('#modal [data-act=dgo]');

  // 2. LOAD THE WEEK from REPORTS/week_46
  await p.click('nav [data-tab=plan]'); await p.click('#uploadBtn'); await p.waitForSelector('input[name=fb]');
  ok((await modalText()).includes('Week 46'),'Load day opens on week 46'); await shot('load-day');
  for(const wd of ['Mon','Tue','Wed','Thu','Fri']) for(const k of ['DIPS_Plan','RES']) await p.check(`input[value="REPORTS/week_46/${k}_${wd}.xlsx"]`);
  await p.click('#fbOk'); await p.waitForSelector('[data-act=add]'); await shot('load-preview');
  await p.click('[data-act=add]'); await p.waitForTimeout(400);
  await p.click('#uploadBtn'); await p.waitForSelector('input[name=fb]');
  ok(/DIPS_Plan_Mon\.xlsx\s*✓ loaded/.test(await modalText()) && /PROD_Mon\.xlsx/.test(await modalText()),'loaded reports are tagged “✓ loaded”'); await p.click('#modal [data-act=close]');
  const days=(await p.textContent('#pDay')).replace(/\s+/g,' ');
  ok(['Mon 09.11','Tue 10.11','Wed 11.11','Thu 12.11','Fri 13.11'].every(d=>days.includes(d)),'all five days loaded: '+days.trim());
  // someone updates Friday's report in the company folder: it is flagged, and replacing the day shows what changes
  await p.evaluate(()=>{ const t=window.__TREE.REPORTS.week_46['DIPS_Plan_Fri.xlsx']; const wb=XLSX.read(t.b64,{type:'base64'}); const n=wb.SheetNames[0];
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1}); rows[1][7]=999; rows.splice(2,1); wb.Sheets[n]=XLSX.utils.aoa_to_sheet(rows); t.b64=XLSX.write(wb,{type:'base64',bookType:'xlsx'}); t.mod=Date.now(); });
  await p.click('#uploadBtn'); await p.waitForSelector('input[name=fb]');
  ok(/DIPS_Plan_Fri\.xlsx\s*⚠ changed since loaded/.test(await modalText()),'a report changed in the folder after loading is tagged “⚠ changed since loaded”'); await shot('file-changed');
  await p.check('input[value="REPORTS/week_46/DIPS_Plan_Fri.xlsx"]'); await p.check('input[value="REPORTS/week_46/RES_Fri.xlsx"]'); await p.click('#fbOk'); await p.waitForSelector('[data-act=add]'); await p.click('[data-act=add]');
  await p.waitForSelector('#modal [data-act=go]'); const rep1=await modalText();
  ok(rep1.includes('Replace what is loaded') && rep1.includes('Fri 13.11') && /−1\s*order/.test(rep1) && /1\s*weight change/.test(rep1),'replacing a day first shows the differences (−1 order, 1 weight change)'); await shot('replace-differences');
  await p.click('#modal [data-act=go]'); await p.waitForTimeout(300);
  await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll');
  ok(!(await p.textContent('#pRoutes')).includes('BAY 07'),'fixed routes are only a reference: BAY 07 is not a route on Monday (no RESOURCES for it)'); await shot('plan-monday');
  // the map follows the expanded routes: none or all expanded = all; some expanded = only those; “show on map” adds a route
  { const cnt=()=>p.evaluate(()=>__rpMaps.pCount()); await p.click('#colAll'); const nAll=await cnt(); const ids=await p.$$eval('.route:not(.deferred)',r=>r.map(x=>x.dataset.r));
    await p.click(`.route[data-r="${ids[0]}"] .rhead`); const nA=await cnt(); await p.click(`.route[data-r="${ids[1]}"] .rhead`); const nAB=await cnt();
    await p.click(`#pBays .chip[data-r="${ids[2]}"]`); const nABC=await cnt(); await p.click('#expAll'); const nEx=await cnt();
    // opening a route fits the map to the open routes; “show on map” never changes the fit; opening a route replaces earlier “show on map” choices
    { const zoom=()=>p.evaluate(()=>__rpMaps.pMap().getZoom()), bounds=()=>p.evaluate(()=>JSON.stringify(__rpMaps.pMap().getBounds())), fitted=()=>p.evaluate(()=>{ const m=__rpMaps.pMap(), b=m.getBounds(); return __rpMaps.pPoints().every(q=>b.contains(q)); });
      await p.click('#colAll'); const zAll=await zoom(); await p.click(`.route[data-r="${ids[0]}"] .rhead`); await p.waitForTimeout(500);
      ok(await fitted() && await zoom()>=zAll,'opening a route fits the map to the open routes'); const b1=await bounds(); await p.click(`#pBays .chip[data-r="${ids[2]}"]`); await p.waitForTimeout(300);
      ok(await bounds()===b1,'“show on map” does not change the fit of the map');
      await p.click('#colAll'); await p.click('#bayAll'); await p.click(`.route[data-r="${ids[0]}"] .rhead`); ok(await cnt()===nA,'after “show on map › All”, opening one route shows only that route on the map'); await p.click('#expAll'); }
    ok(nAll>nA && nAB>nA && nABC>nAB && nEx===nAll,`map: all collapsed ${nAll} · bay 1 expanded ${nA} · bays 1+2 ${nAB} · plus bay 3 chosen in “show on map” ${nABC} · all expanded ${nEx}`); }

  // 3. MOVE — one drop, then a group
  const routes=await p.$$eval('.route:not(.deferred)',rs=>rs.map(r=>({id:r.dataset.r, name:r.querySelector('.title').textContent.trim(), n:r.querySelectorAll('.drop:not(.dh)').length})));
  const big=routes.filter(r=>r.n>=4); const A=big[0], B=big[1];
  const dropsOf=async rid=>p.$$eval(`.route[data-r="${rid}"] .drop:not(.dh)`,ds=>ds.map(d=>({k:d.dataset.k, name:d.querySelector('.nm div').firstChild.textContent.trim(), n:d.querySelector('.c-ord').textContent.split(',').length})));
  let dA=await dropsOf(A.id);
  await p.click(`.drop[data-k="${dA[0].k}"] [data-act=move]`); await p.selectOption('#mTo',B.id); await shot('move-one'); await p.click('#mOk');
  ok((await p.textContent(`.route[data-r="${B.id}"]`)).includes(dA[0].name),`moved ${dA[0].name} to ${B.name}`);
  dA=await dropsOf(A.id);
  await p.check(`.drop[data-k="${dA[0].k}"] [data-act=tick]`); await p.check(`.drop[data-k="${dA[1].k}"] [data-act=tick]`); await shot('select-group');
  await p.click('#selMove'); await p.selectOption('#mTo',await p.$eval('#mTo',s=>[...s.options].filter(o=>o.value&&!o.disabled)[1].value)); await p.selectOption('#mReason','Route rebalancing'); await p.click('#mOk');
  ok(!(await p.textContent(`.route[data-r="${A.id}"]`)).includes(dA[1].name),`group of 2 moved off ${A.name}`);

  // 4. DEFER — one drop to Tuesday on a bay, a group to Wednesday without a bay
  dA=await dropsOf(A.id); const d1=dA[0];
  await p.click(`.drop[data-k="${d1.k}"] [data-act=defer]`); await p.waitForSelector('#dBay'); await p.selectOption('#dBay',{index:1}); await shot('defer-one'); await p.click('#dOk');
  const C=routes.find(r=>r.id!==A.id&&r.id!==B.id&&r.n>=3); let dC=await dropsOf(C.id); const grp=[dC[0],dC[1]];
  for(const d of grp) await p.check(`.drop[data-k="${d.k}"] [data-act=tick]`);
  await p.click('#selDefer'); await p.click('#dCal [data-d="2026-11-11"]'); await p.selectOption('#dReason','Customer closed / not available'); await shot('defer-group'); await p.click('#dOk');
  ok(!(await p.textContent(`.route[data-r="${C.id}"]`)).includes(grp[0].name),'group of 2 deferred to Wed without a bay');

  // 5. SPLIT with a docket for each line
  const sp=await p.$('.drop [data-act=split]'); await sp.click(); await p.check('.olist input >> nth=0');
  await p.click('#spDkNew [data-dkv=PW]'); ok(await p.isDisabled('#spOk'),'split needs a docket for both lines'); await p.click('#spDkOld [data-dkv=OFF]'); await shot('split'); await p.click('#spOk');
  ok((await p.textContent('#pRoutes')).includes('P&W'),'split line tagged Pink & White');

  // 6. INSERT ORDER (docket mandatory)
  await p.click('#insBtn'); await p.waitForTimeout(150); await p.fill('#iOrd','5699001'); await p.fill('#iShip','91000003'); await p.dispatchEvent('#iShip','input');
  if(!(await p.inputValue('#iBay'))) await p.selectOption('#iBay',{index:1});
  ok(await p.isDisabled('#iOk'),'insert needs a docket type'); await p.fill('#iW','120'); await p.click('#iDock [data-dkv=PW]'); await shot('insert-order'); await p.click('#iOk');
  ok((await p.textContent('#pRoutes')).includes('5699001'),'order 5699001 inserted');

  // 7. NEW ROUTE
  await p.click('#newRouteBtn'); await p.waitForTimeout(150); for(const [k,v] of [['nBay','BAY 08'],['nLoad','74699001'],['nDriver','Driver 90'],['nHelper','Helper 90'],['nTruck','TRK-90'],['nNote','Extra van for the Christmas rush']]) await p.fill('#'+k,v);
  await p.dispatchEvent('#nTruck','input');
  await p.waitForSelector('#nOk:not([disabled])',{timeout:5000});
  await shot('new-route'); await p.click('#nOk'); ok((await p.textContent('#pRoutes')).includes('BAY 08'),'new route BAY 08 added');

  // 8. NEW DAY (Mon 16.11, from fixed routes)
  await p.click('#newDayBtn'); await p.click('#ndCal [data-d="2026-11-16"]'); await shot('new-day'); await p.click('#ndOk');
  ok((await p.textContent('#pDay')).includes('Mon 16.11') && (await p.$$eval('#pRoutes .route',x=>x.length))===0,'Mon 16.11 created with no routes (routes come only from RESOURCES)'); await p.selectOption('#pDay','D2026-11-09');

  // 9. CUSTOMERS — fix a missing location, add a new customer
  await p.click('nav [data-tab=customers]'); await p.click('#cK3box'); await p.click('.crow >> nth=0'); await p.waitForSelector('#eLat');
  await p.fill('#eLat','53.3501'); await p.fill('#eLng','-6.2605'); await p.fill('#eTw','09:00-13:00'); await p.dispatchEvent('#eLat','input'); await shot('edit-customer'); await p.click('#modal [data-act=ok]');
  await p.click('#cK3box');
  await p.click('#newCustBtn'); await p.fill('#eId','91000999'); await p.fill('#eName','DEMO NEW CUSTOMER'); await p.fill('#eAddr','1 New Road, City Centre'); await p.fill('#eLat','53.34'); await p.fill('#eLng','-6.27');
  if(await p.$('#eBay')) await p.fill('#eBay','BAY 01'); for(const id of ['eId','eName','eLat','eBay']) await p.dispatchEvent('#'+id,'input'); await p.click('#modal [data-act=ok]').catch(()=>{});
  await p.waitForSelector('#scrim.on',{state:'hidden',timeout:4000}).catch(()=>{}); await closeModal(); await p.waitForFunction(()=>document.getElementById('cBay').textContent.includes('All bays (59)'),null,{timeout:4000}).catch(()=>{}); ok((await p.textContent('#cBay')).includes('All bays (59)'),'new customer added (59)');

  // 10. CHANGE REPORT — the deferred group is allocated later: it stays one line in "Deferred orders"
  await p.click('nav [data-tab=report]'); await p.waitForSelector('[data-pa=one]'); await shot('report');
  { const secs=await p.$$eval('#rBody [data-sec]',x=>x.map(e=>e.dataset.sec)); ok(secs.length>0 && secs.every(x=>['defer','pend','move','add','route','dock','cust'].includes(x)),'change report shows only deferred, reallocated, inserted, new routes, docket and customer changes: '+secs.join(', '));
    const n0=await p.$$eval('#rBody tbody tr',x=>x.length); await p.click('[data-pw]'); const n1=await p.$$eval('#rBody tbody tr',x=>x.length);
    ok(n1>0 && n1<n0 && !(await p.$('[data-sec=route]')) && /P&W/.test(await p.textContent('[data-pw]')),`P&W balloon filters the report to Pink & White orders (${n0} → ${n1} rows)`); await shot('report-pw'); await p.click('[data-pw]'); ok(await p.$$eval('#rBody tbody tr',x=>x.length)===n0,'clicking the P&W balloon again shows everything'); }
  await p.click('[data-pa=all]'); await p.click('[data-pa=bulk]'); await p.waitForSelector('#aDay');
  if(!(await p.inputValue('#aBay'))) await p.selectOption('#aBay',{index:1}); await shot('allocate'); await p.click('#aOk'); await p.waitForTimeout(300);
  const defSec=(await p.textContent('[data-sec=defer]')).replace(/\s+/g,' '), movSec=(await p.textContent('[data-sec=move]').catch(()=>'')).replace(/\s+/g,' ');
  ok(grp.every(g=>defSec.includes(g.name)) && /Wed 11\.11\s*BAY/.test(defSec) && defSec.includes('allocated'),'deferred line updated with the bay it was allocated to');
    const movRows=await p.$$eval('[data-sec=move] tbody tr',rs=>rs.map(r=>r.textContent.replace(/\s+/g,' ')));
  ok(!movRows.some(r=>r.startsWith('Wed 11.11') && grp.some(g=>r.includes(g.name))),'allocated deferral not listed again under "Reallocated between bays"');
  // docket type of any order, from the report
  const monOrder=await p.evaluate(()=>{ const t=document.querySelector('[data-sec=move] .ords'); return t?t.textContent.trim().split(/\s/)[0]:''; });
  await p.fill('#dkFind',monOrder); await p.click('#dkGo'); await p.click('#dkNew [data-dkv=PW]'); await p.click('#dkOk');
  ok((await p.textContent('[data-sec=dock]')).includes(monOrder),`docket of order ${monOrder} changed to Pink & White from the report`);
  // sort by customer (click the heading)
  await p.click('[data-sec=move] th[data-sort="move:1"]'); const names=await p.$$eval('[data-sec=move] tbody tr td:nth-child(2) b',x=>x.map(e=>e.textContent));
  ok(names.join('|')===[...names].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'})).join('|'),'clicking a heading sorts the section A→Z');
  ok(await p.$$eval('#rBody table:not([data-tbl=pend]) tbody tr',rs=>rs.length>0 && rs.every(r=>/👤 Alex/.test(r.textContent))),'every change in the report shows who made it (👤 Alex) in the Logged column');
  await shot('report-after');
  const [dl]=await Promise.all([p.waitForEvent('download'), p.click('#xlsBtn')]); ok(/Route changes .*\.xlsx$/.test(dl.suggestedFilename()),'full report exported to Excel: '+dl.suggestedFilename());

  // 11. CUSTOMIZE — theme (everyone) and bay colours (Master); route names moved to the Resources tab
  ok(await p.isVisible('nav [data-tab=options]'),'Options tab visible'); await p.click('nav [data-tab=options]'); ok(await p.isVisible('#opt-customize') && await p.isVisible('#opt-users') && await p.isVisible('#opt-files'),'Options: Customize, Users (Master) and Files loaded sections'); ok(!!(await p.$('.thopt.on[data-theme=system]')),'the default theme is “Same as the browser”'); ok((await p.$$eval('#tab-options .card',x=>x.map(e=>e.id))).slice(-1)[0]==='opt-theme' && await p.$eval('#opt-theme',e=>!!e.querySelector('.thopt')),'Options: the Theme section is the last one');
  // DELIVERY SHORTAGES: the Power BI report embedded; its link is kept in users.json (set once by a Master)
  { await p.click('[data-tab=shortages]'); ok(/not set up yet/.test(await p.textContent('#tab-shortages')) && await p.isVisible('#biNew'),'Delivery Shortages tab: a Master can set the report link');
    await p.fill('#biNew','https://evil.example.com/report'); await p.click('#biSave'); await p.waitForTimeout(300); ok(!(await p.$('#biFrame')) && /not a Power BI/.test(await p.textContent('#toast')),'only powerbi.com links are accepted');
    const code='<iframe title="IRLDeliveryShortages" width="1140" height="541.25" src="https://app.powerbi.com/reportEmbed?reportId=00000000-0000-0000-0000-000000000000&amp;autoAuth=true&ctid=11111111-1111-1111-1111-111111111111" frameborder="0" allowFullScreen="true"></iframe>';
    await p.fill('#biNew',code); await p.click('#biSave'); await p.waitForSelector('#biFrame');
    ok((await p.getAttribute('#biFrame','src'))==='https://app.powerbi.com/reportEmbed?reportId=00000000-0000-0000-0000-000000000000&autoAuth=true&ctid=11111111-1111-1111-1111-111111111111' && await p.evaluate(()=>JSON.parse(window.__TREE.MASTER_DATA['users.json'].text).deliveryShortagesUrl.startsWith('https://app.powerbi.com/reportEmbed')),'the embed code is accepted: the report is embedded and its link saved in users.json');
    await shot('delivery-shortages'); await p.click('nav [data-tab=options]'); }
  await p.$eval('input[data-cucol="BAY 01"]',e=>{ e.value='#ff00aa'; e.dispatchEvent(new Event('change',{bubbles:true})); });
  ok(!(await p.$('#cuDay')) && !(await p.$('input[data-cuname]')),'Customize: the route-names section is gone');
  await p.click('.thopt[data-theme=dark]'); ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='dark','dark theme applied'); await shot('customize-dark');
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); await shot('plan-dark');
  await p.click('nav [data-tab=options]'); await p.click('.thopt[data-theme=system]'); ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('routePlannerBeta.v082.prefs')).theme==='system' && document.documentElement.dataset.theme===(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')),'“Same as the browser” theme follows the browser'); await p.click('.thopt[data-theme=light]'); ok(await p.evaluate(()=>document.documentElement.dataset.theme==='light' && JSON.parse(localStorage.getItem('routePlannerBeta.v082.prefs')).theme==='light'),'light theme back, kept in this browser'); await shot('customize');

  // 11b. RESOURCES — the day's routes as a sheet: rename a route, add a comment
  await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]');
  ok(await p.isVisible('#rsGrid th .rs-star[title="DIPS calculation. not updated after reallocations"]'),'Resources: * on DIPS km / estimated time with the hint');
  const bayCell='#rsGrid td[data-r="0"][data-c="1"]'; await p.click(bayCell); await p.keyboard.type('City Express'); await p.keyboard.press('Enter');
  ok((await p.textContent(bayCell)).trim()==='CITY EXPRESS','Resources: route renamed by typing in the Route / Bay cell');
  await p.click('#rsGrid td[data-r="0"][data-c="10"]'); await p.keyboard.type('Keys at the gate'); await p.keyboard.press('Enter'); await shot('resources');
  await p.click('nav [data-tab=plan]'); ok((await p.textContent('#pRoutes')).includes('CITY EXPRESS'),'renamed route shown in Planning');

  // 11c. CHECK SHEET PRINT — the day's check-sheet PDF, organised by the plan (with the moves as reallocations)
  await p.click('nav [data-tab=print]'); await p.selectOption('#jpDay','D2026-11-09');
  ok(await p.evaluate(()=>{ const a=document.getElementById('jpExport').getBoundingClientRect(), b=document.getElementById('jpDrop').getBoundingClientRect(), m=document.getElementById('jpOutput').getBoundingClientRect(); return b.top<a.top && a.right<=m.left+1; }),'steps on the left: Import PDF first … Organise (step 4); merged Routes & Organised PDF on the right');
  await p.click('#jpJde'); await p.waitForSelector('input[name=jde]'); await p.waitForFunction(()=>!document.querySelector('#modal [data-jd]')||![...document.querySelectorAll('#modal [data-jd]')].some(e=>/reading/.test(e.textContent)),null,{timeout:60000}); await p.waitForTimeout(400);
  { const rows=await p.$$eval('#modal .fbrow',x=>x.map(r=>({n:r.querySelector('.fn').firstChild.textContent.trim(), t:r.querySelector('[data-jd]').textContent.trim()})));
    const want={Mon:'Mon 09.11',Tue:'Tue 10.11',Wed:'Wed 11.11',Thu:'Thu 12.11',Fri:'Fri 13.11'}; const nm=require('../lib/checksheet').JDE_NAMES;
    ok(Object.keys(want).every(d=>rows.some(r=>r.n===nm[d] && r.t===want[d])),'JDE folder: the day of each PDF is read from its first pages, not from its name ('+rows.map(r=>r.t).join(', ')+')'); await shot('jde-browser');
    await p.check(`input[value="CHECK_SHEETS/JDE/week_46/${require('../lib/checksheet').JDE_NAMES.Wed}"]`); await p.click('#jdeOk'); await p.waitForSelector('#jpExport:not([disabled])',{timeout:60000});
    ok(await p.$eval('#jpDay',s=>s.value)==='D2026-11-11','importing a PDF sets the Printing day from the PDF (Wed 11.11)');
    await p.click('#jpFiles .remove'); await p.selectOption('#jpDay','D2026-11-09'); await p.click('#jpJde'); await p.waitForSelector('input[name=jde]'); await p.waitForTimeout(800);
    await p.check(`input[value="CHECK_SHEETS/JDE/week_46/${nm.Mon}"]`); await p.click('#jdeOk'); await p.waitForSelector('#jpExport:not([disabled])',{timeout:60000});
    await p.click('#jpJde'); await p.waitForSelector('input[name=jde]'); await p.waitForTimeout(800); ok(/✓ loaded/.test(await p.textContent(`#modal .fbrow:has-text("${nm.Mon}")`)),'the imported PDF is tagged “✓ loaded” in the folder window'); await p.click('#modal [data-act=close]'); }
  ok((await p.textContent('#jpRes')).includes('CITY EXPRESS'),'Print: resources come from the Resources tab');
  { const t=await p.textContent('#jpRea'); console.log('   reallocations: '+t.replace(/\s+/g,' ').slice(0,400)); ok(/DEFERRED|BAY/.test(t) && !/Moved in Planning|Deferred in from/.test(t),'Print: reallocations listed from Planning (order, customer / ship to, from, to only)'); }
  await p.click('#jpExport'); await p.waitForSelector('#jpSelBar:not([hidden])',{timeout:90000});
  ok(await p.$$eval('#jpChecks li',x=>x.length>0 && x.every(li=>!li.classList.contains('fail'))),'Print: organised PDF passed every integrity check');
  { const tabs=await p.$$eval('#jpRoutes .jp-route .jp-rname',x=>x.map(e=>e.textContent.replace(/^[^]*?(BAY|CITY|DEFERRED|UNASSIGNED)/,'$1').trim())); console.log('   route tabs: '+tabs.join(' | '));
    ok(tabs.includes('CITY EXPRESS') && tabs.indexOf('BAY 02')<tabs.indexOf('BAY 03'),'Print: one cover per route, in the order of the plan, with the Resources name'); }
  await shot('check-sheet-print');
  const [pdl]=await Promise.all([p.waitForEvent('download'), p.click('#jpDownloadAll')]); ok(/^\d{4}-\d\d-\d\d_\d\d\.\d\d_Alex\.pdf$/.test(pdl.suggestedFilename()),'organised PDF named date_time_user: '+pdl.suggestedFilename());
  ok(await p.evaluate(()=>{ const o=((window.__TREE.CHECK_SHEETS||{}).Organised)||{}; return Object.keys(o).some(f=>/^\d{4}-\d\d-\d\d_\d\d\.\d\d_Alex\.pdf$/.test(f)); }),'the organised PDF is also saved in CHECK_SHEETS/Organised');
  await p.click('nav [data-tab=plan]');

  // 12. SAVE — straight into PLANS/week_46; then one plan per day of the week
  // each day's plan is saved the afternoon before (the browser clock is set for the save only)
  const at=async t=>{ await p.clock.setFixedTime(new Date(t)); };
  await at('2026-11-06T16:05:00'); await p.click('#saveBtn'); await p.waitForTimeout(500);
  let saved=await p.evaluate(()=>Object.keys((window.__TREE.PLANS||{}).week_46||{}));
  ok(saved.some(f=>/^v\d+\.\d+\.\d+_.*_Alex\.json$/.test(f)),'Save wrote the plan into PLANS/week_46: '+saved.join(', '));
  ok(/Saved: "v\d+\.\d+\.\d+_/.test(await p.textContent('#lineage')) && !(await p.textContent('#lineage')).includes('Previous'),'header shows only the current file');
  await at('2026-11-06T16:07:00'); await p.click('#shareBtn');
  ok(!(await p.isVisible('#shName')) && (await modalText()).includes('👤 Alex'),'Save as / share: “saved by” is the user who is in, not editable');
  await p.click('[data-act=snap]'); await p.waitForTimeout(500); await closeModal();
  // Save as: only the folder is chosen (here the company folder itself); the name stays version_date_time_user
  await p.click('#shareBtn'); await p.click('[data-act=jsonas]'); await p.waitForTimeout(500); await closeModal();
  ok(await p.evaluate(()=>Object.keys(window.__TREE).some(f=>/^v\d+\.\d+\.\d+_2026-11-06_16\.07_Alex\.json$/.test(f))),'Save as: the file name stays version_date_time_user (only the folder is chosen)');
  for(const [dk,t] of [['D2026-11-10','2026-11-09T15:40:00'],['D2026-11-11','2026-11-10T15:35:00'],['D2026-11-12','2026-11-11T15:50:00'],['D2026-11-13','2026-11-12T15:45:00']]){
    await p.selectOption('#pDay',dk); await p.click('#expAll');
    const rs=await p.$$eval('.route:not(.deferred)',x=>x.map(r=>({id:r.dataset.r,n:r.querySelectorAll('.drop:not(.dh)').length}))); const src=rs.find(r=>r.n>=2);
    const k=(await dropsOf(src.id))[0].k; await p.click(`.drop[data-k="${k}"] [data-act=move]`); await p.selectOption('#mTo',await p.$eval('#mTo',s=>[...s.options].find(o=>o.value&&!o.disabled).value)); await p.click('#mOk');
    await at(t); await p.click('#saveBtn'); await p.waitForTimeout(400);
  }
  saved=await p.evaluate(()=>Object.keys(window.__TREE.PLANS.week_46)); ok(saved.filter(f=>f.endsWith('.json')).length===5 && saved.some(f=>f.endsWith('.html')),`5 plan files + 1 snapshot in PLANS/week_46`);

  // 13. ROLES — Viewer and User see fewer buttons; a user without a folder can't get in until it is set
  await switchTo('Warehouse');
  await p.click('nav [data-tab=plan]'); await p.click('#expAll');
  ok(!(await p.isVisible('.drop [data-act=move] >> nth=0')) && !(await p.isVisible('#saveBtn')),'Viewer: no move / save');
  await p.click('nav [data-tab=options]'); ok(await p.isDisabled('input[data-cucol] >> nth=0') && await p.isVisible('.thopt') && !(await p.$('#opt-users')),'Viewer: can pick a theme, cannot change bay colours, no Users section');
  await p.click('[data-tab=shortages]'); ok(!!(await p.$('#biFrame')) && !(await p.$('#biNew')),'Viewer: sees the embedded Delivery Shortages report (opens with the account signed in to the browser), cannot change the link'); await p.click('nav [data-tab=options]');
  await shot('viewer');
  // Jordan has no folder: the check fails and there is NO way to set it from the start window
  await p.click('#userBtn'); await p.click('#modal [data-act=switch]'); await p.click('#modal [data-act="u:Jordan"]');
  await p.waitForSelector('#modal [data-act=back]'); await p.waitForTimeout(300); const bad=await modalText();
  ok(bad.includes('Check failed') && bad.includes('No folder is defined') && bad.includes('Ask a Master') && !(await p.isVisible('#modal [data-act=go]')) && !(await p.isVisible('#pPath')),'Jordan: no folder → blocked, cannot set a folder from the start window'); await shot('folder-check-failed');
  // a Master (inside the planner) sets Jordan's folder, then Jordan can get in
  await p.click('#modal [data-act=back]'); await enter('Alex');
  await p.click('nav [data-tab=options]'); await p.waitForSelector('[data-opt=users]'); await shot('options'); await p.click('[data-opt=users]'); await p.waitForSelector('[data-ua="path:2"]');
  await p.fill('[data-ua="path:2"]','C:\\Users\\jordan\\OneDrive - Demo Transport\\Transport\\Route_planning'); await p.fill('#uaCo','Demo Transport Group'); await shot('master-sets-folder'); await p.click('#modal [data-act=save]'); await p.waitForTimeout(300);
  ok((await p.textContent('#coName')).includes('Demo Transport Group') && await p.evaluate(()=>JSON.parse(window.__TREE.MASTER_DATA['users.json'].text).company==='Demo Transport Group'),'Master changed the company name: shown in the header and saved in users.json');
  ok(await p.evaluate(()=>JSON.parse(window.__TREE.MASTER_DATA['users.json'].text).users.find(u=>u.name==='Jordan').path.endsWith('Route_planning')),"Master saved Jordan's folder into MASTER_DATA › users.json");
  await switchTo('Jordan');
  await p.click('nav [data-tab=report]'); ok(!(await p.isVisible('[data-undo] >> nth=0')) && await p.isVisible('#rBody'),'User: no undo (cannot remove changes)');
  await p.click('nav [data-tab=options]'); ok((await p.textContent('#opt-files')).includes('DIPS_Plan_Fri.xlsx'),'Options › Files loaded lists every report loaded, incl. the replaced Friday'); await p.click('nav [data-tab=report]');
  { const nav=+(await p.textContent('#navCount')); const real=await p.evaluate(()=>JSON.parse(localStorage.getItem('routePlannerBeta.v082.state')).log.filter(e=>e.type!=='load'&&e.type!=='resupd').length);
    ok(nav===real && !(await p.$('[data-sec=load]')) && !(await p.$('[data-sec=res]')),'files loaded (now in Options) and resources edits are not in the change report or its count'); }
  await switchTo('Sam');
  await p.click('nav [data-tab=options]'); ok(!(await p.$('#opt-users')) && !(await p.$('[data-opt=users]')) && await p.isVisible('#opt-customize'),'Manager: no user control (Master only)'); await p.click('#userBtn'); ok(!(await p.$('#modal [data-act=admin]')),'Manager: no “Manage users” in the user menu'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // the saved plans (collected before the full reset below)
  const plans=await p.evaluate(()=>window.__TREE.PLANS.week_46);

  // 14. A SNAPSHOT opens on any computer, view-only, without the start window
  const snapName=Object.keys(plans).find(f=>f.endsWith('.html')); const snapFile=path.join(require('os').tmpdir(),'rp-snap-'+Date.now()+'.html'); fs.writeFileSync(snapFile,plans[snapName].text);
  { const c2=await b.newContext(); await c2.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue(); const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); return k?r.fulfill({path:libs[k]}):r.abort(); });
    const s2=await c2.newPage(); await s2.goto('file://'+snapFile); await s2.waitForTimeout(500);
    ok((await s2.textContent('#userBtn')).includes('view only') && (await s2.textContent('#cBay')).includes('All bays (59)') && !(await s2.isVisible('#modal [data-act=link]')),'snapshot opens on a fresh browser: view-only, with its customers'); await c2.close(); }

  // 15. ONE LAPTOP PER PERSON (the company setting): a laptop is registered to its owner the first time
  { const tree=JSON.parse(JSON.stringify(TREE)); const uj=JSON.parse(Buffer.from(tree.MASTER_DATA['users.json'].b64,'base64').toString()); delete uj.shareComputers; uj.users.forEach(u=>{ if(!u.path) u.path='C:\\Users\\x\\Route_planning'; });
    tree.MASTER_DATA['users.json']={text:JSON.stringify(uj),mod:Date.now()}; delete tree.MASTER_DATA['MASTER_DEL_DETAILS.xlsx'];
    const laptop=async t=>{ const cx=await b.newContext({viewport:{width:1360,height:800}}); await cx.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue(); const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); return k?r.fulfill({path:libs[k]}):r.abort(); });
      await cx.addInitScript(tt=>{ window.__TREE=JSON.parse(tt); }, JSON.stringify(t)); await cx.addInitScript(MOCK); const pg=await cx.newPage(); await pg.goto('file://'+APP); await pg.click('#modal [data-act=link]'); await pg.waitForSelector('[data-act="u:Alex"]'); return {cx,pg}; };
    const txt=async pg=>(await pg.textContent('#modal')).replace(/\s+/g,' ');
    const A=await laptop(tree);   // Alex's laptop
    await A.pg.click('[data-act="u:Alex"]'); await A.pg.waitForSelector('#modal [data-act=go]'); ok((await txt(A.pg)).includes('will be registered to Alex'),"first time on a laptop: it will be registered to its owner"); await A.pg.click('#modal [data-act=go]');
    await A.pg.waitForFunction(()=>!document.body.classList.contains('gated')); await A.pg.click('#modal [data-act=dgo]').catch(()=>{}); await A.pg.click('#modal [data-act=sskip]').catch(()=>{}); const reg=JSON.parse(await A.pg.evaluate(()=>window.__TREE.MASTER_DATA['users.json'].text));
    ok(!!reg.users.find(u=>u.name==='Alex').device,"Alex's laptop registered in users.json");
    await A.pg.click('#userBtn'); await A.pg.click('#modal [data-act=switch]'); const only=await txt(A.pg);
    ok(only.includes('registered to Alex') && only.includes('Sam') && await A.pg.isDisabled('#modal button:has-text("Sam")') && !(await A.pg.isDisabled('[data-act="u:Alex"]')),"on Alex's laptop everyone is listed, but only Alex can be chosen"); await shot2(A.pg,'laptop-registered');
    await A.pg.click('#modal [data-act=ureload]'); await A.pg.waitForTimeout(300); ok((await txt(A.pg)).includes('Users file reloaded'),'“Reload users file” reads it again from MASTER_DATA');
    tree.MASTER_DATA['users.json']={text:JSON.stringify(reg),mod:Date.now()};
    const B=await laptop(tree);   // another person's laptop
    await B.pg.click('[data-act="u:Alex"]'); await B.pg.waitForSelector('#modal [data-act=back]'); await B.pg.waitForTimeout(300); const other=await txt(B.pg);
    ok(other.includes('registered on another computer') && !(await B.pg.isVisible('#modal [data-act=go]')),"Alex can't be used on another laptop"); await shot2(B.pg,'other-laptop');
    await B.pg.click('#modal [data-act=back]'); await B.pg.click('[data-act="u:Sam"]'); await B.pg.waitForSelector('#modal [data-act=go]'); ok((await txt(B.pg)).includes('will be registered to Sam'),'the other laptop can be registered to its own owner (Sam)');
    await A.cx.close(); await B.cx.close(); }

  // 16. RESET (Master) — everything cleared, back to the start window
  await switchTo('Alex');
  await p.click('#resetBtn'); await p.waitForSelector('#modal [data-act=ok]'); ok(/Kept:.*users file/.test(await modalText()),'reset window: the plan is cleared, the folder link and users file are kept');
  await Promise.all([p.waitForEvent('load'), p.click('#modal [data-act=ok]')]);
  // the mock folder can't be remembered across a reload in this test set-up, so link it again; in Chrome the link is kept
  if(await p.isVisible('#modal [data-act=link]').catch(()=>false)) await p.click('#modal [data-act=link]');
  await p.waitForSelector('#modal [data-act="u:Alex"]',{state:'visible'});
  // the app writes a fresh, empty plan as it starts again; only the users file choice may be left
  const left=await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('routePlannerBeta') && !/usersConfig|usersFile|\.prefs$/.test(k) && !(k.endsWith('.state') && JSON.parse(localStorage.getItem(k)).log.length===0)));
  ok(left.length===0 && (await p.textContent('#cBay')).includes('All bays (0)') && await p.evaluate(()=>!!localStorage.getItem('routePlannerBeta.usersConfig')),'after reset: plan cleared, users file kept, “Who is planning?” open'+(left.length?' — left: '+left.join(','):''));
  ok(await p.evaluate(()=>{ const q=JSON.parse(localStorage.getItem('routePlannerBeta.v082.prefs')||'{}'); return q.theme==='light' && Object.keys(q).length===1; }),'Reset does not reset the theme option (and clears the other preferences)');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.join(' | '):''));

  const out=path.join(DEMO,'PLANS','week_46'); fs.rmSync(path.join(DEMO,'PLANS'),{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  for(const [f,node] of Object.entries(plans)) fs.writeFileSync(path.join(out,f),node.text);
  console.log(`${fails?fails+' FAILED':'All passed'} · ${Object.keys(plans).length} files written to PLANS/week_46`);
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
