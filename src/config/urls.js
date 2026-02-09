
export const getURLs = () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168');
    
    if (isLocal) {
        return {
            app: 'app.html',
            login: 'index.html'
        };
    } else {
        return {
            app: '/app.html',
            login: '/index.html'
        };
    }
};
