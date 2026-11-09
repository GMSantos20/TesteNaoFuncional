/**
 * Script de Demonstração de Teste de Desempenho (Performance)
 * Dispara requisições concorrentes e mede Latência (Média e P95), Vazão (req/s) e Memória.
 * 
 * Uso: node performance-test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TOTAL_REQUESTS = 100;
const CONCURRENCY = 10;

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, detail = '') {
  if (passed) {
    testsPassed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m - ${name} ${detail ? `(${detail})` : ''}`);
  } else {
    testsFailed++;
    console.log(`  \x1b[31m✘ FAIL\x1b[0m - ${name} ${detail ? `(${detail})` : ''}`);
  }
}

function request(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const url = new URL(path, BASE_URL);

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const durationMs = Number((performance.now() - start).toFixed(2));
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          durationMs
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runPerformanceTests() {
  console.log('\n============================================================');
  console.log('   SUÍTE DE TESTES NÃO-FUNCIONAIS: DESEMPENHO');
  console.log('============================================================\n');

  try {
    const metricsBeforeRes = await request('/api/metrics');
    const metricsBefore = JSON.parse(metricsBeforeRes.body);

    console.log(`\x1b[36m[BLOCO 1] Teste de Carga e Tempo de Resposta (${TOTAL_REQUESTS} requisições):\x1b[0m`);

    const times = [];
    let successCount = 0;
    const startTime = Date.now();
    const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i + 1);

    async function worker() {
      while (queue.length > 0) {
        queue.shift();
        const res = await request('/api/tasks');
        times.push(res.durationMs);

        if (res.statusCode === 200) {
          successCount++;
          process.stdout.write('\x1b[32m.\x1b[0m');
        } else {
          process.stdout.write('\x1b[31mF\x1b[0m');
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
    console.log('\n');

    const totalSeconds = (Date.now() - startTime) / 1000;
    const sum = times.reduce((acc, t) => acc + t, 0);
    const avgTime = Number((sum / times.length).toFixed(2));

    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Time = sorted[p95Index];
    const maxTime = sorted[sorted.length - 1];
    const reqPerSec = Number((TOTAL_REQUESTS / totalSeconds).toFixed(1));

    logTest('Tempo médio de resposta abaixo de 50ms', avgTime < 50, `${avgTime}ms`);
    logTest('Percentil 95 (P95) abaixo de 100ms', p95Time < 100, `${p95Time}ms`);

    console.log('\n\x1b[36m[BLOCO 2] Vazão (Throughput) e Consumo de Recursos:\x1b[0m');

    logTest('Todas as requisições concorrentes atendidas com sucesso', successCount === TOTAL_REQUESTS, `${successCount}/${TOTAL_REQUESTS}`);
    logTest('Vazão (Throughput) acima de 50 req/s', reqPerSec >= 50, `${reqPerSec} req/s`);

    const metricsAfterRes = await request('/api/metrics');
    const metricsAfter = JSON.parse(metricsAfterRes.body);
    const memoryMB = metricsAfter.memoryUsageMB;

    logTest('Uso de memória RAM estável (< 100 MB)', memoryMB < 100, `${memoryMB} MB`);

    console.log('\n------------------------------------------------------------');
    console.log('              RELATÓRIO DE DESEMPENHO');
    console.log('------------------------------------------------------------');
    console.log(`Tempo Total do Teste:       ${totalSeconds.toFixed(2)}s`);
    console.log(`Vazão (Throughput):         ${reqPerSec} req/s`);
    console.log(`Latência Média:             ${avgTime}ms`);
    console.log(`Latência P95 / Máxima:      ${p95Time}ms / ${maxTime}ms`);
    console.log(`Memória RAM (Antes/Depois): ${metricsBefore.memoryUsageMB} MB -> ${memoryMB} MB`);
    console.log('============================================================');
    console.log(`RESULTADO DA SUÍTE: ${testsPassed} PASSOU | ${testsFailed} FALHOU`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('\x1b[31mErro ao executar os testes:\x1b[0m', error.message);
    console.log('Certifique-se de que o servidor está rodando na porta 3000 (node server.js)');
  }
}

runPerformanceTests();
