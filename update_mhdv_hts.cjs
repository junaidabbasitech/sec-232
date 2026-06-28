const fs = require('fs');

const htsDataPath = 'src/data/htsData.ts';
let content = fs.readFileSync(htsDataPath, 'utf8');

// The items we added earlier look like this:
// { code: '8701.21.00', description: 'Medium-Heavy Duty Vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', dutyRate: 'Remedy' }

content = content.replace(/\{ code: '([^']+)', description: 'Medium-Heavy Duty Vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', dutyRate: 'Remedy' \}/g, 
  "{ code: '$1', description: 'Medium-Heavy Duty Vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', additionalTariff: '9903.74.01, 9903.74.03, 9903.74.05, 9903.74.06, 9903.74.07' }");

content = content.replace(/\{ code: '([^']+)', description: 'Buses and other vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', dutyRate: 'Remedy' \}/g, 
  "{ code: '$1', description: 'Buses and other vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', additionalTariff: '9903.74.02, 9903.74.07' }");

content = content.replace(/\{ code: '([^']+)', description: 'Parts of Medium- and Heavy-Duty Vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', dutyRate: 'Remedy' \}/g, 
  "{ code: '$1', description: 'Parts of Medium- and Heavy-Duty Vehicles', annex: 'Proc 10974', page: 1, category: 'MHDV', additionalTariff: '9903.74.08, 9903.74.10, 9903.74.11' }");

fs.writeFileSync(htsDataPath, content);
console.log("Replaced entries in htsData.ts");
