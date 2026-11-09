/**
 * Script de Demonstração de Teste de Carga e Disponibilidade
 * Dispara requisições simultâneas e calcula o SLA e a taxa de disponibilidade observada.
 * 
 * Uso: node stress-test.js
 */

const http = require('http');

const TOTAL_REQUESTS = 50;
const CONCURRENCY = 5;
const BASE_URL = 'http://localhost:3000/api/tasks';

let completed = 0;
let successCount = 0;
let failedCount = 0;
let startTime = Date.now();

console.log('\n============================================================');
console.log(`   TESTE DE CARGA NÃO-FUNCIONAL: MEDIÇÃO DE DISPONIBILIDADE`);
console.log('============================================================');
console.log(`Disparando ${TOTAL_REQUESTS} requisições concorrentes contra: ${BASE_URL}...\n`);

function makeRequest(index) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ text: `Anotação automatizada de estresse #${index}` });
    const url = new URL(BASE_URL);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        completed++;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          successCount++;
          process.stdout.write('\x1b[32m.\x1b[0m'); // Verde para sucesso
        } else {
          failedCount++;
          process.stdout.write('\x1b[31mF\x1b[0m'); // Vermelho para falha/503
        }

        if (completed % 25 === 0) {
          process.stdout.write(` [${completed}/${TOTAL_REQUESTS}]\n`);
        }
        resolve();
      });
    });

    req.on('error', () => {
      completed++;
      failedCount++;
      process.stdout.write('\x1b[31mX\x1b[0m');
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i + 1);

  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      await makeRequest(idx);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const availabilityRate = ((successCount / TOTAL_REQUESTS) * 100).toFixed(2);

  console.log('\n\n------------------------------------------------------------');
  console.log('              RELATÓRIO DE DISPONIBILIDADE (SLA)');
  console.log('------------------------------------------------------------');
  console.log(`Tempo Total do Teste:       ${durationSec}s`);
  console.log(`Requisições Totais:         ${TOTAL_REQUESTS}`);
  console.log(`Sucessos (HTTP 2xx):        ${successCount}`);
  console.log(`Falhas (HTTP 503 / Erros):  ${failedCount}`);
  console.log(`Taxa de Disponibilidade:   \x1b[1m\x1b[${availabilityRate >= 99 ? '32' : '31'}m${availabilityRate}%\x1b[0m`);
  console.log('============================================================\n');
}

run();

