// Regenerates the screenshots in docs/img: builds the small one-week fixture (make-demo.js) in a temporary folder and runs the walkthrough on it.
// Usage: npm run screenshots
const {execFileSync}=require('child_process'), os=require('os'), fs=require('fs'), path=require('path');
const demo=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'rp-shots-')),'demo'); const run=(f,a)=>execFileSync(process.execPath,[path.join(__dirname,f)].concat(a),{stdio:'inherit'});
run('make-demo.js',[demo]); run('walkthrough.js',[path.join(__dirname,'..','..','Route Planner.html'),demo]);
