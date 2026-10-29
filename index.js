const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
// Render автоматически передает порт через process.env.PORT
const PORT = process.env.PORT || 3000;

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Прокси-маршрут с обработкой заголовков
app.use('/proxy', createProxyMiddleware({
    target: 'https://example.com', // Значение по умолчанию, будет переопределено роутером
    changeOrigin: true,
    router: (req) => {
        // Извлекаем URL из параметров запроса
        return req.query.url;
    },
    pathRewrite: {
        '^/proxy': '', // Удаляем /proxy из пути перед отправкой на целевой сайт
    },
    onProxyRes: function (proxyRes, req, res) {
        // Удаляем заголовки защиты, блокирующие отображение во фреймах (iframe)
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        
        // Разрешаем CORS, чтобы скрипты не блокировались браузером
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    },
    onError: (err, req, res) => {
        console.error('Ошибка проксирования для URL:', req.query.url, err.message);
        res.status(500).send('Ошибка прокси: не удалось загрузить запрашиваемую страницу.');
    }
}));

app.listen(PORT, () => {
    console.log(`Сервер успешно запущен на порту ${PORT}`);
});
