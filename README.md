# Demonstração Prática de Testes Não-Funcionais
## Foco: Disponibilidade, Usabilidade, Desempenho e Segurança

Este projeto foi desenvolvido como artefato prático para seminário acadêmico de **Engenharia de Software / Garantia da Qualidade (QA)**, com foco em demonstrar os conceitos e a aplicação de **Testes Não-Funcionais** segundo normas internacionais (**ISO/IEC 25010**, **ISO 9241-11**, **OWASP Top 10**) e heurísticas consolidadas.

---

### 📌 1. Fundamentação Teórica

#### A. Disponibilidade (Norma ISO/IEC 25010 - Confiabilidade)
- **Definição:** Grau em que um sistema, produto ou componente está operacional e acessível quando requisitado para uso.
- **Probe de Observabilidade (`GET /health`):** Simula as verificações de integridade (*liveness/readiness probes*) utilizadas por orquestradores em nuvem (ex: Kubernetes, AWS ALB, Datadog, Prometheus).
  - **Estado Saudável (UP):** Responde com código semântico `HTTP 200 OK` e dados de dependências conectadas.
  - **Estado Degradado (DOWN):** Responde com código semântico `HTTP 503 Service Unavailable`, sinalizando que a réplica não deve receber tráfego de usuários.
- **Tolerância a Falhas (*Fault Tolerance*):** A queda simulada da base de dados não causa o encerramento do processo (`process.exit`), permitindo recuperação instantânea (*Zero Downtime Recovery*).
- **Métrica de SLA:**
  $$\text{Disponibilidade} = \left(\frac{\text{Requisições com Sucesso}}{\text{Requisições Totais}}\right) \times 100$$

#### B. Usabilidade (Norma ISO 9241-11 e Heurísticas de Jakob Nielsen)
- **Heurística 1 (Visibilidade do Status do Sistema):** O usuário tem feedback imediato do estado do sistema através do indicador em tempo real (`🟢 Operacional` / `🔴 Indisponibilidade Simulada`).
- **Heurística 5 (Prevenção de Erros):** Validação de campos obrigatórios no cliente antes do envio, com foco visual (`:focus-visible`) para acessibilidade por teclado.
- **Heurística 9 (Ajudar a Reconhecer, Diagnosticar e Recuperar-se de Erros):** Quando a infraestrutura falha, a aplicação não entrega uma tela branca nem um erro genérico `500 Internal Server Error`. Ela aplica **Degradação Graciosa**, explicando o problema em linguagem clara.
- **Respeito ao Esforço do Usuário (Preservação de Dados):** Se a requisição falhar devido à indisponibilidade da rede ou banco, o conteúdo digitado no formulário **não é apagado**, eliminando retrabalho.

#### C. Eficiência de Desempenho (Norma ISO/IEC 25010 - Performance Efficiency)
- **Comportamento em Relação ao Tempo (*Time Behaviour*):** Medição em tempo real do tempo de resposta (`performance.now()`) e análise estatística por **Percentil P95** para garantir que 95% das requisições respondam dentro do SLA (`< 100ms`), evitando que a média esconda lentidões críticas (*Tail Latency*).
- **Capacidade e Vazão (*Capacity & Throughput*):** Avaliação da quantidade de requisições atendidas por segundo (**req/s**) sob carga concorrente (múltiplos *workers* simultâneos) sem perda de pacotes.
- **Utilização de Recursos (*Resource Utilization*):** Monitoramento do consumo de memória RAM (`Heap Used` em MB) antes e após picos de estresse para comprovar estabilidade e ausência de vazamento de memória (*Memory Leak*).

#### D. Segurança (Norma ISO/IEC 25010 & OWASP Top 10)
- **Hardening de Cabeçalhos e Ocultação de Assinatura (OWASP A05):** Remoção do cabeçalho `X-Powered-By` (prevenindo *Fingerprinting* da tecnologia) e aplicação de cabeçalhos defensivos (`Content-Security-Policy`, `X-Frame-Options: DENY` contra *Clickjacking* e `X-Content-Type-Options: nosniff`).
- **Integridade e Defesa contra Injeção (OWASP A03 - XSS & SQLi):** Inspeção e bloqueio ativo no back-end contra payloads de **Cross-Site Scripting (`<script>`, `onerror=`)** e **SQL Injection (`' OR '1'='1`, `DROP TABLE`)**, rejeitando entradas maliciosas com `HTTP 400 Bad Request` antes da persistência.
- **Confidencialidade e Controle de Acesso (OWASP A01):** Proteção de endpoint administrativo de auditoria (`GET /api/admin/audit`), diferenciando semanticamente falta de autenticação (`HTTP 401 Unauthorized`) de credencial sem permissão (`HTTP 403 Forbidden`).
- **Prevenção contra DoS e Força Bruta (OWASP A04 / A07):** Limitação de payload JSON em `10KB` (`HTTP 413 Payload Too Large`) e **Rate Limiting** no endpoint `/api/login`, bloqueando ataques de força bruta após 5 tentativas consecutivas com `HTTP 429 Too Many Requests`.

---

### 🛠️ 2. Tecnologias Utilizadas

- **Back-end:** Node.js com framework minimalista Express.
- **Front-end:** HTML5 semântico, CSS3 puro (paleta com alto contraste WCAG AA) e JavaScript Vanilla.
- **Persistência:** Em memória local (sem dependência de banco de dados externo para facilitar a execução rápida da banca).
- **Suítes de Teste Automatizadas:** Scripts nativos em Node.js (`http` e `performance.now()`) sem dependências externas.

---

### 🚀 3. Como Executar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar a aplicação:**
   ```bash
   npm start
   ```

3. **Acessar a interface:**
   Abra seu navegador em [http://localhost:3000](http://localhost:3000)

4. **Acessar o Health Check diretamente:**
   Abra [http://localhost:3000/health](http://localhost:3000/health) ou via terminal:
   ```bash
   curl -i http://localhost:3000/health
   ```

5. **Executar as Suítes de Testes Não-Funcionais (em outro terminal, com o servidor rodando):**
   ```bash
   # Suíte de Desempenho (Latência P50/P95/P99, Throughput req/s e Memória RAM)
   npm run test:performance
   # ou: node performance-test.js

   # Suíte de Segurança (Headers HTTP, XSS, SQLi, Auth 401/403, Payload 413 e Rate Limit 429)
   npm run test:security
   # ou: node security-test.js

   # Teste de Estresse e Disponibilidade (SLA)
   npm run test:stress
   # ou: node stress-test.js
   ```

---

### 🎬 4. Roteiro de Demonstração: Disponibilidade e Usabilidade (2 Minutos)

1. **Estado Normal (UP):**
   - Acesse a interface e adicione uma nota de teste.
   - Mostre que a nota é salva e o badge superior indica `🟢 Operacional (UP)` com HTTP 200.
2. **Injeção de Falha (Chaos Engineering):**
   - Clique em **"🔴 Simular Queda do Banco"**.
   - O badge superior muda para `🔴 Indisponibilidade Simulada (DOWN)` e o código HTTP vai para 503.
   - Abra a aba `/health` para mostrar como o monitoramento em nuvem detectaria o incidente.
3. **Validação de Usabilidade sob Falha:**
   - Tente adicionar uma nova anotação.
   - A aplicação não quebra: exibe o alerta claro de **Degradação Graciosa** e preserva o texto digitado no campo de texto.
4. **Restauração:**
   - Clique em **"🟢 Restaurar Serviço"** e clique em Adicionar novamente para concluir a ação com sucesso.

---

### 🛡️⚡ 5. Roteiro de Apresentação: Desempenho e Segurança (Sua Parte)

Este guia foi estruturado para você conduzir sua parte da apresentação de forma prática, visual e direta (cerca de **2 a 3 minutos**), conectando a teoria da **ISO/IEC 25010** com a execução ao vivo.

---

#### Passo 1: Introdução Rápida (20 segundos)
> **O que falar:**
> *"Complementando os testes de Disponibilidade e Usabilidade apresentados pelo meu colega, eu vou demonstrar outros dois pilares críticos da norma **ISO/IEC 25010**: **Segurança** e **Eficiência de Desempenho**. Enquanto os testes funcionais verificam se o sistema faz o que foi pedido, os testes não-funcionais de Segurança e Desempenho garantem que o sistema resista a ataques maliciosos e responda rápido mesmo sob pico de acessos simultâneos."*

---

#### Passo 2: Demonstração Visual de Segurança no Navegador (40 segundos)
Com o sistema aberto em [http://localhost:3000](http://localhost:3000) e no estado `🟢 Operacional (UP)`:

1. **Simulando um ataque XSS (Cross-Site Scripting) ao vivo:**
   - No campo **"Bloco de Notas Rápidas"**, digite:
     ```html
     <script>alert('Invasao XSS')</script>
     ```
   - Clique em **Adicionar**.
2. **O que mostrar para a turma/professor:**
   - Mostre o alerta vermelho que aparece imediatamente: **`🛡️ Bloqueio de Segurança (HTTP 400): Tentativa de injeção de código malicioso (XSS / SQL Injection) detectada e bloqueada pelo servidor.`**
   - Aponte para o painel lateral direito (**"O que este teste avalia?"**) e mostre que o contador **`Ameaças Bloqueadas (Segurança)`** subiu automaticamente, enquanto a **`Taxa de Disponibilidade (SLA)`** continuou em `100%` (pois bloquear um ataque não derruba o servidor).

---

#### Passo 3: Executando a Suíte Automatizada de Segurança no Terminal (1 minuto)
Abra o terminal (com o servidor rodando) e execute:
```bash
node security-test.js
```
*(ou `npm run test:security`)*

> **O que explicar enquanto os 12 testes passam (`✔ PASS`) na tela:**
> 1. **[BLOCO 1] Cabeçalhos de Segurança HTTP:** *"O script verifica se escondemos a assinatura `X-Powered-By` do Express para dificultar o reconhecimento por atacantes e se injetamos cabeçalhos como `X-Frame-Options: DENY` (contra Clickjacking) e `Content-Security-Policy`."*
> 2. **[BLOCO 2] Proteção contra XSS e SQL Injection:** *"Disparamos payloads de XSS (`<script>`) e SQL Injection (`' OR '1'='1'; DROP TABLE`). O teste valida que ambos recebem `HTTP 400` e em seguida consulta a listagem (`GET /api/tasks`) para provar a **Integridade**: nenhum código malicioso foi salvo na lista."*
> 3. **[BLOCO 3] Controle de Acesso:** *"Testamos a rota restrita `/api/admin/audit` em três cenários: sem token (`HTTP 401`), com token inválido (`HTTP 403`) e com o token correto (`HTTP 200`)."*
> 4. **[BLOCO 4] Prevenção contra Abuso de Payload e Força Bruta:** *"Tentamos enviar um payload acima de 10KB e o servidor rejeita com `HTTP 413 Payload Too Large` para proteger a memória. Por fim, simulamos 6 tentativas erradas seguidas no `/api/login`: após a 5ª tentativa, o servidor bloqueia novas requisições com `HTTP 429 (Rate Limit)`."*

---

#### Passo 4: Executando o Teste de Desempenho no Terminal (1 minuto)
No mesmo terminal, execute:
```bash
node performance-test.js
```
*(ou `npm run test:performance`)*

> **O que explicar sobre o Relatório de Desempenho gerado:**
> 1. **Tempo de Resposta (Média e Percentil P95):**
>    - *"No relatório final, além da **Latência Média** (abaixo de 10ms), avaliamos o **Percentil 95 (P95)**. Em testes de desempenho, o **P95** garante que 95% das requisições são rápidas, evitando que uma média simples esconda gargalos."*
> 2. **Capacidade e Vazão (*Throughput*):**
>    - *"O script dispara 100 requisições concorrentes (10 simultâneas por vez) e atinge uma vazão superior a **1000+ req/s** com 100% de sucesso."*
> 3. **Consumo de Memória RAM:**
>    - *"Comparamos o uso de memória RAM antes e depois da carga (~10-12 MB), comprovando que o consumo permanece estável e sem vazamento de memória (*Memory Leak*)."*

---

#### 💡 Dica Extra (Perguntas Clássicas do Professor / Banca)
- **Por que usar P95 em vez de apenas a Média no teste de Desempenho?**
  - *Resposta:* Porque se 99 requisições levarem 1ms e 1 requisição travar por 1 segundo, a média parece ótima (~10ms), mas o usuário daquela requisição sofreu lentidão. O percentil P95/P99 revela esses *outliers* (*Tail Latency*).
- **Qual a diferença entre HTTP 401, 403 e 429 testados na suíte de Segurança?**
  - *Resposta:* `401 Unauthorized` significa que o usuário não se identificou (sem token); `403 Forbidden` significa que ele enviou uma credencial, mas não tem permissão de administrador; e `429 Too Many Requests` indica bloqueio por excesso de tentativas (proteção contra força bruta / DoS).


