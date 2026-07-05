const http = require("http");
const fs = require("fs");
const path = require("path");

const workspaceRoot = process.cwd();
const configuredRoot = process.env.PM_STATIC_PREVIEW_ROOT
  ? path.resolve(workspaceRoot, process.env.PM_STATIC_PREVIEW_ROOT)
  : path.join(workspaceRoot, "dist-admin");
const root = fs.existsSync(configuredRoot) ? configuredRoot : workspaceRoot;
const port = Number(process.env.PM_STATIC_PREVIEW_PORT || process.env.PORT || 5180);
const host = process.env.PM_STATIC_PREVIEW_HOST || process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};
const proxyAllowHosts = new Set(["school.busanedu.net", "open.neis.go.kr"]);

async function handleSchoolProxy(req, res) {
  try {
    const current = new URL(req.url || "/", `http://${host}:${port}`);
    const targetValue = current.searchParams.get("url") || "";
    const target = new URL(targetValue);
    if (!["https:", "http:"].includes(target.protocol) || !proxyAllowHosts.has(target.hostname)) {
      res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "허용되지 않은 학교 연동 URL입니다." }));
      return;
    }
    const upstream = await fetch(target.href, {
      headers: {
        "user-agent": "Mozilla/5.0 PersonalManagementSchoolSync/1.0",
        "accept": "text/html,application/json;q=0.9,*/*;q=0.8"
      }
    });
    const body = await upstream.arrayBuffer();
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    });
    res.end(Buffer.from(body));
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message || String(error) }));
  }
}

function resolveFile(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  let file = path.join(root, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, "index.html");
  }
  return file;
}

http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/school-proxy")) {
    handleSchoolProxy(req, res);
    return;
  }
  const file = resolveFile(req.url || "/");
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, host, () => {
  console.log(`Static preview ready at http://${host}:${port}`);
  console.log(`Serving ${root}`);
});
