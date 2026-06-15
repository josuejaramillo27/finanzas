self.addEventListener('install', (e) => {
    console.log('Service Worker: Instalado');
});

self.addEventListener('fetch', (e) => {
    // Por ahora solo dejamos que pase la red normal, esto cumple el requisito para instalar la app
});
