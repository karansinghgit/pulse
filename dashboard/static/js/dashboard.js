// Dashboard JavaScript

// Settings
let settings = {
    serverUrl: window.location.origin,  // Use the current origin instead of hardcoded URL
    refreshRate: 1,
    maxItems: 1000,
    isPaused: false
};

// WebSocket connections
let logsSocket = null;
let metricsSocket = null;
let tracesSocket = null;

// Charts
let metricsChart = null;
let tracesChart = null;

// DOM Elements
const tabLinks = document.querySelectorAll('nav a');
const tabContents = document.querySelectorAll('.tab-content');
const tabFilters = document.querySelectorAll('.tab-filters');
const serviceFilter = document.getElementById('service-filter');
const timeRange = document.getElementById('time-range');
const applyFiltersBtn = document.getElementById('apply-filters');
const pauseLogsBtn = document.getElementById('pause-logs');
const clearLogsBtn = document.getElementById('clear-logs');
const logsTable = document.getElementById('logs-body');
const metricsTable = document.getElementById('metrics-body');
const tracesTable = document.getElementById('traces-body');
const saveSettingsBtn = document.getElementById('save-settings');

// Initialize the dashboard
function initDashboard() {
    console.log('Initializing dashboard...');
    
    // Load stored settings
    loadSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up tabs
    setupTabs();
    
    // Initialize charts
    try {
        console.log('Initializing charts...');
        initCharts();
        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
    
    // Load services for filter dropdowns
    loadServices();
    
    // Connect WebSockets
    connectWebSockets();
    
    console.log('Dashboard initialization complete');
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('pulseSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            settings = { ...settings, ...parsed };
        } catch (error) {
            console.error('Error parsing saved settings:', error);
        }
    }
    
    // Update the settings form with current values
    document.getElementById('server-url').value = settings.serverUrl;
    document.getElementById('refresh-rate').value = settings.refreshRate;
    document.getElementById('max-items').value = settings.maxItems;
}

// Save settings to localStorage
function saveSettings() {
    // Get values from the form
    settings.serverUrl = document.getElementById('server-url').value;
    settings.refreshRate = parseInt(document.getElementById('refresh-rate').value, 10) || 1;
    settings.maxItems = parseInt(document.getElementById('max-items').value, 10) || 1000;
    
    // Save to localStorage
    try {
        localStorage.setItem('pulseSettings', JSON.stringify(settings));
        alert('Settings saved successfully!');
        
        // Reconnect WebSockets if server URL changed
        disconnectWebSockets();
        connectWebSockets();
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
}

// Set up tab navigation
function setupTabs() {
    // Get all tab links
    const tabLinks = document.querySelectorAll('nav a');
    
    // Add click event listeners to each tab link
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the tab name from the data-tab attribute
            const tabName = this.getAttribute('data-tab');
            
            // Remove active class from all tab links and contents
            document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-filters').forEach(el => el.classList.remove('active'));
            
            // Add active class to the clicked tab link and corresponding content
            this.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Show the corresponding filters if they exist
            const filterEl = document.getElementById(`${tabName}-filters`);
            if (filterEl) {
                filterEl.classList.add('active');
            }
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Pause/resume logs button
    const pauseLogsBtn = document.getElementById('pause-logs');
    if (pauseLogsBtn) {
        pauseLogsBtn.addEventListener('click', function() {
            settings.isPaused = !settings.isPaused;
            this.textContent = settings.isPaused ? 'Resume' : 'Pause';
            this.classList.toggle('paused', settings.isPaused);
        });
    }
    
    // Clear logs button
    const clearLogsBtn = document.getElementById('clear-logs');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', function() {
            const logsBody = document.getElementById('logs-body');
            if (logsBody) {
                logsBody.innerHTML = '';
            }
        });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Save settings button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
}

// Initialize charts
function initCharts() {
    // Ensure Chart.js has the proper date adapter
    try {
        // Metrics chart
        const metricsCtx = document.getElementById('metrics-chart').getContext('2d');
        metricsChart = new Chart(metricsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'PPpp' // Localized format with date and time
                        },
                        adapters: {
                            date: {
                                locale: 'en-US'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });

        // Traces chart
        const tracesCtx = document.getElementById('traces-chart').getContext('2d');
        tracesChart = new Chart(tracesCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Duration (ms)',
                    data: [],
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'PPpp' // Localized format with date and time
                        },
                        adapters: {
                            date: {
                                locale: 'en-US'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

// Load services for filter dropdown
function loadServices() {
    fetch(`${settings.serverUrl}/api/services`)
        .then(response => response.json())
        .then(services => {
            serviceFilter.innerHTML = '<option value="">All Services</option>';
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service;
                option.textContent = service;
                serviceFilter.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading services:', error);
        });
}

// Connect to WebSockets
function connectWebSockets() {
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
    connectLogsWebSocket(params);

    // Metrics WebSocket with metrics-specific filters
    let metricsParams = new URLSearchParams(params.toString());
    if (settings.filters && settings.filters.metricName) metricsParams.append('name', settings.filters.metricName);
    if (settings.filters && settings.filters.metricType) metricsParams.append('type', settings.filters.metricType);
    connectMetricsWebSocket(metricsParams);

    // Traces WebSocket with traces-specific filters
    let tracesParams = new URLSearchParams(params.toString());
    if (settings.filters && settings.filters.traceStatus) tracesParams.append('status', settings.filters.traceStatus);
    if (settings.filters && settings.filters.minDuration) tracesParams.append('min_duration', settings.filters.minDuration);
    connectTracesWebSocket(tracesParams);
}

// Connect to the logs WebSocket
function connectLogsWebSocket(params) {
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
                    addLogEntry(data.payload[i]);
                }
            } else if (data.timestamp || data.message) {
                // It's a single log object
                console.log('Processing single log from WebSocket');
                addLogEntry(data);
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
            connectLogsWebSocket(params);
        }, 3000);
    };
    
    logsSocket.onerror = function(error) {
        console.error('Logs WebSocket error:', error);
    };
}

// Connect to the metrics WebSocket
function connectMetricsWebSocket(params) {
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
                    updateMetrics(data.payload[i]);
                }
                
                // Update chart if we have metrics data
                if (data.payload.length > 0) {
                    updateMetricsChart(data.payload);
                }
            } else {
                console.warn('Received unexpected metrics data format:', data);
            }
        } catch (error) {
            console.error('Error parsing metrics data:', error);
        }
    };
    
    metricsSocket.onclose = function() {
        console.log('Disconnected from metrics WebSocket');
        // Try to reconnect after a delay
        setTimeout(function() {
            connectMetricsWebSocket(params);
        }, 3000);
    };
    
    metricsSocket.onerror = function(error) {
        console.error('Metrics WebSocket error:', error);
    };
}

// Connect to the traces WebSocket
function connectTracesWebSocket(params) {
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
                    updateTraces(data.payload[i]);
                }
                
                // Update chart if we have trace data
                if (data.payload.length > 0) {
                    updateTracesChart(data.payload);
                }
            } else {
                console.warn('Received unexpected traces data format:', data);
            }
        } catch (error) {
            console.error('Error parsing traces data:', error);
        }
    };
    
    tracesSocket.onclose = function() {
        console.log('Disconnected from traces WebSocket');
        // Try to reconnect after a delay
        setTimeout(function() {
            connectTracesWebSocket(params);
        }, 3000);
    };
    
    tracesSocket.onerror = function(error) {
        console.error('Traces WebSocket error:', error);
    };
}

// Disconnect all WebSockets
function disconnectWebSockets() {
    // Close logs WebSocket if it exists
    if (logsSocket && logsSocket.readyState !== WebSocket.CLOSED) {
        logsSocket.close();
        logsSocket = null;
    }
    
    // Close metrics WebSocket if it exists
    if (metricsSocket && metricsSocket.readyState !== WebSocket.CLOSED) {
        metricsSocket.close();
        metricsSocket = null;
    }
    
    // Close traces WebSocket if it exists
    if (tracesSocket && tracesSocket.readyState !== WebSocket.CLOSED) {
        tracesSocket.close();
        tracesSocket = null;
    }
    
    console.log('All WebSocket connections closed');
}

// Apply filters to the data
function applyFilters() {
    console.log('Applying filters...');
    
    // Get the active tab
    const activeTab = document.querySelector('nav a.active').getAttribute('data-tab');
    
    // Get common filter values
    const service = document.getElementById('service-filter').value;
    const timeRange = document.getElementById('time-range').value;
    
    // Build the query parameters
    let params = new URLSearchParams();
    if (service) params.append('service', service);
    if (timeRange) params.append('time_range', timeRange);
    
    // Store filters in settings
    settings.filters = {
        service: service,
        timeRange: timeRange
    };
    
    // Add tab-specific filters
    if (activeTab === 'logs') {
        const logLevel = document.getElementById('log-level').value;
        const logSearch = document.getElementById('log-search').value;
        
        if (logLevel) {
            params.append('level', logLevel);
            settings.filters.logLevel = logLevel;
        }
        if (logSearch) {
            params.append('search', logSearch);
            settings.filters.logSearch = logSearch;
        }
        
        // Clear the logs table
        const logsBody = document.getElementById('logs-body');
        if (logsBody) {
            logsBody.innerHTML = '';
        }
        
        // Disconnect and reconnect the WebSocket with new filters
        if (logsSocket) {
            logsSocket.close();
        }
        
        // Connect with filters
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/logs?${params.toString()}`;
        
        console.log('Connecting to logs WebSocket with filters at:', wsUrl);
        logsSocket = new WebSocket(wsUrl);
        
        logsSocket.onopen = function() {
            console.log('Connected to logs WebSocket with filters');
        };
        
        logsSocket.onmessage = function(event) {
            if (settings.isPaused) return;
            
            try {
                const data = JSON.parse(event.data);
                console.log('Received logs websocket data:', data);
                
                // Check if the data is in the expected format
                if (data.type === 'logs' && Array.isArray(data.payload)) {
                    // Handle array of logs
                    console.log(`Processing ${data.payload.length} logs from WebSocket`);
                    // Process in reverse order to show newest first when inserting at the top
                    for (let i = data.payload.length - 1; i >= 0; i--) {
                        addLogEntry(data.payload[i]);
                    }
                } else if (data.timestamp || data.message) {
                    // It's a single log object
                    console.log('Processing single log from WebSocket');
                    addLogEntry(data);
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
                connectLogsWebSocket(params);
            }, 3000);
        };
        
        logsSocket.onerror = function(error) {
            console.error('Logs WebSocket error:', error);
        };
        
        // Also fetch initial logs via HTTP API
        fetch(`${settings.serverUrl}/api/logs?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log(`Received ${data.length} logs from API`);
                // Add each log to the table
                data.forEach(log => {
                    addLogEntry(log);
                });
            })
            .catch(error => {
                console.error('Error fetching logs:', error);
            });
            
    } else if (activeTab === 'metrics') {
        const metricName = document.getElementById('metric-name').value;
        const metricType = document.getElementById('metric-type').value;
        
        if (metricName) {
            params.append('name', metricName);
            settings.filters.metricName = metricName;
        }
        if (metricType) {
            params.append('type', metricType);
            settings.filters.metricType = metricType;
        }
        
        // Clear the metrics table
        const metricsBody = document.getElementById('metrics-body');
        if (metricsBody) {
            metricsBody.innerHTML = '';
        }
        
        // Disconnect and reconnect the WebSocket with new filters
        if (metricsSocket) {
            metricsSocket.close();
        }
        
        // Connect with filters
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/metrics?${params.toString()}`;
        
        console.log('Connecting to metrics WebSocket with filters at:', wsUrl);
        metricsSocket = new WebSocket(wsUrl);
        
        metricsSocket.onopen = function() {
            console.log('Connected to metrics WebSocket with filters');
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
                        updateMetrics(data.payload[i]);
                    }
                    
                    // Update chart if we have metrics data
                    if (data.payload.length > 0) {
                        updateMetricsChart(data.payload);
                    }
                } else {
                    console.warn('Received unexpected metrics data format:', data);
                }
            } catch (error) {
                console.error('Error parsing metrics data:', error);
            }
        };
        
        metricsSocket.onclose = function() {
            console.log('Disconnected from metrics WebSocket');
            // Try to reconnect after a delay
            setTimeout(function() {
                connectMetricsWebSocket(params);
            }, 3000);
        };
        
        metricsSocket.onerror = function(error) {
            console.error('Metrics WebSocket error:', error);
        };
        
        // Also fetch initial metrics via HTTP API
        fetch(`${settings.serverUrl}/api/metrics?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log(`Received ${data.length} metrics from API`);
                // Add each metric to the table
                data.forEach(metric => {
                    updateMetrics(metric);
                });
                
                // Update chart
                if (data.length > 0) {
                    updateMetricsChart(data);
                }
            })
            .catch(error => {
                console.error('Error fetching metrics:', error);
            });
            
    } else if (activeTab === 'traces') {
        const traceStatus = document.getElementById('trace-status').value;
        const minDuration = document.getElementById('min-duration').value;
        
        if (traceStatus) {
            params.append('status', traceStatus);
            settings.filters.traceStatus = traceStatus;
        }
        if (minDuration) {
            params.append('min_duration', minDuration);
            settings.filters.minDuration = minDuration;
        }
        
        // Clear the traces table
        const tracesBody = document.getElementById('traces-body');
        if (tracesBody) {
            tracesBody.innerHTML = '';
        }
        
        // Disconnect and reconnect the WebSocket with new filters
        if (tracesSocket) {
            tracesSocket.close();
        }
        
        // Connect with filters
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/traces?${params.toString()}`;
        
        console.log('Connecting to traces WebSocket with filters at:', wsUrl);
        tracesSocket = new WebSocket(wsUrl);
        
        tracesSocket.onopen = function() {
            console.log('Connected to traces WebSocket with filters');
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
                        updateTraces(data.payload[i]);
                    }
                    
                    // Update chart if we have trace data
                    if (data.payload.length > 0) {
                        updateTracesChart(data.payload);
                    }
                } else {
                    console.warn('Received unexpected traces data format:', data);
                }
            } catch (error) {
                console.error('Error parsing traces data:', error);
            }
        };
        
        tracesSocket.onclose = function() {
            console.log('Disconnected from traces WebSocket');
            // Try to reconnect after a delay
            setTimeout(function() {
                connectTracesWebSocket(params);
            }, 3000);
        };
        
        tracesSocket.onerror = function(error) {
            console.error('Traces WebSocket error:', error);
        };
        
        // Also fetch initial traces via HTTP API
        fetch(`${settings.serverUrl}/api/traces?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                console.log(`Received ${data.length} traces from API`);
                // Add each trace to the table
                data.forEach(trace => {
                    updateTraces(trace);
                });
                
                // Update chart
                if (data.length > 0) {
                    updateTracesChart(data);
                }
            })
            .catch(error => {
                console.error('Error fetching traces:', error);
            });
    }
    
    // Save filters to localStorage without showing the alert
    localStorage.setItem('pulseSettings', JSON.stringify(settings));
}

// Add metric to table
function addMetricToTable(metric) {
    // Get the table body
    const metricsBody = document.getElementById('metrics-body');
    if (!metricsBody) {
        console.error('Could not find metrics-body element');
        return;
    }
    
    // Limit the number of rows (remove from the bottom)
    while (metricsBody.children.length >= settings.maxItems && metricsBody.lastChild) {
        metricsBody.removeChild(metricsBody.lastChild);
    }

    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(metric.timestamp);
    const formattedTime = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
    
    // Format tags if present
    let tagsHtml = '';
    if (metric.tags && typeof metric.tags === 'object') {
        tagsHtml = formatTags(metric.tags);
    }
    
    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${metric.name}</td>
        <td>${metric.value}</td>
        <td>${metric.type || ''}</td>
        <td>${metric.service || 'unknown'}</td>
        <td>${tagsHtml}</td>
    `;
    
    // Add the row to the top of the table (newest first)
    metricsBody.insertBefore(row, metricsBody.firstChild);
}

// Add trace to table
function addTraceToTable(trace) {
    // Get the table body
    const tracesBody = document.getElementById('traces-body');
    if (!tracesBody) {
        console.error('Could not find traces-body element');
        return;
    }
    
    // Limit the number of rows (remove from the bottom)
    while (tracesBody.children.length >= settings.maxItems && tracesBody.lastChild) {
        tracesBody.removeChild(tracesBody.lastChild);
    }

    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(trace.start_time);
    const formattedTime = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
    
    // Format tags if present
    let tagsHtml = '';
    if (trace.tags && typeof trace.tags === 'object') {
        tagsHtml = formatTags(trace.tags);
    }
    
    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${trace.name || ''}</td>
        <td>${trace.service || 'unknown'}</td>
        <td>${trace.duration || 0}</td>
        <td>${trace.status || 'unknown'}</td>
        <td>${tagsHtml}</td>
    `;
    
    // Add the row to the top of the table (newest first)
    tracesBody.insertBefore(row, tracesBody.firstChild);
}

// Update metrics chart with new data
function updateMetricsChart(metrics) {
    if (!metricsChart) return;
    
    // If metrics is a single object, convert to array
    if (!Array.isArray(metrics)) {
        metrics = [metrics];
    }
    
    console.log(`Updating metrics chart with ${metrics.length} metrics`);
    
    // Group metrics by name
    const metricsByName = {};
    metrics.forEach(metric => {
        if (!metricsByName[metric.name]) {
            metricsByName[metric.name] = [];
        }
        metricsByName[metric.name].push(metric);
    });
    
    // Clear current datasets
    metricsChart.data.datasets = [];
    
    // Add each metric group to the chart
    Object.keys(metricsByName).forEach(name => {
        const metrics = metricsByName[name];
        const color = getRandomColor();
        
        // Create a dataset for this metric name
        const dataset = {
            label: name,
            data: metrics.map(m => ({
                x: new Date(m.timestamp || Date.now()),
                y: parseFloat(m.value)
            })),
            borderColor: color,
            backgroundColor: color + '33',  // Add alpha transparency
            fill: false,
            tension: 0.1
        };
        
        metricsChart.data.datasets.push(dataset);
    });
    
    // Update the chart
    metricsChart.update();
}

// Update traces chart with new data
function updateTracesChart(traces) {
    if (!tracesChart) return;
    
    // If traces is a single object, convert to array
    if (!Array.isArray(traces)) {
        traces = [traces];
    }
    
    console.log(`Updating traces chart with ${traces.length} traces`);
    
    // Group traces by service and name
    const traceGroups = {};
    traces.forEach(trace => {
        const key = `${trace.service || 'unknown'}: ${trace.name || 'unknown'}`;
        if (!traceGroups[key]) {
            traceGroups[key] = [];
        }
        traceGroups[key].push(trace);
    });
    
    // Clear current data
    tracesChart.data.labels = [];
    tracesChart.data.datasets[0].data = [];
    
    // Calculate average duration for each group
    Object.keys(traceGroups).forEach(name => {
        const traces = traceGroups[name];
        const avgDuration = traces.reduce((sum, trace) => {
            return sum + (parseFloat(trace.duration_ms) || 0);
        }, 0) / traces.length;
        
        tracesChart.data.labels.push(name);
        tracesChart.data.datasets[0].data.push(avgDuration);
    });
    
    // Update the chart
    tracesChart.update();
}

// Add a log entry to the table
function addLogEntry(log) {
    console.log('Adding log entry:', log);
    
    // Check if we've reached the maximum number of logs to display
    const logsBody = document.getElementById('logs-body');
    if (!logsBody) {
        console.error('Could not find logs-body element');
        return;
    }
    
    // Check if we need to remove old logs (remove from the bottom)
    while (logsBody.children.length >= settings.maxItems && logsBody.lastChild) {
        logsBody.removeChild(logsBody.lastChild);
    }
    
    // Create a new row
    const row = document.createElement('tr');
    
    // Format the timestamp
    let timestamp = log.timestamp || new Date().toISOString();
    try {
        // Try to parse and format the timestamp
        const date = new Date(timestamp);
        timestamp = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        console.error('Error parsing timestamp:', e);
    }
    
    // Get the log level and apply appropriate class
    const level = log.level || 'INFO';
    row.classList.add(`level-${level.toLowerCase()}`);
    
    // Format tags if present
    let tagsHtml = '';
    if (log.tags && typeof log.tags === 'object') {
        tagsHtml = formatTags(log.tags);
    }
    
    // Set the row content
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${level}</td>
        <td>${log.service || 'unknown'}</td>
        <td>${log.message || ''}</td>
        <td>${tagsHtml}</td>
    `;
    
    // Add the row to the table (at the beginning to show newest first)
    logsBody.insertBefore(row, logsBody.firstChild);
}

// Update metrics with new data
function updateMetrics(metric) {
    if (!metric) return;
    
    // Add to metrics table
    addMetricToTable(metric);
    
    // Update metrics chart
    updateMetricsChart(metric);
}

// Update traces with new data
function updateTraces(trace) {
    if (!trace) return;
    
    // Add to traces table
    addTraceToTable(trace);
    
    // Update traces chart
    updateTracesChart(trace);
}

// Format tags as styled elements
function formatTags(tags) {
    if (!tags || typeof tags !== 'object') {
        return '';
    }
    
    let result = '';
    for (const key in tags) {
        if (tags.hasOwnProperty(key)) {
            result += `<span class="tag" title="${key}=${tags[key]}">${key}=${tags[key]}</span> `;
        }
    }
    return result;
}

// Generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard); 