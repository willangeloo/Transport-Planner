// npm test: all browser checks, with FAKE data only.
//  1. e2e.js        — customer master, plan and snapshot round trip (generated spreadsheets)
//  2. folder.js     — shared folder layout (MASTER_DATA, REPORTS/week_XX, PLANS/week_XX), mocked
//  3. walkthrough.js — every feature on a temporary copy of the demo week (demo/ is not changed)
const {execFileSync}=require('child_process'); const fs=require('fs'); const os=require('os'); const path=require('path');
const APP=path.join(__dirname,'..','Route Planner.html'); const run=(f,args)=>execFileSync(process.execPath,[path.join(__dirname,f)].concat(args),{stdio:'inherit'});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rp-test-'));
run('fixtures.js',[tmp]); run('e2e.js',[APP,tmp,tmp]); run('folder.js',[APP]);
const demo=path.join(tmp,'demo'); fs.cpSync(path.join(__dirname,'..','demo','Route_planning'),demo,{recursive:true});
run(path.join('demo','walkthrough.js'),[APP,demo,'']);
console.log('Outputs (plan, snapshot, screenshot) in '+tmp);
