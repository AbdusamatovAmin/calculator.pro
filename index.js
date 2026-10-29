const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Функция декодирования XOR-ссылок
function decodeUrl(url) {
    if (!url) return url;
    return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
}

// Функция кодирования XOR-ссылок
function encodeUrl(url) {
    if (!url) return url;
    return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
}

// 1. Точка входа для новых сайтов из поисковой строки калькулятора
app.get('/uv/service/:encodedUrl*', async (req, res) => {
    const fullPath = req.params.encodedUrl + (req.params[0] || '');
    let targetUrl = decodeUrl(fullPath);
    
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
    
    try {
        const parsedUrl = new URL(targetUrl);
        // Запоминаем текущий домен в куки, чтобы обрабатывать относительные ссылки (/search, /css)
        res.cookie('proxy_target_host', parsedUrl.origin, { httpOnly: true });
        
        return handleProxyRequest(targetUrl, req, res);
    } catch (e) {
        res.status(500).send(`Ошибка разбора URL: ${e.message}`);
    }
});

// 2. Универсальный перехватчик для ВСЕХ остальных запросов (картинки, формы, относительные пути)
app.all('*', async (req, res, next) => {
    // Пропускаем системные файлы калькулятора
    if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/public/')) {
        return next();
    }
    
    const targetHost = req.cookies['proxy_target_host'];
    if (!targetHost) {
        return next(); // Если куки нет, отдаем калькулятор
    }
    
    // Строим полный путь к целевому ресурсу (например, https://google.com...)
    const targetUrl = targetHost + req.url;
    return handleProxyRequest(targetUrl, req, res);
});

// Основной движок проксирования запросов
async function handleProxyRequest(targetUrl, req, res) {
    try {
        const proxyOrigin = `${req.protocol}://${req.get('host')}`;
        
        // Переносим заголовки, сообщая сайту, что мы обычный браузер
        const headers = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': req.headers['accept'] || '*/*',
            'Accept-Language': req.headers['accept-language'] || 'ru-RU,ru;q=0.9'
        };

        const fetchOptions = {
            method: req.method,
            headers: headers,
            redirect: 'follow'
        };

        // Если это POST-запрос (отправка формы/пароля), передаем тело запроса
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

        // Если это не HTML страница (а картинка, шрифт, скрипт) — отдаем поток как есть
        if (!contentType.includes('text/html')) {
            return response.body.pipe(res);
        }

        // Если это HTML — тотально переписываем внутренние ссылки
        let html = await response.text();
        const currentTargetHost = req.cookies['proxy_target_host'] || new URL(targetUrl).origin;

        // 1. Заменяем абсолютные ссылки (https://site.com) на наш прокси-коридор
        html = html.replace(/(href|src)=["'](https?:\/\/[^"']+)["']/g, (match, attr, p2) => {
            return `${attr}="${proxyOrigin}/uv/service/${encodeUrl(p2)}"`;
        });

        // 2. Фиксим относительные ссылки в формах и кнопках (например, action="/search")
        html = html.replace(/(action|href|src)=["']\/([^"']*)["']/g, (match, attr, path) => {
            return `${attr}="${proxyOrigin}/${path}"`;
        });

        res.send(html);
    } catch (error) {
        res.status(500).send(`Ошибка проксирования ресурса: ${error.message}`);
    }
}

// Раздача статики калькулятора (если запросы не перехвачены прокси)
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Прокси готов к интеграции в Google Sites на порту ${PORT}`));
