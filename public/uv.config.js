self.__uv$config = {
    prefix: '/uv/service/',
    bare: 'https://benroberts.com',
    encodeUrl: function(url) { return encodeURIComponent(url.split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('')); },
    decodeUrl: function(url) { return decodeURIComponent(url).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''); }
};
