const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Users/f.martinez/Desktop/BauDeskPro/src/app');
let fixedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes("import { showAlert } from '@/lib/alert';")) {
        content = content.replace(/import { showAlert } from '@\/lib\/alert';\r?\n?/g, '');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
        fixedCount++;
    }
}
console.log(`Cleaned up ${fixedCount} files.`);
