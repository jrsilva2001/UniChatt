const http = require("http");
const { spawn } = require("child_process");

const PORT = 3187;
const BASE = `http://localhost:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const body = options.body ? JSON.stringify(options.body) : "";
    const req = http.request(
      `${BASE}${path}`,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
        }
      },
      res => {
        let data = "";
        res.on("data", chunk => {
          data += chunk;
        });
        res.on("end", () => {
          const isJson = (res.headers["content-type"] || "").includes("application/json");
          const payload = data && isJson ? JSON.parse(data) : data;
          if (res.statusCode >= 400) {
            reject(new Error(payload.error || `HTTP ${res.statusCode}`));
            return;
          }
          resolve(payload);
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      await request("/");
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  throw new Error("Servidor não iniciou a tempo.");
}

async function run() {
  const server = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(PORT), SESSION_SECRET: "smoke-test-secret" },
    stdio: "ignore"
  });

  try {
    await waitForServer();
    const login = await request("/api/auth/login", {
      method: "POST",
      body: { email: "admin@unimeduberlandia.coop.br", password: "Unichat@2026" }
    });
    if (!login.token) throw new Error("Login não retornou token.");

    try {
      await request("/api/auth/login", {
        method: "POST",
        body: { email: "admin@unimeduberlandia.coop.br", password: "senha-incorreta" }
      });
      throw new Error("Login aceitou senha incorreta.");
    } catch (error) {
      if (error.message === "Login aceitou senha incorreta.") throw error;
    }

    const chat = await request("/api/chat/ask", {
      method: "POST",
      token: login.token,
      body: { question: "Qual setor acionar sobre LGPD e dados sensiveis?" }
    });
    if (!chat.answer || !chat.logId) throw new Error("Chat não retornou resposta válida.");
    if (!chat.citations?.length) throw new Error("Chat não retornou fonte para pergunta coberta pela base.");

    const unknownChat = await request("/api/chat/ask", {
      method: "POST",
      token: login.token,
      body: { question: "Como configurar MAC address do notebook corporativo?" }
    });
    if (!unknownChat.answer.includes("Não encontrei informação suficiente")) {
      throw new Error("Chat respondeu pergunta fora da base em vez de informar desconhecimento.");
    }
    if (unknownChat.confidence !== "baixa" || unknownChat.citations?.length) {
      throw new Error("Chat trouxe fonte ou confiança indevida para pergunta fora da base.");
    }

    await request("/api/chat/rating", {
      method: "POST",
      token: login.token,
      body: { logId: chat.logId, rating: "positive" }
    });

    const metrics = await request("/api/manager/metrics", { token: login.token });
    if (typeof metrics.totalQueries !== "number") throw new Error("Métricas inválidas.");

    const documents = await request("/api/documents", { token: login.token });
    if (!Array.isArray(documents.documents)) throw new Error("Documentos inválidos.");

    const users = await request("/api/users", { token: login.token });
    if (!Array.isArray(users.users)) throw new Error("Usuários inválidos.");

    const logs = await request("/api/admin/logs", { token: login.token });
    if (!Array.isArray(logs.logs)) throw new Error("Logs inválidos.");

    console.log("Smoke test concluído com sucesso.");
  } finally {
    server.kill();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
