const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const arch = require(path.join(rootDir, 'docs', 'architecture.json'));
const jsDir = path.join(rootDir, 'js');

// Verifica arquivos documentados vs reais.
const actualFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
const documentedFiles = Object.keys(arch.modules).map(modulePath => path.basename(modulePath));

const undocumented = actualFiles.filter(file => !documentedFiles.includes(file));
const nonexistent = documentedFiles.filter(file => !actualFiles.includes(file));

let errors = 0;

if (undocumented.length > 0) {
  console.warn('WARNING: Arquivos sem documentacao em architecture.json:', undocumented);
  errors++;
}

if (nonexistent.length > 0) {
  console.warn('WARNING: Modulos documentados mas inexistentes no disco:', nonexistent);
  errors++;
}

// Verifica cabecalhos.
actualFiles.forEach(file => {
  const content = fs.readFileSync(path.join(jsDir, file), 'utf-8');
  if (!content.trimStart().startsWith('/**')) {
    console.warn(`WARNING: ${file} nao comeca com cabecalho /**`);
    errors++;
  }
});

// Verifica load_order.
const documentedButNotInOrder = actualFiles.filter(
  file => !arch.load_order.includes(`js/${file}`)
);

if (documentedButNotInOrder.length > 0) {
  console.warn('WARNING: Arquivos fora do load_order:', documentedButNotInOrder);
  errors++;
}

if (errors === 0) {
  console.log('OK: Arquitetura documentada e integra.');
} else {
  console.log(`ERROR: ${errors} problema(s) encontrado(s).`);
  process.exit(1);
}
