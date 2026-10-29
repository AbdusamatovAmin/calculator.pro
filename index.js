const express = require('express');
const path = require('path');
const proxy = require('express-http-proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздача калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Умный прокси-маршрут
app.use('/service', (req, res, next) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Введите корректный URL');
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const origin = parsedUrl.origin;

        return proxy(origin, {
            proxyReqPathResolver: () => parsedUrl.pathname + parsedUrl.search,
            userResHeaderDecorator: (headers) => {
                // Стираем заголовки, которые заставляют браузер показывать белый экран во фрейме
                delete headers['x-frame-options'];
                delete headers['content-security-policy'];
                delete headers['content-security-policy-report-only'];
                return headers;
            },
            proxyErrorHandler: (err, res, next) => {
                res.status(500).send('Не удалось загрузить сайт через прокси. Попробуйте другой адрес.');
            }
        })(req, res, next);
    } catch (e) {
        return res.status(400).send('Ошибка в адресе сайта');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Прокси-сервер успешно запущен на порту ${PORT}`);
});
