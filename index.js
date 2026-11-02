const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { Ultraviolet } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

// Инициализируем класс Ultraviolet
const uv = new Ultraviolet({
    prefix: '/uv/service/',
    bare: '/bare/',
    config: {
        codec: 'xor'
    }
});

// Подключаем встроенные роуты Ultraviolet для раздачи конфигураций фронтенду
app.use('/uv/', (req, res, next) => {
    if (uv.requiresRoute(req)) {
        uv.route(req, res);
    } else {
        next();
    }
});

// Раздача файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Связываем Express и Bare-сервер вместе
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
