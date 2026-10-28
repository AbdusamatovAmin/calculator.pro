const express = require('express');
const http = require('http');
const path = require('path');
const { UltravioletServer } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Инициализируем прокси-движок Ultraviolet
const uv = new UltravioletServer({
    prefix: '/search/',
    config: path.join(__dirname, 'public'),
    encodeUrl: (url) => encodeURIComponent(url),
    decodeUrl: (url) => decodeURIComponent(url)
});

// Раздача статических файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Подключаем прокси к серверу
uv.inject(server);

// При заходе на главную страницу — отдаем калькулятор
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Прокси-сервер Ultraviolet запущен на порту ${PORT}`);
});
