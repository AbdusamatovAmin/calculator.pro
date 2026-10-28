const express = require('express');
const Corrosion = require('@corrosion/corrosion');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const proxy = new Corrosion({
    prefix: '/search/',
    codec: 'xor'
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.url.startsWith(proxy.prefix)) {
        return proxy.request(req, res);
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
