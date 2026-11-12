// Makes the demo plan files (PLANS/week_XX), one per week, by using the app itself on the demo month:
//   each week's reports are loaded on top of the weeks before, so every plan contains the previous weeks too,
//   and the plan of the last week of the month holds the whole month. Each week has one planning change
//   (a drop moved to another route), so the change report isn't empty; one snapshot (view-only copy) is made for week 37.
// Usage: node make-plans.js [app.html] [demoFolder]   (run make-month.js first)
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const {demoContext, enter}=require('./../lib/harness');
const APP=path.resolve(process.argv[2]||path.join(__dirname,'..','..','Route Planner.html'));
const DEMO=path.resolve(process.argv[3]||path.join(__dirname,'..','..','demo','Route_planning'));
// the working days of each week folder, from the reports on disk; the plan is saved on the last working day (Wed 30.09 for week 40)
const ORD=['Mon','Tue','Wed','Thu','Fri']; const WEEKS=fs.readdirSync(path.join(DEMO,'REPORTS')).filter(n=>/^week_\d+$/.test(n)).sort().map(w=>({wk:+w.slice(5), files:fs.readdirSync(path.join(DEMO,'REPORTS',w)).filter(f=>/^DIPS_Plan_/.test(f)).map(f=>f.slice(10,13)).sort((a,b)=>ORD.indexOf(a)-ORD.indexOf(b))}));
const ORDER=['Mon','Tue','Wed','Thu','Fri']; const dayKey=(wk,wd)=>{ const d=new Date(Date.UTC(2025,11,29)); d.setUTCDate(d.getUTCDate()+(wk-1)*7+ORDER.indexOf(wd)); return 'D'+d.toISOString().slice(0,10); };   // ISO week 1 of 2026 starts on Mon 29.12.2025
(async()=>{
  const b=await chromium.launch(); const c=await demoContext(b,DEMO,{viewport:{width:1360,height:800},colorScheme:'light'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+APP); if(!(await enter(p,'Alex'))) throw new Error('could not get in');
  const at=t=>p.clock.setFixedTime(new Date(t)); const closeModal=async()=>{ if(await p.isVisible('#scrim.on')) await p.evaluate(()=>{ const x=document.querySelector('#modal [data-act=close]'); if(x) x.click(); }); };
  const saveNow=async()=>{ await p.click('#saveBtn'); await p.click('#modal [data-act=json]'); await p.waitForTimeout(800); await closeModal(); };
  for(const {wk,files} of WEEKS){
    await p.click('nav [data-tab=plan]'); await p.click('#uploadBtn'); await p.waitForSelector('input[name=fb]');
    await p.click(`#modal [data-act="w:${wk}"]`); await p.waitForTimeout(300);
    for(const wd of files) for(const k of ['DIPS_Plan','RES']) await p.check(`input[value="REPORTS/week_${wk}/${k}_${wd}.xlsx"]`);
    await p.click('#fbOk'); await p.waitForSelector('[data-act=add]',{timeout:120000}); await p.click('[data-act=add]'); await p.waitForTimeout(1500);
    // one planning change in the first working day of the week: a drop moved to another route
    const first=dayKey(wk,files[0]); await p.selectOption('#pDay',first); await p.click('#expAll');
    const rs=await p.$$eval('.route:not(.deferred)',x=>x.map(r=>({id:r.dataset.r,k:(r.querySelector('.drop:not(.dh)')||{dataset:{}}).dataset.k,n:r.querySelectorAll('.drop:not(.dh)').length})));
    const src=rs.find(r=>r.n>=2&&r.k); await p.click(`.drop[data-k="${src.k}"] [data-act=move]`);
    await p.selectOption('#mTo',await p.$eval('#mTo',s=>[...s.options].find(o=>o.value&&!o.disabled).value)); await p.click('#mOk'); await p.waitForTimeout(400);
    const last=files[files.length-1]; const lastKey=dayKey(wk,last).slice(1);
    await at(lastKey+'T16:00:00'); await saveNow(); console.log(`week ${wk}: ${files.length} days loaded, plan saved (${lastKey})`);
    if(wk===37){ await at(lastKey+'T16:02:00'); await p.click('#saveBtn'); await p.click('[data-act=snap]'); await p.waitForTimeout(1200); await closeModal(); console.log('snapshot saved'); }
  }
  const plans=await p.evaluate(()=>window.__TREE.PLANS||{});
  fs.rmSync(path.join(DEMO,'PLANS'),{recursive:true,force:true});
  let n=0; for(const [wf,files] of Object.entries(plans)) for(const [f,node] of Object.entries(files)){ if(node.text==null) continue; const o=path.join(DEMO,'PLANS',wf); fs.mkdirSync(o,{recursive:true}); fs.writeFileSync(path.join(o,f),node.text); n++; }
  console.log(`${n} files written to ${path.join(DEMO,'PLANS')}`+(errs.length?' · page errors: '+errs.join(' | '):''));
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1); });
