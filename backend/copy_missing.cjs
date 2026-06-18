const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\USER\\Desktop\\main_branch\\backend\\src';
const destDir = 'C:\\Users\\USER\\Desktop\\Meeramoot-Electiontric-Item-reparing-management-system-\\backend\\src';

function copyNewFiles(currentSrc, currentDest) {
    if (!fs.existsSync(currentDest)) {
        fs.mkdirSync(currentDest, { recursive: true });
    }
    
    const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(currentSrc, entry.name);
        const destPath = path.join(currentDest, entry.name);
        
        if (entry.isDirectory()) {
            copyNewFiles(srcPath, destPath);
        } else if (entry.isFile()) {
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied new file: ${destPath}`);
            }
        }
    }
}

copyNewFiles(srcDir, destDir);
console.log('Copy complete.');
