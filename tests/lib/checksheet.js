// Makes a FAKE check-sheet PDF in the JDE "Offloading Sheet Report" layout (one page per order), with pdf-lib.
// Only invented data goes in here: it is used by the demo week and the browser tests.
//   const bytes = await checkSheetPdf([{load:'74600001', order:'5600001', name:'COPPER INN', date:'09/11/2026'}], {blankAfter:[0]})
const {PDFDocument, StandardFonts}=require('pdf-lib');
async function checkSheetPdf(orders, opts){
  const o=opts||{}; const doc=await PDFDocument.create(); doc.setTitle('Demo check sheets'); doc.setCreator('Route Planner demo');
  const reg=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
  orders.forEach((x,i)=>{
    const p=doc.addPage([595.28,841.89]); const t=(s,X,Y,f,sz)=>p.drawText(String(s),{x:X,y:Y,size:sz||9,font:f||reg});
    t('THIS IS NOT A PROOF OF DELIVERY',40,805,reg,11);
    t('Demo Drinks Ltd',250,770,reg,12); t('Offloading Sheet Report',225,752,bold,13);
    t('Load Number:',30,715,bold); t(x.load,95,715);
    t('Order Number:',430,715,bold); t(x.order,500,715);
    t('Delivery Date:',430,690,bold); t(x.date||'',500,690);
    t('Name:',30,665,bold); t(x.name,120,665);
    t('Address:',30,653,bold); t(x.addr||'1 Demo Street',120,653);
    t('SKU',30,610,bold); t('Item Description',90,610,bold); t('Quantity',300,610,bold);
    (x.lines||[['KEG50','Cider keg 50L',2],['CS24','Cider case 24x500ml',4]]).forEach((l,j)=>{ t(l[0],30,590-j*12); t(l[1],90,590-j*12); t(l[2],300,590-j*12); });
    if((o.blankAfter||[]).includes(i)){ const b=doc.addPage([595.28,841.89]); b.drawText('Customer signature: ______________________',{x:40,y:120,size:10,font:reg}); }
  });
  return await doc.save();
}
module.exports={checkSheetPdf};
