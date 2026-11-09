// Resources sheet and Check Sheet Print, in detail, on a copy of the DEMO folder (made-up data).
// Usage: node features.js [app.html] [demoFolder]
const {chromium}=require('playwright'); const XLSX=require('xlsx'); const fs=require('fs'); const os=require('os'); const path=require('path');
const {demoContext, enter}=require('./lib/harness'); const {checkSheetPdf}=require('./lib/checksheet');
const APP=path.resolve(process.argv[2]||path.join(__dirname,'..','Route Planner.html'));
const DEMO=path.resolve(process.argv[3]||path.join(__dirname,'..','demo','Route_planning'));
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'rp-features-'));
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{
  const b=await chromium.launch(); const c=await demoContext(b,DEMO); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+APP); ok(await enter(p,'Alex'),'Alex is in');
  // load Monday and Tuesday
  await p.click('nav [data-tab=plan]'); await p.click('#uploadBtn'); await p.waitForSelector('input[name=fb]');
  for(const wd of ['Mon','Tue']) for(const k of ['DIPS_Plan','RES']) await p.check(`input[value="REPORTS/week_46/${k}_${wd}.xlsx"]`);
  await p.click('#fbOk'); await p.waitForSelector('[data-act=add]'); await p.click('[data-act=add]'); await p.waitForTimeout(400);

  // ---------- RESOURCES ----------
  await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09');
  const cell=(r,c)=>`#rsGrid td[data-r="${r}"][data-c="${c}"]`; const txt=async(r,c)=>(await p.textContent(cell(r,c))).trim();
  const heads=async()=>p.$$eval('#rsGrid thead th[data-col] span:first-child',x=>x.map(e=>e.textContent));
  ok((await heads()).join('|')==='Shipment Number|Route / Bay|Driver|Helper|Truck|Drops|Kgs|Pallets|DIPS Total KM|Estimated Time|Comments','columns as specified (no ID column): '+(await heads()).join(', '));
  const nRows=async()=>p.$$eval('#rsGrid tbody tr',x=>x.length);
  const rows0=await nRows(); ok(rows0>=6,'Monday routes listed from the RESOURCES file ('+rows0+' rows)');
  ok(/not edited yet/.test(await p.textContent('.rs-tools')),'not edited yet: shown from the loaded files');
  const clip={copy:()=>p.evaluate(()=>{ const dt=new DataTransfer(); document.getElementById('rsWrap').focus(); document.dispatchEvent(new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true})); return dt.getData('text/plain'); }),
    paste:t=>p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); document.getElementById('rsWrap').focus(); document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); },t)};
  // select a block with click + shift+click, copy it
  await p.click(cell(0,2)); await p.click(cell(1,3),{modifiers:['Shift']});
  ok(await p.$$eval('#rsGrid td.sel',x=>x.length)===4,'Shift+click selects a block of cells (2 × 2)');
  const tsv=await clip.copy(); const want=[[await txt(0,2),await txt(0,3)].join('\t'),[await txt(1,2),await txt(1,3)].join('\t')].join('\n');
  ok(tsv===want,'Ctrl+C copies the block as tab-separated text (Excel format)');
  // paste it two rows lower
  await p.click(cell(2,2)); await clip.paste(tsv); await p.waitForTimeout(200);
  ok(await txt(2,2)===await txt(0,2) && await txt(3,3)===await txt(1,3),'Ctrl+V pastes the block (group of cells)');
  ok(/Edited in the planner/.test(await p.textContent('.rs-tools')),'first edit stores the table with the plan');
  // a block from Excel larger than the table adds rows
  await p.click(cell(rows0-1,0)); await clip.paste('74699901\tBAY 09\tExcel Driver\n74699902\tbay 9b\tExcel Driver 2\n74699903\tBAY 10\tExcel Driver 3');
  ok(await nRows()===rows0+2 && await txt(rows0,1)==='BAY 09B' && await txt(rows0+1,1)==='BAY 10','pasting past the last row adds rows; bay names are tidied (bay 9b → BAY 09B)');
  // one value over a selection fills it; Delete clears
  await p.click(cell(0,10)); await p.click(cell(2,10),{modifiers:['Shift']}); await clip.paste('Check tyres');
  ok(await txt(0,10)==='Check tyres' && await txt(2,10)==='Check tyres','one value pasted over a selection fills every cell');
  await p.click(cell(1,10)); await p.keyboard.press('Delete'); ok(await txt(1,10)==='','Delete clears the selected cells');
  // arrows + typing edit; Escape cancels
  await p.click(cell(0,8)); await p.keyboard.press('ArrowRight'); await p.keyboard.type('5:30'); await p.keyboard.press('Enter');
  ok(await txt(0,9)==='5:30','arrow keys move, typing edits the cell (estimated time)');
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('6:00'); await p.keyboard.press('Tab');
  ok(await txt(1,9)==='6:00','keyboard keeps working after an edit (Enter moves down, focus stays in the sheet)');
  await p.click(cell(0,7)); await p.keyboard.type('abc'); await p.keyboard.press('Enter'); ok(await p.$eval(cell(0,7),e=>e.classList.contains('bad')),'a number column shows text in red');
  await p.click(cell(0,7)); await p.keyboard.type('12'); await p.keyboard.press('Escape'); ok(await txt(0,7)==='abc','Escape cancels the edit');
  await p.click(cell(0,7)); await p.keyboard.type('14'); await p.keyboard.press('Enter');
  { const d0=await txt(0,5), k0=await txt(0,6); await p.click(cell(0,5)); await p.keyboard.type('99'); await p.keyboard.press('Enter'); ok(await txt(0,5)===d0 && await txt(0,6)===k0 && await p.$eval(cell(0,5),e=>e.classList.contains('ro')),'Drops and Kgs are read-only: they come from the plan'); }
  // rows: add and delete
  await p.click(cell(1,0)); await p.click('[data-rs=addrow]'); ok(await nRows()===rows0+3 && await txt(2,0)==='','＋ Row adds an empty row below the selected cell');
  ok(await p.evaluate(()=>{ const a=document.querySelector('[data-rs=addrow]').getBoundingClientRect(), g=document.getElementById('rsGrid').getBoundingClientRect(), c=document.querySelector('[data-rs=addcol]').getBoundingClientRect(); return a.top>=g.bottom-1 && c.left>=g.right-1; }),'＋ Row is below the table, ＋ Column on its right side');
  await p.click(cell(2,1)); await p.click('[data-rs=delrows]'); ok(await nRows()===rows0+2,'− Delete rows removes the selected row');
  // a row whose load has orders asks first
  await p.click(cell(0,0)); await p.click('[data-rs=delrows]'); ok((await p.textContent('#modal')).includes('Delete rows with orders?'),'deleting a route that has orders asks first'); await p.click('#modal [data-act=close]');
  // columns: add your own, hide a standard one, show it again
  await p.click('[data-rs=addcol]'); await p.fill('#rsColName','Start time'); await p.click('#modal [data-act=ok]');
  ok((await heads()).includes('Start time'),'＋ Column adds a column of your own');
  const ci=(await heads()).indexOf('Start time'); await p.click(cell(0,ci)); await p.keyboard.type('06:15'); await p.keyboard.press('Enter');
  await p.hover('#rsGrid thead th:has-text("Helper")'); await p.click('#rsGrid [data-rshide=helper]'); ok(!(await heads()).includes('Helper'),'× hides a standard column');
  await p.click('[data-rs=cols]'); await p.check('[data-rscol=helper]'); await p.check('[data-rscol=area]'); await p.click('#modal [data-act=close]');
  ok((await heads()).includes('Helper') && (await heads()).includes('General Area'),'Columns… shows hidden columns again (also General Area)');
  // export follows the RESOURCES layout
  const [dl]=await Promise.all([p.waitForEvent('download'), p.click('[data-rs=export]')]); const xf=path.join(TMP,dl.suggestedFilename()); await dl.saveAs(xf);
  const wb=XLSX.readFile(xf); const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
  ok(dl.suggestedFilename()==='RES_Mon 09.11.xlsx','export file name carries the day: '+dl.suggestedFilename());
  ok(aoa[0].join('|')==='Shipment|Bay|Driver|Helper|Vehicle|Number of Pallets|DIPS Total KM|General Area|Drops|Kgs|Estimated Time|Comments|Start time','export headers follow the RESOURCES files: '+aoa[0].join(', '));
  ok(aoa.some(r=>r[0]===74699901 && r[1]==='BAY 09') && aoa.some(r=>r.includes('06:15')),'export has the edited rows and your column');
  // plan and change report follow the table
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); const pr=await p.textContent('#pRoutes');
  ok(pr.includes('BAY 09') && pr.includes('Excel Driver'),'new rows are routes in Plan the day');
  await p.click('nav [data-tab=report]'); ok(!(await p.$('[data-sec=res]')) && +(await p.textContent('#navCount'))===0,'Resources edits are not logged: no section in the change report, nothing counted');
  // Drops and Kgs follow the plan: moving a drop in Plan the day changes the Resources table
  { await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09');
    const row=async i=>p.evaluate(i=>{ const t=[...document.querySelectorAll('#rsGrid tbody tr')][i].children; return {id:t[1].textContent.trim(),bay:t[2].textContent.trim(),drops:+t[6].textContent,kgs:+t[7].textContent}; },i);
    let ri=-1; for(let i=0;i<rows0;i++){ const r=await row(i); if(r.drops>=2){ ri=i; break; } } const before=await row(ri);
    await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll');
    const k=await p.$eval(`.route[data-r="${before.id}"] .drop:not(.dh)`,e=>e.dataset.k); await p.click(`.drop[data-k="${k}"] [data-act=move]`);
    await p.selectOption('#mTo',await p.$eval('#mTo',(s,id)=>[...s.options].find(o=>o.value&&!o.disabled&&o.value!==id).value,before.id)); await p.click('#mOk'); await p.waitForTimeout(300);
    await p.click('nav [data-tab=res]'); const after=await row(ri);
    ok(after.drops===before.drops-1 && after.kgs<before.kgs,`Drops and Kgs follow the plan (${before.bay}: ${before.drops} drops ${before.kgs} kg → ${after.drops} drops ${after.kgs} kg)`); }
  // upload a sheet: the file name says Tuesday while Monday is open → ask which day
  const up=[['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM','Drops','Kgs','Estimated Time','Comments','Start time']];
  const tue=XLSX.utils.sheet_to_json(XLSX.readFile(path.join(DEMO,'REPORTS','week_46','RES_Tue.xlsx')).Sheets.Sheet1,{header:1}).slice(1);
  tue.forEach((r,i)=>up.push([r[0],r[1],i===0?'Uploaded Driver':r[2],r[3],r[4],r[5],r[6],r[8],r[9],'4:00','','07:00']));
  const uw=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(uw,XLSX.utils.aoa_to_sheet(up),'Sheet1'); const uf=path.join(TMP,'RES_Tue 10.11.xlsx'); XLSX.writeFile(uw,uf);
  await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09'); await p.setInputFiles('#rsFile',uf); await p.waitForSelector('#modal [data-act=other]');
  ok((await p.textContent('#modal')).includes('The file name says Tue 10.11'),'upload: the day in the file name is checked against the open day');
  await p.click('#modal [data-act=other]'); await p.waitForTimeout(400);
  ok(await p.$eval('#rsDay',s=>s.value)==='D2026-11-10' && (await p.textContent('#rsGrid')).includes('Uploaded Driver') && (await p.textContent('#rsGrid')).includes('07:00'),'upload loaded into Tuesday, own columns matched by name');
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-10'); ok((await p.textContent('#pRoutes')).includes('Uploaded Driver'),'uploaded resources used by Plan the day');
  // the table is saved with the plan and survives a reload
  await p.reload(); ok(await enter(p,'Alex'),'back in after a reload');
  await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09'); ok((await p.textContent('#rsGrid')).includes('Check tyres') && (await heads()).includes('Start time'),'table, comments and own columns kept');

  // columns: resize by dragging the edge; move a column or a row by pressing its heading and dragging
  { const th=await p.$('#rsGrid thead th[data-k=driver]'); const w0=(await th.boundingBox()).width; const rz=await (await p.$('#rsGrid thead th[data-k=driver] .rs-rz')).boundingBox();
    await p.mouse.move(rz.x+rz.width/2,rz.y+rz.height/2); await p.mouse.down(); await p.mouse.move(rz.x+rz.width/2+70,rz.y+rz.height/2,{steps:6}); await p.mouse.up();
    const w1=(await (await p.$('#rsGrid thead th[data-k=driver]')).boundingBox()).width; ok(w1>w0+50,`a column is resized by dragging its edge (${Math.round(w0)} → ${Math.round(w1)} px)`);
    await p.reload(); ok(await enter(p,'Alex'),'back in'); await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09');
    ok((await (await p.$('#rsGrid thead th[data-k=driver]')).boundingBox()).width>w0+50,'the column width is kept (saved with the plan)');
    const a=await (await p.$('#rsGrid thead th[data-k=truck] span')).boundingBox(), t=await (await p.$('#rsGrid thead th[data-k=driver]')).boundingBox();
    await p.mouse.move(a.x+4,a.y+a.height/2); await p.mouse.down(); await p.mouse.move(t.x+12,t.y+t.height/2,{steps:10}); await p.mouse.up();
    const hs=await heads(); ok(hs.indexOf('Truck')===hs.indexOf('Driver')-1 && hs.indexOf('Truck')>=0,'a column is moved by pressing its heading and dragging: '+hs.join(', '));
    const r0=await txt(0,0); const h0=await (await p.$('#rsGrid tbody th[data-row="0"]')).boundingBox(), h2=await (await p.$('#rsGrid tbody th[data-row="2"]')).boundingBox();
    await p.mouse.move(h0.x+h0.width/2,h0.y+h0.height/2); await p.mouse.down(); await p.mouse.move(h2.x+h2.width/2,h2.y+h2.height/2+4,{steps:10}); await p.mouse.up();
    ok(await txt(2,0)===r0 && await txt(0,0)!==r0,'a row is moved the same way'); }

  // ---------- CHECK SHEET PRINT ----------
  // Monday's orders from the planning file, plus one order on a load that is not in Resources and a signature-only page
  const plan=XLSX.utils.sheet_to_json(XLSX.readFile(path.join(DEMO,'REPORTS','week_46','DIPS_Plan_Mon.xlsx')).Sheets.Sheet1,{header:1}).slice(1);
  const list=plan.map(r=>({load:String(r[0]),order:String(r[1]),name:String(r[3]),date:'09/11/2026'})).concat([{load:'74688888',order:'5699999',name:'NOT ON A ROUTE BAR'}]);
  const pdf=path.join(TMP,'checks_mon.pdf'); fs.writeFileSync(pdf, await checkSheetPdf(list,{blankAfter:[0]}));
  // move one Monday order to another route in Plan the day
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll');
  const k=await p.$eval('.route:not(.deferred) .drop:not(.dh)',e=>e.dataset.k); await p.click(`.drop[data-k="${k}"] [data-act=move]`);
  const to=await p.$eval('#mTo',s=>[...s.options].find(o=>o.value&&!o.disabled).value); await p.selectOption('#mTo',to); await p.click('#mOk'); await p.waitForTimeout(300);
  await p.click('nav [data-tab=print]'); await p.selectOption('#jpDay','D2026-11-09');
  await p.setInputFiles('#jpFile',pdf); await p.waitForSelector('#jpExport:not([disabled])',{timeout:60000});
  const tiles=(await p.textContent('#jpTiles')).replace(/\s+/g,' ');
  ok(tiles.includes(`Orders${list.length}`),'every order page identified ('+list.length+' orders): '+tiles);
  ok(/Blank discarded\s*1/.test(tiles),'signature-only page discarded');
  ok(/Reallocations\s*\d+ \/ \d+/.test(tiles) && (await p.textContent('#jpRea')).includes('Moved in Plan the day'),'the move made in Plan the day is a reallocation');
  const ra=await p.textContent('#jpRea'); ok(!/bad/.test(await p.$$eval('#jpRea tr',x=>x.map(t=>t.className).join(' '))),'every reallocation found in the PDF');
  await p.click('#jpExport'); await p.waitForSelector('#jpOutBody:not([hidden])',{timeout:90000});
  ok(await p.$$eval('#jpChecks li',x=>x.length>0 && x.every(li=>!li.classList.contains('fail'))),'organised PDF passes every integrity check');
  const tabs=await p.$$eval('#jpOutRoutes .jp-rtab b',x=>x.map(e=>e.textContent)); ok(tabs[tabs.length-1]==='UNASSIGNED' && tabs[0]==='BAY 01','routes in plan order, UNASSIGNED last: '+tabs.join(' | '));
  // layout: steps side by side on top, then summary, checks, and routes next to the organised PDF
  ok((await p.$$eval('.jp-steps h2',x=>x.map(e=>e.textContent.replace(/\s+/g,' ').trim().replace(/ (Edit in Resources|Plan the day)$/,'')))).join('|')==='1Import PDF|2Resources|3Reallocations|4Organise','steps 1–4 in a row on top: Import PDF, Resources, Reallocations, Organise');
  ok(await p.evaluate(()=>{ const y=id=>document.getElementById(id).getBoundingClientRect(); const s=document.querySelector('.jp-steps').getBoundingClientRect(), r=document.querySelector('.jp-split section:first-child').getBoundingClientRect(), o=y('jpOutput');
    const cs=[...document.querySelectorAll('.jp-steps section')].map(e=>e.getBoundingClientRect().top); return Math.max(...cs)-Math.min(...cs)<5 && y('jpTiles').top>=s.bottom-1 && r.top>=y('jpTiles').bottom-1 && Math.abs(r.top-o.top)<5 && o.left>r.left; }),'order: steps row → summary → checks → routes | organised PDF');
  // Ship To in the routes list + search (order, customer, ship to, loading, bay)
  await p.click('#jpExpand'); const hdr=await p.$$eval('#jpRoutes th',x=>x.map(e=>e.textContent)); ok(hdr.includes('Ship To') && /9100\d{4}/.test(await p.textContent('#jpRoutes')),'the routes list shows the ship to code of each customer');
  const nAll=await p.$$eval('#jpRoutes .jp-route',x=>x.length); const someShip=(await p.$$eval('#jpRoutes tbody tr',x=>x.map(r=>r.children[3].textContent)))[0];
  const search=async q=>{ await p.fill('#jpSearch',q); return p.$$eval('#jpRoutes .jp-route',x=>x.length); };
  ok(await search(list[0].order)===1,'search by order number'); ok(await search(someShip)>=1,'search by ship to'); ok(await search(list[1].name.slice(0,6))>=1,'search by customer name');
  ok(await search(list[0].load)>=1,'search by loading (shipment) number'); ok(await search('BAY 02')>=1,'search by bay'); ok(await search('zzzzz')===0 && await search('')===nAll,'no match shows nothing; clearing the search shows every route');
  // choose what to print
  await p.evaluate(()=>{ const o=JDEPrint.exporter.extractPages; window.__cap=null; JDEPrint.exporter.extractPages=async(parts,t)=>{ window.__cap=parts[0].pageIndices.slice(); return o(parts,t); }; });
  const total=await p.evaluate(()=>__rpPrint.state.result.manifest.length);
  const sel=async()=>p.evaluate(()=>__rpPrint.selPages().length);
  ok(await p.isChecked('#jpSelAll') && await sel()===total && /Print Selected/.test(await p.textContent('#jpPrintSel')),'Select all is ticked: every route and order is selected');
  const r1=await p.evaluate(()=>__rpPrint.state.result.routes.map(r=>({n:r.name,p:r.pages.length})));
  await p.click('#jpOutRoutes .jp-rrow:nth-child(1) input'); ok(await sel()===total-r1[0].p && !(await p.isChecked('#jpSelAll')),'unticking a route leaves it out ('+r1[0].n+') and clears Select all');
  await p.click('#jpOutRoutes .jp-rrow:nth-child(2) .jp-rtab'); const ordCb=await p.$$('#jpOutOrders input'); const before2=await sel();
  const pagesOfOrder=await p.evaluate(()=>{ const m=__rpPrint.state.result.manifest, r=__rpPrint.state.result.routes[1].name; const k=m.find(x=>x.route===r&&x.type==='page'); return m.filter(x=>x.orderKey===k.orderKey).length; });
  if(ordCb.length>1){ await p.click('#jpOutOrders label:nth-child(1) input'); ok(await sel()===before2-pagesOfOrder,'unticking a single order leaves only its pages out'); await p.click('#jpOutOrders label:nth-child(1) input'); }
  await p.click('#jpPrintSel'); await p.waitForFunction(()=>window.__cap!==null,null,{timeout:20000}); ok(await p.evaluate(()=>window.__cap.length)===total-r1[0].p,'Print Selected prints only the ticked routes and orders ('+(total-r1[0].p)+' of '+total+' pages)');
  await p.click('#jpSelAll'); ok(await sel()===total,'Select all brings everything back');
  // reprint one order
  await p.click('[data-jpmode=reprint]'); await p.fill('#jpQuery','5699999'); await p.waitForSelector('#jpRpPreview:not([hidden])');
  const [rp]=await Promise.all([p.waitForEvent('download'), p.click('#jpRpDownload')]); ok(rp.suggestedFilename()==='Reprint_5699999.pdf','Reprint: one order, original pages only');
  // a Viewer can print but not edit resources
  await p.click('#userBtn'); await p.click('#modal [data-act=switch]'); ok(await enter(p,'Warehouse'),'Warehouse (Viewer) is in');
  await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09'); const before=await txt(0,2);
  await p.click(cell(0,2)); await p.keyboard.type('Nope'); await p.keyboard.press('Enter');
  ok(await txt(0,2)===before && !(await p.isVisible('[data-rs=addrow]')) && !(await p.isVisible('[data-rs=newday]')),'Viewer: resources are view only');
  ok(await p.isVisible('nav [data-tab=print]'),'Viewer: Check Sheet Print available');
  // ---------- DONEGAL is only on the Customers tab ----------
  { const D2=path.join(TMP,'donegal'); fs.cpSync(DEMO,D2,{recursive:true});
    const edit=(rel,fn)=>{ const f=path.join(D2,rel); const wb=XLSX.readFile(f); const n=wb.SheetNames[0]; const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1}); fn(rows); wb.Sheets[n]=XLSX.utils.aoa_to_sheet(rows); XLSX.writeFile(wb,f); };
    edit('MASTER_DATA/MASTER_DEL_DETAILS.xlsx',r=>r.push([91009001,'DONEGAL TEST BAR','DMO 999','1 Main St, Donegal',54.65,-8.11,'DONEGAL 01','Y','','','','','']));
    edit('REPORTS/week_46/RES_Mon.xlsx',r=>r.push([74609001,'DONEGAL 01','Driver 99','','TRK-99',2,100,'Donegal',1,300]));
    edit('REPORTS/week_46/DIPS_Plan_Mon.xlsx',r=>r.push([74609001,5609001,91009001,'DONEGAL TEST BAR','1 Main St','Donegal','09/11/2026',300,'RDONEGAL']));
    const c2=await demoContext(b,D2); const q=await c2.newPage(); const e2=[]; q.on('pageerror',e=>e2.push(e.message)); await q.goto('file://'+APP); ok(await enter(q,'Alex'),'Alex is in (Donegal copy)');
    await q.click('nav [data-tab=plan]'); await q.click('#uploadBtn'); await q.waitForSelector('input[name=fb]'); for(const k of ['DIPS_Plan','RES']) await q.check(`input[value="REPORTS/week_46/${k}_Mon.xlsx"]`);
    await q.click('#fbOk'); await q.waitForSelector('[data-act=add]'); await q.click('[data-act=add]'); await q.waitForTimeout(500);
    await q.selectOption('#pDay','D2026-11-09'); await q.click('#expAll'); const planTxt=await q.textContent('#pRoutes');
    ok(!/DONEGAL/i.test(planTxt) && !planTxt.includes('5609001') && !planTxt.includes('Driver 99'),'Donegal bays and customers are left out of Plan the day');
    await q.click('nav [data-tab=res]'); await q.selectOption('#rsDay','D2026-11-09'); const resTxt2=await q.textContent('#rsGrid'); ok(!/DONEGAL/i.test(resTxt2) && !resTxt2.includes('Driver 99'),'… and out of Resources');
    await q.click('nav [data-tab=customers]'); await q.waitForTimeout(300); ok(/DONEGAL 01/.test(await q.textContent('#cBay')),'… but still on the Customers tab');
    await q.click('nav [data-tab=report]'); ok(!/DONEGAL/i.test(await q.textContent('#rBody')),'… and out of the change report'); ok(!e2.length,'no script errors (Donegal copy)'+(e2.length?': '+e2.join(' | '):'')); await c2.close(); }
  ok(!errs.length,'no script errors'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
})().catch(e=>{ console.error(e); process.exitCode=1; });
