const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Раздача статических файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Исправлено: используем стандартный app.use вместо ошибочного app.toLowerCase
app.use('/search/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Главная страница — калькулятор
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер маскировки успешно запущен на порту ${PORT}`);
});
