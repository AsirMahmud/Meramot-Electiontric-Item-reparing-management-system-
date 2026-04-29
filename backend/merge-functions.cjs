const fs = require('fs');
const path = require('path');

const mainSrcDir = 'C:\\Users\\USER\\Desktop\\main_branch\\backend\\src\\controllers';
const destSrcDir = 'C:\\Users\\USER\\Desktop\\Meeramoot-Electiontric-Item-reparing-management-system-\\backend\\src\\controllers';

const files = fs.readdirSync(mainSrcDir).filter(f => f.endsWith('.ts'));

let totalInjected = 0;

for (const file of files) {
  const mainPath = path.join(mainSrcDir, file);
  const destPath = path.join(destSrcDir, file);
  
  if (fs.existsSync(destPath)) {
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    let destContent = fs.readFileSync(destPath, 'utf8');
    
    // Find all exported functions in mainContent
    // Matches: export async function foo(...) or export function foo(...)
    const funcRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    const mainFuncs = [];
    while ((match = funcRegex.exec(mainContent)) !== null) {
      mainFuncs.push({ name: match[1], index: match.index });
    }
    
    for (let i = 0; i < mainFuncs.length; i++) {
      const funcName = mainFuncs[i].name;
      // Check if this function exists in destContent
      const destFuncRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${funcName}\\s*\\(`, 'g');
      if (!destFuncRegex.test(destContent)) {
        // Extract function body from mainContent
        const startIndex = mainFuncs[i].index;
        const endIndex = (i < mainFuncs.length - 1) ? mainFuncs[i+1].index : mainContent.length;
        const funcBody = mainContent.substring(startIndex, endIndex);
        
        // Append to destContent
        destContent += '\n\n' + funcBody;
        console.log(`Injected missing function: ${funcName} into ${file}`);
        totalInjected++;
      }
    }
    
    fs.writeFileSync(destPath, destContent, 'utf8');
  }
}

console.log(`Total functions injected: ${totalInjected}`);
