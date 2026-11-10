// Makes a FAKE check-sheet PDF in the JDE "Offloading Sheet Report" layout (one page per order), with pdf-lib.
// The layout follows a real JDE page (header fields, a table with UOM / Weight / Empties, totals, footer), but every
// word in it is invented: company, customers, products, numbers and the footer. No logo, no real names.
// It is used by the demo week and the browser tests.
//   const bytes = await checkSheetPdf([{load:'74600001', order:'5600001', name:'COPPER INN', date:'09/11/2026'}], {blankAfter:[0]})
//
// Order fields: load, order, name, date (delivery date), orderDate, po (customer PO, '' = none), customerNo (Ship To),
//   addr ("street, area") or addrLines (array), empties (true = the "Empties" columns are filled),
//   lines: [{sku,desc,qty,uom:'CS'|'EA',weight}] or the short form [sku,desc,qty].
// Options: blankAfter:[i] adds a signature-only page after order i; reviewAfter:[i] adds a page the app cannot identify.
const {PDFDocument, StandardFonts, rgb}=require('pdf-lib');

// An invented product list (SKU, description, unit, kg per unit)
const CATALOGUE=[
  ['HBL401','Harbourside Lager 4.5% 24x330ml CAN','CS',12.9],['HBL402','Harbourside Lager 4.5% 3x8x500ml CAN','CS',12.7],['80000745','Harbourside Light 3.8% 3x8x500 DRS','CS',12.8],
  ['OAK501','Oakmill Dry Cider 4.5% 12x500ml','CS',9.6],['OAK502','Oakmill Pear Cider 4.0% 12x500ml','CS',9.8],['RVS601','Riverstone Red Ale 4.2% 12x500ml NRB','CS',11.4],
  ['WIN851','Demo Valley Merlot 6x75cl','CS',7.2],['WIN852','Demo Valley Sauvignon Blanc 6x75cl','CS',7.0],['WIN853','Coastal Rose 6x75cl','CS',7.1],['WIN854','Coastal Prosecco 6x75cl','CS',8.0],
  ['SOF701','Cola Classic NRB 200ml x 24','CS',8.6],['SOF702','Cola Zero NRB 200ml x 24','CS',8.6],['SOF703','Lemon Lime NRB 200ml x 24','CS',8.0],['SOF704','Tonic Water NRB 6x4x200ml','CS',9.0],
  ['SOF705','Orange Juice 12x1L','CS',12.0],['SOF706','Still Water 24x500ml','CS',12.3],['81000213','Demo Lager 20PK NRB 300ml x 1','CS',10.3],
  ['KEG501','Harbourside Lager 4.5% 50L Keg','EA',40.4],['KEG502','Oakmill Cider 4.5% 30L Keg','EA',32.0],['80000715','Riverstone IPA 5% 30L Keg','EA',40.4]];

// Makes the lines of one order from a weight (kg), with the caller's repeatable random function rnd() (0..1).
// The line weights add up to exactly `kg`, so a demo check sheet matches the planning file.
function makeLines(rnd, kg){
  const n=Math.max(1,Math.min(9, 2+Math.floor(rnd()*(1+kg/60)))); const pool=CATALOGUE.slice(); const chosen=[];
  for(let i=0;i<n && pool.length;i++){ const k=Math.floor(rnd()*pool.length); chosen.push(pool.splice(k,1)[0]); }
  const shares=chosen.map(()=>.3+rnd()); const sum=shares.reduce((a,b)=>a+b,0);
  const lines=chosen.map((c,i)=>({sku:c[0],desc:c[1],uom:c[2],unit:c[3],qty:Math.max(1,Math.round(shares[i]/sum*kg/c[3]))}));
  const raw=lines.reduce((a,l)=>a+l.qty*l.unit,0), f=kg/raw; let left=Math.round(kg*10000)/10000;
  lines.forEach((l,i)=>{ l.weight=i===lines.length-1?left:Math.round(l.qty*l.unit*f*10000)/10000; left=Math.round((left-l.weight)*10000)/10000; delete l.unit; });
  return lines.sort((a,b)=>a.uom.localeCompare(b.uom)||a.sku.localeCompare(b.sku));   // cases first, then kegs, as in the real report
}

const SZ=7.2, PX=1/1.376;   // the layout below is measured in pixels of a 819-px-wide page image
async function checkSheetPdf(orders, opts){
  const o=opts||{}; const doc=await PDFDocument.create(); doc.setTitle('Demo check sheets'); doc.setCreator('Route Planner demo');
  const reg=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const CYAN=rgb(0,.66,.86), RED=rgb(.86,.1,.1), BLACK=rgb(0,0,0), H=841.89;
  const fmt=n=>Number(n).toFixed(4);
  const draw=(p,s,px,py,f,sz,c)=>p.drawText(String(s),{x:px*PX,y:H-(py+4)*PX,size:sz||SZ,font:f||reg,color:c||BLACK});
  const footer=p=>{ draw(p,'THIS IS NOT A PROOF OF DELIVERY',100,997,reg,11.5); draw(p,'DEMO DRINKS',492,1022,bold,19); draw(p,'invented data for training only',494,1058,reg,8);
    draw(p,'Demo document: no real customer, product or delivery',436,1108,bold,6.2); draw(p,'Made by tests/lib/checksheet.js',436,1120,bold,6.2); };
  const head=p=>{ draw(p,'THIS IS NOT A PROOF OF DELIVERY',60,33,reg,11.5); };
  orders.forEach((x,i)=>{
    const p=doc.addPage([595.28,H]); head(p);
    draw(p,'Demo Drinks Ltd',352,92,reg,11.5); draw(p,'Offloading Sheet Report',313,115,bold,11.5);
    draw(p,'Load Number',28,154,bold); draw(p,': '+x.load,90,154);
    draw(p,'Customer PO No:',373,154,bold); if(x.po) draw(p,x.po,457,154);
    draw(p,'Order Number',668,154,bold); draw(p,':'+x.order,735,154);
    if(x.orderDate){ draw(p,'Order Date:',668,176,bold); draw(p,x.orderDate,738,176); }   // the app must NOT take this one as the day
    draw(p,'Customer Number:',28,197,bold); draw(p,x.customerNo||'',167,197);
    draw(p,'Delivery Date',668,197,bold); draw(p,': '+(x.date||''),733,197);
    draw(p,'Name:',28,218,bold); draw(p,x.name,167,218);
    draw(p,'Address:',28,230,bold);
    const al=x.addrLines||String(x.addr||'1 Demo Street').split(', '); al.forEach((a,k)=>draw(p,a,167,230+k*11.5));
    const hy=295+Math.max(0,al.length+1-4)*11.5; const lw=p.drawLine.bind(p);
    const rule=py=>lw({start:{x:21*PX,y:H-py*PX},end:{x:799*PX,y:H-py*PX},thickness:.6,color:BLACK});
    rule(hy-17); rule(hy+7);
    [['SKU',28],['Item Description',97],['Quantity',314],['UOM',373],['Weight',432],['Empties',491],['Description',560]].forEach(([t,px])=>draw(p,t,px,hy,bold));
    draw(p,'Quantity',738,hy-11,bold); draw(p,'Collected',738,hy,bold);
    const lines=(x.lines||[['KEG501','Harbourside Lager 4.5% 50L Keg',2],['HBL401','Harbourside Lager 4.5% 24x330ml CAN',4]]).map(l=>Array.isArray(l)?{sku:l[0],desc:l[1],qty:l[2],uom:l[3]||'CS',weight:l[4]}:l);
    let cs=0, ea=0, kg=0;
    lines.forEach((l,j)=>{ const y=hy+32+j*11.3, col=l.uom==='EA'?RED:CYAN;
      draw(p,l.sku,28,y); draw(p,l.desc,97,y); draw(p,l.qty,314,y); draw(p,l.uom||'CS',373,y,reg,SZ,col);
      if(l.weight!=null) draw(p,fmt(l.weight),432,y);
      if(l.uom==='EA') ea+=Number(l.qty); else cs+=Number(l.qty); kg+=Number(l.weight||0); });
    if(x.empties){ draw(p,'PAC731',491,hy+32); draw(p,'Empty cases returned @0.75',560,hy+32); draw(p,'________',737,hy+32);
      draw(p,'81001250',491,hy+43.3); draw(p,'FULL PINT BTL CS RETURN @4.10',560,hy+43.3); draw(p,'________',737,hy+43.3); }
    const ty=hy+32+lines.length*11.3+13, right=(s,f)=>f.widthOfTextAtSize(s,SZ)/PX;
    draw(p,'Total CS',358-right('Total CS',reg),ty,reg,SZ,CYAN); draw(p,cs,373,ty,reg,SZ,CYAN);
    draw(p,'Total EA',358-right('Total EA',reg),ty+11.3,reg,SZ,RED); draw(p,ea,373,ty+11.3,reg,SZ,RED);
    draw(p,'Total Weight:',358-right('Total Weight:',reg),ty+22.6); draw(p,fmt(kg),373,ty+22.6);
    footer(p);
    if((o.blankAfter||[]).includes(i)){ const b=doc.addPage([595.28,H]); b.drawText('Customer signature: ______________________',{x:40,y:120,size:10,font:reg}); }
    if((o.reviewAfter||[]).includes(i)){ const r=doc.addPage([595.28,H]); head(r); draw(r,'Demo Drinks Ltd',352,92,reg,11.5); draw(r,'Offloading Sheet Report',313,115,bold,11.5);
      draw(r,'(page scanned badly: no load or order number can be read)',150,190,reg,9); footer(r); }
  });
  return await doc.save();
}
// the demo's file names say nothing about the day (the app reads the day from the first pages)
const JDE_NAMES={Mon:'Offloading_Sheet_Report_2.pdf',Tue:'Offloading_Sheet_Report_4.pdf',Wed:'Offloading_Sheet_Report_1.pdf',Thu:'Offloading_Sheet_Report_5.pdf',Fri:'Offloading_Sheet_Report_3.pdf'};
module.exports={checkSheetPdf, makeLines, CATALOGUE, JDE_NAMES};
