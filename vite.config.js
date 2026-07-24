const { resolve } = require("node:path");
const { defineConfig } = require("vite");

const proxyAllowHosts = new Set(["school.busanedu.net", "open.neis.go.kr"]);

function schoolProxyPlugin() {
  return {
    name: "pm-school-proxy",
    configureServer(server) {
      server.middlewares.use("/api/school-proxy", async (req, res) => {
        try {
          const current = new URL(req.url || "/", "http://127.0.0.1");
          const targetValue = current.searchParams.get("url") || "";
          const target = new URL(targetValue);
          if (!["https:", "http:"].includes(target.protocol) || !proxyAllowHosts.has(target.hostname)) {
            res.statusCode = 403;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "허용되지 않은 학교 연동 URL입니다." }));
            return;
          }
          const upstream = await fetch(target.href, {
            headers: {
              "user-agent": "Mozilla/5.0 PersonalManagementSchoolSync/1.0",
              "accept": "text/html,application/json;q=0.9,*/*;q=0.8"
            }
          });
          const body = Buffer.from(await upstream.arrayBuffer());
          res.statusCode = upstream.status;
          res.setHeader("content-type", upstream.headers.get("content-type") || "text/plain; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(body);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: error.message || String(error) }));
        }
      });
    }
  };
}

module.exports = defineConfig({
  plugins: [schoolProxyPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        appNext: resolve(__dirname, "app-next.html")
      }
    }
  }
});
