# Demonstração Prática de Testes Não-Funcionais
## Foco: Disponibilidade (Availability) e Usabilidade (Usability)

Este projeto foi desenvolvido como artefato prático para seminário acadêmico de **Engenharia de Software / Garantia da Qualidade (QA)**, com foco em demonstrar os conceitos e a aplicação de **Testes Não-Funcionais** segundo normas internacionais e heurísticas consolidadas.

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

---

### 🛠️ 2. Tecnologias Utilizadas

- **Back-end:** Node.js com framework minimalista Express.
- **Front-end:** HTML5 semântico, CSS3 puro (paleta com alto contraste WCAG AA) e JavaScript Vanilla.
- **Persistência:** Em memória local (sem dependência de banco de dados externo para facilitar a execução rápida da banca).

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

---

### 🎬 4. Roteiro de Demonstração para Apresentação (2 Minutos)

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

