const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const http = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// XOR Декодирование путей
function decodeUrl(url) {
    if (!url) return url;
    return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
}

// XOR Кодирование путей
function encodeUrl(url) {
    if (!url) return url;
    return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
}

// Потоковая раздача Ultraviolet скриптов из CDN для активации Service Worker
function streamRemoteScript(url, res) {
    http.get(url, (remoteRes) => {
        res.setHeader('Content-Type', 'application/javascript');
        remoteRes.pipe(res);
    }).on('error', (e) => res.status(500).send(`Ошибка загрузки ядра: ${e.message}`));
}

app.get('/uv.bundle.js', (req, res) => streamRemoteScript('https://unpkg.com', res));
app.get('/uv.sw.js', (req, res) => streamRemoteScript('https://unpkg.com', res));

// ГЛАВНЫЙ ПРОКСИ-КОРИДОР ДЛЯ ИНТЕРНЕТА ВНУТРИ IFRAME
app.all('/uv/service/:encodedUrl*', async (req, res) => {
    const proxyOrigin = `${req.protocol}://${req.get('host')}`;
    let rawParam = req.params.encodedUrl + (req.params[0] || '');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    let targetUrl = decodeUrl(rawParam);
    if (!targetUrl) return res.status(400).send('Неверный адрес');
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
    if (queryString && !targetUrl.includes('?')) targetUrl += queryString;

    try {
        const parsedTarget = new URL(targetUrl);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            'Referer': parsedTarget.origin + '/',
            'Origin': parsedTarget.origin
        };

        const fetchOptions = { method: req.method, headers: headers, redirect: 'follow' };
        if (req.method === 'POST') {
            fetchOptions.body = new URLSearchParams(req.body).toString();
            if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
        }

        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        
        res.status(response.status);
        if (contentType) res.setHeader('content-type', contentType);

        // Медиа, шрифты и JS-файлы соцсетей транслируем потоком как есть
        if (!contentType.includes('text/html')) {
            return response.body.pipe(res);
        }

        // HTML-страницы тотально модифицируем под прокси-пути фрейма
        let html = await response.text();
        
        // 1. Фиксим абсолютные ссылки
        html = html.replace(/(href|src|action)=["'](https?:\/\/[^"']+)["']/g, (match, attr, p2) => {
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(p2)}"`;
        });

        // 2. Фиксим относительные пути сайта
        html = html.replace(/(href|src|action)=["']\/([^"']*)["']/g, (match, attr, relPath) => {
            const absoluteRemoteUrl = parsedTarget.origin + '/' + relPath;
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(absoluteRemoteUrl)}"`;
        });

        res.send(html);
    } catch (error) {
        res.status(500).send(`Ошибка шлюза прокси: ${error.message}`);
    }
});

// Статика калькулятора
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Прокси-сервер полностью автономен и готов!`));
