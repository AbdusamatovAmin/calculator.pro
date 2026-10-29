const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Функция декодирования XOR-ссылок от фронтенда
function decodeUrl(url) {
    if (!url) return url;
    return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
}

// Функция кодирования ссылок для обратной подстановки в HTML
function encodeUrl(url) {
    if (!url) return url;
    return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
}

// Наш собственный мощный прокси-коридор
app.use('/uv/service/:encodedUrl*', async (req, res) => {
    try {
        // Собираем полный зашифрованный путь
        const fullPath = req.params.encodedUrl + (req.params[0] || '');
        let targetUrl = decodeUrl(fullPath);

        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // Выполняем запрос к целевому сайту от имени сервера
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        // Получаем тип контента (HTML, CSS, картинка и т.д.)
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('content-type', contentType);

        // Если это не текст/HTML — просто отдаем файл (картинку, скрипт) как есть
        if (!contentType || !contentType.includes('text/html')) {
            return response.body.pipe(res);
        }

        // Если это HTML страница — переписываем ссылки внутри нее, чтобы они вели через наш прокси
        let html = await response.text();
        const origin = `${req.protocol}://${req.get('host')}/uv/service/`;

        // Умная замена ссылок (href и src)
        html = html.replace(/(href|src)=["'](https?:\/\/[^"']+)["']/g, (match, p1, p2) => {
            return `${p1}="${origin}${encodeUrl(p2)}"`;
        });

        res.send(html);

    } catch (error) {
        res.status(500).send(`Ошибочка проксирования: ${error.message}`);
    }
});

// Раздача калькулятора
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Прокси-сервер успешно запущен на порту ${PORT}`);
});
