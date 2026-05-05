const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const dist = path.join(__dirname, 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname);
  const requested = path.normalize(path.join(dist, urlPath));
  const safePath = requested.startsWith(dist) ? requested : path.join(dist, 'index.html');
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : path.join(dist, 'index.html');

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(500);
      response.end('Server error');
      return;
    }

    response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`SklaDinya frontend: http://127.0.0.1:${port}`);
});
