const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@mercuryworkshop/bare-as-a-service');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');
const PORT = process.env.PORT || 3000;

// 1. Привязываем роуты нового Bare-сервера к Express
app.use((req, res, next) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        next();
    }
});

// 2. Раздаем статические файлы скриптов Ultraviolet
app.use('/uv', express.static(uvPath));

// 3. Раздаем файлы твоего калькулятора из папки public
app.use(express.static(path.join(__dirname, 'public')));

// 4. Запасной роут для корректной работы путей
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Передаем WebSocket-апгрейды новому серверу bare-as-a-service
server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// 6. Запускаем единый сервер
server.listen(PORT, () => {
    console.log(`Официальный Ultraviolet прокси успешно запущен на порту ${PORT}`);
});
