// End-to-end check: customer master loaded at runtime, carried in plan .json and snapshot .html.
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const APP=path.resolve(process.argv[2]); const FX=path.resolve(process.argv[3]); const OUT=path.resolve(process.argv[4]||'.');
const libs={'leaflet.js':require.resolve('leaflet/dist/leaflet.js'),'leaflet.css':require.resolve('leaflet/dist/leaflet.css'),'xlsx.full.min.js':require.resolve('xlsx/dist/xlsx.full.min.js')};
async function ctx(browser){
  const c=await browser.newContext({acceptDownloads:true});
  await c.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue();
    const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); if(k) return r.fulfill({path:libs[k]}); return r.abort(); });
  await c.addInitScript(()=>{ window.showSaveFilePicker=undefined; window.showDirectoryPicker=undefined; });
  return c;
}
const pick=async p=>{ try{ await p.waitForSelector('[data-act=manual]',{state:'visible',timeout:5000}); await p.click('[data-act=manual]'); }catch(e){} };
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{
  const b=await chromium.launch(); const errs=[];
  let c=await ctx(b); let p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+APP); await pick(p);
  ok(await p.isVisible('#noMaster'),'banner shown when no master is loaded');
  ok((await p.textContent('#cBay')).includes('All bays (0)'),'no built-in customers');
  await p.click('#noMasterBtn');
  await p.setInputFiles('#fi',['MASTER_DEL_DETAILS.xlsx','DIPS_Plan_Tue.xlsx','RES_Tue - 03.11.xlsx'].map(f=>FX+'/'+f));
  await p.waitForSelector('[data-act=add]');
  const prev=await p.textContent('#modal'); ok(/5 customers/.test(prev)&&/1<\/b> without coordinates|1 without coordinates/.test(prev.replace(/\s+/g,' ')),'preview: 5 customers, 1 without coordinates');
  ok((await p.textContent('[data-act=add]')).includes('Load customer master'),'button: '+await p.textContent('[data-act=add]'));
  await Promise.all([p.waitForEvent('load'), p.click('[data-act=add]')]);
  await pick(p);
  ok(!(await p.isVisible('#noMaster')),'banner gone after load');
  const bays=await p.textContent('#cBay'); ok(bays.includes('All bays (5)')&&bays.includes('BAY 01')&&bays.includes('BAY 02')&&bays.includes('BAY 04'),'5 customers, bays normalised: '+bays.replace(/\s+/g,' ').slice(0,120));
  const days=await p.evaluate(()=>JSON.parse(localStorage.getItem('routePlannerBeta.v082.customers')).list.map(c=>c.id+':'+c.days.join('')+':'+c.tw));
  ok(days.join(' ')==='90000001:02:08:00-12:00 90000002:02:10:00-15:00 90000003:13: 90000004:4: 90000005:0:09:00-17:00','days/time windows parsed: '+days.join(' '));
  ok((await p.textContent('#pDay')).includes('03.11'),'planning day loaded');
  await p.screenshot({path:OUT+'/after-load.png'});
  // save plan + snapshot
  await p.click('#shareBtn');
  const [d1]=await Promise.all([p.waitForEvent('download'), p.click('[data-act=json]')]); const jsonP=OUT+'/plan.json'; await d1.saveAs(jsonP);
  await p.click('#modal [data-act=close]');
  await p.click('#shareBtn');
  const [d2]=await Promise.all([p.waitForEvent('download'), p.click('[data-act=snap]')]); const snapP=OUT+'/v0.9.1-snapshot.html'; await d2.saveAs(snapP);
  const plan=JSON.parse(fs.readFileSync(jsonP)); ok(plan.customers&&plan.customers.list.length===5,'plan .json carries the 5-customer master');
  await c.close();
  // snapshot opened on a fresh browser
  c=await ctx(b); p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto('file://'+snapP);
  ok((await p.textContent('#cBay')).includes('All bays (5)'),'snapshot shows the 5 customers on a fresh browser');
  await c.close();
  // plan opened on a fresh browser
  c=await ctx(b); p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto('file://'+APP); await pick(p);
  await p.setInputFiles('#planFile',jsonP); await p.waitForSelector('[data-act=ok]');
  await Promise.all([p.waitForEvent('load'), p.click('[data-act=ok]')]); await pick(p);
  ok((await p.textContent('#cBay')).includes('All bays (5)'),'Open plan restores the master on a fresh browser');
  ok((await p.textContent('#pDay')).includes('03.11'),'Open plan restores the planning day');
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
})();
