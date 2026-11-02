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

// Инициализируем ядро Ultraviolet напрямую вне конвейера Express middleware
const UltravioletClass = uvSystem.Ultraviolet || uvSystem;
let uv = null;
try {
    if (typeof uvSystem !== 'function' && UltravioletClass && typeof UltravioletClass === 'function') {
        uv = new UltravioletClass(uvConfig);
    }
} catch (e) {
    console.log("Инициализация через класс не требуется");
}

// Умный бесконфликтный перехватчик: отдаем запрос Ultraviolet ТОЛЬКО если он служебный
app.use((req, res, next) => {
    if (uv && uv.requiresRoute(req)) {
        return uv.route(req, res);
    }
    if (typeof uvSystem === 'function' && (req.url.startsWith('/uv/ service/') || req.url.startsWith('/uv/'))) {
        return uvSystem(uvConfig)(req, res, next);
    }
    next();
});

// Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Раздача остальных статических элементов (строго после проверки прокси)
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
