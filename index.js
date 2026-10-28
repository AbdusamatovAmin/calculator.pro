const express = require('express');
const http = require('http');
const path = require('path');
// Самый надежный импорт класса напрямую из исходников пакета
const { Ultraviolet } = require('@titaniumnetwork-dev/ultraviolet/dist/uv.cjs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Инициализируем наш прокси
const uv = new Ultraviolet({
    prefix: '/search/',
    config: path.join(__dirname, 'public'),
    encodeUrl: (url) => encodeURIComponent(url),
    decodeUrl: (url) => decodeURIComponent(url)
});

// Отдаем калькулятор
app.use(express.static(path.join(__dirname, 'public')));

// Обрабатываем запросы через прокси-обработчик
app.use((req, res, next) => {
    if (req.url.startsWith(uv.prefix)) {
        return uv.request(req, res);
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Прокси-сервер Ultraviolet успешно запущен на порту ${PORT}`);
});
