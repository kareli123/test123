// === TON CONNECT TRAFFIC DEBUGGER ===
// Вставь этот код в консоль браузера (F12) на странице с TonConnect
// Он перехватит ВСЕ запросы и покажет что отправляется

(function() {
    console.log('%c[DEBUGGER] Starting TonConnect Traffic Monitor...', 'color: #00ff00; font-size: 16px; font-weight: bold');
    
    // === 1. ПЕРЕХВАТ FETCH ===
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        console.group('%c[FETCH] ' + (options.method || 'GET') + ' ' + url, 'color: #00aaff; font-weight: bold');
        console.log('URL:', url);
        console.log('Method:', options.method || 'GET');
        console.log('Headers:', options.headers);
        
        if (options.body) {
            console.log('Body (raw):', options.body);
            try {
                const bodyJson = JSON.parse(options.body);
                console.log('Body (JSON):', bodyJson);
            } catch (e) {
                console.log('Body (not JSON):', options.body);
            }
        }
        
        try {
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();
            const responseText = await clone.text();
            
            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
            
            try {
                const responseJson = JSON.parse(responseText);
                console.log('Response Body (JSON):', responseJson);
            } catch (e) {
                console.log('Response Body (text):', responseText);
            }
            
            console.groupEnd();
            return response;
        } catch (error) {
            console.error('Fetch Error:', error);
            console.groupEnd();
            throw error;
        }
    };
    
    // === 2. ПЕРЕХВАТ XMLHttpRequest ===
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._debugURL = url;
        this._debugMethod = method;
        return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
        console.group('%c[XHR] ' + this._debugMethod + ' ' + this._debugURL, 'color: #ff9900; font-weight: bold');
        console.log('URL:', this._debugURL);
        console.log('Method:', this._debugMethod);
        
        if (body) {
            console.log('Body (raw):', body);
            try {
                const bodyJson = JSON.parse(body);
                console.log('Body (JSON):', bodyJson);
            } catch (e) {
                console.log('Body (not JSON):', body);
            }
        }
        
        this.addEventListener('load', function() {
            console.log('Response Status:', this.status);
            console.log('Response Text:', this.responseText);
            
            try {
                const responseJson = JSON.parse(this.responseText);
                console.log('Response (JSON):', responseJson);
            } catch (e) {
                console.log('Response (not JSON)');
            }
            
            console.groupEnd();
        });
        
        this.addEventListener('error', function() {
            console.error('XHR Error');
            console.groupEnd();
        });
        
        return originalXHRSend.apply(this, arguments);
    };
    
    // === 3. ПЕРЕХВАТ WEBSOCKET ===
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
        const ws = new originalWebSocket(...args);
        
        console.log('%c[WebSocket] Connecting to: ' + args[0], 'color: #ff00ff; font-weight: bold');
        
        const originalSend = ws.send;
        ws.send = function(data) {
            console.group('%c[WebSocket SEND]', 'color: #ff00ff; font-weight: bold');
            console.log('Data (raw):', data);
            
            try {
                const dataJson = JSON.parse(data);
                console.log('Data (JSON):', dataJson);
            } catch (e) {
                console.log('Data (not JSON)');
            }
            
            console.groupEnd();
            return originalSend.apply(this, arguments);
        };
        
        ws.addEventListener('message', function(event) {
            console.group('%c[WebSocket RECEIVE]', 'color: #ff00ff; font-weight: bold');
            console.log('Data (raw):', event.data);
            
            try {
                const dataJson = JSON.parse(event.data);
                console.log('Data (JSON):', dataJson);
            } catch (e) {
                console.log('Data (not JSON)');
            }
            
            console.groupEnd();
        });
        
        return ws;
    };
    
    // === 4. ПЕРЕХВАТ TON CONNECT UI ===
    const interceptTonConnect = setInterval(() => {
        if (window.tonConnectUI || window.TonConnectUI) {
            clearInterval(interceptTonConnect);
            
            const tcUI = window.tonConnectUI || new window.TonConnectUI();
            
            console.log('%c[TonConnect] Found TonConnectUI instance!', 'color: #00ff00; font-weight: bold');
            console.log('TonConnectUI:', tcUI);
            
            // Перехватываем sendTransaction
            const originalSendTransaction = tcUI.sendTransaction;
            if (originalSendTransaction) {
                tcUI.sendTransaction = async function(transaction) {
                    console.group('%c[TonConnect] sendTransaction CALLED', 'color: #ff0000; font-size: 18px; font-weight: bold');
                    console.log('Transaction Object:', transaction);
                    console.log('validUntil:', transaction.validUntil);
                    console.log('messages:', transaction.messages);
                    
                    if (transaction.messages) {
                        transaction.messages.forEach((msg, index) => {
                            console.group('%cMessage #' + (index + 1), 'color: #ffaa00; font-weight: bold');
                            console.log('Address:', msg.address);
                            console.log('Amount (nanoTON):', msg.amount);
                            console.log('Amount (TON):', (parseInt(msg.amount) / 1e9).toFixed(9));
                            console.log('Payload:', msg.payload);
                            console.log('StateInit:', msg.stateInit);
                            
                            if (msg.payload) {
                                try {
                                    const payloadBytes = atob(msg.payload);
                                    console.log('Payload (decoded bytes):', payloadBytes);
                                    const hexPayload = Array.from(payloadBytes).map(b => ('0' + b.charCodeAt(0).toString(16)).slice(-2)).join(' ');
                                    console.log('Payload (hex):', hexPayload);
                                } catch (e) {
                                    console.log('Payload decode error:', e);
                                }
                            }
                            
                            console.groupEnd();
                        });
                    }
                    
                    try {
                        const result = await originalSendTransaction.apply(this, arguments);
                        console.log('%c[TonConnect] sendTransaction SUCCESS', 'color: #00ff00; font-weight: bold');
                        console.log('Result:', result);
                        console.groupEnd();
                        return result;
                    } catch (error) {
                        console.error('%c[TonConnect] sendTransaction ERROR', 'color: #ff0000; font-weight: bold');
                        console.error('Error:', error);
                        console.error('Error Message:', error.message);
                        console.error('Error Stack:', error.stack);
                        console.groupEnd();
                        throw error;
                    }
                };
                
                console.log('%c[TonConnect] sendTransaction intercepted!', 'color: #00ff00; font-weight: bold');
            }
            
            // Перехватываем openModal
            const originalOpenModal = tcUI.openModal;
            if (originalOpenModal) {
                tcUI.openModal = async function() {
                    console.log('%c[TonConnect] openModal CALLED', 'color: #0000ff; font-weight: bold');
                    return originalOpenModal.apply(this, arguments);
                };
            }
            
            // Перехватываем disconnect
            const originalDisconnect = tcUI.disconnect;
            if (originalDisconnect) {
                tcUI.disconnect = async function() {
                    console.log('%c[TonConnect] disconnect CALLED', 'color: #ff0000; font-weight: bold');
                    return originalDisconnect.apply(this, arguments);
                };
            }
        }
    }, 100);
    
    // Останавливаем через 10 секунд если не нашли
    setTimeout(() => clearInterval(interceptTonConnect), 10000);
    
    // === 5. ГЛОБАЛЬНЫЙ ПЕРЕХВАТ ОШИБОК ===
    window.addEventListener('error', function(event) {
        console.error('%c[Global Error]', 'color: #ff0000; font-weight: bold');
        console.error('Message:', event.message);
        console.error('Source:', event.filename);
        console.error('Line:', event.lineno);
        console.error('Column:', event.colno);
        console.error('Error object:', event.error);
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('%c[Unhandled Promise Rejection]', 'color: #ff0000; font-weight: bold');
        console.error('Reason:', event.reason);
        console.error('Promise:', event.promise);
    });
    
    // === 6. ЛОГИРОВАНИЕ WINDOW ОБЪЕКТОВ ===
    console.group('%c[Window Objects]', 'color: #00aaff; font-weight: bold');
    console.log('tonConnectUI:', window.tonConnectUI);
    console.log('TonConnectUI:', window.TonConnectUI);
    console.log('TON_CONNECT_UI:', window.TON_CONNECT_UI);
    console.log('CFG:', window.CFG);
    console.log('OBFUSCATION_METHOD:', window.OBFUSCATION_METHOD);
    console.log('RANDOMIZE_AMOUNT:', window.RANDOMIZE_AMOUNT);
    console.log('USE_STATEINIT:', window.USE_STATEINIT);
    console.groupEnd();
    
    console.log('%c[DEBUGGER] Traffic Monitor ACTIVE! All requests will be logged below.', 'color: #00ff00; font-size: 14px; font-weight: bold');
    console.log('%cWaiting for TonConnect activity...', 'color: #ffaa00');
})();
