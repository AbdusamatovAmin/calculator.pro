const express = require('express');
const path = require('path');
const Unblocker = require('unblocker');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализируем движок проксирования
const unblocker = new Unblocker({
    prefix: '/proxy/'
});

// 1. Подключаем прокси-движок (он должен быть на первом месте)
app.use(unblocker);

// 2. Раздаем файлы калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Настоящий прокси-сервер успешно запущен на порту ${PORT}`);
});
