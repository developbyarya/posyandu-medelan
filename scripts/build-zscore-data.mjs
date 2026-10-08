import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PDF_PATH = path.join(rootDir, 'docs', 'permenkes-2-2020.pdf');
const OUT_DIR = path.join(rootDir, 'src', 'lib', 'zscore', 'data');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Extracting text from PDF...');
const text = execSync(`pdftotext -layout "${PDF_PATH}" -`, { encoding: 'utf8' });
const lines = text.split('\n');

function parseTable(startKeyword, endKeyword, keyIsDecimal = false) {
  const result = {};
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes(startKeyword)) {
      inTable = true;
      continue;
    }
    
    if (inTable && endKeyword && line.includes(endKeyword)) {
      break;
    }

    if (inTable) {
      // Remove asterisk from age/height column, e.g. "24 *" -> "24 "
      line = line.replace(/(\d+)\s*\*/, '$1 ');
      
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.trim().split(/\s+/);
      if (parts.length === 8) {
        const nums = parts.map(Number);
        if (nums.every(n => !isNaN(n))) {
          const key = keyIsDecimal ? nums[0].toFixed(1) : nums[0].toString();
          
          result[key] = {
            '-3': nums[1],
            '-2': nums[2],
            '-1': nums[3],
            '0': nums[4],
            '1': nums[5],
            '2': nums[6],
            '3': nums[7]
          };
        }
      }
    }
  }
  return result;
}

console.log('Parsing BBU...');
const bbuBoys = parseTable('Tabel 1. Standar Berat Badan menurut Umur (BB/U)', 'Tabel 2. Standar Panjang Badan menurut Umur (PB/U)', false);
const bbuGirls = parseTable('Tabel 8. Standar Berat Badan menurut Umur (BB/U)', 'Tabel 9. Standar Panjang Badan menurut Umur (PB/U)', false);

console.log('Parsing PB/U & TB/U...');
const pbuBoys = parseTable('Tabel 2. Standar Panjang Badan menurut Umur (PB/U)', 'Tabel 3. Standar Tinggi Badan menurut Umur (TB/U)', false);
const tbuBoys = parseTable('Tabel 3. Standar Tinggi Badan menurut Umur (TB/U)', 'Tabel 4. Standar Berat Badan menurut Panjang Badan (BB/PB)', false);

const pbuGirls = parseTable('Tabel 9. Standar Panjang Badan menurut Umur (PB/U)', 'Tabel 10. Standar Tinggi Badan menurut Umur (TB/U)', false);
const tbuGirls = parseTable('Tabel 10. Standar Tinggi Badan menurut Umur (TB/U)', 'Tabel 11. Standar Berat Badan menurut Panjang Badan (BB/PB)', false);

const tbuBoysCombined = { ...pbuBoys, ...tbuBoys };
const tbuGirlsCombined = { ...pbuGirls, ...tbuGirls };

console.log('Parsing BB/PB...');
const bbpbBoys = parseTable('Tabel 4. Standar Berat Badan menurut Panjang Badan (BB/PB)', 'Tabel 5. Standar Berat Badan menurut Tinggi Badan (BB/TB)', true);
const bbpbGirls = parseTable('Tabel 11. Standar Berat Badan menurut Panjang Badan (BB/PB)', 'Tabel 12. Standar Berat Badan menurut Tinggi Badan (BB/TB)', true);

console.log('Parsing BB/TB...');
const bbtbBoys = parseTable('Tabel 5. Standar Berat Badan menurut Tinggi Badan (BB/TB)', 'Tabel 6. Standar Indeks Massa Tubuh menurut Umur (IMT/U)', true);
const bbtbGirls = parseTable('Tabel 12. Standar Berat Badan menurut Tinggi Badan (BB/TB)', 'Tabel 13. Standar Indeks Massa Tubuh menurut Umur (IMT/U)', true);

function writeJson(filename, data) {
  const filepath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data));
  const stats = fs.statSync(filepath);
  console.log(`Saved ${filename} (${(stats.size / 1024).toFixed(1)} KB) | keys: ${Object.keys(data).length}`);
}

writeJson('bbu_boys.json', bbuBoys);
writeJson('bbu_girls.json', bbuGirls);

writeJson('tbu_boys.json', tbuBoysCombined);
writeJson('tbu_girls.json', tbuGirlsCombined);

writeJson('bbpb_boys.json', bbpbBoys);
writeJson('bbpb_girls.json', bbpbGirls);

writeJson('bbtb_boys.json', bbtbBoys);
writeJson('bbtb_girls.json', bbtbGirls);

console.log('Done!');
