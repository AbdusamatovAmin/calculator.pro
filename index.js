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

// 1. Инициализируем ядро Ultraviolet
const UltravioletClass = uvSystem.Ultraviolet || uvSystem;
let uv = null;
try {
    if (typeof uvSystem !== 'function' && UltravioletClass && typeof UltravioletClass === 'function') {
        uv = new UltravioletClass(uvConfig);
    }
} catch (e) {
    console.log("Инициализация через конструктор не требуется");
}

// 2. Изолированный перехватчик: отдаем роут Ultraviolet, только если он служебный
app.use((req, res, next) => {
    if (uv && uv.requiresRoute(req)) {
        return uv.route(req, res);
    }
    if (typeof uvSystem === 'function' && (req.url.startsWith('/uv/service/') || req.url.startsWith('/uv/'))) {
        return uvSystem(uvConfig)(req, res, next);
    }
    next();
});

// 3. Автоматическая и безопасная раздача папки public (Express сам найдет там index.html)
app.use(express.static(path.join(__dirname, 'public')));

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
