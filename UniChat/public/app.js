const state = {
  token: localStorage.getItem("unichat.token") || "",
  user: null,
  view: "landing",
  section: "chat",
  adminTab: "documents",
  metrics: null,
  documents: [],
  users: [],
  logs: [],
  messages: []
};

const app = document.querySelector("#app");

const icons = {
  chat: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
  shield: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-5"/></svg>',
  file: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
  users: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chart: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  logs: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8z"/></svg>',
  send: '<svg class="icon" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  upload: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  logout: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>'
};

function roleLabel(role) {
  return {
    colaborador: "Colaborador",
    gestor: "Gestor",
    admin: "Admin"
  }[role] || role;
}

function routeTo(view, section) {
  state.view = view;
  if (section) state.section = section;
  render();
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível concluir a ação.");
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3600);
}

function brand() {
  return `
    <div class="brand">
      <div class="brand-mark">U</div>
      <div class="brand-text">
        <div class="brand-name">UniChat</div>
        <div class="brand-subtitle">Unimed Uberlândia</div>
      </div>
    </div>
  `;
}

function render() {
  if (state.view === "login") {
    renderLogin();
  } else if (state.user) {
    renderApp();
  } else {
    renderLanding();
  }
}

function renderLanding() {
  app.innerHTML = `
    <div class="app-shell landing">
      <header class="topbar">
        ${brand()}
        <div class="topbar-actions">
          <button class="nav-link" data-scroll="#solucao">Solução</button>
          <button class="nav-link" data-scroll="#governanca">Governança</button>
          <button class="button" data-route="login">Acessar</button>
        </div>
      </header>

      <main>
        <section class="hero">
          <canvas class="hero-canvas" id="heroCanvas" aria-hidden="true"></canvas>
          <div class="hero-inner">
            <div class="hero-copy">
              <span class="eyebrow">${icons.shield} Conhecimento institucional</span>
              <h1>UniChat</h1>
              <p>
                Um canal interno para encontrar orientações oficiais com rapidez, clareza e o setor responsável
                pela informação.
              </p>
              <div class="hero-actions">
                <button class="button" data-route="login">Entrar no UniChat</button>
                <button class="button secondary" data-scroll="#solucao">Conhecer</button>
              </div>
              <div class="trust-row">
                <div class="trust-item"><strong>Oficial</strong><span>Respostas com origem identificada.</span></div>
                <div class="trust-item"><strong>Ágil</strong><span>Menos retrabalho nas dúvidas do dia a dia.</span></div>
                <div class="trust-item"><strong>Seguro</strong><span>Acesso restrito aos colaboradores autorizados.</span></div>
              </div>
            </div>
            <div class="hero-panel">
              <div class="preview-window" aria-label="Prévia da interface do chat">
                <div class="preview-header">
                  ${brand()}
                  <div class="window-dots"><span></span><span></span><span></span></div>
                </div>
                <div class="preview-content">
                  <div class="preview-message">Qual setor acompanha orientações sobre dados sensíveis?</div>
                  <div class="preview-message answer">O setor responsável é Governança. A orientação encontrada está vinculada ao documento oficial cadastrado.</div>
                  <div class="source-strip">
                    <span><strong>Fonte</strong><em>Política Interna de Privacidade</em></span>
                    <span><strong>Setor</strong><em>Governança</em></span>
                    <span><strong>Status</strong><em>Documento ativo</em></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="section" id="solucao">
          <div class="section-inner">
            <div class="section-heading">
              <h2>Conhecimento certo, no momento certo</h2>
              <p>
                O UniChat ajuda cada área a encontrar orientações padronizadas, reduzindo dúvidas repetitivas e
                tornando o atendimento interno mais fluido.
              </p>
            </div>
            <div class="feature-grid">
              ${feature(icons.chat, "Atendimento interno", "Perguntas respondidas de forma objetiva, com origem da informação sempre visível.")}
              ${feature(icons.file, "Documentos oficiais", "Conteúdos organizados por setor, categoria, versão e validade.")}
              ${feature(icons.chart, "Acompanhamento", "Gestores visualizam temas frequentes e oportunidades de melhoria por area.")}
            </div>
          </div>
        </section>

        <section class="section alt" id="como-funciona">
          <div class="section-inner">
            <div class="section-heading">
              <h2>Fluxo desenhado para decisão segura</h2>
              <p>
                A experiência foi pensada para ser simples: perguntar, receber a orientação, conferir a fonte e seguir
                para a decisão correta.
              </p>
            </div>
            <div class="process">
              ${step("1", "Pergunta", "O colaborador envia uma dúvida no chat interno.")}
              ${step("2", "Orientação", "O UniChat procura a informação nos documentos vigentes.")}
              ${step("3", "Fonte", "A resposta mostra documento, setor e versão.")}
              ${step("4", "Avaliação", "O colaborador indica se a resposta ajudou.")}
            </div>
          </div>
        </section>

        <section class="section" id="governanca">
          <div class="section-inner">
            <div class="section-heading">
              <h2>Controle institucional</h2>
              <p>
                Administradores mantêm documentos, usuários e acessos organizados. Gestores acompanham indicadores
                para melhorar a disponibilidade das informações por área.
              </p>
            </div>
            <div class="feature-grid">
              ${feature(icons.shield, "Acesso protegido", "Cada perfil visualiza somente as áreas correspondentes à sua função.")}
              ${feature(icons.logs, "Histórico", "Consultas e avaliações ficam disponíveis para acompanhamento administrativo.")}
              ${feature(icons.users, "Perfis", "Colaborador, Gestor e Admin com jornadas especificas.")}
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
  bindLanding();
  drawKnowledgeCanvas("heroCanvas");
}

function feature(icon, title, body) {
  return `
    <article class="feature">
      <div class="feature-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${body}</p>
    </article>
  `;
}

function step(number, title, body) {
  return `
    <article class="process-step">
      <strong>${number}</strong>
      <h3>${title}</h3>
      <p>${body}</p>
    </article>
  `;
}

function bindLanding() {
  document.querySelectorAll("[data-route='login']").forEach(button => {
    button.addEventListener("click", () => routeTo("login"));
  });
  document.querySelectorAll("[data-scroll]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderLogin() {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-visual">
        <canvas id="loginCanvas" aria-hidden="true"></canvas>
        <div class="login-visual-content">
          ${brand()}
          <h1>Acesso seguro ao conhecimento interno</h1>
          <p>
            Entre com seu perfil corporativo para consultar documentos oficiais, acompanhar indicadores ou administrar
            a base institucional do UniChat.
          </p>
        </div>
      </section>
      <section class="login-panel">
        <button class="text-button" data-route="landing">Voltar para apresentação</button>
        <form class="form-card" id="loginForm">
          <div>
            <h2>Entrar</h2>
            <p>Acesse com seu e-mail corporativo.</p>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>E-mail</span>
              <input name="email" type="email" placeholder="seu.email@unimeduberlandia.coop.br" autocomplete="username" required>
            </label>
            <label class="field">
              <span>Senha</span>
              <input name="password" type="password" placeholder="Digite sua senha" autocomplete="current-password" required>
            </label>
          </div>
          <button class="button" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  `;
  document.querySelector("[data-route='landing']").addEventListener("click", () => routeTo("landing"));
  document.querySelector("#loginForm").addEventListener("submit", login);
  drawKnowledgeCanvas("loginCanvas");
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("unichat.token", state.token);
    state.section = data.user.role === "colaborador" ? "chat" : data.user.role === "gestor" ? "manager" : "admin";
    state.view = "app";
    await loadInitialData();
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function loadInitialData() {
  if (!state.user) return;
  if (state.user.role === "gestor" || state.user.role === "admin") {
    state.metrics = await api("/api/manager/metrics");
    state.documents = (await api("/api/documents")).documents;
  }
  if (state.user.role === "admin") {
    state.users = (await api("/api/users")).users;
    state.logs = (await api("/api/admin/logs")).logs;
  }
}

function renderApp() {
  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        ${brand()}
        <nav class="nav">
          ${navButton("chat", icons.chat, "Chat IA", ["colaborador", "gestor", "admin"])}
          ${navButton("manager", icons.chart, "Painel Gestor", ["gestor", "admin"])}
          ${navButton("admin", icons.shield, "Admin", ["admin"])}
        </nav>
        <div class="sidebar-footer">
          <div class="user-box">
            <strong>${escapeHtml(state.user.name)}</strong>
            <span>${roleLabel(state.user.role)} - ${escapeHtml(state.user.sector)}</span>
          </div>
          <button class="button secondary" id="logoutButton">${icons.logout} Sair</button>
        </div>
      </aside>
      <main class="main">
        <header class="main-header">
          <div>
            <h1>${pageTitle()}</h1>
            <p>${pageSubtitle()}</p>
          </div>
          ${state.section === "admin" ? `<button class="button secondary" id="exportLogsButton">${icons.logs} Exportar logs</button>` : ""}
        </header>
        <section class="content">
          ${renderSection()}
        </section>
      </main>
    </div>
  `;
  bindApp();
}

function navButton(section, icon, label, allowed) {
  if (!allowed.includes(state.user.role)) return "";
  return `<button class="${state.section === section ? "active" : ""}" data-section="${section}">${icon}<span>${label}</span></button>`;
}

function pageTitle() {
  if (state.section === "manager") return "Painel Gestor";
  if (state.section === "admin") return "Admin";
  return "Chat IA";
}

function pageSubtitle() {
  if (state.section === "manager") return "Indicadores de uso, engajamento e avaliações por área.";
  if (state.section === "admin") return "Documentos, usuários, perfis e auditoria completa.";
  return "Encontre orientações oficiais com fonte e setor responsável.";
}

function renderSection() {
  if (state.section === "manager") return renderManager();
  if (state.section === "admin") return renderAdmin();
  return renderChat();
}

function bindApp() {
  document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", async () => {
      state.section = button.dataset.section;
      await loadInitialData();
      render();
    });
  });
  document.querySelector("#logoutButton").addEventListener("click", logout);
  document.querySelector("#exportLogsButton")?.addEventListener("click", exportLogs);

  if (state.section === "chat") bindChat();
  if (state.section === "manager") bindManager();
  if (state.section === "admin") bindAdmin();
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } catch (error) {
    state.token = "";
  }
  localStorage.removeItem("unichat.token");
  state.token = "";
  state.user = null;
  state.view = "landing";
  state.messages = [];
  render();
}

function renderChat() {
  if (state.messages.length === 0) {
    state.messages = [
      {
        type: "assistant",
        answer:
          "Olá. Pergunte sobre processos, políticas ou orientações internas. Quando houver informação disponível, eu mostro a fonte e o setor responsável.",
        citations: [],
        confidence: "informativo"
      }
    ];
  }
  return `
    <div class="chat-layout">
      <div class="chat-surface">
        <div class="messages" id="messages">
          ${state.messages.map(renderMessage).join("")}
        </div>
        <form class="chat-form" id="chatForm">
          <textarea name="question" placeholder="Digite sua pergunta sobre a base oficial..." required></textarea>
          <button class="button" type="submit">${icons.send} Enviar</button>
        </form>
      </div>
      <aside class="panel side-panel">
        <h2>Apoio à decisão</h2>
        <p class="hint">As respostas exibem a origem da informação para facilitar o encaminhamento correto.</p>
        <div class="status-list">
          <div class="status-item"><div><strong>Fonte</strong><br><span>Documento usado na resposta</span></div><span class="badge">Oficial</span></div>
          <div class="status-item"><div><strong>Setor</strong><br><span>Responsável pela informação</span></div><span class="badge gray">Contato</span></div>
          <div class="status-item"><div><strong>Avaliação</strong><br><span>Ajude a melhorar as respostas</span></div><span class="badge blue">Feedback</span></div>
        </div>
      </aside>
    </div>
  `;
}

function renderMessage(message) {
  const citations = message.citations?.length
    ? `<div class="citation-list">${message.citations.map(renderCitation).join("")}</div>`
    : "";
  const rating =
    message.type === "assistant" && message.logId
      ? `<div class="rating">
          <button data-rate="${message.logId}" data-value="positive">${icons.check} Útil</button>
          <button data-rate="${message.logId}" data-value="negative">${icons.x} Revisar</button>
        </div>`
      : "";
  return `
    <article class="message ${message.type === "user" ? "user" : "assistant"}">
      <div class="bubble">${escapeHtml(message.type === "user" ? message.text : message.answer)}</div>
      ${message.type === "assistant" ? `<div class="message-meta"><span>Status: ${escapeHtml(message.confidence || "-")}</span></div>` : ""}
      ${citations}
      ${rating}
    </article>
  `;
}

function renderCitation(citation) {
  return `
    <div class="citation">
      <strong>${escapeHtml(citation.title)}</strong>
      <span>Setor: ${escapeHtml(citation.sector)} - Categoria: ${escapeHtml(citation.category)} - Versão: ${escapeHtml(citation.version)}</span>
      <p>${escapeHtml(citation.excerpt || "")}</p>
    </div>
  `;
}

function bindChat() {
  const messages = document.querySelector("#messages");
  messages.scrollTop = messages.scrollHeight;
  document.querySelector("#chatForm").addEventListener("submit", askQuestion);
  document.querySelectorAll("[data-rate]").forEach(button => {
    button.addEventListener("click", rateAnswer);
  });
}

async function askQuestion(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const question = String(form.get("question") || "").trim();
  if (!question) return;
  state.messages.push({ type: "user", text: question });
  state.messages.push({ type: "assistant", answer: "Consultando a base oficial...", citations: [], confidence: "processando" });
  render();

  try {
    const response = await api("/api/chat/ask", {
      method: "POST",
      body: JSON.stringify({ question })
    });
    state.messages.pop();
    state.messages.push({ type: "assistant", ...response });
  } catch (error) {
    state.messages.pop();
    state.messages.push({ type: "assistant", answer: error.message, citations: [], confidence: "erro" });
  }
  render();
}

async function rateAnswer(event) {
  const button = event.currentTarget;
  try {
    await api("/api/chat/rating", {
      method: "POST",
      body: JSON.stringify({
        logId: button.dataset.rate,
        rating: button.dataset.value
      })
    });
    button.parentElement.querySelectorAll("button").forEach(item => {
      item.disabled = true;
    });
    toast("Avaliação registrada.");
  } catch (error) {
    toast(error.message);
  }
}

function renderManager() {
  const metrics = state.metrics || {
    totalQueries: 0,
    uniqueUsers: 0,
    ratings: { positive: 0, negative: 0, pending: 0 },
    topTopics: [],
    usageByUser: [],
    recentLogs: []
  };
  return `
    <div class="filters">
      <label class="field">
        <span>Período</span>
        <select id="periodFilter">
          ${option("7", "Últimos 7 dias", metrics.periodDays === 7)}
          ${option("30", "Últimos 30 dias", metrics.periodDays === 30)}
          ${option("90", "Últimos 90 dias", metrics.periodDays === 90)}
          ${option("all", "Todo histórico", metrics.periodDays === "Todos")}
        </select>
      </label>
      ${state.user.role === "admin" ? `<label class="field"><span>Setor</span><input id="sectorFilter" value="${metrics.sector === "Todos" ? "" : escapeHtml(metrics.sector)}" placeholder="Todos"></label>` : ""}
      <button class="button" id="applyManagerFilter">Filtrar</button>
    </div>

    <div class="dashboard-grid" style="margin-top:16px">
      ${metric("Consultas", metrics.totalQueries)}
      ${metric("Usuários ativos", metrics.uniqueUsers)}
      ${metric("Avaliações positivas", metrics.ratings.positive)}
      ${metric("Para revisar", metrics.ratings.negative)}
    </div>

    <div class="panel-grid">
      <section class="panel">
        <div class="panel-header"><h2>Tópicos mais buscados</h2></div>
        ${
          metrics.topTopics.length
            ? `<div class="status-list">${metrics.topTopics.map(topic => `<div class="status-item"><strong>${escapeHtml(topic.topic)}</strong><span class="badge">${topic.total}</span></div>`).join("")}</div>`
            : `<div class="empty-state">Nenhuma consulta no período.</div>`
        }
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Uso por colaborador</h2></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Setor</th><th>Total</th></tr></thead>
            <tbody>
              ${metrics.usageByUser.map(user => `<tr><td><strong>${escapeHtml(user.name)}</strong><br>${escapeHtml(user.email)}</td><td>${escapeHtml(user.role)}</td><td>${escapeHtml(user.sector)}</td><td>${user.total}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>Consultas recentes</h2></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Data</th><th>Usuário</th><th>Pergunta</th><th>Fonte</th><th>Avaliação</th></tr></thead>
          <tbody>
            ${metrics.recentLogs.map(log => `<tr><td>${formatDate(log.createdAt)}</td><td>${escapeHtml(log.userName)}</td><td>${escapeHtml(log.question)}</td><td>${escapeHtml(log.citations?.[0]?.title || "Sem fonte")}</td><td>${escapeHtml(log.rating || "Pendente")}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
}

function bindManager() {
  document.querySelector("#applyManagerFilter")?.addEventListener("click", async () => {
    const period = document.querySelector("#periodFilter")?.value || "30";
    const sector = document.querySelector("#sectorFilter")?.value || "";
    const query = new URLSearchParams({ period });
    if (sector) query.set("sector", sector);
    try {
      state.metrics = await api(`/api/manager/metrics?${query.toString()}`);
      render();
    } catch (error) {
      toast(error.message);
    }
  });
}

function renderAdmin() {
  return `
    <div class="tabs">
      <button class="${state.adminTab === "documents" ? "active" : ""}" data-admin-tab="documents">${icons.file} Documentos</button>
      <button class="${state.adminTab === "users" ? "active" : ""}" data-admin-tab="users">${icons.users} Usuários</button>
      <button class="${state.adminTab === "logs" ? "active" : ""}" data-admin-tab="logs">${icons.logs} Logs</button>
    </div>
    ${state.adminTab === "documents" ? renderDocumentsAdmin() : state.adminTab === "users" ? renderUsersAdmin() : renderLogsAdmin()}
  `;
}

function renderDocumentsAdmin() {
  return `
    <div class="split-view">
      <section class="panel">
        <div class="panel-header"><h2>Novo documento</h2></div>
        <form class="form-grid" id="documentForm">
          <label class="field"><span>Arquivo .txt</span><input type="file" id="documentFile" accept=".txt,.md,.csv,.json"></label>
          <label class="field"><span>Título</span><input name="title" required></label>
          <label class="field"><span>Setor responsável</span><input name="sector" required></label>
          <label class="field"><span>Categoria</span><input name="category" required></label>
          <label class="field"><span>Versão</span><input name="version" value="1.0" required></label>
          <label class="field"><span>Conteúdo oficial</span><textarea name="content" required></textarea></label>
          <button class="button" type="submit">${icons.upload} Cadastrar</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Base de conhecimento</h2><span class="badge">${state.documents.length} docs</span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Documento</th><th>Setor</th><th>Versão</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              ${state.documents.map(document => `
                <tr>
                  <td><strong>${escapeHtml(document.title)}</strong><br>${escapeHtml(document.category)}</td>
                  <td>${escapeHtml(document.sector)}</td>
                  <td>${escapeHtml(document.version)}</td>
                  <td><span class="badge ${document.status === "active" ? "" : "red"}">${document.status === "active" ? "Ativo" : "Inativo"}</span></td>
                  <td><button class="button secondary" data-toggle-document="${document.id}" data-status="${document.status === "active" ? "inactive" : "active"}">${document.status === "active" ? "Desativar" : "Ativar"}</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderUsersAdmin() {
  return `
    <div class="split-view">
      <section class="panel">
        <div class="panel-header"><h2>Novo usuário</h2></div>
        <form class="form-grid" id="userForm">
          <label class="field"><span>Nome</span><input name="name" required></label>
          <label class="field"><span>E-mail</span><input name="email" type="email" required></label>
          <label class="field"><span>Perfil</span><select name="role" required><option value="colaborador">Colaborador</option><option value="gestor">Gestor</option><option value="admin">Admin</option></select></label>
          <label class="field"><span>Setor</span><input name="sector" required></label>
          <label class="field"><span>Senha inicial</span><input name="password" type="password" required></label>
          <button class="button" type="submit">${icons.users} Criar usuário</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Usuários e perfis</h2><span class="badge">${state.users.length} usuários</span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Setor</th><th>Status</th><th>Ação</th></tr></thead>
            <tbody>
              ${state.users.map(user => `
                <tr>
                  <td><strong>${escapeHtml(user.name)}</strong><br>${escapeHtml(user.email)}</td>
                  <td>
                    <select data-user-role="${user.id}">
                      <option value="colaborador" ${user.role === "colaborador" ? "selected" : ""}>Colaborador</option>
                      <option value="gestor" ${user.role === "gestor" ? "selected" : ""}>Gestor</option>
                      <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                    </select>
                  </td>
                  <td>${escapeHtml(user.sector)}</td>
                  <td><span class="badge ${user.active ? "" : "red"}">${user.active ? "Ativo" : "Inativo"}</span></td>
                  <td><button class="button secondary" data-toggle-user="${user.id}" data-active="${!user.active}">${user.active ? "Desativar" : "Ativar"}</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderLogsAdmin() {
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Logs e auditoria</h2>
        <button class="button" id="exportLogsTableButton">${icons.logs} Exportar .CSV</button>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Data</th><th>Usuário</th><th>Setor</th><th>Pergunta</th><th>Documento usado</th><th>Avaliação</th></tr></thead>
          <tbody>
            ${state.logs.map(log => `
              <tr>
                <td>${formatDate(log.createdAt)}</td>
                <td><strong>${escapeHtml(log.userName)}</strong><br>${escapeHtml(log.userEmail)}</td>
                <td>${escapeHtml(log.userSector)}</td>
                <td>${escapeHtml(log.question)}</td>
                <td>${escapeHtml(log.citations?.map(item => `${item.title} (${item.sector}, v${item.version})`).join(" | ") || "Sem fonte")}</td>
                <td>${escapeHtml(log.rating || "Pendente")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function bindAdmin() {
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", async () => {
      state.adminTab = button.dataset.adminTab;
      await loadInitialData();
      render();
    });
  });

  document.querySelector("#exportLogsTableButton")?.addEventListener("click", exportLogs);

  document.querySelector("#documentFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const form = document.querySelector("#documentForm");
    form.elements.title.value = form.elements.title.value || file.name.replace(/\.[^.]+$/, "");
    form.elements.content.value = text;
  });

  document.querySelector("#documentForm")?.addEventListener("submit", createDocument);
  document.querySelector("#userForm")?.addEventListener("submit", createUser);

  document.querySelectorAll("[data-toggle-document]").forEach(button => {
    button.addEventListener("click", () => updateDocumentStatus(button.dataset.toggleDocument, button.dataset.status));
  });

  document.querySelectorAll("[data-toggle-user]").forEach(button => {
    button.addEventListener("click", () => updateUser(button.dataset.toggleUser, { active: button.dataset.active === "true" }));
  });

  document.querySelectorAll("[data-user-role]").forEach(select => {
    select.addEventListener("change", () => updateUser(select.dataset.userRole, { role: select.value }));
  });
}

async function createDocument(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const file = document.querySelector("#documentFile")?.files?.[0];
  try {
    await api("/api/documents", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        fileName: file?.name || `${form.get("title")}.txt`,
        sector: form.get("sector"),
        category: form.get("category"),
        version: form.get("version"),
        content: form.get("content")
      })
    });
    state.documents = (await api("/api/documents")).documents;
    toast("Documento cadastrado na base oficial.");
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function updateDocumentStatus(id, status) {
  try {
    await api(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    state.documents = (await api("/api/documents")).documents;
    toast("Status do documento atualizado.");
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function createUser(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
        sector: form.get("sector"),
        password: form.get("password")
      })
    });
    state.users = (await api("/api/users")).users;
    toast("Usuário criado.");
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function updateUser(id, patch) {
  try {
    await api(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
    state.users = (await api("/api/users")).users;
    toast("Usuário atualizado.");
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function exportLogs() {
  try {
    const response = await fetch("/api/admin/logs/export", {
      headers: { Authorization: `Bearer ${state.token}` }
    });
    if (!response.ok) throw new Error("Não foi possível exportar os logs.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "unichat-logs.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast(error.message);
  }
}

function drawKnowledgeCanvas(id) {
  const canvas = document.querySelector(`#${id}`);
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const points = Array.from({ length: 52 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0007,
    vy: (Math.random() - 0.5) * 0.0007,
    r: index % 7 === 0 ? 3.2 : 2
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
  }

  function frame() {
    resize();
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f8fbfa";
    context.fillRect(0, 0, width, height);

    points.forEach(point => {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < 0 || point.x > 1) point.vx *= -1;
      if (point.y < 0 || point.y > 1) point.vy *= -1;
    });

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        const dx = (a.x - b.x) * width;
        const dy = (a.y - b.y) * height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 190 * devicePixelRatio) {
          context.strokeStyle = `rgba(0, 153, 93, ${0.13 - (distance / (190 * devicePixelRatio)) * 0.1})`;
          context.lineWidth = 1 * devicePixelRatio;
          context.beginPath();
          context.moveTo(a.x * width, a.y * height);
          context.lineTo(b.x * width, b.y * height);
          context.stroke();
        }
      }
    }

    points.forEach(point => {
      context.fillStyle = point.r > 3 ? "rgba(0, 153, 93, 0.72)" : "rgba(45, 58, 69, 0.36)";
      context.beginPath();
      context.arc(point.x * width, point.y * height, point.r * devicePixelRatio, 0, Math.PI * 2);
      context.fill();
    });

    requestAnimationFrame(frame);
  }

  frame();
}

async function restoreSession() {
  if (!state.token) {
    render();
    return;
  }
  try {
    const data = await api("/api/me");
    state.user = data.user;
    state.view = "app";
    state.section = data.user.role === "colaborador" ? "chat" : data.user.role === "gestor" ? "manager" : "admin";
    await loadInitialData();
  } catch (error) {
    localStorage.removeItem("unichat.token");
    state.token = "";
  }
  render();
}

restoreSession();
