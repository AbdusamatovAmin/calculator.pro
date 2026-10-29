const express = require('express');
const path = require('path');
const Unblocker = require('unblocker');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализируем мощный движок проксирования
const unblocker = new Unblocker({
    prefix: '/proxy/'
});

// 1. Подключаем unblocker (он обрабатывает все запросы к сайтам, скриптам и картинкам)
app.use(unblocker);

// 2. Раздаем файлы калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// 3. Перехватчик для старых ссылок /service (чтобы не было ошибки Cannot GET)
app.get('/service', (req, res) => {
    const targetUrl = req.query.url;
    if (targetUrl) {
        // Красиво перенаправляем на новый защищенный unblocker-коридор
        res.redirect('/proxy/' + targetUrl.replace(/^https?:\/\//i, ''));
    } else {
        res.redirect('/');
    }
});

// 4. Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Железная защита для Google Sites: если сайт внутри фрейма запрашивает свои внутренние файлы,
// сервер не выдаст ошибку, а плавно пропустит их через прокси
app.use('/*', (req, res, next) => {
    if (req.headers.referer && req.headers.referer.includes('/proxy/')) {
        const refererUrl = req.headers.referer;
        const proxyPart = refererUrl.substring(refererUrl.indexOf('/proxy/') + 7);
        const baseDomain = proxyPart.split('/')[0];
        res.redirect('/proxy/' + baseDomain + req.originalUrl);
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`Прокси-сервер для Google Sites запущен на порту ${PORT}`);
});
