const http = require("http");
const fs = require("fs");
const path = require("path");

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 4173;
const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendFile(request, response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      response.writeHead(statError.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(statError.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const cacheHeaders = {
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Type": type
    };

    if (ext === ".mp4" && request.headers.range) {
      const range = request.headers.range;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = end - start + 1;

      response.writeHead(206, {
        ...cacheHeaders,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Range": `bytes ${start}-${end}/${stats.size}`
      });
      fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      ...cacheHeaders,
      "Content-Length": stats.size,
      ...(ext === ".mp4" ? { "Accept-Ranges": "bytes" } : {})
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

function sendFallbackFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, { "Content-Type": type });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const rawUrl = request.url ? request.url.split("?")[0] : "/";
  const safeUrl = rawUrl === "/" ? "/index.html" : rawUrl;
  const resolvedPath = path.normalize(path.join(root, safeUrl));

  if (!resolvedPath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(request, response, resolvedPath);
      return;
    }

    if (!error && stats.isDirectory()) {
      sendFile(request, response, path.join(resolvedPath, "index.html"));
      return;
    }

    sendFallbackFile(response, path.join(root, "index.html"));
  });
});

server.listen(Number(port), host, () => {
  console.log(`Preview server running at http://${host}:${port}/index.html`);
});
