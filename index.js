const express = require('express');
const http = require('http');
const path = require('path');
const { UltravioletServer } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Инициализация полноценного и изолированного ядра Ultraviolet
const uvServer = new UltravioletServer({
    prefix: '/proxy/',
    config: path.join(__dirname, 'public'),
    encodeUrl: (url) => encodeURIComponent(url),
    decodeUrl: (url) => decodeURIComponent(url)
});

// 1. Раздача калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// 2. Подключение прокси-обработчиков к веб-серверу
uvServer.inject(server);

// Маршрут для обработки фоновых страниц внутри фрейма
app.use('/proxy/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Финальный прокси-сервер Ultraviolet успешно запущен на порту ${PORT}`);
});
