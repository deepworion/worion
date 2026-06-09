/**
 * Script de teste para verificar se a variável de ambiente está sendo lida
 * Execute com: node test-env.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('=== TESTE DE VARIÁVEIS DE AMBIENTE ===\n');

console.log('1. process.env existe?', typeof process !== 'undefined' && !!process.env);
console.log('2. WORION_MODEL_ROUTER_ENABLED:', process.env.WORION_MODEL_ROUTER_ENABLED);
console.log('3. Valor === "true"?', process.env.WORION_MODEL_ROUTER_ENABLED === 'true');

console.log('\n=== ARQUIVO .env ===\n');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('Arquivo .env encontrado em:', envPath);
  const envContent = fs.readFileSync(envPath, 'utf8');
  const modelRouterLine = envContent.split('\n').find(line => line.includes('MODEL_ROUTER'));
  console.log('Linha MODEL_ROUTER no .env:', modelRouterLine || 'NÃO ENCONTRADA');
} else {
  console.log('❌ Arquivo .env NÃO EXISTE em:', envPath);
}

console.log('\n=== OUTRAS VARIÁVEIS WORION ===\n');
const worionVars = Object.keys(process.env).filter(key => key.startsWith('WORION_'));
if (worionVars.length === 0) {
  console.log('❌ Nenhuma variável WORION_* encontrada!');
} else {
  worionVars.forEach(key => {
    const value = process.env[key];
    const display = value ? (value.length > 50 ? value.slice(0, 50) + '...' : value) : 'VAZIA';
    console.log(`${key}:`, display);
  });
}

console.log('\n=== TESTE CONCLUÍDO ===');
