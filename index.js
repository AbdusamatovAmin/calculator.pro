const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const uvSystem = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

const uvConfig = {
    prefix: '/uv/service/',
    bare: '/bare/',
    config: {
        codec: 'xor'
    }
};

// 1. СНАЧАЛА инициализируем и обрабатываем запросы прокси-движка Ultraviolet
if (typeof uvSystem === 'function') {
    app.use('/uv/', uvSystem(uvConfig));
} else if (uvSystem.ultraviolet && typeof uvSystem.ultraviolet === 'function') {
    app.use('/uv/', uvSystem.ultraviolet(uvConfig));
} else {
    const UltravioletClass = uvSystem.Ultraviolet || uvSystem;
    try {
        const uv = new UltravioletClass(uvConfig);
        app.use('/uv/', (req, res, next) => {
            if (uv.requiresRoute(req)) {
                uv.route(req, res);
            } else {
                next();
            }
        });
    } catch (e) {
        app.use('/uv/', uvSystem.server ? uvSystem.server(uvConfig) : (req, res, next) => next());
    }
}

// 2. ТОЛЬКО ПОСЛЕ ЭТОГО отдаем калькулятор и его статические файлы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Связываем Express и Bare-сервер воедино
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
