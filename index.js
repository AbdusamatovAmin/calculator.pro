const express = require('express');
const { createServer } = require('node:http');
const { ultraviolet } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Подключаем Ultraviolet прокси-движок
app.use('/uv/', ultraviolet({
    prefix: '/uv/service/',
    bare: 'https://benroberts.com', // Открытый Bare-сервер для обработки сетевых запросов
    config: {
        codec: 'xor'
    }
}));

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница (Калькулятор)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Ultraviolet прокси запущен на порту ${PORT}`);
});
