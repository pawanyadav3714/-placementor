import http from 'http';
const data = JSON.stringify({ company: "Google", documentBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", documentMimeType: "image/png" });
const options = { hostname: 'localhost', port: 3000, path: '/api/admin/parse-company-document', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } };
const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', (d) => { chunks += d; });
  res.on('end', () => { console.log("Status:", res.statusCode); console.log("Body:", chunks); });
});
req.on('error', (e) => { console.error("Error:", e); });
req.write(data);
req.end();
