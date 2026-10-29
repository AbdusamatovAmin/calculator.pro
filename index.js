const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздача статических файлов калькулятора из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Перехват непредвиденных роутов для удержания структуры фрейма
app.get('/uv/service/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер-калькулятор успешно запущен на порту ${PORT}`);
});
