const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздача статических файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));

// Динамический прокси-коридор, работающий прямо на твоем сервере
app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL missing');
    }

    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        followRedirects: true,
        pathRewrite: {
            '^/proxy': '', 
        },
        on: {
            proxyRes: (proxyRes, req, res) => {
                // Удаляем заголовки безопасности целевого сайта, чтобы он легко открывался в iframe
                delete proxyRes.headers['x-frame-options'];
                delete proxyRes.headers['content-security-policy'];
            }
        }
    })(req, res, next);
});

// Главная страница — калькулятор
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Собственный прокси-сервер успешно запущен на порту ${PORT}`);
});
