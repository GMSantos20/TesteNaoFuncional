/**
 * Script de Demonstração de Testes Automatizados de Segurança
 * Testa cabeçalhos HTTP, bloqueio de XSS/SQL Injection, autenticação e limite de requisições.
 * 
 * Uso: node security-test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
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
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSecurityTests() {
  console.log('\n============================================================');
  console.log('   SUÍTE DE TESTES NÃO-FUNCIONAIS: SEGURANÇA');
  console.log('============================================================\n');

  try {
    // -------------------------------------------------------------
    // BLOCO 1: CABEÇALHOS DE SEGURANÇA HTTP
    // -------------------------------------------------------------
    console.log('\x1b[36m[BLOCO 1] Verificação de Cabeçalhos de Segurança HTTP:\x1b[0m');
    const homeRes = await request('/');

    logTest('Cabeçalho X-Powered-By oculto para não expor tecnologia', !homeRes.headers['x-powered-by']);
    logTest('Proteção contra MIME Sniffing (X-Content-Type-Options: nosniff)', homeRes.headers['x-content-type-options'] === 'nosniff');
    logTest('Proteção contra Clickjacking (X-Frame-Options: DENY)', homeRes.headers['x-frame-options'] === 'DENY');
    logTest('Política Content-Security-Policy (CSP) ativa', Boolean(homeRes.headers['content-security-policy']));

    // -------------------------------------------------------------
    // BLOCO 2: BLOQUEIO DE INJEÇÃO (XSS & SQL INJECTION)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[BLOCO 2] Proteção contra XSS e SQL Injection:\x1b[0m');

    const xssRes = await request('/api/tasks', { method: 'POST' }, JSON.stringify({
      text: "<script>alert('XSS')</script>"
    }));
    logTest('Bloqueio de script malicioso (<script>) com HTTP 400', xssRes.statusCode === 400);

    const sqliRes = await request('/api/tasks', { method: 'POST' }, JSON.stringify({
      text: "teste' OR '1'='1'; DROP TABLE tasks;"
    }));
    logTest('Bloqueio de tentativa de SQL Injection com HTTP 400', sqliRes.statusCode === 400);

    const tasksRes = await request('/api/tasks');
    const isClean = !tasksRes.body.includes("<script>") && !tasksRes.body.includes("DROP TABLE");
    logTest('Integridade dos dados: entradas maliciosas não foram salvas na lista', isClean);

    // -------------------------------------------------------------
    // BLOCO 3: CONTROLE DE ACESSO E AUTENTICAÇÃO
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[BLOCO 3] Controle de Acesso em Rota Restrita (/api/admin/audit):\x1b[0m');

    const noTokenRes = await request('/api/admin/audit');
    logTest('Acesso sem token bloqueado com HTTP 401 (Não Autenticado)', noTokenRes.statusCode === 401);

    const wrongTokenRes = await request('/api/admin/audit', {
      headers: { 'Authorization': 'Bearer token-invalido' }
    });
    logTest('Acesso com token inválido bloqueado com HTTP 403 (Acesso Negado)', wrongTokenRes.statusCode === 403);

    const validTokenRes = await request('/api/admin/audit', {
      headers: { 'Authorization': 'Bearer token-admin-123' }
    });
    logTest('Acesso com token correto liberado com HTTP 200', validTokenRes.statusCode === 200);

    // -------------------------------------------------------------
    // BLOCO 4: LIMITE DE PAYLOAD E PROTEÇÃO CONTRA FORÇA BRUTA
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[BLOCO 4] Prevenção contra Abuso de Payload e Força Bruta:\x1b[0m');

    const bigPayload = JSON.stringify({ text: 'A'.repeat(15000) });
    const bigPayloadRes = await request('/api/tasks', { method: 'POST' }, bigPayload);
    logTest('Bloqueio de payload acima de 10KB com HTTP 413 (Payload Too Large)', bigPayloadRes.statusCode === 413);

    // Faz um login válido primeiro para zerar o contador de tentativas
    await request('/api/login', { method: 'POST' }, JSON.stringify({ username: 'admin', password: '123456' }));

    // Dispara 6 tentativas incorretas seguidas para testar o bloqueio (Rate Limit)
    let lastStatus = 0;
    for (let i = 1; i <= 6; i++) {
      const loginRes = await request('/api/login', { method: 'POST' }, JSON.stringify({
        username: 'admin',
        password: 'senha-errada'
      }));
      lastStatus = loginRes.statusCode;
    }

    logTest('Bloqueio de Força Bruta após 5 tentativas falhas com HTTP 429 (Rate Limit)', lastStatus === 429);

    // -------------------------------------------------------------
    // RESUMO FINAL
    // -------------------------------------------------------------
    console.log('\n============================================================');
    console.log(`RESULTADO DA SUÍTE: ${testsPassed} PASSOU | ${testsFailed} FALHOU`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('\x1b[31mErro ao executar os testes:\x1b[0m', error.message);
    console.log('Certifique-se de que o servidor está rodando na porta 3000 (node server.js)');
  }
}

runSecurityTests();
