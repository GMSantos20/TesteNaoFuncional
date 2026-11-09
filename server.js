const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Remove cabeçalho padrão do Express por segurança
app.disable('x-powered-by');

// Histórico simples de tempos de resposta (em ms)
const responseTimes = [];

// Middleware de cabeçalhos de segurança e medição de tempo
app.use((req, res, next) => {
  const start = performance.now();

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  res.on('finish', () => {
    const duration = Number((performance.now() - start).toFixed(2));
    responseTimes.push(duration);
    if (responseTimes.length > 200) {
      responseTimes.shift();
    }
  });

  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10kb' }));

// Estado de disponibilidade simulado (true = UP, false = DOWN)
let isSystemHealthy = true;

// Lista de tarefas armazenadas em memória
let tasks = [
  { id: 1, text: "Apresentar seminário de Testes Não-Funcionais", createdAt: "10:00" },
  { id: 2, text: "Demonstrar probe de monitoramento (/health)", createdAt: "10:05" }
];

// Métricas para a apresentação
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  blockedSecurityRequests: 0
};

// Verifica se o texto possui tentativa de XSS ou SQL Injection
function hasMaliciousInput(text) {
  const lower = text.toLowerCase();
  const blockedTerms = [
    '<script',
    '</script>',
    'javascript:',
    'onerror=',
    'onload=',
    '<iframe',
    '<img',
    'drop table',
    "' or '1'='1",
    'union select'
  ];

  return blockedTerms.some(term => lower.includes(term));
}

// 1. Endpoint de Health Check (Observabilidade / Monitoramento de Disponibilidade)
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  
  if (isSystemHealthy) {
    return res.status(200).json({
      status: "UP",
      httpCode: 200,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: "ONLINE",
        cache: "ONLINE"
      }
    });
  } else {
    // Código 503 semântico que ferramentas como Prometheus/Kubernetes usam para detectar falhas
    return res.status(503).json({
      status: "DOWN",
      httpCode: 503,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      error: "DatabaseConnectionTimeout",
      message: "Falha de infraestrutura simulada: Banco de dados inacessível.",
      dependencies: {
        database: "OFFLINE",
        cache: "DEGRADED"
      }
    });
  }
});

// 2. Endpoint para alternar a disponibilidade (Simulador de Queda)
app.post('/toggle-health', (req, res) => {
  isSystemHealthy = !isSystemHealthy;
  res.json({
    status: isSystemHealthy ? "UP" : "DOWN",
    message: isSystemHealthy 
      ? "Serviço restaurado! Todas as requisições voltam a ser processadas."
      : "Falha ativada! Simulando indisponibilidade do banco de dados."
  });
});

// 3. Endpoint para listar tarefas
app.get('/api/tasks', (req, res) => {
  metrics.totalRequests++;
  
  if (!isSystemHealthy) {
    metrics.failedRequests++;
    return res.status(503).json({
      error: "Serviço Indisponível",
      message: "Não foi possível carregar os dados atualizados pois a base está temporariamente inacessível (HTTP 503)."
    });
  }

  metrics.successfulRequests++;
  res.json(tasks);
});

// 4. Endpoint para adicionar tarefa (com tratamento gracioso se DOWN e validação de segurança)
app.post('/api/tasks', (req, res) => {
  metrics.totalRequests++;

  // SE O SISTEMA ESTIVER INDISPONÍVEL (DOWN):
  if (!isSystemHealthy) {
    metrics.failedRequests++;
    return res.status(503).json({
      error: "Serviço Indisponível",
      message: "Não foi possível salvar sua anotação no momento. A camada de banco de dados está fora do ar (HTTP 503)."
    });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({
      error: "Entrada Inválida",
      message: "O texto da anotação não pode ficar vazio."
    });
  }

  if (text.length > 300) {
    metrics.blockedSecurityRequests++;
    metrics.successfulRequests++;
    return res.status(400).json({
      error: "Limite Excedido",
      message: "O texto excede o limite máximo de 300 caracteres."
    });
  }

  if (hasMaliciousInput(text)) {
    metrics.blockedSecurityRequests++;
    metrics.successfulRequests++;
    return res.status(400).json({
      error: "Bloqueio de Segurança",
      message: "Tentativa de injeção de código (XSS / SQL Injection) bloqueada pelo servidor."
    });
  }

  metrics.successfulRequests++;
  const newTask = {
    id: Date.now(),
    text: text.trim(),
    createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  tasks.unshift(newTask);
  res.status(201).json(newTask);
});

// 5. Endpoint para remover tarefa
app.delete('/api/tasks/:id', (req, res) => {
  metrics.totalRequests++;

  if (!isSystemHealthy) {
    metrics.failedRequests++;
    return res.status(503).json({
      error: "Serviço Indisponível",
      message: "Operação não realizada: banco de dados inacessível (HTTP 503)."
    });
  }

  const id = parseInt(req.params.id, 10);
  tasks = tasks.filter(t => t.id !== id);
  metrics.successfulRequests++;
  res.json({ success: true });
});

// 6. Endpoint de métricas da apresentação
app.get('/api/metrics', (req, res) => {
  const availabilityRate = metrics.totalRequests === 0 
    ? 100 
    : ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1);

  let avgResponseTimeMs = 0;
  let p95ResponseTimeMs = 0;

  if (responseTimes.length > 0) {
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    avgResponseTimeMs = Number((sum / responseTimes.length).toFixed(2));

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const index95 = Math.floor(sorted.length * 0.95);
    p95ResponseTimeMs = sorted[index95] || sorted[sorted.length - 1];
  }

  const memoryUsageMB = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));

  res.json({
    ...metrics,
    availabilityRate: `${availabilityRate}%`,
    isSystemHealthy,
    avgResponseTimeMs,
    p95ResponseTimeMs,
    memoryUsageMB
  });
});

// 7. Endpoint administrativo protegido por Token (Teste de Controle de Acesso)
app.get('/api/admin/audit', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    metrics.blockedSecurityRequests++;
    return res.status(401).json({
      error: "Não Autenticado",
      message: "Token de autenticação não informado."
    });
  }

  if (authHeader !== 'Bearer token-admin-123') {
    metrics.blockedSecurityRequests++;
    return res.status(403).json({
      error: "Acesso Negado",
      message: "Você não tem permissão para acessar este recurso."
    });
  }

  res.json({
    status: "OK",
    blockedSecurityRequests: metrics.blockedSecurityRequests
  });
});

// 8. Endpoint de Login com limite de tentativas (Teste de Rate Limit / Força Bruta)
let loginAttempts = 0;
let lastAttemptTime = Date.now();

app.post('/api/login', (req, res) => {
  const now = Date.now();

  // Reinicia contador após 10 segundos
  if (now - lastAttemptTime > 10000) {
    loginAttempts = 0;
  }
  lastAttemptTime = now;

  const { username, password } = req.body;

  if (username === 'admin' && password === '123456') {
    loginAttempts = 0;
    return res.json({ status: "Logado com sucesso", token: "token-admin-123" });
  }

  loginAttempts++;

  if (loginAttempts > 5) {
    metrics.blockedSecurityRequests++;
    return res.status(429).json({
      error: "Muitas Tentativas",
      message: "Bloqueado temporariamente por excesso de tentativas (Rate Limit)."
    });
  }

  res.status(401).json({
    error: "Credenciais Inválidas",
    message: "Usuário ou senha incorretos."
  });
});

// Tratamento para payload JSON maior que o limite de 10kb
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    metrics.blockedSecurityRequests++;
    return res.status(413).json({
      error: "Payload Muito Grande",
      message: "A requisição ultrapassou o limite de 10KB."
    });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log(`Endpoint de Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
