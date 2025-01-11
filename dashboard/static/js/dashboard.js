// Dashboard JavaScript

// Settings
let settings = {
    serverUrl: 'http://localhost:8080',
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
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }

    // Update settings form
    document.getElementById('server-url').value = settings.serverUrl;
    document.getElementById('refresh-rate').value = settings.refreshRate;
    document.getElementById('max-items').value = settings.maxItems;
}

// Save settings to localStorage
function saveSettings() {
    settings.serverUrl = document.getElementById('server-url').value;
    settings.refreshRate = parseInt(document.getElementById('refresh-rate').value);
    settings.maxItems = parseInt(document.getElementById('max-items').value);

    localStorage.setItem('pulseSettings', JSON.stringify(settings));

    // Reconnect WebSockets with new settings
    disconnectWebSockets();
    connectWebSockets();

    alert('Settings saved successfully!');
}

// Set up tab navigation
function setupTabs() {
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');

            // Update active tab link
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });

            // Update active filters
            tabFilters.forEach(filter => {
                filter.classList.remove('active');
                if (filter.id === `${tabId}-filters`) {
                    filter.classList.add('active');
                }
            });
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Apply filters button
    applyFiltersBtn.addEventListener('click', applyFilters);

    // Pause logs button
    pauseLogsBtn.addEventListener('click', () => {
        settings.isPaused = !settings.isPaused;
        pauseLogsBtn.textContent = settings.isPaused ? 'Resume' : 'Pause';
    });

    // Clear logs button
    clearLogsBtn.addEventListener('click', () => {
        logsTable.innerHTML = '';
    });

    // Save settings button
    saveSettingsBtn.addEventListener('click', saveSettings);
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

// Connect to logs WebSocket
function connectLogsWebSocket() {
    const wsUrl = `ws://${settings.serverUrl.replace(/^https?:\/\//, '')}/ws/logs`;
    logsSocket = new WebSocket(wsUrl);

    logsSocket.onopen = () => {
        console.log('Connected to logs WebSocket');
    };

    logsSocket.onmessage = (event) => {
        if (settings.isPaused) return;

        const data = JSON.parse(event.data);
        if (data.type === 'logs' && Array.isArray(data.payload)) {
            data.payload.forEach(log => {
                addLogToTable(log);
            });
        }
    };

    logsSocket.onerror = (error) => {
        console.error('Logs WebSocket error:', error);
    };

    logsSocket.onclose = () => {
        console.log('Logs WebSocket closed');
        // Attempt to reconnect after a delay
        setTimeout(connectLogsWebSocket, 5000);
    };
}

// Connect to metrics WebSocket
function connectMetricsWebSocket() {
    const wsUrl = `ws://${settings.serverUrl.replace(/^https?:\/\//, '')}/ws/metrics`;
    metricsSocket = new WebSocket(wsUrl);

    metricsSocket.onopen = () => {
        console.log('Connected to metrics WebSocket');
    };

    metricsSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'metrics' && Array.isArray(data.payload)) {
            data.payload.forEach(metric => {
                addMetricToTable(metric);
            });
            updateMetricsChart(data.payload);
        }
    };

    metricsSocket.onerror = (error) => {
        console.error('Metrics WebSocket error:', error);
    };

    metricsSocket.onclose = () => {
        console.log('Metrics WebSocket closed');
        // Attempt to reconnect after a delay
        setTimeout(connectMetricsWebSocket, 5000);
    };
}

// Connect to traces WebSocket
function connectTracesWebSocket() {
    const wsUrl = `ws://${settings.serverUrl.replace(/^https?:\/\//, '')}/ws/traces`;
    tracesSocket = new WebSocket(wsUrl);

    tracesSocket.onopen = () => {
        console.log('Connected to traces WebSocket');
    };

    tracesSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'traces' && Array.isArray(data.payload)) {
            data.payload.forEach(trace => {
                addTraceToTable(trace);
            });
            updateTracesChart(data.payload);
        }
    };

    tracesSocket.onerror = (error) => {
        console.error('Traces WebSocket error:', error);
    };

    tracesSocket.onclose = () => {
        console.log('Traces WebSocket closed');
        // Attempt to reconnect after a delay
        setTimeout(connectTracesWebSocket, 5000);
    };
}

// Disconnect all WebSockets
function disconnectWebSockets() {
    if (logsSocket) logsSocket.close();
    if (metricsSocket) metricsSocket.close();
    if (tracesSocket) tracesSocket.close();
}

// Apply filters
function applyFilters() {
    // Get filter values
    const service = serviceFilter.value;
    const time = timeRange.value;
    const level = document.getElementById('log-level')?.value || '';
    const search = document.getElementById('log-search')?.value || '';
    const metricName = document.getElementById('metric-name')?.value || '';
    const metricType = document.getElementById('metric-type')?.value || '';
    const traceStatus = document.getElementById('trace-status')?.value || '';
    const minDuration = document.getElementById('min-duration')?.value || '';

    // Reconnect WebSockets with filters
    disconnectWebSockets();
    connectWebSockets();

    // Clear tables
    logsTable.innerHTML = '';
    metricsTable.innerHTML = '';
    tracesTable.innerHTML = '';
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

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard); 