const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// XOR Алгоритм шифрования
function decodeUrl(url) {
    if (!url) return url;
    return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
}

function encodeUrl(url) {
    if (!url) return url;
    return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
}

// Главный прокси-коридор: перехватывает запросы вида /uv/service/[ЗАШИФРОВАННЫЙ_URL]
app.all('/uv/service/:encodedUrl*', async (req, res) => {
    const proxyOrigin = `${req.protocol}://${req.get('host')}`;
    
    // Получаем зашифрованную часть URL
    let rawParam = req.params.encodedUrl + (req.params[0] || '');
    
    // Поддержка обычных GET параметров после знака вопроса (?q=...)
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    
    let targetUrl = decodeUrl(rawParam);
    if (!targetUrl) return res.status(400).send('Неверный целевой адрес');
    
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
    }

    // Если есть GET-параметры (например поисковый запрос), приклеиваем их к ссылке
    if (queryString && !targetUrl.includes('?')) {
        targetUrl += queryString;
    }

    try {
        const parsedTarget = new URL(targetUrl);
        
        // Маскируемся под чистый домашний браузер
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': parsedTarget.origin + '/',
            'Origin': parsedTarget.origin
        };

        const fetchOptions = {
            method: req.method,
            headers: headers,
            redirect: 'follow'
        };

        if (req.method === 'POST') {
            fetchOptions.body = req.headers['content-type']?.includes('application/json') 
                ? JSON.stringify(req.body) 
                : new URLSearchParams(req.body).toString();
            if (req.headers['content-type']) {
                headers['content-type'] = req.headers['content-type'];
            }
        }

        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        
        res.status(response.status);
        if (contentType) res.setHeader('content-type', contentType);

        // Картинки, стили, скрипты отдаем без изменений потоком
        if (!contentType.includes('text/html')) {
            return response.body.pipe(res);
        }

        // HTML страницы тотально переписываем
        let html = await response.text();

        // 1. Изменяем абсолютные ссылки (https://...)
        html = html.replace(/(href|src|action)=["'](https?:\/\/[^"']+)["']/g, (match, attr, p2) => {
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(p2)}"`;
        });

        // 2. Изменяем относительные ссылки (/search, /images), принудительно вшивая текущий домен прямо в прокси-путь
        html = html.replace(/(href|src|action)=["']\/([^"']*)["']/g, (match, attr, relPath) => {
            const absoluteRemoteUrl = parsedTarget.origin + '/' + relPath;
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(absoluteRemoteUrl)}"`;
        });

        res.send(html);

    } catch (error) {
        res.status(500).send(`Ошибка шлюза прокси: ${error.message}`);
    }
});

// Раздача файлов калькулятора
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Прокси-сервер успешно перезапущен на порту ${PORT}`));
