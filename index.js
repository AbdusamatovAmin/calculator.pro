const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

// 1. Интегрируем Bare-сервер напрямую в Express
app.use((req, res, next) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        next();
    }
});

// 2. Явно отдаем uv.config.js, чтобы фронтенд его точно увидел
app.get('/uv/uv.config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`
        self.__uv$config = {
            prefix: '/uv/service/',
            bare: '/bare/',
            encodeUrl: Ultraviolet.codec.xor.encode,
            decodeUrl: Ultraviolet.codec.xor.decode,
            handler: '/uv/uv.handler.js',
            bundle: '/uv/uv.bundle.js',
            config: '/uv/uv.config.js',
            sw: '/uv/uv.sw.js',
        };
    `);
});

// 3. Раздаем остальные статические файлы Ultraviolet
app.use('/uv', express.static(uvPath));

// 4. Раздаем файлы твоего калькулятора из папки public
app.use(express.static(path.join(__dirname, 'public')));

// 5. Запасной роут
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6. Обрабатываем WebSocket-апгрейды для Bare
server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// 7. Запускаем сервер
server.listen(PORT, () => {
    console.log(`Официальный Ultraviolet прокси успешно запущен на порту ${PORT}`);
});
