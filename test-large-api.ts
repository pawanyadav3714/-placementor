import http from 'http';
const str = "A".repeat(5 * 1024 * 1024); // 5MB
const data = JSON.stringify({ company: "Google", documentBase64: "data:image/png;base64," + str, documentMimeType: "image/png" });
const options = { hostname: 'localhost', port: 3000, path: '/api/admin/parse-company-document', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', (d) => { chunks += d; });
  res.on('end', () => { console.log("Status:", res.statusCode); console.log("Body:", chunks.substring(0,100)); });
});
req.on('error', (e) => { console.error("Error:", e); });
req.write(data);
req.end();
