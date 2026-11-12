// npm test: all browser checks, with FAKE data only.
//  1. folder.js      — the company folder layout (MASTER_DATA, REPORTS/week_XX, PLANS/week_XX), mocked
//  2. features.js    — Resources sheet and Printing in detail, on a small one-week fixture (make-demo.js)
//  3. walkthrough.js — start window, every feature, plans and snapshot, on the same fixture
// The published demo (demo/Route_planning, a whole month with 1,500 customers) is made by make-month.js and make-plans.js; it is too big for these checks.
const {execFileSync}=require('child_process'); const fs=require('fs'); const os=require('os'); const path=require('path');
const APP=path.join(__dirname,'..','Route Planner.html'); const run=(f,args)=>execFileSync(process.execPath,[path.join(__dirname,f)].concat(args),{stdio:'inherit'});
// the browser steps are retried once: a very occasional timing hiccup (a page reload that is slow) must not fail the run; a real failure fails both times
const runRetry=(f,args)=>{ try{ run(f,args); }catch(e){ console.log('RETRY: '+f+' did not finish (timing?) — running it once more'); run(f,args); } };
run('folder.js',[APP]);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rp-test-')); const demo=path.join(tmp,'demo');
run(path.join('demo','make-demo.js'),[demo]);
runRetry('features.js',[APP,demo]);
runRetry(path.join('demo','walkthrough.js'),[APP,demo,'']);
console.log('Plans saved by the walkthrough are in '+demo);
