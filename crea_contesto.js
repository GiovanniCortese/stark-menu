const fs = require('fs');
const path = require('path');

// CONFIGURAZIONE: Cartelle e file da IGNORARE
const IGNORE_DIRS = ['node_modules', '.git', '.vscode', 'dist', 'build', 'coverage', 'public/assets']; // Ignora cartelle pesanti
const IGNORE_FILES = ['package-lock.json', '.env', 'crea_contesto.js', '.DS_Store']; // Ignora file inutili o sensibili
const ALLOWED_EXTS = ['.js', '.jsx', '.css', '.html', '.sql', '.json', '.txt', '.md']; // Estensioni da includere

const OUTPUT_FILE = 'TUTTO_IL_CODICE.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (!IGNORE_FILES.includes(file) && ALLOWED_EXTS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(__dirname);
let content = `PROJECT EXPORT - DATE: ${new Date().toISOString()}\n\n`;

allFiles.forEach(filePath => {
  const relativePath = path.relative(__dirname, filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  content += `\n================================================================================\n`;
  content += `FILE: ${relativePath}\n`;
  content += `================================================================================\n`;
  content += fileContent + `\n\n`;
});

fs.writeFileSync(OUTPUT_FILE, content);
console.log(`✅ Fatto! Ho creato ${OUTPUT_FILE} con tutto il tuo codice.`);