const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function decodeUrl(url) {
    if (!url) return url;
    return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
}

function encodeUrl(url) {
    if (!url) return url;
    return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
}

// 1. Точка входа для новых URL
app.get('/uv/service/:encodedUrl*', async (req, res) => {
    let fullPath = req.params.encodedUrl + (req.params[0] || '');
    let targetUrl = decodeUrl(fullPath);
    
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
    
    try {
        const parsedUrl = new URL(targetUrl);
        res.cookie('proxy_target_host', parsedUrl.origin, { httpOnly: true });
        return handleProxyRequest(targetUrl, req, res);
    } catch (e) {
        res.status(500).send(`Ошибка разбора URL: ${e.message}`);
    }
});

// 2. Перехватчик всех запросов (кнопки, формы, картинки)
app.all('*', async (req, res, next) => {
    if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/public/')) {
        return next();
    }
    
    const targetHost = req.cookies['proxy_target_host'];
    if (!targetHost) return next();
    
    // Корректно склеиваем домен и относительный путь формы
    const targetUrl = targetHost + req.url;
    return handleProxyRequest(targetUrl, req, res);
});

async function handleProxyRequest(targetUrl, req, res) {
    try {
        const proxyOrigin = `${req.protocol}://${req.get('host')}`;
        
        // Полностью имитируем реальный домашний браузер, чтобы Google не выдавал робота
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://google.com',
            'Origin': 'https://google.com'
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
        
        // Передаем куки от Google обратно в браузер (нужно для работы кнопок и поиска)
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            res.setHeader('set-cookie', setCookieHeader);
        }

        if (contentType) res.setHeader('content-type', contentType);

        if (!contentType.includes('text/html')) {
            return response.body.pipe(res);
        }

        let html = await response.text();

        // 1. Модернизированная замена абсолютных ссылок
        html = html.replace(/(href|src)=["'](https?:\/\/[^"']+)["']/g, (match, attr, p2) => {
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(p2)}"`;
        });

        // 2. Модернизированная замена относительных путей (включая формы /search)
        html = html.replace(/(action|href|src)=["']\/([^"']*)["']/g, (match, attr, path) => {
            return `${attr}="${proxyOrigin}/${path}"`;
        });

        res.send(html);
    } catch (error) {
        res.status(500).send(`Ошибка проксирования: ${error.message}`);
    }
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Прокси-сервер запущен!`));
