const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getAllTsFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        scanDir(fullPath);
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

function transpileFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      resolveJsonModule: true
    }
  });
  
  const relativePath = path.relative('src', filePath);
  const outPath = path.join('dist', relativePath).replace('.ts', '.js');
  const outDir = path.dirname(outPath);
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  fs.writeFileSync(outPath, result.outputText);
  console.log(`Compiled: ${filePath} -> ${outPath}`);
}

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Get all TypeScript files in src directory
const tsFiles = getAllTsFiles('src');

// Transpile each file
tsFiles.forEach(transpileFile);

console.log(`Successfully compiled ${tsFiles.length} files.`);
