import fs from 'fs';
import path from 'path';

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      walk(fullPath, results);
    } else {
      if (file.endsWith('.sql')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const sqlFiles = walk('.');
console.log('SQL files found:', sqlFiles);
