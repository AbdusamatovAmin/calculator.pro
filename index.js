const express = require('express');
const { createServer } = require('node:http');
const uvSystem = require('@titaniumnetwork-dev/ultraviolet');
const path = require('path');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Конфигурация путей Ultraviolet
const uvConfig = {
    prefix: '/uv/service/',
    bare: 'https://benroberts.com', 
    config: {
        codec: 'xor'
    }
};

// Защищенный способ инициализации middleware вне зависимости от версии конструктора пакета
if (typeof uvSystem === 'function') {
    app.use('/uv/', uvSystem(uvConfig));
} else if (uvSystem.ultraviolet && typeof uvSystem.ultraviolet === 'function') {
    app.use('/uv/', uvSystem.ultraviolet(uvConfig));
} else {
    // Резервный вариант через встроенный обработчик объекта
    const UltravioletClass = uvSystem.Ultraviolet || uvSystem;
    try {
        const uv = new UltravioletClass(uvConfig);
        app.use('/uv/', (req, res, next) => {
            if (uv.requiresRoute(req)) {
                uv.route(req, res);
            } else {
                next();
            }
        });
    } catch (e) {
        // Если класс не создается, используем метод фабрики по умолчанию
        app.use('/uv/', uvSystem.server ? uvSystem.server(uvConfig) : (req, res, next) => next());
    }
}

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница (Калькулятор)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Ultraviolet прокси успешно запущен на порту ${PORT}`);
});
