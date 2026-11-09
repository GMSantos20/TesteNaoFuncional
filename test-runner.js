/**
 * Script de Demonstração de Testes Automatizados Não-Funcionais
 * Executa testes automatizados de Disponibilidade e Usabilidade contra a aplicação Express.
 * 
 * Uso: node test-runner.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, detail = '') {
  if (passed) {
    testsPassed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m - ${name}`);
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
      reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
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

async function runNonFunctionalTestSuite() {
  console.log('\n============================================================');
  console.log('   SUÍTE DE TESTES NÃO-FUNCIONAIS: DISPONIBILIDADE E USABILIDADE');
  console.log('============================================================\n');

  try {
    // -------------------------------------------------------------
    // BLOCO 1: TESTES DE USABILIDADE (WCAG & HEURÍSTICAS DE NIELSEN)
    // -------------------------------------------------------------
    console.log('\x1b[36m[BLOCO 1] Validação de Usabilidade e Acessibilidade (Interface /):\x1b[0m');
    const homeRes = await request('/');
    
    // 1.1 Código HTTP da interface
    logTest('Interface principal deve responder com HTTP 200 OK', homeRes.statusCode === 200);

    // 1.2 Heurística: Rótulos claros para leitores de tela e acessibilidade (labels para inputs)
    const hasNameLabel = homeRes.body.includes('<label for="name">');
    const hasCommentLabel = homeRes.body.includes('<label for="comment">');
    logTest('Presença de rótulos semânticos (<label for="...">) para todos os inputs', hasNameLabel && hasCommentLabel);

    // 1.3 Acessibilidade: Live Region para leitores de tela em mensagens dinâmicas
    const hasAriaLive = homeRes.body.includes('aria-live') || homeRes.body.includes('role="alert"');
    logTest('Suporte a tecnologias assistivas com atributos ARIA (role="alert" / aria-live)', hasAriaLive);

    // 1.4 Acessibilidade: Viewport responsivo para dispositivos móveis
    const hasViewport = homeRes.body.includes('name="viewport"');
    logTest('Responsividade declarada via meta viewport para uso em múltiplos dispositivos', hasViewport);

    // -------------------------------------------------------------
    // BLOCO 2: DISPONIBILIDADE NO ESTADO SAUDÁVEL (UP)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[BLOCO 2] Testes de Disponibilidade no Estado Saudável (UP):\x1b[0m');
    
    const healthUpRes = await request('/health');
    const healthUpJson = JSON.parse(healthUpRes.body);

    // 2.1 Código HTTP 200 no probe de disponibilidade
    logTest('Probe de saúde deve retornar HTTP 200 quando operacional', healthUpRes.statusCode === 200);

    // 2.2 Estrutura semântica para ferramentas de APM (Datadog/NewRelic)
    logTest('Payload JSON deve conter status "UP" e dependências saudáveis', 
      healthUpJson.status === 'UP' && healthUpJson.dependencies.database.status === 'UP');

    // 2.3 Submissão de dados com sucesso
    const submitSuccessRes = await request('/feedback', { method: 'POST' }, 'name=RoboDeTeste&comment=Validando+estado+UP');
    logTest('Submissão funcional bem-sucedida quando infraestrutura está UP', 
      submitSuccessRes.statusCode === 200 && submitSuccessRes.body.includes('gravada com êxito'));

    // -------------------------------------------------------------
    // BLOCO 3: INJEÇÃO DE FALHAS & DEGRADAÇÃO GRACIOSA (DOWN)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[BLOCO 3] Teste de Resiliência sob Injeção de Falha (DOWN):\x1b[0m');

    // 3.1 Ativa simulação de indisponibilidade
    await request('/toggle-health', { method: 'POST' });
    console.log('  \x1b[33m⚡ Injeção de falha ativada: Simulando queda de infraestrutura...\x1b[0m');

    // 3.2 Validação do Probe de Disponibilidade sob Incidente
    const healthDownRes = await request('/health');
    const healthDownJson = JSON.parse(healthDownRes.body);
    logTest('Probe deve retornar HTTP 503 (Service Unavailable) para retirar réplica do balanceador', healthDownRes.statusCode === 503);
    logTest('Payload JSON sob falha deve expor código de erro do incidente (ERR_DB_TIMEOUT)', 
      healthDownJson.incident && healthDownJson.incident.errorCode === 'ERR_DB_TIMEOUT');

    // 3.3 Degradação Graciosa: envio do formulário sob falha
    const submitFailRes = await request('/feedback', { method: 'POST' }, 'name=UsuarioPreocupado&comment=MinhaMensagemImportante');
    
    logTest('Requisição de formulário NÃO deve quebrar com crash ou 500 cru (retorna 503 tratado)', 
      submitFailRes.statusCode === 503);

    logTest('Usabilidade sob falha: Mensagem amigável com explicação clara ao usuário', 
      submitFailRes.body.includes('Degradação Graciosa') || submitFailRes.body.includes('instável'));

    // 3.4 Heurística de Nielsen: Preservação dos dados digitados após o erro
    const preservedName = submitFailRes.body.includes('value="UsuarioPreocupado"');
    const preservedComment = submitFailRes.body.includes('MinhaMensagemImportante');
    logTest('Heurística de Nielsen: Dados preenchidos foram preservados para evitar redigitação', 
      preservedName && preservedComment);

    // -------------------------------------------------------------
    // RESTAURAÇÃO DO SISTEMA
    // -------------------------------------------------------------
    await request('/toggle-health', { method: 'POST' });
    console.log('\n  \x1b[32m✔ Sistema restaurado ao estado inicial (UP).\x1b[0m');

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

runNonFunctionalTestSuite();

