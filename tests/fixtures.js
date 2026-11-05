// Generates FAKE test spreadsheets (invented customers/drivers) into the folder given as argv[2].
const XLSX=require('xlsx'); const out=process.argv[2]||'.';
const wr=(name,sheet,rows)=>{ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),sheet); XLSX.writeFile(wb,out+'/'+name); };
wr('MASTER_DEL_DETAILS.xlsx','Master',[
 ['Ship To','Ship To Name','Address','Eircode','Latitude','Longitude','Bay','Delivery Days','Time Window'],
 [90000001,'TEST PUB ONE','1 Main St, Dublin','D01 AA11',53.35,-6.26,'BAY001','Mon, Wed','08:00-12:00'],
 [90000002,'TEST PUB TWO','2 High St, Dublin','D02 BB22',53.33,-6.25,'BAY 2','.M.W...','10:00-15:00'],
 [90000003,'TEST HOTEL','3 Quay, Wicklow','A67 CC33',52.98,-6.04,'BAY 03','TUE/THU',''],
 [90000004,'TEST BAR NO LOC','4 Lane, Cork','T12 DD44','','','BAY 03','Fri',''],
 [90000005,'TEST INN','5 Road, Meath','C15 EE55',53.65,-6.68,'Bay 4','Mon','09:00-17:00'],
]);
wr('DIPS_Plan_Tue.xlsx','Plan',[
 ['Load Number','Order Number','Address Number Ship To','Ship To Name','Date Promised Shipment','Weight','Route Code'],
 [70000001,5000001,90000001,'TEST PUB ONE','03/11/2026',120,'R1'],
 [70000001,5000002,90000002,'TEST PUB TWO','03/11/2026',80,'R1'],
 [70000002,5000003,90000003,'TEST HOTEL','03/11/2026',200,'R2'],
 [70000002,5000004,90000009,'UNKNOWN CUST','03/11/2026',50,'R2'],
]);
wr('RES_Tue - 03.11.xlsx','Tue 03.11',[
 ['Shipment','Bay','Driver','Helper','Vehicle','Number of Pallets','DIPS Total KM'],
 [70000001,'BAY 01','Test Driver A','','TRK1',4,120],
 [70000002,'BAY 03','Test Driver B','Test Helper','TRK2',6,180],
]);
console.log('fixtures written');
