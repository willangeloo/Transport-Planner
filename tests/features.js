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
  await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]');
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
  ok(pr.includes('BAY 09') && pr.includes('Excel Driver'),'new rows are routes in Planning');
  await p.click('nav [data-tab=report]'); ok(!(await p.$('[data-sec=res]')) && +(await p.textContent('#navCount'))===0,'Resources edits are not logged: no section in the change report, nothing counted');
  // Drops and Kgs follow the plan: moving a drop in Planning changes the Resources table
  { await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]');
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
  await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]'); await p.setInputFiles('#rsFile',uf); await p.waitForSelector('#modal [data-act=other]');
  ok((await p.textContent('#modal')).includes('The file name says Tue 10.11'),'upload: the day in the file name is checked against the open day');
  await p.click('#modal [data-act=other]'); await p.waitForTimeout(400);
  ok(await p.$eval('#rsDays .rs-day.on',e=>e.dataset.rsday)==='D2026-11-10' && (await p.textContent('#rsGrid')).includes('Uploaded Driver') && (await p.textContent('#rsGrid')).includes('07:00'),'upload loaded into Tuesday, own columns matched by name');
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-10'); ok((await p.textContent('#pRoutes')).includes('Uploaded Driver'),'uploaded resources used by Planning');
  // the day selector (weeks + week days as buttons) is the same on Planning, Change report and Printing
  { const cls=async sel=>p.$eval(sel,e=>e.className);
    await p.click('nav [data-tab=plan]'); ok(await p.isVisible('#dbPlan .rs-wk.on') && /\bhas\b/.test(await cls('#dbPlan [data-dbday="D2026-11-09"]')) && /\bnone\b/.test(await cls('#dbPlan [data-dbdate="2026-11-12"]')),'Planning: weeks and week days as buttons (filled = plan open, dashed = no plan)');
    await p.click('#dbPlan [data-dbday="D2026-11-10"]'); ok(await p.$eval('#pDay',e=>e.value)==='D2026-11-10' && /\bon\b/.test(await cls('#dbPlan [data-dbday="D2026-11-10"]')),'Planning: pressing a day opens it');
    await p.click('#dbPlan [data-dbdate="2026-11-12"]'); ok(/Open the plan for Thu 12\.11\?/.test(await p.textContent('#modal')),'Planning: a day with no plan asks to confirm first'); await p.click('#modal [data-act=close]');
    await p.click('#dbPlan [data-dbday="D2026-11-09"]');
    await p.click('nav [data-tab=report]'); ok(await p.isVisible('#dbRep .rs-day.all.on') && await p.$eval('#rDay',e=>e.classList.contains('sr-only')),'Change report: the same day buttons, with “All days” (the drop-down list is gone)');
    await p.click('#dbRep [data-dbday="D2026-11-10"]'); await p.waitForTimeout(200); ok(/Tue 10\.11/.test(await p.textContent('#rSub')) && await p.$eval('#rDay',e=>e.value)==='D2026-11-10','Change report: pressing a day filters the report to it'); await p.click('#dbRep [data-dball]'); ok(!/Tue 10\.11/.test(await p.textContent('#rSub')),'Change report: All days');
    await p.click('nav [data-tab=print]'); ok(await p.isVisible('#dbPrint .rs-wk.on') && await p.$eval('#jpDay',e=>e.classList.contains('sr-only')),'Printing: the same day buttons (no drop-down list)');
    await p.click('#dbPrint [data-dbday="D2026-11-10"]'); await p.waitForTimeout(300); ok(await p.$eval('#jpDay',e=>e.value)==='D2026-11-10','Printing: pressing a day selects it'); await p.click('#dbPrint [data-dbday="D2026-11-09"]'); }
  // the table is saved with the plan and survives a reload
  await p.reload(); ok(await enter(p,'Alex'),'back in after a reload');
  await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]'); ok((await p.textContent('#rsGrid')).includes('Check tyres') && (await heads()).includes('Start time'),'table, comments and own columns kept');

  // weeks and days are buttons: filled = a plan is open, dashed = no plan yet (opening one asks first)
  { await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday="D2026-11-09"]');
    ok(!(await p.$('#rsDay')) && await p.isVisible('#rsDays .rs-wk.on') && /Week 46/.test(await p.textContent('#rsDays .rs-wk.on')),'the day list is gone: weeks are buttons');
    const cls=async sel=>p.$eval(sel,e=>e.className);
    ok(/\bhas\b/.test(await cls('#rsDays [data-rsday="D2026-11-09"]')) && /\bon\b/.test(await cls('#rsDays [data-rsday="D2026-11-09"]')) && /\bhas\b/.test(await cls('#rsDays [data-rsday="D2026-11-10"]')) && /\bnone\b/.test(await cls('#rsDays [data-rsdate="2026-11-12"]')),'week days are buttons: a different colour for days with a plan open and days without');
    await p.click('#rsDays [data-rsdate="2026-11-12"]'); ok(/Open the plan for Thu 12\.11\?/.test(await p.textContent('#modal')),'pressing a day with no plan asks the user to confirm opening it');
    await p.click('#modal [data-act=close]'); ok(!(await p.$('#rsDays [data-rsday="D2026-11-12"]')),'cancel: nothing is opened');
    await p.click('#rsDays [data-rsdate="2026-11-12"]'); await p.click('#modal [data-act=ok]'); await p.waitForTimeout(300);
    ok(await p.$eval('#rsDays .rs-day.on',e=>e.dataset.rsday)==='D2026-11-12' && (await p.$$eval('#rsGrid tbody tr td.empty',x=>x.length))===1,'confirmed: the day is open (no routes yet) and its button is filled');
    await p.click('#rsDays [data-rsday="D2026-11-09"]'); }
  // columns: resize by dragging the edge; move a column or a row by pressing its heading and dragging
  { const th=await p.$('#rsGrid thead th[data-k=driver]'); const w0=(await th.boundingBox()).width; const rz=await (await p.$('#rsGrid thead th[data-k=driver] .rs-rz')).boundingBox();
    await p.mouse.move(rz.x+rz.width/2,rz.y+rz.height/2); await p.mouse.down(); await p.mouse.move(rz.x+rz.width/2+70,rz.y+rz.height/2,{steps:6}); await p.mouse.up();
    const w1=(await (await p.$('#rsGrid thead th[data-k=driver]')).boundingBox()).width; ok(w1>w0+50,`a column is resized by dragging its edge (${Math.round(w0)} → ${Math.round(w1)} px)`);
    await p.reload(); ok(await enter(p,'Alex'),'back in'); await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]');
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
  // a late-call order is inserted on one route in Planning and then moved to another route
  await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll');
  await p.click('#insBtn'); await p.waitForTimeout(150); await p.fill('#iOrd','5699001'); await p.fill('#iShip','91000003'); await p.dispatchEvent('#iShip','input');
  if(!(await p.inputValue('#iBay'))) await p.selectOption('#iBay',{index:1}); await p.fill('#iW','120'); await p.click('#iDock [data-dkv=PW]'); await p.click('#iOk'); await p.waitForTimeout(300);
  const insK=await p.$eval('.drop:has-text("5699001")',e=>e.dataset.k); const insLoad=await p.$eval(`.drop[data-k="${insK}"]`,e=>e.closest('.route').dataset.r);
  await p.click(`.drop[data-k="${insK}"] [data-act=move]`); const to2=await p.$eval('#mTo',(s,id)=>[...s.options].find(o=>o.value&&!o.disabled&&o.value!==id).value,insLoad); await p.selectOption('#mTo',to2); await p.click('#mOk'); await p.waitForTimeout(300);
  const insTo=await p.$eval('.route:has(.drop:has-text("5699001")) .title',e=>e.textContent.trim().replace(/\s+Load .*$/,'').replace(/ new route$/,''));
  list.push({load:insLoad,order:'5699001',name:'DEMO INSERTED BAR',date:'09/11/2026'});
  const pdf=path.join(TMP,'checks_mon.pdf'); fs.writeFileSync(pdf, await checkSheetPdf(list,{blankAfter:[0]}));
  // move one Monday order to another route in Planning
  const k=await p.$eval('.route:not(.deferred) .drop:not(.dh)',e=>e.dataset.k); await p.click(`.drop[data-k="${k}"] [data-act=move]`);
  const to=await p.$eval('#mTo',s=>[...s.options].find(o=>o.value&&!o.disabled).value); await p.selectOption('#mTo',to); await p.click('#mOk'); await p.waitForTimeout(300);
  await p.click('nav [data-tab=print]'); await p.selectOption('#jpDay','D2026-11-09');
  await p.setInputFiles('#jpFile',pdf); await p.waitForSelector('#jpExport:not([disabled])',{timeout:60000});
  const tiles=(await p.textContent('#jpTiles')).replace(/\s+/g,' ');
  ok(tiles.includes(`Orders${list.length}`),'every order page identified ('+list.length+' orders): '+tiles);
  ok(/Blank discarded\s*1/.test(tiles),'signature-only page discarded');
  ok(/Reallocations\s*\d+ \/ \d+/.test(tiles) && (await p.$$eval('#jpRea tbody tr',x=>x.length))>=2 && !/Moved in Planning|Deferred in from/.test(await p.textContent("#jpRea")),'the moves made in Planning are reallocations, shown with only: order, customer / ship to, from, to');
  { const rea=(await p.textContent('#jpRea')).replace(/\s+/g,' '); ok(rea.includes('5699001') && rea.includes(insTo),'an inserted order that was moved is a reallocation too ('+insTo+')'); }
  ok(!/bad/.test(await p.$$eval('#jpRea tr',x=>x.map(t=>t.className).join(' '))),'every reallocation found in the PDF');
  await p.click('#jpExport'); await p.waitForSelector('#jpSelBar:not([hidden])',{timeout:90000});
  ok(await p.$$eval('#jpChecks li',x=>x.length>0 && x.every(li=>!li.classList.contains('fail'))),'organised PDF passes every integrity check');
  { const names=await p.$$eval('#jpRoutes .jp-route .jp-rname',x=>x.map(e=>e.textContent.replace(/^[^]*?(BAY|CITY|DEFERRED|UNASSIGNED)/,'$1').trim())); ok(names[names.length-1]==='UNASSIGNED' && names[0]==='BAY 01','routes in plan order, UNASSIGNED last: '+names.join(' | ')); }
  // balloons: Reallocations / To check filter the orders in the routes list
  { await p.click('#jpExpand'); const all=await p.$$eval('#jpRoutes tbody tr',x=>x.length); const rea=await p.evaluate(()=>__rpPrint.state.rea.map(r=>String(r.order)));
    await p.click('#jpTiles .jp-tile:has-text("Reallocations")'); const shown=await p.$$eval('#jpRoutes tbody tr td:nth-child(2)',x=>x.map(e=>e.textContent.trim()));
    ok(shown.length>0 && shown.length<all && shown.every(o=>rea.includes(o)) && /Showing only reallocated orders/.test(await p.textContent('#jpRoutes')),`balloon Reallocations shows only the reallocated orders (${shown.length} of ${all})`);
    await p.click('#jpTiles .jp-tile:has-text("To check")'); ok(/Showing only orders to check/.test(await p.textContent('#jpRoutes')),'balloon To check filters to the orders to check');
    await p.click('#jpTiles .jp-tile:has-text("To check")'); ok(await p.$$eval('#jpRoutes tbody tr',x=>x.length)===all && !/Showing only/.test(await p.textContent('#jpRoutes')),'clicking the balloon again shows every order'); await p.click('#jpExpand'); }
  // layout: the four steps on the left; Routes and Organised PDF merged on the right
  ok((await p.$$eval('#jpRea th',x=>x.map(e=>e.textContent.trim()))).join('|')==='Order|Customer · Ship To|From|To','Reallocations: only the columns Order, Customer · Ship To, From, To');
  ok(await p.evaluate(()=>{ const w=document.querySelector('.jp-setup').getBoundingClientRect().width; return w>=370 && [...document.querySelectorAll('.jp-tbl')].every(t=>t.scrollWidth<=t.clientWidth+1); }),'the left side bar is 10% wider and no list needs a sideways scroll');
  ok((await p.$$eval('.jp-setup h2',x=>x.map(e=>e.textContent.replace(/\s+/g,' ').trim().replace(/ (Edit in Resources|Planning)$/,'')))).join('|')==='1Import PDF|2Resources|3Reallocations|4Organise','steps 1–4 on the left: Import PDF, Resources, Reallocations, Organise');
  ok(await p.evaluate(()=>{ const s=document.querySelector('.jp-setup').getBoundingClientRect(), m=document.getElementById('jpOutput'); const mr=m.getBoundingClientRect(); const hs=[...document.querySelectorAll('#tab-print h2')].map(h=>h.textContent.trim());
    return s.right<=mr.left+1 && m.contains(document.getElementById('jpRoutes')) && m.contains(document.getElementById('jpOutPages')) && !hs.includes('Organised PDF') && !hs.includes('Routes'); }),'one merged section on the right (Routes and Organised PDF are not duplicated)');
  ok((await p.$$eval('#jpRoutes .jp-rhead.hd span',x=>x.map(e=>e.textContent.trim()).filter(Boolean))).join('|')==='Bay|Driver|Helper|Drops|Orders|Shipments attached','headings: Bay, Driver, Helper, Drops, Orders, Shipments attached');
  // selecting a bay opens its orders; the right side previews the organised pages
  await p.click('#jpRoutes .jp-route:nth-child(2) .jp-rhead');
  ok((await p.$$eval('#jpRoutes .jp-route.open th',x=>x.map(e=>e.textContent.trim()))).join('|')==='|Order Number|Customer Name|Ship To|Shipment|Note|' && await p.$$eval('#jpRoutes .jp-route.open tbody tr',x=>x.length>0 && x.every(r=>r.querySelector('input[type=checkbox]') && r.querySelector('button'))),'route details: tick box, order number, customer, ship to, shipment, note, view');
  ok(await p.$$eval('#jpOutPages figure',x=>x.length)>2 && (await p.textContent('#jpOutTitle')).length>0,'the organised pages of the selected route are previewed on the right');
  { const n=await p.$$eval('#jpOutPages figure',x=>x.length); await p.click('#jpOutPages figure >> nth=1'); await p.waitForSelector('#jpViewerBody figure'); ok(await p.$$eval('#jpViewerBody figure',x=>x.length)===n,`click to enlarge shows every page of the route, in order (${n} pages)`); await p.click('#jpViewerClose'); }
  // Ship To in the routes list + search (order, customer, ship to, loading, bay)
  await p.click('#jpExpand'); await p.click('#jpExpand'); if(!(await p.$$eval('#jpRoutes .jp-route.open',x=>x.length>3))) await p.click('#jpExpand');
  ok(/9100\d{4}/.test(await p.textContent('#jpRoutes')),'the routes list shows the ship to code of each customer');
  const nAll=await p.$$eval('#jpRoutes .jp-route',x=>x.length); const someShip=(await p.$$eval('#jpRoutes tbody tr',x=>x.map(r=>r.children[3].textContent)))[0];
  const search=async q=>{ await p.fill('#jpSearch',q); return p.$$eval('#jpRoutes .jp-route',x=>x.length); };
  ok(await search(list[0].order)===1,'search by order number'); ok(await search(someShip)>=1,'search by ship to'); ok(await search(list[1].name.slice(0,6))>=1,'search by customer name');
  ok(await search(list[0].load)>=1,'search by loading (shipment) number'); ok(await search('BAY 02')>=1,'search by bay'); ok(await search('zzzzz')===0 && await search('')===nAll,'no match shows nothing; clearing the search shows every route');
  ok(await search('5699001')===1 && (await p.textContent('#jpRoutes .jp-route .jp-rname')).includes(insTo),'the inserted and moved order is printed under the route it was moved to'); await search('');
  // choose what to print
  await p.evaluate(()=>{ const o=JDEPrint.exporter.extractPages; window.__cap=null; JDEPrint.exporter.extractPages=async(parts,t)=>{ window.__cap=parts[0].pageIndices.slice(); return o(parts,t); }; });
  const total=await p.evaluate(()=>__rpPrint.state.result.manifest.length);
  const sel=async()=>p.evaluate(()=>__rpPrint.selPages().length);
  ok(await p.isChecked('#jpSelAll') && await sel()===total && /Print Selected/.test(await p.textContent('#jpPrintSel')),'Select all is ticked: every route and order is selected');
  const r1=await p.evaluate(()=>__rpPrint.state.result.routes.map(r=>({n:r.name,p:r.pages.length})));
  await p.click('#jpRoutes .jp-route:nth-child(2) .jp-rhead input'); ok(await sel()===total-r1[0].p && !(await p.isChecked('#jpSelAll')),'unticking a route leaves it out ('+r1[0].n+') and clears Select all');
  const before2=await sel(); const pagesOfOrder=await p.evaluate(()=>{ const m=__rpPrint.state.result.manifest, r=__rpPrint.state.result.routes[1].name; const k=m.find(x=>x.route===r&&x.type==='page'); return m.filter(x=>x.orderKey===k.orderKey).length; });
  await p.click('#jpRoutes .jp-route:nth-child(3) tbody tr:nth-child(1) input'); ok(await sel()===before2-pagesOfOrder,'unticking a single order leaves only its pages out'); await p.click('#jpRoutes .jp-route:nth-child(3) tbody tr:nth-child(1) input');
  await p.click('#jpPrintSel'); await p.waitForFunction(()=>window.__cap!==null,null,{timeout:20000}); ok(await p.evaluate(()=>window.__cap.length)===total-r1[0].p,'Print Selected prints only the ticked routes and orders ('+(total-r1[0].p)+' of '+total+' pages)');
  await p.click('#jpSelAll'); ok(await sel()===total,'Select all brings everything back');
  // reprint one order
  await p.click('[data-jpmode=reprint]'); await p.fill('#jpQuery','5699999'); await p.waitForSelector('#jpRpPreview:not([hidden])');
  const [rp]=await Promise.all([p.waitForEvent('download'), p.click('#jpRpDownload')]); ok(rp.suggestedFilename()==='Reprint_5699999.pdf','Reprint: one order, original pages only');
  // ---------- NEW DAY: fixed routes are only a reference; routes come from Resources ----------
  { await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll');
    await p.click('#newDayBtn'); await p.click('#ndCal [data-d="2026-11-16"]'); ok((await p.textContent('#ndInfo')).includes('no routes planned yet'),'new day: “no routes planned yet”, fixed routes only a reference'); await p.click('#ndOk'); await p.waitForTimeout(300);
    ok(await p.$$eval('#pRoutes .route',x=>x.length)===0,'the new day has no routes (not built from the fixed routes)');
    await p.selectOption('#pDay','D2026-11-09'); await p.click('#expAll'); const dk=await p.$eval('.route:not(.deferred) .drop:not(.dh)',e=>e.dataset.k);
    await p.click(`.drop[data-k="${dk}"] [data-act=defer]`); await p.waitForSelector('#dCal'); await p.click('#dCal [data-d="2026-11-16"]');
    ok(await p.$$eval('#dBay option',o=>o.some(x=>x.value==='FX-BAY 07')),'deferring to a day without routes offers the fixed bay as a reference'); await p.selectOption('#dBay','FX-BAY 07'); await p.click('#dOk'); await p.waitForTimeout(300);
    await p.selectOption('#pDay','D2026-11-16'); await p.click('#expAll'); const w=await p.textContent('#pRoutes');
    ok(/not assigned · wanted BAY 07/.test(w) && await p.$$eval('#pRoutes .route:not(.deferred)',x=>x.length)===0,'planning that day: no bay BAY 07 → warning “not assigned”');
    await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-16\"]'); await p.click('[data-rs=addrow]'); await p.click(cell(0,0)); await clip.paste('74699777\tBAY 07'); await p.waitForTimeout(300);
    await p.click('nav [data-tab=plan]'); await p.selectOption('#pDay','D2026-11-16'); await p.click('#expAll'); const w2=await p.textContent('#pRoutes');
    ok(!/not assigned/.test(w2) && /BAY 07/.test(w2) && await p.$$eval('#pRoutes .route:not(.deferred)',x=>x.length)===1,'once Resources give the day a BAY 07, the deferred order is on it'); }
  // the day of a PDF is its DELIVERY date: this one was ordered on Monday 09.11 but is delivered on Tuesday 10.11
  { const od=path.join(TMP,'order_vs_delivery.pdf'); fs.writeFileSync(od, await checkSheetPdf([{load:String(tue[0][0]),order:'5688001',name:'ORDER DATE TEST BAR',date:'10/11/2026',orderDate:'09/11/2026'}],{}));
    await p.click('nav [data-tab=print]'); await p.selectOption('#jpDay','D2026-11-09'); await p.setInputFiles('#jpFile',od); await p.waitForFunction(()=>document.getElementById('jpDay').value==='D2026-11-10',null,{timeout:30000});
    ok(true,'a PDF ordered on Mon 09.11 and delivered on Tue 10.11 sets the day to Tue 10.11: the delivery date is used, not the order date');
    // two PDFs of two days: each day uses only its own PDF (the other day's shipments are not "unassigned")
    { const fl=async()=>p.$$eval('#jpFiles li',x=>x.length); ok(await fl()===2,'both PDFs are imported (Mon 09.11 and Tue 10.11)');
      const tueRoutes=await p.$$eval('#jpRoutes .jp-route .jp-rname',x=>x.map(e=>e.textContent)); ok(!tueRoutes.some(n=>/UNASSIGNED|Not in Resources/i.test(n)) && tueRoutes.length===1,'Tuesday: only its own PDF is planned, the Monday shipments are not shown as unassigned ('+tueRoutes.map(x=>x.replace(/\s+/g,' ')).join(' | ')+')');
      ok(/Another day/.test(await p.textContent('#jpFiles')),'the PDF of the other day is marked “Another day — not used for the selected day”');
      await p.selectOption('#jpDay','D2026-11-09'); await p.waitForTimeout(500);
      ok(!/5688001/.test(await p.textContent('#jpRoutes')) && /Orders\s*\d+/.test((await p.textContent('#jpTiles')).replace(/\s+/g,' ')),'Monday: the Tuesday PDF is left out');
      // duplicates are blocked: the same file, or a second PDF of the same day
      await p.setInputFiles('#jpFile',od); await p.waitForTimeout(1500); ok(await fl()===2 && /already imported/.test(await p.textContent('#toast')),'the same PDF cannot be imported twice');
      const od2=path.join(TMP,'tue_again.pdf'); fs.writeFileSync(od2, await checkSheetPdf([{load:String(tue[0][0]),order:'5688002',name:'SECOND TUESDAY BAR',date:'10/11/2026',orderDate:'09/11/2026'}],{}));
      await p.setInputFiles('#jpFile',od2); await p.waitForTimeout(1500); ok(await fl()===2 && /PDF for Tue 10\.11 is already imported/.test(await p.textContent('#toast')),'a second PDF of the same day is blocked'); }
    // Reprint: the loadings, grouped by the day they were loaded
    { await p.click('[data-jpmode=reprint]'); const days=await p.$$eval('#jpRpLoads .jp-lday',x=>x.map(e=>e.textContent.trim()));
      ok(days.join('|')==='Mon 09.11|Tue 10.11','Reprint lists the loadings grouped by day: '+days.join(', '));
      const first=await p.$('#jpRpLoads .jp-lgrp:first-child .jp-lchip'); const label=(await first.textContent()).replace(/\s+/g,' '); await first.click();
      ok(await p.$$eval('#jpRpList li',x=>x.length)>0 && /Loading \d+/.test(await p.textContent('#jpRpCount')),'clicking a loading lists its orders ('+label+')'); await p.click('[data-jpmode=organise]'); } }
  // an order deferred from Mon to Tue: its check sheet is in the Monday PDF; Tuesday's Printing must find it there
  { await p.click('nav [data-tab=plan]'); await p.click('#dbPlan [data-dbday="D2026-11-09"]'); await p.click('#expAll');
    const dk=await p.$eval('.route:not(.deferred) .drop:not(.dh)',e=>e.dataset.k); const ord=(await p.$eval(`.drop[data-k="${dk}"] .c-ord`,e=>e.textContent)).split(',')[0].trim();
    await p.click(`.drop[data-k="${dk}"] [data-act=defer]`); await p.waitForSelector('#dCal'); await p.click('#dCal [data-d="2026-11-10"]'); await p.selectOption('#dBay',{index:1}); await p.click('#dOk'); await p.waitForTimeout(300);
    await p.click('nav [data-tab=print]'); await p.click('#dbPrint [data-dbday="D2026-11-10"]'); await p.waitForTimeout(800);
    ok((await p.textContent('#jpRea')).includes(ord) && !(await p.$('#jpRea tr.bad')) && !(await p.$('#jpRea tr.inf')),'Tuesday: the order deferred from Monday is a reallocation found in the PDF of its original day ('+ord+')');
    ok(!/not in any imported PDF|is not in the PDF/.test(await p.textContent('#jpIssuesCard')) && /Reallocations\s*(\d+) \/ \1(?!\d)/.test((await p.textContent('#jpTiles')).replace(/\s+/g,' ')),'… and nothing is flagged: all reallocations are applied');
    await p.fill('#jpSearch',ord); ok((await p.$$eval('#jpRoutes .jp-route',x=>x.length))===1,'… it is printed under its Tuesday route'); await p.fill('#jpSearch','');
    ok(await p.evaluate(()=>{ const t=document.querySelector('#jpRea .jp-tbl'); const c=[...document.querySelectorAll('#jpRea tbody tr:first-child td')]; const ws=i=>getComputedStyle(c[i]).whiteSpace; return ws(0)==='nowrap' && ws(2)==='nowrap' && ws(3)==='nowrap' && ws(1)==='normal' && t.scrollWidth<=t.clientWidth+1; }),'Reallocations: Order, From and To never wrap (the customer may), and the left bar is wide enough');
    // the original day's PDF is not imported (any more): only then is it flagged, as a warning
    const idx=await p.$$eval('#jpFiles li',x=>x.findIndex(li=>/Mon 09\.11/.test(li.textContent))); await p.click(`#jpFiles li:nth-child(${idx+1}) .remove`); await p.waitForTimeout(800);
    ok(/not in any imported PDF/.test(await p.textContent('#jpIssues')) && (await p.$$eval('#jpIssues .jp-badge',x=>x.map(e=>e.className).join(' '))).includes('warning'),'if no imported PDF has the order, it is flagged as a warning'); }
  // a Viewer can print but not edit resources
  await p.click('#userBtn'); await p.click('#modal [data-act=switch]'); ok(await enter(p,'Warehouse'),'Warehouse (Viewer) is in');
  await p.click('nav [data-tab=res]'); await p.click('#rsDays [data-rsday=\"D2026-11-09\"]'); const before=await txt(0,2);
  await p.click(cell(0,2)); await p.keyboard.type('Nope'); await p.keyboard.press('Enter');
  ok(await txt(0,2)===before && !(await p.isVisible('[data-rs=addrow]')) && !(await p.isVisible('[data-rs=newday]')),'Viewer: resources are view only');
  ok(await p.isVisible('nav [data-tab=print]'),'Viewer: Check Sheet Print available');
  // ---------- START: the first window asks for access to the company folder, with a Reset button ----------
  { const c3=await demoContext(b,DEMO); const q=await c3.newPage(); await q.goto('file://'+APP); await q.waitForSelector('#modal [data-act=link]');
    ok(/Allow access to the company folder/.test(await q.textContent('#modal')) && await q.isVisible('#modal [data-act=reset]'),'first start without a folder: access window with a Reset button');
    await q.evaluate(()=>{ localStorage.setItem('routePlannerBeta.old','x'); localStorage.setItem('routePlannerBeta.usersConfig','{}'); localStorage.setItem('routePlannerBeta.v082.customers','{}'); sessionStorage.setItem('rp.user','x'); localStorage.setItem('routePlannerBeta.v082.prefs',JSON.stringify({theme:'dark',name:'Someone'})); }); await q.reload(); await q.waitForSelector('#modal [data-act=link]');
    await q.evaluate(async()=>{ __rpGate.setRoot(await window.showDirectoryPicker()); __rpGate.home(); });
    await q.waitForSelector('#modal [data-act=allow]'); ok(/Allow access to “Route_planning”/.test(await q.textContent('#modal')) && await q.isVisible('#modal [data-act=reset]'),'a remembered folder is the first window too: “Allow access to Route_planning”, with Reset');
    await q.click('#modal [data-act=reset]'); ok(/Click again/.test(await q.textContent('#modal [data-act=reset]')),'Reset asks for a second click');
    await Promise.all([q.waitForEvent('load'),q.click('#modal [data-act=reset]')]); await q.waitForSelector('#modal [data-act=link]');
    ok(await q.evaluate(()=>localStorage.getItem('routePlannerBeta.old')===null && localStorage.getItem('routePlannerBeta.usersConfig')===null && localStorage.getItem('routePlannerBeta.v082.customers')===null && sessionStorage.getItem('rp.user')===null && !!localStorage.getItem('routePlannerDevice') && JSON.parse(localStorage.getItem('routePlannerBeta.v082.prefs')||'{}').theme==='dark' && !JSON.parse(localStorage.getItem('routePlannerBeta.v082.prefs')||'{}').name),'Reset at start clears all the browser\'s saved data (plan, customers, users list, session) and keeps only the theme and the computer id');
    await q.evaluate(async()=>{ __rpGate.setRoot(await window.showDirectoryPicker()); __rpGate.home(); }); await q.waitForSelector('#modal [data-act=allow]'); await q.click('#modal [data-act=allow]'); await q.waitForSelector('[data-act="u:Alex"]');
    ok(true,'Allow access goes on to “Who is planning?”'); await c3.close(); }
  // ---------- START WORKFLOW: after the master data window, load a saved plan or start a new week ----------
  { const c5=await demoContext(b,DEMO); const q=await c5.newPage(); const e5=[]; q.on('pageerror',e=>e5.push(e.message)); await q.goto('file://'+APP); ok(await enter(q,'Alex',{keepStart:true}),'Alex is at the start window');
    ok(/Load a saved plan/.test(await q.textContent('#modal')) && /New Plan/.test(await q.textContent('#modal')),'start window: Load a saved plan / New Plan');
    await q.click('#modal [data-act=sload]'); await q.waitForFunction(()=>/Saved plans/.test(document.getElementById('modal').textContent)); ok(/PLANS/.test(await q.textContent('#modal')) && /Saved plans/.test(await q.textContent('#modal')),'Load a saved plan shows the window of saved plans'); await q.click('#modal [data-act=close]');
    await q.evaluate(()=>{ document.getElementById('scrim').classList.remove('on'); });
    await q.close(); await c5.close();
    // v0.12.5: New Plan → the reports window (Go back returns), then the planner opens with no day open; the Home page lets the user pick the day
    const c6=await demoContext(b,DEMO); const r=await c6.newPage(); await r.goto('file://'+APP); await enter(r,'Alex',{keepStart:true});
    ok(/Go back/.test(await r.textContent('#modal [data-act=sback]')),'the start window has a Go back button');
    await r.click('#modal [data-act=snew]'); await r.waitForSelector('#modal [data-act=dgo]'); ok(/Master data/.test(await r.textContent('#modal')) && /Reports/.test(await r.textContent('#modal')) && await r.$('#modal [data-act=dback]'),'New Plan opens the reports loaded window (with Go back)');
    await r.click('#modal [data-act=dback]'); await r.waitForSelector('#modal [data-act=snew]'); ok(true,'Go back returns to “What are you planning?”');
    await r.click('#modal [data-act=snew]'); await r.waitForSelector('#modal [data-act=dgo]'); await r.click('#modal [data-act=dgo]');
    ok((await r.$$eval('#pDay option',o=>o.filter(x=>x.value).length))===0 && await r.evaluate(()=>document.getElementById('tab-home').classList.contains('on')) && await r.$$eval('.hball:not(.none)',x=>x.length)===0,'the planner opens on Home with no planning day open (the user picks the day)'); ok(!e5.length,'no script errors (start workflow)'); await c6.close(); }
  // ---------- UPLOAD: a planning sheet (Fri) and a resources sheet (Wed) in one go ----------
  { const c7=await demoContext(b,DEMO); const r=await c7.newPage(); const e7=[]; r.on('pageerror',e=>e7.push(e.message)); await r.goto('file://'+APP); await enter(r,'Alex');
    const wedDriver=XLSX.utils.sheet_to_json(XLSX.readFile(path.join(DEMO,'REPORTS','week_46','RES_Wed.xlsx')).Sheets.Sheet1,{header:1})[1][2];
    await r.click('nav [data-tab=plan]'); await r.click('#uploadBtn'); await r.waitForSelector('input[name=fb]'); await r.check('input[value="REPORTS/week_46/DIPS_Plan_Fri.xlsx"]'); await r.check('input[value="REPORTS/week_46/RES_Wed.xlsx"]'); await r.click('#fbOk'); await r.waitForSelector('[data-act=add]');
    ok(/no RESOURCES file for this day/.test(await r.textContent('#modal')) && !/used it anyway/.test(await r.textContent('#modal')),'a RESOURCES sheet of another day is not used for the planning day');
    await r.click('[data-act=add]'); await r.waitForTimeout(500);
    const opts=await r.$$eval('#pDay option',o=>o.map(x=>x.textContent.replace(/\s+/g,' ').trim())); ok(opts.some(x=>/Fri 13\.11/.test(x)) && opts.some(x=>/Wed 11\.11/.test(x)),'two days: Fri 13.11 (planning) and Wed 11.11 (resources only): '+opts.join(' | '));
    await r.click('#dbPlan [data-dbday="D2026-11-13"]'); await r.click('#expAll'); const fri=await r.textContent('#pRoutes'); ok(await r.$$eval('#pRoutes .drop:not(.dh)',x=>x.length)>0 && !fri.includes(wedDriver) && /ROUTE/.test(fri),'Fri has the orders of the planning sheet and does not take the Wednesday crews (it shows route codes)');
    await r.click('#dbPlan [data-dbday="D2026-11-11"]'); await r.click('#expAll'); ok(await r.$$eval('#pRoutes .drop:not(.dh)',x=>x.length)===0 && (await r.textContent('#pRoutes')).includes(wedDriver),'Wed has only the routes of the resources sheet (no orders)');
    await r.click('nav [data-tab=res]'); await r.click('#rsDays [data-rsday="D2026-11-11"]'); ok((await r.textContent('#rsGrid')).includes(wedDriver),'the resources sheet feeds the Resources tab of its own day'); ok(!e7.length,'no script errors (upload test)'); await c7.close(); }
  // ---------- UPLIFTS (v0.12.0): the outstanding report, automatic and manual plan, map, Uplift Control, Printing, Change report — and the HOME page ----------
  { const c8=await demoContext(b,DEMO); const r=await c8.newPage(); const e8=[]; r.on('pageerror',e=>e8.push(e.message)); await r.goto('file://'+APP); ok(await enter(r,'Alex'),'Alex is in (uplifts)'); await r.clock.setFixedTime(new Date('2026-11-11T07:30:00'));   // “today” = Wed 11.11 (only matches today or later are flagged)
    ok(await r.evaluate(()=>document.getElementById('tab-home').classList.contains('on')) && (await r.$$eval('header nav button',x=>x.map(b=>b.dataset.tab))).join()==='home,plan,res,report,print,options','the planner opens on the Home page, the first tab');
    await r.click('#reportsBtn'); await r.waitForSelector('input[name=fb]');
    ok(!(await r.isDisabled('input[value="REPORTS/week_46/UPLIFTS_Mon_AM.xlsx"]')) && !(await r.isDisabled('input[value="REPORTS/week_46/PROD_Mon.xlsx"]')) && await r.isDisabled('input[value="REPORTS/week_46/POD_Mon.xlsx"]'),'Reports: Uplifts and Products can be imported (POD is still blocked)');
    for(const wd of ['Mon','Tue','Wed','Thu','Fri']) for(const k of ['DIPS_Plan','RES','PROD']) await r.check(`input[value="REPORTS/week_46/${k}_${wd}.xlsx"]`);
    for(const f of ['Mon_AM','Mon_PM','Tue_AM','Tue_PM','Wed_AM']) await r.check(`input[value="REPORTS/week_46/UPLIFTS_${f}.xlsx"]`);
    await r.click('#fbOk'); await r.waitForSelector('[data-act=add]'); ok(/Uplifts outstanding:[\s\S]*UPLIFTS_Wed_AM\.xlsx › CU_Rep \(Wed 11\.11 07:30\): 6 orders from 6 lines · 1 line without an order number left out/.test((await r.textContent('#modal')).replace(/\s+/g,' ')),'the CU report (CU_Rep layout) is recognised; its time is the moment of the upload (the page clock, Wed 07:30); the totals row is left out');
    await r.click('[data-act=add]'); await r.waitForTimeout(800);
    const st=await r.evaluate(()=>{ const s=__rpUpl.state(), pl=__rpUpl.plan(); const it=Object.values(s.items); return {n:it.length, open:it.filter(u=>!u.closed).map(u=>u.no), done:it.filter(u=>u.closed).length, pl, reps:s.reports.length}; });
    { const chk=await r.evaluate(()=>{ const it=Object.values(__rpUpl.state().items); const multi=it.filter(u=>u.lines.length>1);
        return {nums:it.every(u=>/^77\d{5}$/.test(u.no)), multi:multi.length, sums:it.every(u=>Math.abs(u.value-u.lines.reduce((t,l)=>t+(l.amount||0),0))<0.005), low:multi.every(u=>u.status===560), ok540:it.some(u=>u.status===540)}; });
      ok(chk.nums && chk.multi>0 && chk.sums && chk.low && chk.ok540,'one uplift per order: lines summed (Extended Amount), lowest Next Status, no uplift made from the totals row ('+chk.multi+' orders with several lines)'); }
    ok(st.reps===5 && st.open.length===6 && st.done===8,`5 reports loaded: 6 outstanding (the Wed 08:00 report), 8 completed (not in a later report) — ${st.open.length} / ${st.done}`);
    { const pr=await r.evaluate(()=>__rpUpl.prop()); ok(!Object.keys(st.pl).length && st.open.every(no=>pr[no] && pr[no].date==='2026-11-11' && pr[no].load),'each outstanding uplift matches its customer\'s Wednesday delivery — a match to confirm, not planned yet'); }
    // PLANNING › UPLIFT CONTROL (sub heading of Planning): summary, planned days (confirm), history
    await r.click('nav [data-tab=plan]'); ok((await r.$$eval('#subnav button',x=>x.map(b=>b.textContent.trim()))).join('|')==='Planning|Uplift Control','Planning has a sub heading: Planning | Uplift Control');
    await r.click('.subnav [data-tab=upl]'); ok(await r.$eval('nav [data-tab=plan]',e=>e.classList.contains('on')),'Uplift Control is a sub heading of Planning (the parent stays highlighted)');
    ok((await r.$$eval('table[data-tbl=upl] thead th',x=>x.map(e=>e.textContent.trim()).filter(Boolean))).join('|')==='Uplift Order|Customer Name|Status|Value|Route|Day Planned|Attempt|First seen|Last seen|Comments','Uplift summary columns: Uplift Order, Customer Name, Status, Value, Route, Day Planned, First seen, Last seen, Comments (+ (i) and Allocate)');
    ok(await r.$$eval('table[data-tbl=upl] .ibtn svg.info-ic',x=>x.length)===6,'the history button is the (i) icon');
    ok((await r.$$eval('table[data-tbl=upl] > tbody > tr',x=>x.filter(t=>/Not Planned/.test(t.textContent)).length))===6 && !/confirm in Planned days|no delivery on the loaded days/.test(await r.textContent('table[data-tbl=upl]')) && await r.$$eval('table[data-tbl=upl] [data-uact=hist]',x=>x.length)===6 && await r.$$eval('table[data-tbl=upl] [data-uact=alloc]',x=>x.length)===6,'until confirmed, the summary just says “Not Planned” (no match message); each row has (i) and Allocate');
    { const t0=await r.$$eval('table[data-tbl=upl] .uc-lines',x=>x.length); await r.click('table[data-tbl=upl] [data-uctg] >> nth=0'); const lt=await r.textContent('table[data-tbl=upl] .uc-lines'); await r.click('table[data-tbl=upl] [data-uctg] >> nth=0');
      ok(t0===0 && /Ln Ty/.test(lt) && /CU/.test(lt) && await r.$$eval('table[data-tbl=upl] .uc-lines',x=>x.length)===0,'the › button under the order number opens its product lines; pressed again it closes them'); }
    await r.click('[data-ucv=days]'); await r.click('#dbUpl [data-dbwk="2026-11-09"]'); await r.click('#dbUpl [data-dbday="D2026-11-11"]');
    ok(await r.$$eval('table[data-tbl=upld] > tbody > tr',x=>x.length)===6 && /delivery: 5600/.test(await r.textContent('table[data-tbl=upld]')),'Planned days (same day buttons): Wednesday lists the deliveries with an uplift outstanding');
    await r.click('table[data-tbl=upld] [data-uctg] >> nth=0'); ok(await r.$$eval('table[data-tbl=upld] .uc-lines',x=>x.length)===1,'… with the same product lines toggle'); await r.click('table[data-tbl=upld] [data-uctg] >> nth=0');
    await r.click('#dbUpl [data-dbday="D2026-11-10"]'); ok(!(await r.$('table[data-tbl=upld] .flag.dup')),'a day before today has nothing “to confirm”'); await r.click('#dbUpl [data-dbday="D2026-11-11"]');
    await r.check('[data-ucs] >> nth=0'); await r.click('[data-uc=confsel]'); ok(Object.keys(await r.evaluate(()=>__rpUpl.plan())).length===1,'“Confirm selected” confirms one');
    await r.click('[data-uc=confall]'); const pl2=await r.evaluate(()=>__rpUpl.plan()); ok(Object.values(pl2).length===6 && Object.values(pl2).every(x=>x.date==='2026-11-11' && !x.manual),'“Confirm all”: every match is planned, status Auto');
    await r.click('[data-ucv=sum]'); ok((await r.$$eval('table[data-tbl=upl] tbody tr',x=>x.filter(t=>/Auto/.test(t.textContent) && !/Auto · /.test(t.textContent)).length))===6,'Day Planned shows the tag “Auto” (without the user name)');
    await r.click(`table[data-tbl=upl] [data-uact=hist][data-no="${st.open[0]}"]`); const hm=await r.textContent('#modal'); ok(/history/.test(hm) && /First seen in the report/.test(hm) && /Allocation confirmed \(auto\)/.test(hm) && /status 560/.test(hm),'(i) opens the history of the order: report snapshots and the confirmation');
    await r.fill('#uhNote','printed, keys at the bar'); await r.click('#modal [data-act=save]'); await r.waitForTimeout(200);
    ok(/printed, keys at the bar\s*Alex ·/.test(await r.textContent(`table[data-tbl=upl] tbody tr:has([data-no="${st.open[0]}"])`)),'Comments column: the last comment of the history, with who and when');
    await r.click(`table[data-tbl=upl] [data-uact=hist][data-no="${st.open[0]}"]`); ok(/Comment\s*note: printed, keys at the bar/.test(await r.textContent('#modal')),'… the comment is in the history'); await r.click('#modal [data-act=close]');
    ok(await r.evaluate(()=>Object.values(__rpUpl.state().items).filter(u=>u.closed).every(u=>u.closed.date && u.closed.route)),'completed uplifts keep the day and route they were planned on (records)');
    // HOME: balloons with the totals
    await r.click('nav [data-tab=home]'); const balls=await r.$$eval('.hball',x=>x.map(e=>({cls:e.className, t:e.textContent.replace(/\s+/g,' ')})));
    ok(balls.length===5 && balls.every(x=>!/none/.test(x.cls)),'Home: the five days of week 46 are balloons with a plan open');
    const wed=balls.find(x=>/Wed 11\.11/.test(x.t)).t; ok(['Bays','Drops','Orders','Kgs','Km','Pallets','Products','CS','EA','KEG','Uplifts'].every(w=>new RegExp(w,'i').test(wed)) && /Planned\s*6/.test(wed) && /CS\s*[\d,]+/.test(wed),'Home: each balloon shows bays, drops, orders, kgs, km, pallets, products (CS / EA / KEG) and uplifts — '+wed.slice(0,160));
    await r.click('[data-hwnav="1"]'); const nxt=await r.$$eval('.hball',x=>x.map(e=>e.className)); ok(nxt.length===5 && nxt.every(c=>/none/.test(c)) && await r.evaluate(()=>{ const a=getComputedStyle(document.querySelector('.hball.none')).backgroundColor; return a!=='rgb(255, 255, 255)'; }),'Home: days with no plan (week 47) are greyed out');
    await r.click('.hball.none >> nth=0'); ok(/Open the plan for Mon 16\.11/.test(await r.textContent('#modal')),'Home: clicking a day with no plan opens the window to create it'); await r.click('#modal [data-act=close]');
    await r.click('[data-hwnav="-1"]'); await r.click('[data-hday="D2026-11-11"]'); ok(await r.evaluate(()=>document.getElementById('tab-plan').classList.contains('on')) && /Wed 11\.11/.test(await r.textContent('#dbPlan .rs-day.on')),'Home: clicking a planned day opens it in Planning');
    // PLANNING: the UPLIFT column (red numbers) between Orders and Kg, triangles on the map, the Uplifts button
    await r.click('#expAll'); ok((await r.$$eval('.route:first-of-type .drop.dh span',x=>x.map(e=>e.textContent.trim()).filter(Boolean))).join('|').startsWith('Customer|Orders|Uplift|Kg'),'Planning: new column UPLIFT between ORDERS and KG');
    const nos=await r.$$eval('.drop .c-upl .upl-no',x=>x.map(e=>e.textContent)); ok(nos.length===6 && await r.$eval('.drop .c-upl .upl-no',e=>getComputedStyle(e).color==='rgb(209, 26, 42)'),'Planning: the uplift numbers are shown in red on their drops ('+nos.join(', ')+')');
    ok(await r.$$eval('.drop .c-ord, .drop .c-upl',x=>x.every(e=>e.innerHTML.split('<br>').every(l=>l.split(', ').length<=3))),'orders and uplifts of one customer: separated by “, ”, at most 3 per line');
    const mk=await r.evaluate(()=>__rpUpl.markers()); ok(mk.length>=5 && await r.$$eval('.upl-ic polygon',x=>x.length)===mk.length,'Map: the outstanding uplifts are triangles ('+mk.length+')');
    ok(await r.evaluate(()=>{ const u=document.getElementById('uplBtn'), c=document.getElementById('pBays'); return u.getBoundingClientRect().top>=c.getBoundingClientRect().bottom-1 && getComputedStyle(u).backgroundColor==='rgb(75, 85, 99)'; }),'Show on map: the Uplifts button is below the bay buttons, dark grey in the light theme');
    ok(/Uplifts \(6\)/.test(await r.textContent('#uplBtn')) && /Planned CU \(6\)/.test(await r.textContent('#uplPlBtn')),'two buttons: Uplifts (6 outstanding) and Planned CU (6 allocated to Wednesday)');
    { const nU=[]; for(const d of ['D2026-11-09','D2026-11-13']){ await r.click(`#dbPlan [data-dbday="${d}"]`); nU.push([await r.textContent('#uplBtn'), await r.textContent('#uplPlBtn')]); } await r.click('#dbPlan [data-dbday="D2026-11-11"]'); await r.click('#expAll');
      ok(nU.every(x=>/Uplifts \(6\)/.test(x[0]) && /Planned CU \(0\)/.test(x[1])),'Uplifts (x) is the total outstanding on every day; Planned CU (x) counts the day ('+nU.map(x=>x.join(' / ')).join(' · ')+')'); }
    await r.click('#uplPlBtn'); ok((await r.evaluate(()=>__rpUpl.markers())).length===0,'Planned CU hides the triangles of the uplifts planned on the day'); await r.click('#uplPlBtn');
    ok(await r.evaluate(()=>{ const ic=document.querySelector('.upl-ic'); const pane=ic.closest('.leaflet-pane'); const ov=document.querySelector('#pMap .leaflet-overlay-pane'); return +getComputedStyle(pane).zIndex < +getComputedStyle(ov).zIndex && ic.getBoundingClientRect().width<=14; }),'the triangles are smaller and drawn under the delivery dots');
    ok(await r.evaluate(()=>[...document.querySelectorAll('.upl-ic')].some(ic=>{ const b=ic.getBoundingClientRect(); return [[.5,.85],[.25,.9],[.75,.9],[.5,.5]].some(([fx,fy])=>{ const el=document.elementFromPoint(b.left+b.width*fx,b.top+b.height*fy); return !!el && !!el.closest('.upl-ic'); }); })),'… and they can still be clicked where no dot covers them');
    await r.evaluate(()=>{ document.documentElement.dataset.theme='dark'; }); ok(await r.$eval('#uplBtn',e=>getComputedStyle(e).backgroundColor==='rgb(203, 213, 225)'),'… light grey in the dark theme'); await r.evaluate(()=>{ document.documentElement.dataset.theme='light'; });
    // UPLIFT CONTROL (sub heading of Resources): allocate by hand to a route without a delivery for that customer
    await r.click('nav [data-tab=res]'); ok((await r.$$eval('#subnav button',x=>x.map(b=>b.textContent.trim()))).join('|')==='Resources sheet|Customers','Resources sub heading: Resources sheet | Customers');
    await r.click('nav [data-tab=plan]'); await r.click('.subnav [data-tab=upl]'); const uc=await r.textContent('#tab-upl'); ok(/Uplift Control/.test(uc) && /6\s*outstanding/.test(uc) && /8\s*completed/.test(uc) && /Wed 11\.11 07:30/.test(uc),'Uplift Control: summary of the outstanding uplifts and the records');
    ok(await r.$$eval('#tab-upl tbody tr',x=>x.length)>=6 && await r.$$eval('[data-uact=goday]',x=>x.length)===6,'Uplift Control: each outstanding uplift shows the day planned (a button to open it) and its route');
    const no=st.open[0]; await r.click(`#tab-upl [data-uact=alloc][data-no="${no}"]`); await r.waitForSelector('#uaDay'); await r.selectOption('#uaDay','D2026-11-12'); await r.waitForTimeout(100);
    const ld=await r.$$eval('#uaLoad option',x=>{ const o=x.find(e=>!/delivers this customer/.test(e.textContent)); return o?o.value:x[0].value; }); await r.selectOption('#uaLoad',ld); await r.click('#modal [data-act=ok]'); await r.waitForTimeout(200);
    const p1=await r.evaluate(n=>__rpUpl.plan()[n],no); ok(p1.manual && p1.date==='2026-11-12' && String(p1.load)===String(ld),'a planner allocates an uplift by hand to any route ('+no+' → Thu, load '+ld+')');
    await r.click('[data-ucf=hand]'); ok(await r.$$eval('#tab-upl table[data-tbl=upl] tbody tr',x=>x.length)===1 && /Manual · Alex/.test(await r.textContent('#tab-upl table[data-tbl=upl] tbody')),'Uplift Control: filter “allocated by hand”'); await r.click('[data-ucf=open]');
    await r.click('nav [data-tab=plan]'); await r.click('#dbPlan [data-dbday="D2026-11-12"]'); await r.click('#expAll'); ok(await r.$$eval(`.drop.uplonly[data-un="${no}"]`,x=>x.length)===1 && /uplift only/.test(await r.textContent(`.drop.uplonly[data-un="${no}"]`)),'Planning: an uplift put on a route with no delivery for that customer is an “uplift only” stop');
    // PRINTING › Uplift: separate PDF, a cover per route and a docket per uplift
    await r.click('nav [data-tab=print]'); ok((await r.$$eval('[data-jpmode]',x=>x.map(e=>e.textContent.trim()))).join('|')==='Delivery|Uplift|Reprint a Docket','Printing sections: Delivery | Uplift | Reprint a Docket');
    await r.click('#dbPrint [data-dbday="D2026-11-11"]'); await r.click('[data-jpmode=uplift]'); ok(/5 uplifts on 5 routes/.test(await r.textContent('#jpUpHint')),'Printing › Uplift: the uplifts planned for Wednesday, by route ('+(await r.textContent('#jpUpHint'))+')');
    // the uplift docket PDF (CHECK_SHEETS/UPLIFTS): each page matched with the report by Order No
    const UPDF=path.join(DEMO,'CHECK_SHEETS','UPLIFTS','week_46','Uplift_dockets_Wed.pdf');
    await r.click('#jpUpJde'); await r.waitForSelector('input[name=jde]'); ok(/CHECK_SHEETS › UPLIFTS/.test(await r.textContent('#modal')) && /Uplift_dockets_Wed\.pdf/.test(await r.textContent('#modal')),'Uplift: “Choose from CHECK_SHEETS › UPLIFTS” lists the uplift docket PDFs');
    await r.check('input[name=jde]'); await r.click('#jdeOk'); await r.waitForFunction(()=>document.querySelectorAll('#jpUpFiles tbody tr').length>0,null,{timeout:60000});
    const ut=(await r.textContent('#jpUpFiles')).replace(/\s+/g,' ');
    ok(await r.$$eval('#jpUpFiles tbody tr',x=>x.length)===7 && /7799901.*✗ not in the uplifts report/.test(ut) && /⚠ Load No 10599999 ≠ shipment/.test(ut) && /7700108.*planned Thu 12\.11/.test(ut) && (ut.match(/✓ Wed 11\.11 · BAY/g)||[]).length===5,'each docket is matched with the report: where to collect (route of the day), a docket not in the report and a Load No that differs are flagged');
    ok(/\(5 from the JDE PDF\)/.test(await r.textContent('#jpUpHint')),'the uplifts planned for the day use their JDE docket pages ('+(await r.textContent('#jpUpHint'))+')');
    await r.click('#jpUpGo'); await r.waitForSelector('#jpUpOut:not([hidden])',{timeout:60000}); ok(/10 pages: 5 covers and 5 dockets \(5 JDE pages\)/.test(await r.textContent('#jpUpInfo')),'Printing › Uplift: a cover per route, then the original JDE docket of each uplift (10 pages)');
    { const vis=()=>r.evaluate(()=>document.getElementById('jpUplift').getBoundingClientRect().height>0); await r.click('[data-jpmode=organise]'); const v1=await vis(); await r.click('[data-jpmode=reprint]'); const v2=await vis(); await r.click('[data-jpmode=uplift]');
      ok(!v1 && !v2 && await vis(),'the Uplift section is shown only on the Uplift screen (not under Delivery or Reprint a Docket)'); }
    { await r.click('[data-jpmode=reprint]'); await r.fill('#jpQuery','7700110'); await r.waitForTimeout(800); ok(/UPLIFT/.test(await r.textContent('#jpRpList')) && /Uplift docket 7700110/.test(await r.textContent('#jpRpTitle')) && await r.$$eval('#jpRpPages canvas, #jpRpPages img, #jpRpPages .jp-page',x=>x.length)>0,'Reprint a Docket: typing an uplift order number finds its uplift docket and previews it');
      await r.fill('#jpQuery',''); await r.click('[data-jpmode=uplift]'); }
    ok(await r.evaluate(()=>{ const o=((window.__TREE.CHECK_SHEETS||{}).Organised)||{}; return Object.keys(o).some(f=>/^\d{4}-\d\d-\d\d_\d\d\.\d\d_Alex_UPLIFTS\.pdf$/.test(f)); }),'the uplift PDF is saved apart (…_UPLIFTS.pdf in CHECK_SHEETS/Organised), never mixed with the deliveries');
    await r.click('[data-jpmode=organise]'); await r.setInputFiles('#jpFile',UPDF); await r.waitForTimeout(2500); ok(/holds uplift dockets: imported in the Uplift section/.test(await r.textContent('#toast')) && !(await r.evaluate(()=>__rpPrint.state.org&&__rpPrint.state.org.sources.length)),'an uplift docket PDF dropped in Delivery goes to the Uplift section: never mixed with the deliveries');
    await r.setInputFiles('#jpFile',path.join(DEMO,'CHECK_SHEETS','JDE','week_46',require('./lib/checksheet').JDE_NAMES.Wed)); await r.waitForSelector('#jpExport:not([disabled])',{timeout:60000}); await r.click('#jpExpand');
    const tags=await r.$$eval('#jpRoutes .flag.upl',x=>x.map(e=>e.textContent)); ok(tags.length>=5 && tags.every(t=>/^UPLIFT 77\d+/.test(t)) && /tagged UPLIFT/.test(await r.textContent('#jpExportHint')),'Printing › Delivery: orders of a customer with an uplift that day are tagged UPLIFT ('+tags.length+')');
    // CHANGE REPORT: the uplifts planned for the day
    await r.click('nav [data-tab=report]'); await r.click('#dbRep [data-dbday="D2026-11-11"]'); ok(await r.$$eval('table[data-tbl=uplr] tbody tr',x=>x.length)===5 && /Uplifts planned/.test(await r.textContent('#rBody')),'Change report: Uplifts section lists the uplifts planned for the day (5 on Wed)');
    // the next report (Wed 15:00): the uplifts collected on Wednesday are completed
    await r.clock.setFixedTime(new Date('2026-11-11T15:00:00'));
    await r.click('#reportsBtn'); await r.waitForSelector('input[name=fb]'); await r.check('input[value="REPORTS/week_46/UPLIFTS_Wed_PM.xlsx"]'); await r.click('#fbOk'); await r.waitForSelector('[data-act=add]'); await r.click('[data-act=add]'); await r.waitForTimeout(600);
    const st2=await r.evaluate(()=>{ const it=Object.values(__rpUpl.state().items); return {open:it.filter(u=>!u.closed).length, man:Object.keys(__rpUpl.state().man).length}; });
    ok(st2.open===2 && st2.man===0,'the Wed 15:00 report: Wednesday\'s uplifts are completed, 2 new ones are outstanding; the one put on Thursday was collected too, so its allocation is closed');
    ok(!e8.length,'no script errors (uplifts)'+(e8.length?': '+e8.join(' | '):'')); await c8.close(); }
    // ---- v0.12.4: Uplift Control rework: drop box, attempts, planned days keep their uplifts, no address ----
    { const c10=await demoContext(b,DEMO); const r=await c10.newPage(); const e10=[]; r.on('pageerror',e=>e10.push(e.message)); await r.goto('file://'+APP); ok(await enter(r,'Alex'),'Alex is in (uplift attempts)'); await r.clock.setFixedTime(new Date('2026-11-11T07:30:00'));
      await r.click('#reportsBtn'); await r.waitForSelector('input[name=fb]');
      for(const wd of ['Mon','Tue','Wed','Thu','Fri']) for(const k of ['DIPS_Plan','RES','PROD']) await r.check(`input[value="REPORTS/week_46/${k}_${wd}.xlsx"]`);
      await r.check('input[value="REPORTS/week_46/UPLIFTS_Wed_AM.xlsx"]'); await r.click('#fbOk'); await r.waitForSelector('[data-act=add]'); await r.click('[data-act=add]'); await r.waitForTimeout(800);
      await r.click('nav [data-tab=plan]'); await r.click('.subnav [data-tab=upl]');
      ok(await r.$('#ucDrop #ucFile') && /Drop the uplifts report here/.test(await r.textContent('#ucDrop')),'Uplift Control: a box to drop the uplifts report');
      ok(!/Dublin|Cork|Road|Street/i.test(await r.textContent('table[data-tbl=upl]')) && await r.evaluate(()=>{ const t=document.querySelector('#tab-upl .rep'); return t.getBoundingClientRect().width>=innerWidth*0.9; }),'the uplift list has no customer address and uses the width of the screen');
      await r.click('[data-ucv=days]'); await r.click('#dbUpl [data-dbwk="2026-11-09"]'); await r.click('#dbUpl [data-dbday="D2026-11-11"]'); await r.click('[data-uc=confall]');
      ok(await r.$$eval('table[data-tbl=upld] [data-uact=hist]',x=>x.length)===6 && (await r.$$eval('table[data-tbl=upld] thead th',x=>x.map(e=>e.textContent.trim()).filter(Boolean))).join('|')==='Uplift|Customer|Route · delivery|Status|Attempt','Planned days: a historic (i) button on every line and an Attempt column');
      ok(await r.$$eval('table[data-tbl=upld] tbody tr .flag.ad',x=>x.every(e=>e.textContent.trim()==='Auto')),'Planned days: the Auto tag shows no user name');
      await r.click('[data-ucdf=auto]'); ok(await r.$$eval('table[data-tbl=upld] > tbody > tr',x=>x.length)===6,'a box on Planned days filters the list (confirmed · auto: 6)'); await r.click('[data-ucdf=man]'); ok(await r.$$eval('table[data-tbl=upld] > tbody > tr',x=>x.length)===0,'… (manual: none)'); await r.click('[data-ucdf=man]');
      // v0.12.6: a report of the same afternoon (15:00) still lists the uplifts planned today: they are NOT “not done”, and no day is listed twice
      await r.clock.setFixedTime(new Date('2026-11-11T15:00:00')); await r.setInputFiles('#ucFile',path.join(DEMO,'REPORTS','week_46','UPLIFTS_Wed_AM.xlsx')); await r.waitForSelector('[data-act=add]',{timeout:20000}); await r.click('[data-act=add]'); await r.waitForTimeout(900);
      await r.click('nav [data-tab=plan]'); await r.click('.subnav [data-tab=upl]'); await r.click('[data-ucv=days]'); await r.click('#dbUpl [data-dbday="D2026-11-11"]');
      { const t=await r.evaluate(()=>{ const it=Object.values(__rpUpl.state().items).filter(u=>!u.closed); return {att:it.filter(u=>(u.att||[]).length).length, plan:Object.keys(__rpUpl.plan()).length}; }); const ids=await r.$$eval('table[data-tbl=upld] > tbody > tr:not(.uc-lines) .upl-no',x=>x.map(e=>e.textContent));
        ok(t.att===0 && t.plan===6 && ids.length===6 && new Set(ids).size===6,'a report of the same day (afternoon) does not make today\'s plan “not done”; Planned days lists each uplift once ('+ids.length+')'); }
      // old data: a “not done” mark on the day the uplift is planned again is repaired (the history keeps both lines)
      { const rr=await r.evaluate(()=>{ const u=Object.values(__rpUpl.state().items).find(x=>!x.closed); u.att=[{date:'2026-11-11',load:'',route:'',manual:false,by:'',ts:'x',why:'test'}]; const n=Object.keys(__rpUpl.plan()).length; return {att:(u.att||[]).length, n, h:u.hist.some(h=>/removed/.test(h.what))}; });
        ok(rr.att===0 && rr.n===6 && rr.h,'1st and 2nd attempt can\'t be on the same day: such a mark is removed and the history says so'); }
      // Thursday 08:00: the same report is uploaded again through the box — the uplifts are still outstanding after Wednesday: not done
      await r.clock.setFixedTime(new Date('2026-11-12T08:00:00')); await r.click('[data-ucv=sum]');
      await r.setInputFiles('#ucFile',path.join(DEMO,'REPORTS','week_46','UPLIFTS_Wed_AM.xlsx')); await r.waitForSelector('[data-act=add]',{timeout:20000});
      ok(/Thu 12\.11 08:00/.test((await r.textContent('#modal')).replace(/\s+/g,' ')),'a report uploaded through the box is dated the moment of the upload (Thu 08:00), not by its name');
      const n0=await r.evaluate(()=>Object.keys(__rpUpl.state().items).length); ok(/6 already in Uplift Control — updated, not duplicated · 0 new/.test((await r.textContent('#modal')).replace(/\s+/g,' ')),'duplicate check: the orders already in Uplift Control are announced as updated, not duplicated');
      await r.click('[data-act=add]'); await r.waitForTimeout(900); ok(await r.evaluate(()=>Object.keys(__rpUpl.state().items).length)===n0,'loading the same orders again updates them: no uplift is duplicated ('+n0+')');
      await r.click('nav [data-tab=plan]'); await r.click('.subnav [data-tab=upl]');
      const s2=await r.evaluate(()=>{ const it=Object.values(__rpUpl.state().items).filter(u=>!u.closed); return {open:it.length, att:it.map(u=>(u.att||[]).length), plan:Object.keys(__rpUpl.plan()).length}; });
      ok(s2.open===6 && s2.att.every(n=>n===1) && s2.plan===0,'still outstanding after Wednesday: the plan of each uplift is “not done” (1 attempt) and no longer planned');
      const no=await r.evaluate(()=>Object.values(__rpUpl.state().items).find(u=>!u.closed).no);
      await r.click(`#tab-upl [data-uact=alloc][data-no="${no}"]`); await r.waitForSelector('#uaDay'); await r.selectOption('#uaDay','D2026-11-13'); await r.waitForTimeout(100); await r.selectOption('#uaLoad',{index:0}); await r.click('#modal [data-act=ok]'); await r.waitForTimeout(300);
      ok(/2nd/.test(await r.textContent(`#tab-upl table[data-tbl=upl] tbody tr:has([data-no="${no}"])`)),'allocated again (Fri): the Attempt column says 2nd, with the day that was not done');
      await r.click(`table[data-tbl=upl] [data-uact=hist][data-no="${no}"]`); ok(/Not done on Wed 11\.11 \(1st attempt\)/.test(await r.textContent('#modal')),'the historic flags Wednesday as not done'); await r.click('#modal [data-act=close]');
      await r.click('[data-ucv=days]'); await r.click('#dbUpl [data-dbday="D2026-11-11"]');
      ok(await r.$$eval('table[data-tbl=upld] > tbody > tr',x=>x.length)===6 && await r.$$eval('table[data-tbl=upld] .flag.dup',x=>x.filter(e=>/not done/.test(e.textContent)).length)===6,'Planned days: Wednesday keeps its 6 uplifts, now with the status “not done”');
      await r.click('[data-ucdf=miss]'); ok(await r.$$eval('table[data-tbl=upld] > tbody > tr',x=>x.length)===6,'box filter: not done (6)'); await r.click('[data-ucdf=miss]');
      await r.click('nav [data-tab=print]'); await r.click('#dbPrint [data-dbday="D2026-11-13"]'); await r.click('[data-jpmode=uplift]');
      ok(/2nd attempt/.test(await r.textContent('#jpUpList')),'Printing › Uplift: the uplift on its second attempt is marked “2nd attempt”');
      // an uplift that is no longer in the next report is completed: it stays on its day, status completed
      await r.clock.setFixedTime(new Date('2026-11-12T15:00:00')); await r.click('#reportsBtn'); await r.waitForSelector('input[name=fb]'); await r.check('input[value="REPORTS/week_46/UPLIFTS_Wed_PM.xlsx"]'); await r.click('#fbOk'); await r.waitForSelector('[data-act=add]'); await r.click('[data-act=add]'); await r.waitForTimeout(700);
      await r.click('nav [data-tab=plan]'); await r.click('.subnav [data-tab=upl]'); await r.click('[data-ucv=days]'); await r.click('#dbUpl [data-dbday="D2026-11-13"]');
      ok(/completed/.test(await r.textContent('table[data-tbl=upld]')) && /Uplift/.test(await r.textContent('table[data-tbl=upld]')),'Planned days: a completed uplift stays on its day, only its status changes (completed)');
      ok(!e10.length,'no script errors (uplift attempts)'+(e10.length?': '+e10.join(' | '):'')); await c10.close(); }
  // ---------- UPLIFT MATCH BY ADDRESS (v0.12.2): same Eircode, another Ship To — any loaded planning day ----------
  { const D3=path.join(TMP,'addr'); fs.cpSync(DEMO,D3,{recursive:true});
    const rd=f=>XLSX.utils.sheet_to_json(XLSX.readFile(path.join(D3,f)).Sheets[XLSX.readFile(path.join(D3,f)).SheetNames[0]],{header:1});
    const fri=rd('REPORTS/week_46/DIPS_Plan_Fri.xlsx').slice(1); const friShips=new Set(fri.map(x=>String(x[2]))); const upl=rd('REPORTS/week_46/UPLIFTS_Fri_PM.xlsx').slice(1).filter(x=>x[0]);
    const u=upl.find(x=>!friShips.has(String(x[2]))); const y=String(fri[0][2]);
    const mf=path.join(D3,'MASTER_DATA','MASTER_DEL_DETAILS.xlsx'); const wb=XLSX.readFile(mf); const n=wb.SheetNames[0]; const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1});
    const pcY=rows.find(x=>String(x[0])===y)[2]; rows.find(x=>String(x[0])===String(u[2]))[2]=pcY; wb.Sheets[n]=XLSX.utils.aoa_to_sheet(rows); XLSX.writeFile(wb,mf);
    const c9=await demoContext(b,D3); const q=await c9.newPage(); const e9=[]; q.on('pageerror',e=>e9.push(e.message)); await q.goto('file://'+APP); ok(await enter(q,'Alex'),'Alex is in (address match)'); await q.clock.setFixedTime(new Date('2026-11-12T16:00:00'));
    await q.click('#reportsBtn'); await q.waitForSelector('input[name=fb]'); for(const f of ['DIPS_Plan_Fri','RES_Fri','UPLIFTS_Fri_PM']) await q.check(`input[value="REPORTS/week_46/${f}.xlsx"]`);
    await q.click('#fbOk'); await q.waitForSelector('[data-act=add]'); await q.click('[data-act=add]'); await q.waitForTimeout(800);
    const pr=await q.evaluate(()=>__rpUpl.prop()); const x=pr[String(u[0])];
    ok(x && x.how==='addr' && x.date==='2026-11-13','an uplift whose Ship To has no delivery matches the delivery to the same address (same Eircode, Ship To '+y+')');
    await q.click('nav [data-tab=plan]'); await q.click('.subnav [data-tab=upl]'); await q.click('[data-ucv=days]'); await q.click('#dbUpl [data-dbday="D2026-11-13"]');
    ok(new RegExp(String(u[0])+'[\\s\\S]*same address').test(await q.textContent('table[data-tbl=upld]')),'Planned days shows the match “same address” for the planner to confirm');
    ok(!e9.length,'no script errors (address match)'+(e9.length?': '+e9.join(' | '):'')); await c9.close(); }
  // ---------- UPLOAD FROM THIS COMPUTER (v0.12.3): recognised, saved in its folder as “MM.DD - weekday - type - user - time”; PLANNING layout ----------
  { const PC=path.join(TMP,'pc'); fs.mkdirSync(PC,{recursive:true}); const W46=path.join(DEMO,'REPORTS','week_46');
    fs.copyFileSync(path.join(W46,'DIPS_Plan_Fri.xlsx'),path.join(PC,'export1.xlsx')); fs.copyFileSync(path.join(W46,'RES_Fri.xlsx'),path.join(PC,'RES Fri 13.11.xlsx')); fs.copyFileSync(path.join(W46,'UPLIFTS_Thu_PM.xlsx'),path.join(PC,'cu_rep_today.xlsx'));
    fs.copyFileSync(path.join(DEMO,'CHECK_SHEETS','JDE','week_46',require('./lib/checksheet').JDE_NAMES.Fri),path.join(PC,'sheets.pdf'));
    const cA=await demoContext(b,DEMO); const q=await cA.newPage(); const eA=[]; q.on('pageerror',e=>eA.push(e.message)); await q.goto('file://'+APP); ok(await enter(q,'Alex'),'Alex is in (upload from this computer)'); await q.clock.setFixedTime(new Date('2026-11-12T16:35:00'));
    await q.click('#reportsBtn'); await q.waitForSelector('#fbUp',{state:'attached'}); await q.setInputFiles('#fbUp',['export1.xlsx','RES Fri 13.11.xlsx','cu_rep_today.xlsx'].map(f=>path.join(PC,f))); await q.waitForSelector('[data-act=add]',{timeout:30000});
    const tree=await q.evaluate(()=>Object.keys(window.__TREE.REPORTS.week_46).filter(k=>/ - /.test(k)).sort());
    ok(tree.join('|')==='11.12 - Thu - Uplifts - Alex - 16.35.xlsx|11.13 - Fri - DIPS Plan - Alex - 16.35.xlsx|11.13 - Fri - Resources - Alex - 16.35.xlsx','files uploaded from this computer are recognised and saved in REPORTS/week_46 as “MM.DD - weekday - type - user - time”: '+tree.join(', '));
    const pv=(await q.textContent('#modal')).replace(/\s+/g,' '); ok(/Fri 13\.11/.test(pv) && /Thu 12\.11 16:35/.test(pv),'… and imported from there: the day and the report time come from the new name');
    await q.click('[data-act=add]'); await q.waitForTimeout(800);
    await q.click('#reportsBtn'); await q.waitForSelector('input[name=fb]'); ok(/11\.13 - Fri - DIPS Plan - Alex - 16\.35\.xlsx\s*✓ loaded/.test(await q.textContent('#modal')),'the saved file is listed in the Reports window, tagged ✓ loaded'); await q.click('#modal [data-act=close]');
    await q.click('nav [data-tab=print]'); await q.setInputFiles('#jpFile',path.join(PC,'sheets.pdf')); await q.waitForSelector('#jpExport:not([disabled])',{timeout:60000});
    ok(await q.evaluate(()=>Object.keys(window.__TREE.CHECK_SHEETS.JDE.week_46).includes('11.13 - Fri - Check Sheets - Alex - 16.35.pdf')),'a check-sheet PDF dropped in Printing is saved in CHECK_SHEETS/JDE/week_46 the same way');
    // Planning layout: Show on map under the KPIs, search under the day buttons (same width), the whole left side scrolls
    await q.click('nav [data-tab=plan]'); await q.click('#expAll');
    ok(await q.evaluate(()=>{ const k=document.querySelector('#tab-plan .kpis').getBoundingClientRect(), m=document.getElementById('pBays').getBoundingClientRect(), s=document.getElementById('pSearch').getBoundingClientRect(), d=document.getElementById('dbPlan').getBoundingClientRect(), l=document.querySelector('#tab-plan .lhead').getBoundingClientRect();
      return m.top>=k.bottom && m.left>=k.left-1 && s.top>=d.bottom && Math.abs(s.width-d.width)<4 && l.top>=m.bottom && l.top>=s.bottom; }),'Planning: Show on map is under the KPIs, the search box under the day buttons and as wide, then Routes & orders');
    ok(await q.evaluate(()=>{ const sd=document.querySelector('#tab-plan .side'); return getComputedStyle(document.querySelector('#tab-plan .list')).overflowY==='visible' && sd.scrollHeight>sd.clientHeight; }),'… and the whole left side scrolls as one page');
    ok(!eA.length,'no script errors (upload from this computer)'+(eA.length?': '+eA.join(' | '):'')); await cA.close(); }
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
    ok(!/DONEGAL/i.test(planTxt) && !planTxt.includes('5609001') && !planTxt.includes('Driver 99'),'Donegal bays and customers are left out of Planning');
    await q.click('nav [data-tab=res]'); await q.click('#rsDays [data-rsday=\"D2026-11-09\"]'); const resTxt2=await q.textContent('#rsGrid'); ok(!/DONEGAL/i.test(resTxt2) && !resTxt2.includes('Driver 99'),'… and out of Resources');
    await q.click('nav [data-tab=res]'); await q.click('.subnav [data-tab=customers]'); await q.waitForTimeout(300); ok(/DONEGAL 01/.test(await q.textContent('#cBay')),'… but still on the Customers tab');
    await q.click('nav [data-tab=report]'); ok(!/DONEGAL/i.test(await q.textContent('#rBody')),'… and out of the change report'); ok(!e2.length,'no script errors (Donegal copy)'+(e2.length?': '+e2.join(' | '):'')); await c2.close(); }
  ok(!errs.length,'no script errors'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
})().catch(e=>{ console.error(e); process.exitCode=1; });
