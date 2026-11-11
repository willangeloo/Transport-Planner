// Shared bits for browser tests that run on a copy of the DEMO folder (made-up data):
// local copies of the CDN libraries, the mocked File System Access API and the start window.
const fs=require('fs'), path=require('path');
const libs={'leaflet.js':require.resolve('leaflet/dist/leaflet.js'),'leaflet.css':require.resolve('leaflet/dist/leaflet.css'),'xlsx.full.min.js':require.resolve('xlsx/dist/xlsx.full.min.js'),
  'pdf.min.js':require.resolve('pdfjs-dist/build/pdf.min.js'),'pdf.worker.min.js':require.resolve('pdfjs-dist/build/pdf.worker.min.js'),'pdf-lib.min.js':require.resolve('pdf-lib/dist/pdf-lib.min.js')};
const readTree=d=>Object.fromEntries(fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.name!=='PLANS').map(e=>{ const q=path.join(d,e.name);
  return [e.name, e.isDirectory()?readTree(q):{b64:fs.readFileSync(q).toString('base64'),mod:Math.floor(fs.statSync(q).mtimeMs)}]; }));
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
// a browser context that serves the libraries locally, blocks everything else and holds the demo folder
async function demoContext(browser, demoDir, opts){
  const c=await browser.newContext(Object.assign({viewport:{width:1360,height:800},acceptDownloads:true},opts||{}));
  await c.route('**/*',r=>{ const u=r.request().url(); if(u.startsWith('file:')) return r.continue(); const k=Object.keys(libs).find(k=>u.endsWith('/'+k)); return k?r.fulfill({path:libs[k]}):r.abort(); });
  await c.addInitScript(t=>{ let s=null; try{ s=sessionStorage.getItem('__tree'); }catch(e){ return; } if(!s){ s=t; } window.__TREE=JSON.parse(s);
    window.addEventListener('beforeunload',()=>{ try{ sessionStorage.setItem('__tree',JSON.stringify(window.__TREE)); }catch(e){} }); }, JSON.stringify(readTree(demoDir)));
  await c.addInitScript(MOCK);
  return c;
}
// goes through the start window as `name` (links the folder when asked; the app may reload once)
async function enter(p, name, opts){ const keep=!!(opts&&opts.keepStart);
  const done=()=>p.evaluate(n=>{ const b=document.getElementById('userBtn'); return !!b && b.textContent.includes(n) && !document.body.classList.contains('gated'); },name).catch(()=>false);
  const settled=async()=>{ if(!(await done())) return false; if(keep && await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) return true; if(await p.isVisible('#modal [data-act=dgo]').catch(()=>false) || await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) return false; await p.waitForTimeout(1200); if(await p.waitForSelector('#modal [data-act=dgo], #modal [data-act=sskip]',{timeout:5000}).then(()=>true).catch(()=>false)) return keep && await p.isVisible('#modal [data-act=sskip]').catch(()=>false); return await done(); };
  for(let i=0;i<40 && !(await settled());i++){
    if(await p.isVisible('#modal [data-act=sskip]').catch(()=>false)) await p.click('#modal [data-act=sskip]').catch(()=>{});   // start window: load a plan / new week
    else if(await p.isVisible('#modal [data-act=dgo]').catch(()=>false)) await p.click('#modal [data-act=dgo]').catch(()=>{});   // master data & reports window
    else if(await p.isVisible('#modal [data-act=allow]').catch(()=>false)) await p.click('#modal [data-act=allow]').catch(()=>{});   // access to the remembered company folder   // master data & reports window
    else if(await p.isVisible('#modal [data-act=link]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=link]').catch(()=>{})]);
    else if(await p.isVisible(`#modal [data-act="u:${name}"]`).catch(()=>false)) await p.click(`#modal [data-act="u:${name}"]`).catch(()=>{});
    else if(await p.isVisible('#modal [data-act=go]').catch(()=>false)) await Promise.all([p.waitForEvent('load',{timeout:4000}).catch(()=>null), p.click('#modal [data-act=go]').catch(()=>{})]);
    await p.waitForTimeout(300); }
  return await done();
}
module.exports={libs, readTree, MOCK, demoContext, enter};
