/**
 * WebSockets Module - Manages WebSocket connections
 */

// WebSocket connections
let logsSocket = null;
let metricsSocket = null;
let tracesSocket = null;

// Message handlers
let logsMessageHandler = null;
let metricsMessageHandler = null;
let tracesMessageHandler = null;

/**
 * Set message handlers for WebSocket data
 */
function setMessageHandlers(handlers) {
    if (handlers.logs) logsMessageHandler = handlers.logs;
    if (handlers.metrics) metricsMessageHandler = handlers.metrics;
    if (handlers.traces) tracesMessageHandler = handlers.traces;
}

/**
 * Connect to all WebSockets
 */
function connectWebSockets(settings) {
    console.log('Attempting to connect to WebSockets...');

    // Build any saved filter parameters
    let params = new URLSearchParams();
    if (settings.filters) {
        if (settings.filters.service) params.append('service', settings.filters.service);
        if (settings.filters.timeRange) params.append('time_range', settings.filters.timeRange);
        
        // Logs specific filters
        if (settings.filters.logLevel) params.append('level', settings.filters.logLevel);
        if (settings.filters.logSearch) params.append('search', settings.filters.logSearch);
    }

    // Logs WebSocket
    connectLogsWebSocket(params, settings);

    // Metrics WebSocket with metrics-specific filters
    let metricsParams = new URLSearchParams(params.toString());
    if (settings.filters && settings.filters.metricName) metricsParams.append('name', settings.filters.metricName);
    if (settings.filters && settings.filters.metricType) metricsParams.append('type', settings.filters.metricType);
    connectMetricsWebSocket(metricsParams, settings);

    // Traces WebSocket with traces-specific filters
    let tracesParams = new URLSearchParams(params.toString());
    if (settings.filters && settings.filters.traceStatus) tracesParams.append('status', settings.filters.traceStatus);
    if (settings.filters && settings.filters.minDuration) tracesParams.append('min_duration', settings.filters.minDuration);
    connectTracesWebSocket(tracesParams, settings);
}

/**
 * Connect to the logs WebSocket
 */
function connectLogsWebSocket(params, settings) {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Add parameters if provided
    let wsUrl = `${wsProtocol}//${window.location.host}/ws/logs`;
    if (params) {
        wsUrl += `?${params.toString()}`;
    }
    
    console.log('Connecting to logs WebSocket at:', wsUrl);
    logsSocket = new WebSocket(wsUrl);
    
    logsSocket.onopen = function() {
        console.log('Connected to logs WebSocket');
    };
    
    logsSocket.onmessage = function(event) {
        console.log('Raw WebSocket message received:', event.data);
        
        if (settings.isPaused) {
            console.log('Dashboard is paused, ignoring message');
            return;
        }
        
        try {
            const data = JSON.parse(event.data);
            console.log('Parsed WebSocket data:', data);
            
            // Check if the data is in the expected format
            if (data.type === 'logs' && Array.isArray(data.payload)) {
                // Handle array of logs
                console.log(`Processing ${data.payload.length} logs from WebSocket`);
                // Process in reverse order to show newest first when inserting at the top
                for (let i = data.payload.length - 1; i >= 0; i--) {
                    if (logsMessageHandler) logsMessageHandler(data.payload[i]);
                }
            } else if (data.timestamp || data.message) {
                // It's a single log object
                console.log('Processing single log from WebSocket');
                if (logsMessageHandler) logsMessageHandler(data);
            } else {
                console.warn('Received unexpected data format:', data);
            }
        } catch (error) {
            console.error('Error parsing log data:', error);
            console.error('Raw data:', event.data);
        }
    };
    
    logsSocket.onclose = function() {
        console.log('Disconnected from logs WebSocket');
        // Try to reconnect after a delay
        setTimeout(function() {
            connectLogsWebSocket(params, settings);
        }, 3000);
    };
    
    logsSocket.onerror = function(error) {
        console.error('Logs WebSocket error:', error);
    };
}

/**
 * Connect to the metrics WebSocket
 */
function connectMetricsWebSocket(params, settings) {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Add parameters if provided
    let wsUrl = `${wsProtocol}//${window.location.host}/ws/metrics`;
    if (params) {
        wsUrl += `?${params.toString()}`;
    }
    
    console.log('Connecting to metrics WebSocket at:', wsUrl);
    metricsSocket = new WebSocket(wsUrl);
    
    metricsSocket.onopen = function() {
        console.log('Connected to metrics WebSocket');
    };
    
    metricsSocket.onmessage = function(event) {
        if (settings.isPaused) return;
        
        try {
            const data = JSON.parse(event.data);
            console.log('Received metrics websocket data:', data);
            
            if (data.type === 'metrics' && Array.isArray(data.payload)) {
                // Process multiple metrics
                // Process in reverse order to show newest first
                for (let i = data.payload.length - 1; i >= 0; i--) {
                    if (metricsMessageHandler) metricsMessageHandler(data.payload[i]);
                }
            } else {
                // It's a single metric object
                if (metricsMessageHandler) metricsMessageHandler(data);
            }
        } catch (error) {
            console.error('Error parsing metrics data:', error);
        }
    };
    
    metricsSocket.onclose = function() {
        console.log('Disconnected from metrics WebSocket');
        // Try to reconnect after a delay
        setTimeout(function() {
            connectMetricsWebSocket(params, settings);
        }, 3000);
    };
    
    metricsSocket.onerror = function(error) {
        console.error('Metrics WebSocket error:', error);
    };
}

/**
 * Connect to the traces WebSocket
 */
function connectTracesWebSocket(params, settings) {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Add parameters if provided
    let wsUrl = `${wsProtocol}//${window.location.host}/ws/traces`;
    if (params) {
        wsUrl += `?${params.toString()}`;
    }
    
    console.log('Connecting to traces WebSocket at:', wsUrl);
    tracesSocket = new WebSocket(wsUrl);
    
    tracesSocket.onopen = function() {
        console.log('Connected to traces WebSocket');
    };
    
    tracesSocket.onmessage = function(event) {
        if (settings.isPaused) return;
        
        try {
            const data = JSON.parse(event.data);
            console.log('Received traces websocket data:', data);
            
            if (data.type === 'traces' && Array.isArray(data.payload)) {
                // Process multiple traces
                // Process in reverse order to show newest first
                for (let i = data.payload.length - 1; i >= 0; i--) {
                    if (tracesMessageHandler) tracesMessageHandler(data.payload[i]);
                }
            } else {
                // It's a single trace object
                if (tracesMessageHandler) tracesMessageHandler(data);
            }
        } catch (error) {
            console.error('Error parsing traces data:', error);
        }
    };
    
    tracesSocket.onclose = function() {
        console.log('Disconnected from traces WebSocket');
        // Try to reconnect after a delay
        setTimeout(function() {
            connectTracesWebSocket(params, settings);
        }, 3000);
    };
    
    tracesSocket.onerror = function(error) {
        console.error('Traces WebSocket error:', error);
    };
}

/**
 * Disconnect all WebSockets
 */
function disconnectWebSockets() {
    console.log('Disconnecting WebSockets...');
    
    if (logsSocket) {
        logsSocket.close();
        logsSocket = null;
    }
    
    if (metricsSocket) {
        metricsSocket.close();
        metricsSocket = null;
    }
    
    if (tracesSocket) {
        tracesSocket.close();
        tracesSocket = null;
    }
}

/**
 * Apply filters and reconnect WebSockets
 */
function applyFilters(filters, settings) {
    // Store the current filters
    settings.filters = filters;
    
    // Disconnect existing WebSockets
    disconnectWebSockets();
    
    // Reconnect with new filters
    connectWebSockets(settings);
}

// Export the module
export default {
    connect: connectWebSockets,
    disconnect: disconnectWebSockets,
    applyFilters: applyFilters,
    setMessageHandlers: setMessageHandlers
}; 