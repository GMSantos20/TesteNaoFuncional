/**
 * LÓGICA DO FRONT-END: DISPONIBILIDADE EM TEMPO REAL & USABILIDADE RESILIENTE
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBanner = document.getElementById('status-banner');
  const statusText = document.getElementById('status-text');
  const pulseDot = document.getElementById('pulse-dot');
  const httpBadge = document.getElementById('http-badge');
  const uptimeDisplay = document.getElementById('uptime-display');
  const btnToggle = document.getElementById('btn-toggle');
  const alertBox = document.getElementById('alert-box');

  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const tasksList = document.getElementById('tasks-list');

  const metricSla = document.getElementById('metric-sla');
  const metricRequests = document.getElementById('metric-requests');
  const metricLatency = document.getElementById('metric-latency');
  const metricSecurity = document.getElementById('metric-security');

  let currentSystemHealthy = true;

  // 1. CHECAGEM DO HEALTH CHECK (MONITORAMENTO DE DISPONIBILIDADE)
  async function checkHealth() {
    try {
      const response = await fetch('/health');
      const data = await response.json();

      httpBadge.textContent = `HTTP ${response.status}`;
      uptimeDisplay.textContent = formatUptime(data.uptimeSeconds);

      if (response.status === 200 && data.status === 'UP') {
        currentSystemHealthy = true;
        statusText.textContent = "🟢 Operacional (UP)";
        statusText.className = "status-text online";
        pulseDot.className = "pulse-dot online";
        btnToggle.textContent = "🔴 Simular Queda do Banco";
        btnToggle.className = "btn btn-toggle";
      } else {
        currentSystemHealthy = false;
        statusText.textContent = "🔴 Indisponibilidade Simulada (DOWN)";
        statusText.className = "status-text offline";
        pulseDot.className = "pulse-dot offline";
        btnToggle.textContent = "🟢 Restaurar Serviço (Subir Banco)";
        btnToggle.className = "btn btn-toggle restore";
      }
    } catch (err) {
      statusText.textContent = "⚫ Servidor Inacessível";
      statusText.className = "status-text offline";
      pulseDot.className = "pulse-dot offline";
      httpBadge.textContent = "ERR_OFFLINE";
    }

    updateMetrics();
  }

  // 2. ATUALIZAR MÉTRICAS DE SLA, DESEMPENHO E SEGURANÇA NO PAINEL
  async function updateMetrics() {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const metrics = await res.json();
        metricSla.textContent = metrics.availabilityRate;
        metricRequests.textContent = metrics.totalRequests;
        if (metricLatency && typeof metrics.avgResponseTimeMs === 'number') {
          metricLatency.textContent = `${metrics.avgResponseTimeMs}ms (P95: ${metrics.p95ResponseTimeMs}ms)`;
        }
        if (metricSecurity && typeof metrics.blockedSecurityRequests === 'number') {
          metricSecurity.textContent = metrics.blockedSecurityRequests;
        }
      }
    } catch (e) {}
  }

  // 3. ALTERNAR DISPONIBILIDADE VIA BOTÃO (CHAOS SIMULATION)
  btnToggle.addEventListener('click', async () => {
    try {
      const res = await fetch('/toggle-health', { method: 'POST' });
      const data = await res.json();
      
      showAlert(
        data.status === 'UP' ? 'success' : 'danger',
        data.status === 'UP' 
          ? '✅ Sistema restaurado! A infraestrutura voltou a operar normalmente.'
          : '⚠️ Falha simulada ativada: A base de dados principal está fora do ar.'
      );

      await checkHealth();
    } catch (err) {
      showAlert('danger', 'Erro ao tentar se comunicar com o servidor.');
    }
  });

  // 4. CARREGAR ITENS DA LISTA
  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const items = await res.json();
        renderTasks(items);
      } else {
        // Degradação graciosa ao carregar
        const err = await res.json();
        showAlert('danger', `⚠️ Degradação Graciosa: ${err.message}`);
      }
    } catch (err) {
      console.warn("Falha de rede ao listar tarefas:", err);
    }
  }

  function renderTasks(items) {
    if (!items || items.length === 0) {
      tasksList.innerHTML = `<li class="empty-state">Nenhuma anotação cadastrada no momento.</li>`;
      return;
    }

    tasksList.innerHTML = items.map(item => `
      <li class="task-item" id="task-${item.id}">
        <div class="task-item-content">
          <span class="task-item-text">${escapeHtml(item.text)}</span>
          <span class="task-item-time">${item.createdAt}</span>
        </div>
        <button class="btn-delete" title="Excluir anotação" onclick="deleteTask(${item.id})">
          ✕
        </button>
      </li>
    `).join('');
  }

  // 5. SUBMETER NOVA ANOTAÇÃO (PROVA DE USABILIDADE & DEGRADAÇÃO GRACIOSA)
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();

    // Heurística de Usabilidade: Prevenção de Erros
    if (!text) {
      showAlert('danger', 'Por favor, digite algum texto antes de adicionar.');
      taskInput.focus();
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        // SUCESSO: Limpa campo e recarrega
        taskInput.value = '';
        showAlert('success', 'Anotação salva com sucesso!');
        await loadTasks();
      } else {
        // FALHA / INDISPONIBILIDADE (DEGRADAÇÃO GRACIOSA) OU BLOQUEIO DE SEGURANÇA:
        const errData = await res.json().catch(() => ({}));

        if (res.status === 400 || res.status === 413 || res.status === 429) {
          showAlert(
            'danger',
            `<strong>🛡️ Bloqueio de Segurança (HTTP ${res.status}):</strong> ${errData.message || 'Entrada rejeitada pelas regras de segurança.'}<br><small>💡 A camada de proteção (WAF/Sanitização) impediu que o payload malicioso afetasse o sistema.</small>`
          );
        } else {
          // USABILIDADE: O texto digitado NÃO é apagado do campo
          showAlert(
            'danger',
            `<strong>⚠️ Degradação Graciosa (HTTP ${res.status}):</strong> ${errData.message || 'Serviço temporariamente indisponível.'}<br><small>💡 Seu texto continuou preenchido no campo abaixo para você não perder o que escreveu.</small>`
          );
        }
      }
    } catch (err) {
      showAlert('danger', 'Falha de comunicação com o servidor.');
    }

    updateMetrics();
  });

  // 6. EXCLUIR ANOTAÇÃO
  window.deleteTask = async function(id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadTasks();
      } else {
        const err = await res.json();
        showAlert('danger', `⚠️ Degradação Graciosa: ${err.message}`);
      }
    } catch (err) {
      showAlert('danger', 'Falha ao tentar excluir item.');
    }
    updateMetrics();
  };

  // Helper de alertas amigáveis
  function showAlert(type, htmlContent) {
    alertBox.className = `alert-box alert-${type}`;
    alertBox.innerHTML = htmlContent;
    alertBox.classList.remove('hidden');

    // Remove alerta de sucesso após 4s, mas mantém de erro visível
    if (type === 'success') {
      setTimeout(() => {
        alertBox.classList.add('hidden');
      }, 4000);
    }
  }

  function formatUptime(seconds) {
    if (typeof seconds !== 'number') return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Polling automático de saúde a cada 4 segundos
  checkHealth();
  loadTasks();
  setInterval(checkHealth, 4000);
});
