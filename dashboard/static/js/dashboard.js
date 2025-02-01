// Dashboard JavaScript

// Settings
let settings = {
    serverUrl: window.location.origin,  // Use the current origin instead of hardcoded URL
    refreshRate: 1,
    maxItems: 100,
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
    // Load settings from localStorage
    loadSettings();

    // Set up tab navigation
    setupTabs();

    // Set up event listeners
    setupEventListeners();

    // Initialize charts
    initCharts();

    // Load services for filter dropdown
    loadServices();

    // Connect to WebSockets
    connectWebSockets();
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
    settings.maxItems = parseInt(document.getElementById('max-items').value, 10) || 100;
    
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
                        unit: 'minute'
                    }
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
                y: {
                    beginAtZero: true
                }
            }
        }
    });
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
    // Logs WebSocket
    connectLogsWebSocket();

    // Metrics WebSocket
    connectMetricsWebSocket();

    // Traces WebSocket
    connectTracesWebSocket();
}

// Connect to the logs WebSocket
function connectLogsWebSocket() {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/logs`;
    
    logsSocket = new WebSocket(wsUrl);
    
    logsSocket.onopen = function() {
        console.log('Connected to logs WebSocket');
    };
    
    logsSocket.onmessage = function(event) {
        if (settings.isPaused) return;
        
        try {
            const log = JSON.parse(event.data);
            addLogEntry(log);
        } catch (error) {
            console.error('Error parsing log data:', error);
        }
    };
    
    logsSocket.onclose = function() {
        console.log('Disconnected from logs WebSocket');
        // Try to reconnect after a delay
        setTimeout(connectLogsWebSocket, 3000);
    };
    
    logsSocket.onerror = function(error) {
        console.error('Logs WebSocket error:', error);
    };
}

// Connect to the metrics WebSocket
function connectMetricsWebSocket() {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/metrics`;
    
    metricsSocket = new WebSocket(wsUrl);
    
    metricsSocket.onopen = function() {
        console.log('Connected to metrics WebSocket');
    };
    
    metricsSocket.onmessage = function(event) {
        try {
            const metric = JSON.parse(event.data);
            updateMetrics(metric);
        } catch (error) {
            console.error('Error parsing metric data:', error);
        }
    };
    
    metricsSocket.onclose = function() {
        console.log('Disconnected from metrics WebSocket');
        // Try to reconnect after a delay
        setTimeout(connectMetricsWebSocket, 3000);
    };
    
    metricsSocket.onerror = function(error) {
        console.error('Metrics WebSocket error:', error);
    };
}

// Connect to the traces WebSocket
function connectTracesWebSocket() {
    // Convert http/https to ws/wss
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/traces`;
    
    tracesSocket = new WebSocket(wsUrl);
    
    tracesSocket.onopen = function() {
        console.log('Connected to traces WebSocket');
    };
    
    tracesSocket.onmessage = function(event) {
        try {
            const trace = JSON.parse(event.data);
            updateTraces(trace);
        } catch (error) {
            console.error('Error parsing trace data:', error);
        }
    };
    
    tracesSocket.onclose = function() {
        console.log('Disconnected from traces WebSocket');
        // Try to reconnect after a delay
        setTimeout(connectTracesWebSocket, 3000);
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
    // Get the active tab
    const activeTab = document.querySelector('nav a.active').getAttribute('data-tab');
    
    // Get common filter values
    const service = document.getElementById('service-filter').value;
    const timeRange = document.getElementById('time-range').value;
    
    // Build the query parameters
    let params = new URLSearchParams();
    if (service) params.append('service', service);
    if (timeRange) params.append('time_range', timeRange);
    
    // Add tab-specific filters
    if (activeTab === 'logs') {
        const logLevel = document.getElementById('log-level').value;
        const logSearch = document.getElementById('log-search').value;
        
        if (logLevel) params.append('level', logLevel);
        if (logSearch) params.append('search', logSearch);
        
        // Fetch filtered logs
        fetch(`${settings.serverUrl}/api/logs?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                // Clear the logs table
                const logsBody = document.getElementById('logs-body');
                if (logsBody) {
                    logsBody.innerHTML = '';
                    
                    // Add each log to the table
                    data.forEach(log => {
                        addLogEntry(log);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching logs:', error);
            });
    } else if (activeTab === 'metrics') {
        const metricName = document.getElementById('metric-name').value;
        const metricType = document.getElementById('metric-type').value;
        
        if (metricName) params.append('name', metricName);
        if (metricType) params.append('type', metricType);
        
        // Fetch filtered metrics
        fetch(`${settings.serverUrl}/api/metrics?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                // Clear the metrics table
                const metricsBody = document.getElementById('metrics-body');
                if (metricsBody) {
                    metricsBody.innerHTML = '';
                    
                    // Add each metric to the table
                    data.forEach(metric => {
                        addMetricToTable(metric);
                    });
                }
                
                // Update the chart with the filtered data
                if (metricsChart) {
                    metricsChart.data.datasets = [];
                    metricsChart.update();
                    
                    // Group metrics by name
                    const metricsByName = {};
                    data.forEach(metric => {
                        if (!metricsByName[metric.name]) {
                            metricsByName[metric.name] = [];
                        }
                        metricsByName[metric.name].push(metric);
                    });
                    
                    // Add each metric group to the chart
                    Object.keys(metricsByName).forEach(name => {
                        const metrics = metricsByName[name];
                        const color = getRandomColor();
                        
                        const dataset = {
                            label: name,
                            data: metrics.map(m => ({
                                x: new Date(m.timestamp || Date.now()),
                                y: m.value
                            })),
                            borderColor: color,
                            backgroundColor: color + '33',
                            fill: false,
                            tension: 0.1
                        };
                        
                        metricsChart.data.datasets.push(dataset);
                    });
                    
                    metricsChart.update();
                }
            })
            .catch(error => {
                console.error('Error fetching metrics:', error);
            });
    } else if (activeTab === 'traces') {
        const traceStatus = document.getElementById('trace-status').value;
        const minDuration = document.getElementById('min-duration').value;
        
        if (traceStatus) params.append('status', traceStatus);
        if (minDuration) params.append('min_duration', minDuration);
        
        // Fetch filtered traces
        fetch(`${settings.serverUrl}/api/traces?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                // Clear the traces table
                const tracesBody = document.getElementById('traces-body');
                if (tracesBody) {
                    tracesBody.innerHTML = '';
                    
                    // Add each trace to the table
                    data.forEach(trace => {
                        addTraceToTable(trace);
                    });
                }
                
                // Update the chart with the filtered data
                if (tracesChart) {
                    tracesChart.data.labels = [];
                    tracesChart.data.datasets[0].data = [];
                    
                    // Group traces by name
                    const tracesByName = {};
                    data.forEach(trace => {
                        if (!tracesByName[trace.name]) {
                            tracesByName[trace.name] = [];
                        }
                        tracesByName[trace.name].push(trace);
                    });
                    
                    // Calculate average duration for each trace name
                    Object.keys(tracesByName).forEach(name => {
                        const traces = tracesByName[name];
                        const avgDuration = traces.reduce((sum, trace) => {
                            const duration = trace.duration_ms || (trace.spans && trace.spans.length > 0 ? 
                                trace.spans.reduce((max, span) => Math.max(max, span.duration_ms || 0), 0) : 0);
                            return sum + duration;
                        }, 0) / traces.length;
                        
                        tracesChart.data.labels.push(name);
                        tracesChart.data.datasets[0].data.push(avgDuration);
                    });
                    
                    tracesChart.update();
                }
            })
            .catch(error => {
                console.error('Error fetching traces:', error);
            });
    }
}

// Add log to table
function addLogToTable(log) {
    // Limit the number of rows
    if (logsTable.children.length >= settings.maxItems) {
        logsTable.removeChild(logsTable.firstChild);
    }

    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(log.timestamp);
    const formattedTime = timestamp.toLocaleTimeString();
    
    // Create level span with appropriate class
    const levelClass = log.level.toLowerCase();
    
    row.innerHTML = `
        <td>${formattedTime}</td>
        <td><span class="log-level ${levelClass}">${log.level}</span></td>
        <td>${log.service}</td>
        <td>${log.message}</td>
    `;
    
    logsTable.appendChild(row);
    
    // Scroll to bottom
    const container = logsTable.parentElement;
    container.scrollTop = container.scrollHeight;
}

// Add metric to table
function addMetricToTable(metric) {
    // Limit the number of rows
    if (metricsTable.children.length >= settings.maxItems) {
        metricsTable.removeChild(metricsTable.firstChild);
    }

    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(metric.timestamp);
    const formattedTime = timestamp.toLocaleTimeString();
    
    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${metric.name}</td>
        <td>${metric.value}</td>
        <td>${metric.service}</td>
        <td>${metric.type}</td>
    `;
    
    metricsTable.appendChild(row);
}

// Add trace to table
function addTraceToTable(trace) {
    // Limit the number of rows
    if (tracesTable.children.length >= settings.maxItems) {
        tracesTable.removeChild(tracesTable.firstChild);
    }

    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(trace.start_time);
    const formattedTime = timestamp.toLocaleTimeString();
    
    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${trace.service}</td>
        <td>${trace.name}</td>
        <td>${trace.duration_ms.toFixed(2)}</td>
        <td>${trace.status}</td>
    `;
    
    tracesTable.appendChild(row);
}

// Update metrics chart
function updateMetricsChart(metrics) {
    // Group metrics by name
    const metricsByName = {};
    metrics.forEach(metric => {
        if (!metricsByName[metric.name]) {
            metricsByName[metric.name] = [];
        }
        metricsByName[metric.name].push({
            x: new Date(metric.timestamp),
            y: metric.value
        });
    });

    // Update chart datasets
    metricsChart.data.datasets = Object.keys(metricsByName).map((name, index) => {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];
        return {
            label: name,
            data: metricsByName[name],
            borderColor: colors[index % colors.length],
            backgroundColor: 'transparent',
            tension: 0.4
        };
    });

    metricsChart.update();
}

// Update traces chart
function updateTracesChart(traces) {
    // Group traces by service
    const tracesByService = {};
    traces.forEach(trace => {
        if (!tracesByService[trace.service]) {
            tracesByService[trace.service] = [];
        }
        tracesByService[trace.service].push(trace.duration_ms);
    });

    // Calculate average duration by service
    const services = Object.keys(tracesByService);
    const avgDurations = services.map(service => {
        const durations = tracesByService[service];
        return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    });

    // Update chart
    tracesChart.data.labels = services;
    tracesChart.data.datasets[0].data = avgDurations;
    tracesChart.update();
}

// Add new functions to handle data

// Add a log entry to the logs table
function addLogEntry(log) {
    if (!log) return;
    
    // Create a new row for the log table
    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : new Date().toLocaleString();
    
    // Determine row class based on log level
    if (log.level) {
        if (log.level.toUpperCase() === 'ERROR') {
            row.className = 'error';
        } else if (log.level.toUpperCase() === 'WARNING' || log.level.toUpperCase() === 'WARN') {
            row.className = 'warning';
        }
    }
    
    // Add cells to the row
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${log.level || 'INFO'}</td>
        <td>${log.service || 'unknown'}</td>
        <td>${log.message || ''}</td>
        <td>${formatTags(log.tags || {})}</td>
    `;
    
    // Add the row to the table
    const tbody = document.getElementById('logs-body');
    if (tbody) {
        // Add the new row at the top of the table
        tbody.insertBefore(row, tbody.firstChild);
        
        // Limit the number of rows
        while (tbody.children.length > settings.maxItems) {
            tbody.removeChild(tbody.lastChild);
        }
    }
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

// Format tags as a string
function formatTags(tags) {
    if (!tags || typeof tags !== 'object') return '';
    
    return Object.entries(tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
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