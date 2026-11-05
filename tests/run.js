// npm test: builds FAKE spreadsheets in a temp folder and runs the browser checks against ../Route Planner.html
const {execFileSync}=require('child_process'); const fs=require('fs'); const os=require('os'); const path=require('path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rp-test-'));
execFileSync(process.execPath,[path.join(__dirname,'fixtures.js'),tmp],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(__dirname,'e2e.js'),path.join(__dirname,'..','Route Planner.html'),tmp,tmp],{stdio:'inherit'});
console.log('Outputs (plan, snapshot, screenshot) in '+tmp);
