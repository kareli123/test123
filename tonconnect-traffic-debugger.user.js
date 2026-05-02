// ==UserScript==
// @name         TON Connect Traffic Debugger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Перехватывает ВСЕ запросы (fetch, XHR, WebSocket, TonConnect) и экспортирует в JSON по Ctrl+X
// @author       You
// @match        https://kareli123.github.io/test123/*
// @match        https://*.github.io/*
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Хранилище всего трафика
    const trafficLog = {
        startTime: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        fetch: [],
        xhr: [],
        websocket: [],
        tonConnect: [],
        errors: [],
        windowObjects: {}
    };

    let requestCounter = 0;

    // === УТИЛИТЫ ===
    function getTimestamp() {
        return new Date().toISOString();
    }

    function safeStringify(obj, maxDepth = 5) {
        const seen = new WeakSet();
        return JSON.stringify(obj, function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            if (typeof value === 'function') {
                return '[Function: ' + value.name + ']';
            }
            if (value instanceof Error) {
                return {
                    message: value.message,
                    stack: value.stack,
                    name: value.name
                };
            }
            return value;
        }, 2);
    }

    function base64ToHex(base64) {
        try {
            const binary = atob(base64);
            const hex = Array.from(binary).map(c => {
                const byte = c.charCodeAt(0);
                return ('0' + byte.toString(16)).slice(-2);
            }).join(' ');
            return hex;
        } catch (e) {
            return 'Invalid base64';
        }
    }

    // === 1. ПЕРЕХВАТ FETCH ===
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const requestId = ++requestCounter;
        const timestamp = getTimestamp();
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        const options = args[1] || {};

        const fetchEntry = {
            id: requestId,
            timestamp: timestamp,
            type: 'FETCH',
            url: url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body || null,
            bodyParsed: null
        };

        // Пытаемся распарсить body
        if (options.body) {
            try {
                fetchEntry.bodyParsed = JSON.parse(options.body);
            } catch (e) {
                fetchEntry.bodyParsed = String(options.body);
            }
        }

        console.group(`%c[FETCH #${requestId}] ${options.method || 'GET'} ${url}`, 'color: #00aaff; font-weight: bold; font-size: 12px');
        console.log('Request:', fetchEntry);

        try {
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();

            fetchEntry.response = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                url: response.url,
                redirected: response.redirected
            };

            try {
                const responseText = await clone.text();
                fetchEntry.response.bodyRaw = responseText;

                try {
                    fetchEntry.response.bodyParsed = JSON.parse(responseText);
                } catch (e) {
                    fetchEntry.response.bodyParsed = responseText;
                }
            } catch (e) {
                fetchEntry.response.bodyError = e.message;
            }

            console.log('Response:', fetchEntry.response);
            console.groupEnd();

            trafficLog.fetch.push(fetchEntry);
            return response;

        } catch (error) {
            fetchEntry.error = {
                message: error.message,
                stack: error.stack,
                name: error.name
            };

            console.error('Error:', error);
            console.groupEnd();

            trafficLog.fetch.push(fetchEntry);
            trafficLog.errors.push({
                timestamp: getTimestamp(),
                type: 'FETCH_ERROR',
                requestId: requestId,
                error: fetchEntry.error
            });

            throw error;
        }
    };

    // === 2. ПЕРЕХВАТ XMLHttpRequest ===
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._debugInfo = {
            id: ++requestCounter,
            timestamp: getTimestamp(),
            type: 'XHR',
            method: method,
            url: url,
            headers: {}
        };
        return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (this._debugInfo) {
            this._debugInfo.headers[header] = value;
        }
        return originalXHRSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        if (!this._debugInfo) {
            return originalXHRSend.apply(this, arguments);
        }

        const xhrEntry = this._debugInfo;
        xhrEntry.body = body || null;

        if (body) {
            try {
                xhrEntry.bodyParsed = JSON.parse(body);
            } catch (e) {
                xhrEntry.bodyParsed = String(body);
            }
        }

        console.group(`%c[XHR #${xhrEntry.id}] ${xhrEntry.method} ${xhrEntry.url}`, 'color: #ff9900; font-weight: bold; font-size: 12px');
        console.log('Request:', xhrEntry);

        this.addEventListener('load', function() {
            xhrEntry.response = {
                status: this.status,
                statusText: this.statusText,
                headers: this.getAllResponseHeaders(),
                bodyRaw: this.responseText
            };

            try {
                xhrEntry.response.bodyParsed = JSON.parse(this.responseText);
            } catch (e) {
                xhrEntry.response.bodyParsed = this.responseText;
            }

            console.log('Response:', xhrEntry.response);
            console.groupEnd();

            trafficLog.xhr.push(xhrEntry);
        });

        this.addEventListener('error', function() {
            xhrEntry.error = {
                message: 'XHR request failed',
                status: this.status
            };

            console.error('Error:', xhrEntry.error);
            console.groupEnd();

            trafficLog.xhr.push(xhrEntry);
            trafficLog.errors.push({
                timestamp: getTimestamp(),
                type: 'XHR_ERROR',
                requestId: xhrEntry.id,
                error: xhrEntry.error
            });
        });

        return originalXHRSend.apply(this, arguments);
    };

    // === 3. ПЕРЕХВАТ WEBSOCKET ===
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
        const ws = new originalWebSocket(...args);
        const wsId = ++requestCounter;
        const wsUrl = args[0];

        const wsEntry = {
            id: wsId,
            timestamp: getTimestamp(),
            type: 'WEBSOCKET',
            url: wsUrl,
            messages: []
        };

        console.log(`%c[WebSocket #${wsId}] Connecting to: ${wsUrl}`, 'color: #ff00ff; font-weight: bold; font-size: 12px');

        ws.addEventListener('open', function() {
            wsEntry.opened = getTimestamp();
            console.log(`%c[WebSocket #${wsId}] Connected`, 'color: #00ff00; font-weight: bold');
        });

        const originalSend = ws.send;
        ws.send = function(data) {
            const message = {
                timestamp: getTimestamp(),
                direction: 'SEND',
                dataRaw: data
            };

            try {
                message.dataParsed = JSON.parse(data);
            } catch (e) {
                message.dataParsed = String(data);
            }

            wsEntry.messages.push(message);
            console.log(`%c[WebSocket #${wsId}] SEND:`, 'color: #ff00ff', message.dataParsed);

            return originalSend.apply(this, arguments);
        };

        ws.addEventListener('message', function(event) {
            const message = {
                timestamp: getTimestamp(),
                direction: 'RECEIVE',
                dataRaw: event.data
            };

            try {
                message.dataParsed = JSON.parse(event.data);
            } catch (e) {
                message.dataParsed = String(event.data);
            }

            wsEntry.messages.push(message);
            console.log(`%c[WebSocket #${wsId}] RECEIVE:`, 'color: #ff00ff', message.dataParsed);
        });

        ws.addEventListener('close', function(event) {
            wsEntry.closed = getTimestamp();
            wsEntry.closeCode = event.code;
            wsEntry.closeReason = event.reason;
            console.log(`%c[WebSocket #${wsId}] Closed`, 'color: #ff0000; font-weight: bold');
            trafficLog.websocket.push(wsEntry);
        });

        ws.addEventListener('error', function(event) {
            wsEntry.error = {
                timestamp: getTimestamp(),
                message: 'WebSocket error'
            };
            console.error(`%c[WebSocket #${wsId}] Error`, 'color: #ff0000; font-weight: bold');
            trafficLog.errors.push({
                timestamp: getTimestamp(),
                type: 'WEBSOCKET_ERROR',
                requestId: wsId,
                error: wsEntry.error
            });
        });

        return ws;
    };

    // === 4. ПЕРЕХВАТ TON CONNECT ===
    function interceptTonConnect() {
        const checkInterval = setInterval(() => {
            if (window.tonConnectUI && !window._tonConnectIntercepted) {
                window._tonConnectIntercepted = true;
                clearInterval(checkInterval);

                console.log('%c[TonConnect] Found and intercepting TonConnectUI!', 'color: #00ff00; font-size: 14px; font-weight: bold');

                const tcUI = window.tonConnectUI;
                const originalSendTransaction = tcUI.sendTransaction;

                if (originalSendTransaction) {
                    tcUI.sendTransaction = async function(transaction) {
                        const tcId = ++requestCounter;
                        const timestamp = getTimestamp();

                        const tcEntry = {
                            id: tcId,
                            timestamp: timestamp,
                            type: 'TON_CONNECT_SEND_TRANSACTION',
                            transaction: JSON.parse(JSON.stringify(transaction)),
                            messages: []
                        };

                        console.group(`%c[TonConnect #${tcId}] sendTransaction`, 'color: #ff0000; font-size: 16px; font-weight: bold');
                        console.log('Transaction Object:', transaction);
                        console.log('validUntil:', transaction.validUntil);
                        console.log('Number of messages:', transaction.messages?.length || 0);

                        if (transaction.messages) {
                            transaction.messages.forEach((msg, index) => {
                                const messageInfo = {
                                    index: index + 1,
                                    address: msg.address,
                                    amountNano: msg.amount,
                                    amountTON: (parseInt(msg.amount) / 1e9).toFixed(9),
                                    payload: msg.payload || null,
                                    payloadHex: msg.payload ? base64ToHex(msg.payload) : null,
                                    stateInit: msg.stateInit || null,
                                    bounce: msg.bounce
                                };

                                tcEntry.messages.push(messageInfo);

                                console.group(`%cMessage #${index + 1}`, 'color: #ffaa00; font-weight: bold; font-size: 14px');
                                console.log('Address:', msg.address);
                                console.log('Amount (nanoTON):', msg.amount);
                                console.log('Amount (TON):', messageInfo.amountTON);
                                console.log('Payload (base64):', msg.payload);
                                console.log('Payload (hex):', messageInfo.payloadHex);
                                console.log('StateInit:', msg.stateInit);
                                console.log('Bounce:', msg.bounce);
                                console.groupEnd();
                            });
                        }

                        try {
                            console.log('%c⏳ Calling original sendTransaction...', 'color: #ffff00; font-weight: bold');
                            const result = await originalSendTransaction.apply(this, arguments);

                            tcEntry.result = 'SUCCESS';
                            tcEntry.response = result;

                            console.log('%c✅ SUCCESS', 'color: #00ff00; font-size: 16px; font-weight: bold');
                            console.log('Result:', result);
                            console.groupEnd();

                            trafficLog.tonConnect.push(tcEntry);
                            return result;

                        } catch (error) {
                            tcEntry.result = 'ERROR';
                            tcEntry.error = {
                                message: error.message,
                                stack: error.stack,
                                name: error.name,
                                toString: error.toString()
                            };

                            console.log('%c❌ ERROR', 'color: #ff0000; font-size: 16px; font-weight: bold');
                            console.error('Error message:', error.message);
                            console.error('Error object:', error);
                            console.groupEnd();

                            trafficLog.tonConnect.push(tcEntry);
                            trafficLog.errors.push({
                                timestamp: getTimestamp(),
                                type: 'TON_CONNECT_ERROR',
                                requestId: tcId,
                                error: tcEntry.error
                            });

                            throw error;
                        }
                    };

                    console.log('%c[TonConnect] sendTransaction intercepted successfully!', 'color: #00ff00; font-weight: bold');
                }
            }
        }, 100);

        setTimeout(() => clearInterval(checkInterval), 15000);
    }

    // === 5. ПЕРЕХВАТ ГЛОБАЛЬНЫХ ОШИБОК ===
    window.addEventListener('error', function(event) {
        const errorEntry = {
            timestamp: getTimestamp(),
            type: 'GLOBAL_ERROR',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error ? {
                message: event.error.message,
                stack: event.error.stack,
                name: event.error.name
            } : null
        };

        trafficLog.errors.push(errorEntry);
        console.error('%c[Global Error]', 'color: #ff0000; font-weight: bold', errorEntry);
    });

    window.addEventListener('unhandledrejection', function(event) {
        const rejectionEntry = {
            timestamp: getTimestamp(),
            type: 'UNHANDLED_REJECTION',
            reason: event.reason,
            promise: '[Promise]'
        };

        trafficLog.errors.push(rejectionEntry);
        console.error('%c[Unhandled Rejection]', 'color: #ff0000; font-weight: bold', rejectionEntry);
    });

    // === 6. ЭКСПОРТ В JSON ПО CTRL+X ===
    window.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'x') {
            event.preventDefault();

            // Собираем window объекты
            trafficLog.windowObjects = {
                tonConnectUI: window.tonConnectUI ? '[Object]' : null,
                CFG: window.CFG || null,
                OBFUSCATION_METHOD: window.OBFUSCATION_METHOD || null,
                RANDOMIZE_AMOUNT: window.RANDOMIZE_AMOUNT || null,
                AMOUNT_VARIANCE: window.AMOUNT_VARIANCE || null,
                USE_STATEINIT: window.USE_STATEINIT || null
            };

            trafficLog.endTime = new Date().toISOString();
            trafficLog.totalRequests = trafficLog.fetch.length + trafficLog.xhr.length + trafficLog.websocket.length + trafficLog.tonConnect.length;

            const json = safeStringify(trafficLog);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tonconnect-traffic-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('%c📥 Traffic log exported to JSON!', 'color: #00ff00; font-size: 16px; font-weight: bold');
            console.log('Total requests:', trafficLog.totalRequests);
            console.log('Fetch:', trafficLog.fetch.length);
            console.log('XHR:', trafficLog.xhr.length);
            console.log('WebSocket:', trafficLog.websocket.length);
            console.log('TonConnect:', trafficLog.tonConnect.length);
            console.log('Errors:', trafficLog.errors.length);
        }
    });

    // === 7. ИНИЦИАЛИЗАЦИЯ ===
    console.log('%c╔════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-weight: bold');
    console.log('%c║    TON CONNECT TRAFFIC DEBUGGER ACTIVE                     ║', 'color: #00ff00; font-weight: bold');
    console.log('%c╠════════════════════════════════════════════════════════════╣', 'color: #00ff00; font-weight: bold');
    console.log('%c║  Press CTRL+X to export all traffic to JSON               ║', 'color: #ffff00; font-weight: bold');
    console.log('%c╚════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-weight: bold');

    // Запускаем перехват TonConnect при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptTonConnect);
    } else {
        interceptTonConnect();
    }

    // Глобальная функция для быстрого доступа к логу
    window.getTrafficLog = function() {
        return trafficLog;
    };

    window.exportTrafficLog = function() {
        const json = safeStringify(trafficLog);
        console.log(json);
        return json;
    };

    window.clearTrafficLog = function() {
        trafficLog.fetch = [];
        trafficLog.xhr = [];
        trafficLog.websocket = [];
        trafficLog.tonConnect = [];
        trafficLog.errors = [];
        console.log('%c🗑️ Traffic log cleared!', 'color: #ffaa00; font-weight: bold');
    };

    console.log('%c💡 Helper functions:', 'color: #00aaff; font-weight: bold');
    console.log('   getTrafficLog() - get current traffic log');
    console.log('   exportTrafficLog() - print JSON to console');
    console.log('   clearTrafficLog() - clear all logs');

})();
