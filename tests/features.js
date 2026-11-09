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
  ok((await heads()).join('|')==='ID|Shipment Number|Route / Bay|Driver|Helper|Truck|Drops|Kgs|Pallets|DIPS Total KM|Estimated Time|Comments','columns as specified: '+(await heads()).join(', '));
  const nRows=async()=>p.$$eval('#rsGrid tbody tr',x=>x.length);
  const rows0=await nRows(); ok(rows0>=6,'Monday routes listed from the RESOURCES file ('+rows0+' rows)');
  ok(/not edited yet/.test(await p.textContent('.rs-tools')),'not edited yet: shown from the loaded files');
  const clip={copy:()=>p.evaluate(()=>{ const dt=new DataTransfer(); document.getElementById('rsWrap').focus(); document.dispatchEvent(new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true})); return dt.getData('text/plain'); }),
    paste:t=>p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain',t); document.getElementById('rsWrap').focus(); document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); },t)};
  // select a block with click + shift+click, copy it
  await p.click(cell(0,3)); await p.click(cell(1,4),{modifiers:['Shift']});
  ok(await p.$$eval('#rsGrid td.sel',x=>x.length)===4,'Shift+click selects a block of cells (2 × 2)');
  const tsv=await clip.copy(); const want=[[await txt(0,3),await txt(0,4)].join('\t'),[await txt(1,3),await txt(1,4)].join('\t')].join('\n');
  ok(tsv===want,'Ctrl+C copies the block as tab-separated text (Excel format)');
  // paste it two rows lower
  await p.click(cell(2,3)); await clip.paste(tsv); await p.waitForTimeout(200);
  ok(await txt(2,3)===await txt(0,3) && await txt(3,4)===await txt(1,4),'Ctrl+V pastes the block (group of cells)');
  ok(/Edited in the planner/.test(await p.textContent('.rs-tools')),'first edit stores the table with the plan');
  // a block from Excel larger than the table adds rows
  await p.click(cell(rows0-1,1)); await clip.paste('74699901\tBAY 09\tExcel Driver\n74699902\tbay 9b\tExcel Driver 2\n74699903\tBAY 10\tExcel Driver 3');
  ok(await nRows()===rows0+2 && await txt(rows0,2)==='BAY 09B' && await txt(rows0+1,2)==='BAY 10','pasting past the last row adds rows; bay names are tidied (bay 9b → BAY 09B)');
  // one value over a selection fills it; Delete clears
  await p.click(cell(0,11)); await p.click(cell(2,11),{modifiers:['Shift']}); await clip.paste('Check tyres');
  ok(await txt(0,11)==='Check tyres' && await txt(2,11)==='Check tyres','one value pasted over a selection fills every cell');
  await p.click(cell(1,11)); await p.keyboard.press('Delete'); ok(await txt(1,11)==='','Delete clears the selected cells');
  // arrows + typing edit; Escape cancels
  await p.click(cell(0,9)); await p.keyboard.press('ArrowRight'); await p.keyboard.type('5:30'); await p.keyboard.press('Enter');
  ok(await txt(0,10)==='5:30','arrow keys move, typing edits the cell (estimated time)');
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowDown'); await p.keyboard.type('6:00'); await p.keyboard.press('Tab');
  ok(await txt(1,10)==='6:00','keyboard keeps working after an edit (Enter moves down, focus stays in the sheet)');
  await p.click(cell(0,6)); await p.keyboard.type('abc'); await p.keyboard.press('Enter'); ok(await p.$eval(cell(0,6),e=>e.classList.contains('bad')),'a number column shows text in red');
  await p.click(cell(0,6)); await p.keyboard.type('12'); await p.keyboard.press('Escape'); ok(await txt(0,6)==='abc','Escape cancels the edit');
  await p.click(cell(0,6)); await p.keyboard.type('14'); await p.keyboard.press('Enter');
  // rows: add and delete
  await p.click(cell(1,1)); await p.click('[data-rs=addrow]'); ok(await nRows()===rows0+3 && await txt(2,1)==='','＋ Row adds an empty row below the selected cell');
  await p.click(cell(2,2)); await p.click('[data-rs=delrows]'); ok(await nRows()===rows0+2,'− Delete rows removes the selected row');
  // a row whose load has orders asks first
  await p.click(cell(0,1)); await p.click('[data-rs=delrows]'); ok((await p.textContent('#modal')).includes('Delete rows with orders?'),'deleting a route that has orders asks first'); await p.click('#modal [data-act=close]');
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
  await p.click('nav [data-tab=report]'); ok((await p.textContent('[data-sec=res]')).includes('Resources tab'),'edits are in the change report (one line per route)');
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
  await p.click('#jpExport'); await p.waitForSelector('#jpOutput:not([hidden])',{timeout:90000});
  ok(await p.$$eval('#jpChecks li',x=>x.length>0 && x.every(li=>!li.classList.contains('fail'))),'organised PDF passes every integrity check');
  const tabs=await p.$$eval('#jpOutRoutes .jp-rtab b',x=>x.map(e=>e.textContent)); ok(tabs[tabs.length-1]==='UNASSIGNED' && tabs[0]==='BAY 01','routes in plan order, UNASSIGNED last: '+tabs.join(' | '));
  // reprint one order
  await p.click('[data-jpmode=reprint]'); await p.fill('#jpQuery','5699999'); await p.waitForSelector('#jpRpPreview:not([hidden])');
  const [rp]=await Promise.all([p.waitForEvent('download'), p.click('#jpRpDownload')]); ok(rp.suggestedFilename()==='Reprint_5699999.pdf','Reprint: one order, original pages only');
  // a Viewer can print but not edit resources
  await p.click('#userBtn'); await p.click('#modal [data-act=switch]'); ok(await enter(p,'Warehouse'),'Warehouse (Viewer) is in');
  await p.click('nav [data-tab=res]'); await p.selectOption('#rsDay','D2026-11-09'); const before=await txt(0,3);
  await p.click(cell(0,3)); await p.keyboard.type('Nope'); await p.keyboard.press('Enter');
  ok(await txt(0,3)===before && !(await p.isVisible('[data-rs=addrow]')),'Viewer: resources are view only');
  ok(await p.isVisible('nav [data-tab=print]'),'Viewer: Check Sheet Print available');
  ok(!errs.length,'no script errors'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
})().catch(e=>{ console.error(e); process.exitCode=1; });
