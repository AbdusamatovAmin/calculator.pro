const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const path = require('path');

const app = express();
const server = createServer(app);
const bareServer = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

// Раздача статических файлов калькулятора из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Интеграция Bare-сервера в наш HTTP-сервер для проксирования медиа и скриптов соцсетей
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.route(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(PORT, () => {
    console.log(`Профессиональный сервер Ultraviolet запущен на порту ${PORT}`);
});
