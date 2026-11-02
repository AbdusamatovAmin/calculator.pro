const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

// 1. Раздаем статические файлы Ultraviolet (конфиги, бандл, воркер)
// Это автоматически сделает доступными файлы /uv/uv.config.js, /uv/uv.bundle.js и т.д.
app.use('/uv', express.static(uvPath));

// 2. Автоматическая раздача твоей папки public (где лежит калькулятор index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Обработка ошибок для несуществующих страниц (404)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Связываем Express-сервер и Bare-сервер воедино
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(PORT, () => {
    console.log(`Официальный Ultraviolet прокси успешно запущен на порту ${PORT}`);
});
