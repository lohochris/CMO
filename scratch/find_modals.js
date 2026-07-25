import fs from 'fs';
import path from 'path';

const dir = 'src/pages/dashboard/sports';
const files = fs.readdirSync(dir);

for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.statSync(filePath).isFile() && filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('fixed') && (line.includes('inset-0') || line.includes('z-50') || line.includes('bg-black'))) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
}
process.exit(0);
