import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const OUT_DIR = path.join(rootDir, 'src', 'lib', 'zscore', 'data');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Ensure xlsx is imported correctly (using dynamic import for CJS module in ESM)
let xlsx;
try {
  xlsx = await import('xlsx');
} catch (e) {
  console.error("Please install xlsx: npm install -D xlsx");
  process.exit(1);
}

const URL_BOYS = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/hcfa-boys-0-5-zscores.xlsx';
const URL_GIRLS = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/head-circumference-for-age/hcfa-girls-0-5-zscores.xlsx';

async function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(downloadBuffer(res.headers.location));
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processXlsx(url, outFilename) {
  console.log(`Downloading ${url}...`);
  const buffer = await downloadBuffer(url);
  
  console.log(`Parsing Excel file...`);
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON
  // Headers in WHO tables are usually: Month, L, M, S, SD3neg, SD2neg, SD1neg, SD0, SD1, SD2, SD3
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find header row index
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i] && data[i].includes('Month')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Could not find header row with "Month"');
  }

  const headers = data[headerRowIdx];
  const monthIdx = headers.indexOf('Month');
  const sd3negIdx = headers.indexOf('SD3neg');
  const sd2negIdx = headers.indexOf('SD2neg');
  const sd1negIdx = headers.indexOf('SD1neg');
  const sd0Idx = headers.indexOf('SD0');
  const sd1posIdx = headers.indexOf('SD1');
  const sd2posIdx = headers.indexOf('SD2');
  const sd3posIdx = headers.indexOf('SD3');
  
  const result = {};
  
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const month = row[monthIdx];
    if (typeof month !== 'number') continue;
    
    // We only need 0-60 months
    if (month > 60) continue;
    
    // Round WHO values to 1 decimal place to match Permenkes style? 
    // Actually Permenkes has 1 decimal for BBU, PB, TB. For LK, let's keep 1 decimal.
    const round1 = (val) => Number(val.toFixed(1));
    
    result[month.toString()] = {
      '-3': round1(row[sd3negIdx]),
      '-2': round1(row[sd2negIdx]),
      '-1': round1(row[sd1negIdx]),
      '0': round1(row[sd0Idx]),
      '1': round1(row[sd1posIdx]),
      '2': round1(row[sd2posIdx]),
      '3': round1(row[sd3posIdx]),
    };
  }
  
  const filepath = path.join(OUT_DIR, outFilename);
  fs.writeFileSync(filepath, JSON.stringify(result));
  console.log(`Saved ${outFilename} (${(fs.statSync(filepath).size / 1024).toFixed(1)} KB) | keys: ${Object.keys(result).length}`);
}

async function main() {
  try {
    await processXlsx(URL_BOYS, 'lk_boys.json');
    await processXlsx(URL_GIRLS, 'lk_girls.json');
    console.log('Done!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
