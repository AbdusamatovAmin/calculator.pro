const express = require('express');
const { createServer } = require('node:http');
const { Ultraviolet } = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Создаем экземпляр класса Ultraviolet через оператор new
const uv = new Ultraviolet({
    prefix: '/uv/service/',
    bare: 'https://benroberts.com', 
    config: {
        codec: 'xor'
    }
});

// Интегрируем Ultraviolet в Express через его встроенный обработчик запросов
app.use('/uv/', (req, res, next) => {
    if (uv.requiresRoute(req)) {
        uv.route(req, res);
    } else {
        next();
    }
});

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница (Калькулятор)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Ultraviolet прокси запущен на порту ${PORT}`);
});
