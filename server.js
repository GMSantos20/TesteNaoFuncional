const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Estado de disponibilidade simulado (true = UP, false = DOWN)
let isSystemHealthy = true;

// Lista de tarefas armazenadas em memória
let tasks = [
  { id: 1, text: "Apresentar seminário de Testes Não-Funcionais", createdAt: "10:00" },
  { id: 2, text: "Demonstrar probe de monitoramento (/health)", createdAt: "10:05" }
];

// Métricas de disponibilidade para a apresentação
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0
};

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

// 4. Endpoint para adicionar tarefa (com tratamento gracioso se DOWN)
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
    metrics.failedRequests++;
    return res.status(400).json({
      error: "Entrada Inválida",
      message: "O texto da anotação não pode ficar vazio."
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

  res.json({
    ...metrics,
    availabilityRate: `${availabilityRate}%`,
    isSystemHealthy
  });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log(`Endpoint de Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
