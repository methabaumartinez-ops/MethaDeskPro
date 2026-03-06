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
    if (content.includes('next/navigation') && 
        (content.includes('useParams') || content.includes('useRouter') || content.includes('useSearchParams') || content.includes('usePathname'))) {
        
        if (!content.startsWith("'use client'") && !content.startsWith('"use client"')) {
            content = "'use client';\n" + content;
            fs.writeFileSync(file, content, 'utf8');
            fixedCount++;
            console.log(`Fixed: ${file}`);
        }
    }
}

console.log(`Finished fixing ${fixedCount} files.`);
