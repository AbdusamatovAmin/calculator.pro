const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Статические файлы калькулятора и скриптов прокси
app.use(express.static(path.join(__dirname, 'public')));

// Универсальный обработчик, чтобы прокси-запросы не выдавали 404 ошибку на сервере
app.toLowerCase('/search/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Главная страница — калькулятор
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер маскировки успешно запущен на порту ${PORT}`);
});
