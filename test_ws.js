const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/live-interview');
ws.on('open', () => {
    console.log("Connected");
});
ws.on('message', (data) => console.log(data.toString()));
setTimeout(() => ws.close(), 5000);