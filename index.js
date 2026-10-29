const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Раздача статических файлов калькулятора (всегда на первом месте)
app.use(express.static(path.join(__dirname, 'public')));

// Переменная для хранения последнего посещенного сайта (чтобы внутренние ссылки не ломались)
let lastTargetUrl = 'https://google.com';

// 2. Главный динамический прокси-коридор для ручного ввода
app.use('/proxy', (req, res, next) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL missing');
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    lastTargetUrl = new URL(targetUrl).origin;

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        followRedirects: true,
        pathRewrite: { '^/proxy': '' },
        on: {
            proxyRes: (proxyRes) => {
                delete proxyRes.headers['x-frame-options'];
                delete proxyRes.headers['content-security-policy'];
            }
        }
    })(req, res, next);
});

// 3. Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. ИСПРАВЛЕНИЕ: Перехватываем вообще ВСЕ остальные запросы (вроде /search) и перенаправляем их на посещаемый сайт!
app.use('/*', (req, res, next) => {
    // Если это внутренний запрос проксированного сайта (например, /search?q=...)
    createProxyMiddleware({
        target: lastTargetUrl,
        changeOrigin: true,
        followRedirects: true,
        on: {
            proxyRes: (proxyRes) => {
                delete proxyRes.headers['x-frame-options'];
                delete proxyRes.headers['content-security-policy'];
            }
        }
    })(req, res, next);
});

app.listen(PORT, () => {
    console.log(`Прокси-сервер успешно запущен на порту ${PORT}`);
});
