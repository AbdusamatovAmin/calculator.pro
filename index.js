const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Раздаем калькулятор и интерфейс
app.use(express.static(path.join(__dirname, 'public')));

// Все запросы перенаправляем на главную страницу, чтобы не было ошибок 404
app.use('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер калькулятора успешно запущен на порту ${PORT}`);
});
