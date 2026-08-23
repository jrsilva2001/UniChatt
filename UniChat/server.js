const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const config = createConfig();
const PORT = config.port;
const PUBLIC_DIR = config.publicDir;
const DATA_DIR = config.dataDir;
const USERS_FILE = path.join(DATA_DIR, "users.json");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

const sessions = new Map();

const roleNames = {
  colaborador: "Colaborador",
  gestor: "Gestor",
  admin: "Admin"
};

const seedPassword = "Unichat@2026";
const defaultEmailMigration = new Map([
  ["admin@unichat.local", "admin@unimeduberlandia.coop.br"],
  ["gestor@unichat.local", "gestor@unimeduberlandia.coop.br"],
  ["colaborador@unichat.local", "colaborador@unimeduberlandia.coop.br"]
]);

function createConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const sessionSecret = process.env.SESSION_SECRET || "change-this-secret-before-production";
  const httpsEnabled = process.env.HTTPS_ENABLED === "true";
  const trustProxy = process.env.TRUST_PROXY === "true";
  const storageDriver = process.env.STORAGE_DRIVER || "json";
  const documentRepositoryPath = process.env.DOCUMENT_REPOSITORY_PATH
    ? path.resolve(process.env.DOCUMENT_REPOSITORY_PATH)
    : "";

  const runtimeConfig = {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT || 3000),
    publicDir: path.join(ROOT, "public"),
    dataDir: path.join(ROOT, "data"),
    sessionSecret,
    storageDriver,
    allowJsonStorageInProduction: process.env.ALLOW_JSON_STORAGE_IN_PRODUCTION === "true",
    https: {
      enabled: httpsEnabled,
      keyPath: process.env.HTTPS_KEY_PATH || "",
      certPath: process.env.HTTPS_CERT_PATH || "",
      trustProxy
    },
    sso: {
      enabled: process.env.SSO_ENABLED === "true",
      mode: process.env.SSO_MODE || "trusted-header",
      emailHeader: (process.env.SSO_EMAIL_HEADER || "x-authenticated-email").toLowerCase(),
      localLoginEnabled: process.env.LOCAL_LOGIN_ENABLED !== "false"
    },
    documentRepositoryPath
  };

  validateConfig(runtimeConfig);
  return runtimeConfig;
}

function validateConfig(runtimeConfig) {
  if (!Number.isFinite(runtimeConfig.port) || runtimeConfig.port <= 0) {
    throw new Error("PORT deve ser um número válido.");
  }

  if (runtimeConfig.storageDriver !== "json") {
    throw new Error("STORAGE_DRIVER informado ainda não possui adaptador ativo neste pacote.");
  }

  if (runtimeConfig.isProduction) {
    if (
      !process.env.SESSION_SECRET ||
      runtimeConfig.sessionSecret === "change-this-secret-before-production" ||
      runtimeConfig.sessionSecret.length < 32
    ) {
      throw new Error("Em produção, configure SESSION_SECRET com uma chave forte de pelo menos 32 caracteres.");
    }

    if (!runtimeConfig.https.enabled && !runtimeConfig.https.trustProxy) {
      throw new Error("Em produção, habilite HTTPS_ENABLED=true ou TRUST_PROXY=true quando houver proxy HTTPS.");
    }

    if (runtimeConfig.storageDriver === "json" && !runtimeConfig.allowJsonStorageInProduction) {
      throw new Error("Em produção, configure um armazenamento corporativo ou defina ALLOW_JSON_STORAGE_IN_PRODUCTION=true de forma consciente.");
    }
  }

  if (runtimeConfig.https.enabled && (!runtimeConfig.https.keyPath || !runtimeConfig.https.certPath)) {
    throw new Error("HTTPS_ENABLED=true requer HTTPS_KEY_PATH e HTTPS_CERT_PATH.");
  }

  if (runtimeConfig.sso.enabled && runtimeConfig.sso.mode !== "trusted-header") {
    throw new Error("O modo SSO disponível neste pacote é trusted-header.");
  }
}

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    writeJson(USERS_FILE, [
      createUserSeed("u-admin", "Administrador UniChat", "admin@unimeduberlandia.coop.br", "admin", "Governança", true),
      createUserSeed("u-gestor", "Gestor Atendimento", "gestor@unimeduberlandia.coop.br", "gestor", "Atendimento", true),
      createUserSeed("u-colab", "Colaborador Atendimento", "colaborador@unimeduberlandia.coop.br", "colaborador", "Atendimento", true)
    ]);
  }

  if (!fs.existsSync(DOCUMENTS_FILE)) {
    const now = new Date().toISOString();
    writeJson(DOCUMENTS_FILE, [
      {
        id: "doc-politica-lgpd",
        title: "Política Interna de Privacidade e LGPD",
        fileName: "politica-lgpd.txt",
        sector: "Governança",
        category: "Compliance",
        version: "1.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
        ownerUserId: "u-admin",
        content:
          "A consulta a informações corporativas deve ocorrer somente em bases internas autorizadas. Dados pessoais e dados sensíveis de pacientes, clientes, cooperados e colaboradores não devem ser compartilhados em ferramentas externas não homologadas. Em caso de dúvida sobre tratamento de dados, o setor responsável é Governança. Toda consulta deve preservar finalidade, necessidade, confidencialidade e rastreabilidade. Incidentes ou suspeitas de exposição indevida devem ser encaminhados imediatamente para Governança."
      },
      {
        id: "doc-atendimento-prazos",
        title: "Procedimento de Atendimento - Prazos e Escalonamento",
        fileName: "procedimento-atendimento.txt",
        sector: "Atendimento",
        category: "Operacional",
        version: "1.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
        ownerUserId: "u-admin",
        content:
          "Solicitações de beneficiários devem ser registradas no sistema corporativo de atendimento com classificação do tema, prioridade e responsável. Demandas simples devem ser respondidas com base nos documentos oficiais vigentes. Quando a resposta depender de decisão técnica ou exceção operacional, o colaborador deve acionar o gestor do Atendimento. Consultas repetitivas devem ser direcionadas para a base oficial para padronizar a resposta."
      },
      {
        id: "doc-autorizacao",
        title: "Orientação de Autorização de Procedimentos",
        fileName: "autorizacao-procedimentos.txt",
        sector: "Autorizações",
        category: "Saúde",
        version: "1.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
        ownerUserId: "u-admin",
        content:
          "Pedidos de autorização devem ser analisados conforme cobertura contratual, documentação apresentada e regras internas vigentes. O colaborador deve consultar a base oficial antes de orientar o beneficiário. Se houver divergência entre documentos, prevalece a versão ativa mais recente cadastrada pelo setor responsável. Casos clínicos sensíveis devem ser tratados com confidencialidade e encaminhados ao setor de Autorizações."
      }
    ]);
  }

  if (!fs.existsSync(LOGS_FILE)) {
    writeJson(LOGS_FILE, []);
  }

  migrateDefaultEmails();
}

function migrateDefaultEmails() {
  const users = readJson(USERS_FILE, []);
  let usersChanged = false;
  users.forEach(user => {
    const migratedEmail = defaultEmailMigration.get(String(user.email || "").toLowerCase());
    if (migratedEmail) {
      user.email = migratedEmail;
      user.updatedAt = new Date().toISOString();
      usersChanged = true;
    }
  });
  if (usersChanged) writeJson(USERS_FILE, users);

  const logs = readJson(LOGS_FILE, []);
  let logsChanged = false;
  logs.forEach(log => {
    const migratedEmail = defaultEmailMigration.get(String(log.userEmail || "").toLowerCase());
    if (migratedEmail) {
      log.userEmail = migratedEmail;
      logsChanged = true;
    }
  });
  if (logsChanged) writeJson(LOGS_FILE, logs);
}

function createUserSeed(id, name, email, role, sector, active) {
  const password = hashPassword(seedPassword);
  const now = new Date().toISOString();
  return {
    id,
    name,
    email,
    role,
    sector,
    active,
    passwordSalt: password.salt,
    passwordHash: password.hash,
    createdAt: now,
    updatedAt: now
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const attempted = hashPassword(password, user.passwordSalt);
  const stored = Buffer.from(user.passwordHash, "hex");
  const provided = Buffer.from(attempted.hash, "hex");
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

function signToken(userId) {
  const nonce = crypto.randomBytes(24).toString("hex");
  const payload = `${userId}.${Date.now()}.${nonce}`;
  const signature = crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
  const token = `${payload}.${signature}`;
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function sanitizeUser(user) {
  const { passwordSalt, passwordHash, ...safeUser } = user;
  return safeUser;
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders()
  });
  res.end(JSON.stringify(data));
}

function sendCsv(res, fileName, rows) {
  const content = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
    ...securityHeaders()
  });
  res.end(content);
}

function securityHeaders() {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
  if (config.isProduction && (config.https.enabled || config.https.trustProxy)) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function getAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = sessions.get(token);
  if (!session) return null;

  const users = readJson(USERS_FILE, []);
  const user = users.find(item => item.id === session.userId && item.active);
  if (!user) return null;

  return { token, user };
}

function findActiveUserByEmail(email) {
  const users = readJson(USERS_FILE, []);
  return users.find(item => item.email.toLowerCase() === String(email || "").toLowerCase() && item.active);
}

function requireAuth(req, res, allowedRoles) {
  const auth = getAuth(req);
  if (!auth) {
    sendJson(res, 401, { error: "Acesso não autenticado." });
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
    sendJson(res, 403, { error: "Perfil sem permissão para esta ação." });
    return null;
  }
  return auth;
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const SEARCH_STOP_WORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "um",
  "uma",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "com",
  "que",
  "quem",
  "qual",
  "quais",
  "como",
  "quando",
  "onde",
  "sobre",
  "ao",
  "aos",
  "na",
  "no",
  "nas",
  "nos",
  "se",
  "ou",
  "ser",
  "ter",
  "deve",
  "devem",
  "saber",
  "sabe",
  "preciso",
  "gostaria",
  "pergunta",
  "resposta",
  "responder",
  "consulta",
  "consultar",
  "base",
  "documento",
  "documentos",
  "oficial",
  "oficiais",
  "interno",
  "interna",
  "internos",
  "internas",
  "informacao",
  "informacoes",
  "orientacao",
  "orientacoes",
  "setor",
  "responsavel",
  "responsaveis",
  "acionar",
  "aciono",
  "falar",
  "tratar"
]);

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/g)
    .filter(word => word.length > 2 && !SEARCH_STOP_WORDS.has(word));
}

function singularizeToken(token) {
  if (token.endsWith("oes") && token.length > 5) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("ais") && token.length > 5) return `${token.slice(0, -3)}al`;
  if (token.endsWith("eis") && token.length > 5) return `${token.slice(0, -3)}el`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);
  return token;
}

function expandSearchTerm(term) {
  const singular = singularizeToken(term);
  return singular === term ? [term] : [term, singular];
}

function buildQuestionTerms(text) {
  const seen = new Set();
  return tokenize(text).reduce((terms, term) => {
    const canonical = singularizeToken(term);
    if (seen.has(canonical)) return terms;
    seen.add(canonical);
    terms.push({ term: canonical, variants: expandSearchTerm(term) });
    return terms;
  }, []);
}

function buildSearchTermSet(text) {
  return new Set(tokenize(text).flatMap(expandSearchTerm));
}

function matchedQuestionTerms(questionTerms, termSet) {
  return questionTerms
    .filter(({ variants }) => variants.some(variant => termSet.has(variant)))
    .map(({ term }) => term);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function buildChunks(document) {
  const sentences = splitSentences(readDocumentContent(document));
  const chunks = [];
  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push({
      document,
      text: sentences.slice(index, index + 2).join(" ")
    });
  }
  const content = readDocumentContent(document);
  if (chunks.length === 0 && content) {
    chunks.push({ document, text: content.slice(0, 1200) });
  }
  return chunks;
}

function readDocumentContent(document) {
  if (document.repositoryPath) {
    const resolvedPath = path.resolve(document.repositoryPath);
    if (config.documentRepositoryPath && !resolvedPath.startsWith(config.documentRepositoryPath)) {
      return "";
    }
    try {
      return fs.readFileSync(resolvedPath, "utf8");
    } catch (error) {
      return "";
    }
  }
  return document.content || "";
}

function saveDocumentContent(fileName, content) {
  if (!config.documentRepositoryPath) {
    return { content, repositoryPath: "" };
  }

  fs.mkdirSync(config.documentRepositoryPath, { recursive: true });
  const safeName = String(fileName || crypto.randomUUID())
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const finalName = safeName || `${crypto.randomUUID()}.txt`;
  const repositoryPath = path.join(config.documentRepositoryPath, finalName);
  fs.writeFileSync(repositoryPath, content, "utf8");
  return { content: "", repositoryPath };
}

function searchKnowledgeBase(question, documents) {
  const terms = buildQuestionTerms(question);
  if (terms.length === 0) return [];

  const chunks = documents.filter(doc => doc.status === "active").flatMap(buildChunks);

  return chunks
    .map(chunk => {
      const text = `${chunk.document.title} ${chunk.document.sector} ${chunk.document.category} ${chunk.text}`;
      const textTerms = buildSearchTermSet(text);
      const metadataTerms = buildSearchTermSet(`${chunk.document.title} ${chunk.document.sector} ${chunk.document.category}`);
      const matchedTerms = matchedQuestionTerms(terms, textTerms);
      const metadataMatchedTerms = matchedQuestionTerms(terms, metadataTerms);
      const coverage = matchedTerms.length / terms.length;
      const score = matchedTerms.length + metadataMatchedTerms.length * 0.4 + coverage;
      return { ...chunk, score, coverage, matchedTerms, metadataMatchedTerms };
    })
    .filter(item => {
      if (item.matchedTerms.length >= 2 && item.coverage >= 0.5) return true;
      return terms.length === 1 && item.metadataMatchedTerms.length === 1;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function composeAnswer(matches) {
  if (matches.length === 0) {
    return {
      answer:
        "Não encontrei informação suficiente na base oficial ativa para responder com segurança. Recomendo acionar o setor responsável ou solicitar que o documento oficial seja cadastrado na base.",
      confidence: "baixa",
      citations: []
    };
  }

  const primary = matches[0];
  const citations = matches.map(match => ({
    documentId: match.document.id,
    title: match.document.title,
    fileName: match.document.fileName,
    sector: match.document.sector,
    category: match.document.category,
    version: match.document.version,
    excerpt: match.text
  }));

  return {
    answer:
      `Com base no documento oficial "${primary.document.title}", a orientação encontrada é: ${primary.text} ` +
      `Setor responsável: ${primary.document.sector}. ` +
      "Use esta resposta como referência institucional rastreável. Se o caso envolver exceção, decisão técnica ou dado sensível, acione o setor responsável informado.",
    confidence: primary.score >= 3 ? "alta" : "media",
    citations
  };
}

function createLog({ user, question, result }) {
  const logs = readJson(LOGS_FILE, []);
  const log = {
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    userSector: user.sector,
    question,
    answer: result.answer,
    confidence: result.confidence,
    citations: result.citations.map(item => ({
      documentId: item.documentId,
      title: item.title,
      fileName: item.fileName,
      sector: item.sector,
      category: item.category,
      version: item.version
    })),
    rating: null,
    createdAt: new Date().toISOString()
  };
  logs.unshift(log);
  writeJson(LOGS_FILE, logs);
  return log;
}

function getMetrics(scopeUser, query) {
  const logs = readJson(LOGS_FILE, []);
  const users = readJson(USERS_FILE, []).map(sanitizeUser);
  const sector = scopeUser.role === "gestor" ? scopeUser.sector : query.sector || "";
  const period = query.period || "30";
  const days = Number(period);
  const since = Number.isFinite(days) && days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  const scopedLogs = logs.filter(log => {
    const bySector = sector ? log.userSector === sector : true;
    const byDate = since ? new Date(log.createdAt).getTime() >= since : true;
    return bySector && byDate;
  });

  const topicCount = new Map();
  scopedLogs.forEach(log => {
    tokenize(log.question)
      .slice(0, 5)
      .forEach(term => topicCount.set(term, (topicCount.get(term) || 0) + 1));
  });

  const ratings = scopedLogs.reduce(
    (acc, log) => {
      if (log.rating === "positive") acc.positive += 1;
      if (log.rating === "negative") acc.negative += 1;
      if (!log.rating) acc.pending += 1;
      return acc;
    },
    { positive: 0, negative: 0, pending: 0 }
  );

  const usageByUser = users
    .filter(user => (sector ? user.sector === sector : true))
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleNames[user.role],
      sector: user.sector,
      active: user.active,
      total: scopedLogs.filter(log => log.userId === user.id).length
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalQueries: scopedLogs.length,
    uniqueUsers: new Set(scopedLogs.map(log => log.userId)).size,
    sector: sector || "Todos",
    periodDays: period === "all" ? "Todos" : days,
    ratings,
    topTopics: [...topicCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, total]) => ({ topic, total })),
    usageByUser,
    recentLogs: scopedLogs.slice(0, 10)
  };
}

function parseQuery(reqUrl) {
  const url = new URL(reqUrl, `http://localhost:${PORT}`);
  return Object.fromEntries(url.searchParams.entries());
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestedPath = url.pathname === "/" ? "index.html" : url.pathname;
  const filePath = path.resolve(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(path.resolve(PUBLIC_DIR))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() });
        res.end(fallbackContent);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg"
    };
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600",
      ...securityHeaders()
    });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  try {
    if (method === "GET" && url.pathname === "/api/auth/options") {
      sendJson(res, 200, {
        ssoEnabled: config.sso.enabled,
        localLoginEnabled: config.sso.localLoginEnabled
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/login") {
      if (!config.sso.localLoginEnabled) {
        sendJson(res, 403, { error: "Login local desabilitado para este ambiente." });
        return;
      }
      const body = await getBody(req);
      const user = findActiveUserByEmail(body.email);
      if (!user || !user.active || !verifyPassword(String(body.password || ""), user)) {
        sendJson(res, 401, { error: "E-mail ou senha inválidos." });
        return;
      }
      const token = signToken(user.id);
      sendJson(res, 200, { token, user: sanitizeUser(user) });
      return;
    }

    if (method === "GET" && url.pathname === "/api/auth/sso") {
      if (!config.sso.enabled) {
        sendJson(res, 404, { error: "SSO não habilitado." });
        return;
      }
      const headerEmail = req.headers[config.sso.emailHeader];
      const user = findActiveUserByEmail(Array.isArray(headerEmail) ? headerEmail[0] : headerEmail);
      if (!user) {
        sendJson(res, 401, { error: "Usuário corporativo não autorizado." });
        return;
      }
      const token = signToken(user.id);
      sendJson(res, 200, { token, user: sanitizeUser(user) });
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/logout") {
      const auth = getAuth(req);
      if (auth) sessions.delete(auth.token);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "GET" && url.pathname === "/api/me") {
      const auth = requireAuth(req, res);
      if (!auth) return;
      sendJson(res, 200, { user: sanitizeUser(auth.user) });
      return;
    }

    if (method === "POST" && url.pathname === "/api/chat/ask") {
      const auth = requireAuth(req, res, ["colaborador", "gestor", "admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const question = String(body.question || "").trim();
      if (question.length < 3) {
        sendJson(res, 400, { error: "Digite uma pergunta com mais detalhes." });
        return;
      }
      const documents = readJson(DOCUMENTS_FILE, []);
      const matches = searchKnowledgeBase(question, documents);
      const result = composeAnswer(matches);
      const log = createLog({ user: auth.user, question, result });
      sendJson(res, 200, { ...result, logId: log.id });
      return;
    }

    if (method === "POST" && url.pathname === "/api/chat/rating") {
      const auth = requireAuth(req, res, ["colaborador", "gestor", "admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const logs = readJson(LOGS_FILE, []);
      const log = logs.find(item => item.id === body.logId && item.userId === auth.user.id);
      if (!log) {
        sendJson(res, 404, { error: "Registro de consulta não encontrado." });
        return;
      }
      if (!["positive", "negative"].includes(body.rating)) {
        sendJson(res, 400, { error: "Avaliação inválida." });
        return;
      }
      log.rating = body.rating;
      log.ratedAt = new Date().toISOString();
      writeJson(LOGS_FILE, logs);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "GET" && url.pathname === "/api/documents") {
      const auth = requireAuth(req, res, ["gestor", "admin"]);
      if (!auth) return;
      sendJson(res, 200, { documents: readJson(DOCUMENTS_FILE, []) });
      return;
    }

    if (method === "POST" && url.pathname === "/api/documents") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const missing = ["title", "sector", "category", "version", "content"].filter(key => !String(body[key] || "").trim());
      if (missing.length) {
        sendJson(res, 400, { error: "Preencha título, setor, categoria, versão e conteúdo." });
        return;
      }
      const now = new Date().toISOString();
      const documents = readJson(DOCUMENTS_FILE, []);
      const fileName = String(body.fileName || `${body.title}.txt`).trim();
      const storedContent = saveDocumentContent(fileName, String(body.content).trim());
      const document = {
        id: crypto.randomUUID(),
        title: String(body.title).trim(),
        fileName,
        sector: String(body.sector).trim(),
        category: String(body.category).trim(),
        version: String(body.version).trim(),
        status: body.status === "inactive" ? "inactive" : "active",
        createdAt: now,
        updatedAt: now,
        ownerUserId: auth.user.id,
        content: storedContent.content,
        repositoryPath: storedContent.repositoryPath || undefined
      };
      documents.unshift(document);
      writeJson(DOCUMENTS_FILE, documents);
      sendJson(res, 201, { document });
      return;
    }

    const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/);
    if (documentMatch && method === "PUT") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const documents = readJson(DOCUMENTS_FILE, []);
      const document = documents.find(item => item.id === documentMatch[1]);
      if (!document) {
        sendJson(res, 404, { error: "Documento não encontrado." });
        return;
      }
      ["title", "fileName", "sector", "category", "version", "content"].forEach(key => {
        if (key === "content" && body[key] !== undefined) {
          if (document.repositoryPath) {
            fs.writeFileSync(document.repositoryPath, String(body[key]).trim(), "utf8");
          } else if (config.documentRepositoryPath) {
            const storedContent = saveDocumentContent(document.fileName, String(body[key]).trim());
            document.content = storedContent.content;
            document.repositoryPath = storedContent.repositoryPath || undefined;
          } else {
            document.content = String(body[key]).trim();
          }
          return;
        }
        if (body[key] !== undefined) document[key] = String(body[key]).trim();
      });
      if (["active", "inactive"].includes(body.status)) {
        document.status = body.status;
      }
      document.updatedAt = new Date().toISOString();
      writeJson(DOCUMENTS_FILE, documents);
      sendJson(res, 200, { document });
      return;
    }

    if (method === "GET" && url.pathname === "/api/users") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      sendJson(res, 200, { users: readJson(USERS_FILE, []).map(sanitizeUser) });
      return;
    }

    if (method === "POST" && url.pathname === "/api/users") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const users = readJson(USERS_FILE, []);
      if (!body.name || !body.email || !body.role || !body.sector || !body.password) {
        sendJson(res, 400, { error: "Preencha nome, e-mail, perfil, setor e senha." });
        return;
      }
      if (!roleNames[body.role]) {
        sendJson(res, 400, { error: "Perfil inválido." });
        return;
      }
      if (users.some(user => user.email.toLowerCase() === String(body.email).toLowerCase())) {
        sendJson(res, 409, { error: "Já existe usuário com este e-mail." });
        return;
      }
      const password = hashPassword(String(body.password));
      const now = new Date().toISOString();
      const user = {
        id: crypto.randomUUID(),
        name: String(body.name).trim(),
        email: String(body.email).trim().toLowerCase(),
        role: body.role,
        sector: String(body.sector).trim(),
        active: body.active !== false,
        passwordSalt: password.salt,
        passwordHash: password.hash,
        createdAt: now,
        updatedAt: now
      };
      users.unshift(user);
      writeJson(USERS_FILE, users);
      sendJson(res, 201, { user: sanitizeUser(user) });
      return;
    }

    const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && method === "PUT") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      const body = await getBody(req);
      const users = readJson(USERS_FILE, []);
      const user = users.find(item => item.id === userMatch[1]);
      if (!user) {
        sendJson(res, 404, { error: "Usuário não encontrado." });
        return;
      }
      ["name", "email", "sector"].forEach(key => {
        if (body[key] !== undefined) user[key] = String(body[key]).trim();
      });
      if (roleNames[body.role]) user.role = body.role;
      if (typeof body.active === "boolean") user.active = body.active;
      if (body.password) {
        const password = hashPassword(String(body.password));
        user.passwordSalt = password.salt;
        user.passwordHash = password.hash;
      }
      user.updatedAt = new Date().toISOString();
      writeJson(USERS_FILE, users);
      sendJson(res, 200, { user: sanitizeUser(user) });
      return;
    }

    if (method === "GET" && url.pathname === "/api/manager/metrics") {
      const auth = requireAuth(req, res, ["gestor", "admin"]);
      if (!auth) return;
      sendJson(res, 200, getMetrics(auth.user, parseQuery(req.url)));
      return;
    }

    if (method === "GET" && url.pathname === "/api/admin/logs") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      sendJson(res, 200, { logs: readJson(LOGS_FILE, []) });
      return;
    }

    if (method === "GET" && url.pathname === "/api/admin/logs/export") {
      const auth = requireAuth(req, res, ["admin"]);
      if (!auth) return;
      const logs = readJson(LOGS_FILE, []);
      const rows = [
        ["data", "usuário", "email", "perfil", "setor_usuário", "pergunta", "confiança", "avaliação", "documentos_fontes"],
        ...logs.map(log => [
          log.createdAt,
          log.userName,
          log.userEmail,
          roleNames[log.userRole] || log.userRole,
          log.userSector,
          log.question,
          log.confidence,
          log.rating || "",
          log.citations.map(item => `${item.title} (${item.sector}, v${item.version})`).join(" | ")
        ])
      ];
      sendCsv(res, "unichat-logs.csv", rows);
      return;
    }

    sendJson(res, 404, { error: "Rota não encontrada." });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Erro interno." });
  }
}

ensureDataStore();

const requestHandler = (req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
};

function loadHttpsOptions() {
  return {
    key: fs.readFileSync(path.resolve(config.https.keyPath)),
    cert: fs.readFileSync(path.resolve(config.https.certPath))
  };
}

const server = config.https.enabled
  ? https.createServer(loadHttpsOptions(), requestHandler)
  : http.createServer(requestHandler);

server.listen(PORT, () => {
  const protocol = config.https.enabled ? "https" : "http";
  console.log(`UniChat disponivel em ${protocol}://localhost:${PORT}`);
});
