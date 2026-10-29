const express = require('express');
const Corrosion = require('@corrosion/corrosion');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Инициализируем прокси-движок с кодеком base64, чтобы он совпадал с фронтендом
const proxy = new Corrosion({
    prefix: '/search/',
    codec: 'base64' 
});

// Настройка раздачи статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Перехватываем все запросы, которые идут через прокси-префикс
app.use((req, res, next) => {
    if (req.url.startsWith(proxy.prefix)) {
        return proxy.request(req, res);
    }
    next();
});

// При заходе на главную страницу — отдаем калькулятор с секретом
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Прокси-сервер успешно запущен на порту ${PORT}`);
});
