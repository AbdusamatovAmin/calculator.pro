const express = require('express');
const http = require('http');
const path = require('path');
// Добавляем .default, чтобы правильно вытащить конструктор
const Ultraviolet = require('@titaniumnetwork-dev/ultraviolet').default;

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Теперь эта строчка отработает без ошибок
const uv = new Ultraviolet({
    prefix: '/search/',
    config: path.join(__dirname, 'public'),
    encodeUrl: (url) => encodeURIComponent(url),
    decodeUrl: (url) => decodeURIComponent(url)
});

// Раздача статических файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Подключаем прокси к серверу через специальный обработчик
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
