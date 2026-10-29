const express = require('express');
const path = require('path');
const http = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Функция-помощник для динамической загрузки скриптов Ultraviolet в память сервера
function streamRemoteScript(url, res) {
    http.get(url, (remoteRes) => {
        res.setHeader('Content-Type', 'application/javascript');
        remoteRes.pipe(res);
    }).on('error', (e) => {
        res.status(500).send(`Ошибка загрузки компонента прокси: ${e.message}`);
    });
}

// Эмулируем наличие локальных файлов Ultraviolet, отдавая их напрямую из CDN без участия жесткого диска
app.get('/uv.bundle.js', (req, res) => {
    streamRemoteScript('https://unpkg.com', res);
});

app.get('/uv.sw.js', (req, res) => {
    streamRemoteScript('https://unpkg.com', res);
});

// Стандартная раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница калькулятора
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Умный сервер-калькулятор успешно запущен на порту ${PORT}`);
});
