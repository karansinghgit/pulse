// Dashboard JavaScript - Main Entry Point
import SettingsModule from './modules/settings.js';
import WebSocketsModule from './modules/websockets.js';
import ChartsModule from './modules/charts.js';
import Utils from './modules/utils.js';

// Pagination variables
let logEntries = [];
let currentPage = 1;
let pageSize = 50;
let totalPages = 1;

// Current active tab
let activeTab = 'logs';

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
    const settings = SettingsModule.load();
    
    // Read route from URL hash
    parseRoute();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up tabs
    setupTabs();
    
    // Initialize charts
    try {
        console.log('Initializing charts...');
        ChartsModule.init();
        console.log('Charts initialized successfully');
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
    
    // Load services for filter dropdowns
    Utils.loadServices(settings.serverUrl);
    
    // Set up WebSocket message handlers
    WebSocketsModule.setMessageHandlers({
        logs: addLogEntry,
        metrics: updateMetrics,
        traces: updateTraces
    });
    
    // Connect WebSockets
    WebSocketsModule.connect(SettingsModule.get());
    
    console.log('Dashboard initialization complete');
}

// Parse the route from URL hash
function parseRoute() {
    const hash = window.location.hash.substring(1); // Remove the # symbol
    if (hash && ['logs', 'metrics', 'traces', 'settings'].includes(hash)) {
        activeTab = hash;
        console.log('Route set to:', activeTab);
    } else {
        // Default to logs if no valid hash found
        activeTab = 'logs';
        // Set the URL hash to the default tab
        window.location.hash = activeTab;
    }
}

// Update the URL hash when tab changes
function updateRoute(tabName) {
    window.location.hash = tabName;
    activeTab = tabName;
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
            
            // Update the URL route
            updateRoute(tabName);
            
            // Switch to the selected tab
            switchToTab(tabName);
        });
    });
    
    // Set the initial active tab based on the route
    switchToTab(activeTab);
}

// Switch to a specific tab
function switchToTab(tabName) {
    // Remove active class from all tab links and contents
    document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-filters').forEach(el => el.classList.remove('active'));
    
    // Add active class to the specified tab link and corresponding content
    const tabLink = document.querySelector(`nav a[data-tab="${tabName}"]`);
    if (tabLink) tabLink.classList.add('active');
    
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) tabContent.classList.add('active');
    
    // Show the corresponding filters if they exist
    const filterEl = document.getElementById(`${tabName}-filters`);
    if (filterEl) {
        filterEl.classList.add('active');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Pause/resume logs button
    const pauseLogsBtn = document.getElementById('pause-logs');
    if (pauseLogsBtn) {
        pauseLogsBtn.addEventListener('click', function() {
            const settings = SettingsModule.get();
            settings.isPaused = !settings.isPaused;
            SettingsModule.update('isPaused', settings.isPaused);
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
                logEntries = [];
                updatePagination();
            }
        });
    }
    
    // Pagination controls
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageSizeSelect = document.getElementById('page-size');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPage();
            }
        });
    }
    
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value, 10);
            currentPage = 1; // Reset to first page when changing page size
            updatePagination();
            renderCurrentPage();
        });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    // Save settings button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            if (SettingsModule.save()) {
                // Reconnect WebSockets if server URL changed
                WebSocketsModule.disconnect();
                WebSocketsModule.connect(SettingsModule.get());
            }
        });
    }
}

// Apply filters and reconnect WebSockets
function applyFilters() {
    const settings = SettingsModule.get();
    
    // Get filter values
    const service = document.getElementById('service-filter').value;
    const timeRangeValue = document.getElementById('time-range').value;
    
    // Tab-specific filters
    let filters = {
        service: service,
        timeRange: timeRangeValue
    };
    
    // Add logs-specific filters
    if (activeTab === 'logs') {
        filters.logLevel = document.getElementById('log-level').value;
        filters.logSearch = document.getElementById('log-search').value;
    }
    
    // Add metrics-specific filters
    else if (activeTab === 'metrics') {
        filters.metricName = document.getElementById('metric-name').value;
        filters.metricType = document.getElementById('metric-type').value;
    }
    
    // Add traces-specific filters
    else if (activeTab === 'traces') {
        filters.traceStatus = document.getElementById('trace-status').value;
        filters.minDuration = document.getElementById('min-duration').value;
    }
    
    // Apply filters and reconnect WebSockets
    WebSocketsModule.applyFilters(filters, settings);
}

// Add a log entry to the table
function addLogEntry(log) {
    console.log('Adding log entry:', log);
    
    // Add to our log entries array
    logEntries.unshift(log); // Add to beginning to show newest first
    
    // Trim the array if it gets too large
    const settings = SettingsModule.get();
    if (logEntries.length > settings.maxItems) {
        logEntries = logEntries.slice(0, settings.maxItems);
    }
    
    // Update pagination and re-render
    updatePagination();
    renderCurrentPage();
}

// Update pagination information
function updatePagination() {
    totalPages = Math.max(1, Math.ceil(logEntries.length / pageSize));
    
    // Update UI elements
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    
    // Disable/enable buttons as needed
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
}

// Render the current page of log entries
function renderCurrentPage() {
    const logsBody = document.getElementById('logs-body');
    if (!logsBody) {
        console.error('Could not find logs-body element');
        return;
    }
    
    // Clear the current table content
    logsBody.innerHTML = '';
    
    // Calculate start and end indices
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, logEntries.length);
    
    // Render log entries for the current page
    for (let i = startIndex; i < endIndex; i++) {
        const log = logEntries[i];
        renderLogEntry(log, logsBody);
    }
}

// Render a single log entry in the table
function renderLogEntry(log, logsBody) {
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
    
    // Set log level as a class for styling
    if (log.level) {
        row.classList.add(`level-${log.level.toLowerCase()}`);
    }
    
    // Build the row content
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${log.level || 'INFO'}</td>
        <td>${log.service || 'unknown'}</td>
        <td>${log.message || ''}</td>
        <td>${Utils.formatTags(log.tags || {})}</td>
    `;
    
    // Add the row to the table
    logsBody.appendChild(row);
}

// Update metrics data
function updateMetrics(metric) {
    // Add to metrics table
    addMetricToTable(metric);
    
    // Collect all metrics for chart update
    const metricsBody = document.getElementById('metrics-body');
    const metrics = [];
    
    if (metricsBody) {
        // Get all metrics from the table
        const rows = metricsBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                metrics.push({
                    timestamp: cells[0].getAttribute('data-timestamp'),
                    name: cells[1].textContent,
                    value: cells[2].textContent,
                    type: cells[3].textContent,
                    service: cells[4].textContent,
                    tags: cells[5].getAttribute('data-tags')
                });
            }
        });
    }
    
    // Update the chart
    ChartsModule.updateMetricsChart(metrics);
}

// Add a metric to the metrics table
function addMetricToTable(metric) {
    const metricsBody = document.getElementById('metrics-body');
    if (!metricsBody) {
        console.error('Could not find metrics-body element');
        return;
    }
    
    // Check if we've reached the maximum number of metrics to display
    const settings = SettingsModule.get();
    while (metricsBody.children.length >= settings.maxItems && metricsBody.lastChild) {
        metricsBody.removeChild(metricsBody.lastChild);
    }
    
    // Create a new row
    const row = document.createElement('tr');
    
    // Format the timestamp
    let timestamp = metric.timestamp || new Date().toISOString();
    let displayTimestamp = timestamp;
    try {
        // Try to parse and format the timestamp
        const date = new Date(timestamp);
        displayTimestamp = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        console.error('Error parsing timestamp:', e);
    }
    
    // Format tags if present
    let tagsHtml = Utils.formatTags(metric.tags || {});
    
    // Set the row content
    row.innerHTML = `
        <td data-timestamp="${timestamp}">${displayTimestamp}</td>
        <td>${metric.name || 'unknown'}</td>
        <td>${metric.value || '0'}</td>
        <td>${metric.type || 'gauge'}</td>
        <td>${metric.service || 'unknown'}</td>
        <td data-tags="${JSON.stringify(metric.tags || {})}">${tagsHtml}</td>
    `;
    
    // Add the row to the table (at the beginning to show newest first)
    metricsBody.insertBefore(row, metricsBody.firstChild);
}

// Update traces data
function updateTraces(trace) {
    // Add to traces table
    addTraceToTable(trace);
    
    // Collect all traces for chart update
    const tracesBody = document.getElementById('traces-body');
    const traces = [];
    
    if (tracesBody) {
        // Get all traces from the table
        const rows = tracesBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) {
                traces.push({
                    timestamp: cells[0].getAttribute('data-timestamp'),
                    name: cells[1].textContent,
                    service: cells[2].textContent,
                    duration_ms: cells[3].textContent,
                    status: cells[4].textContent,
                    tags: cells[5].getAttribute('data-tags')
                });
            }
        });
    }
    
    // Update the chart
    ChartsModule.updateTracesChart(traces);
}

// Add a trace to the traces table
function addTraceToTable(trace) {
    const tracesBody = document.getElementById('traces-body');
    if (!tracesBody) {
        console.error('Could not find traces-body element');
        return;
    }
    
    // Check if we've reached the maximum number of traces to display
    const settings = SettingsModule.get();
    while (tracesBody.children.length >= settings.maxItems && tracesBody.lastChild) {
        tracesBody.removeChild(tracesBody.lastChild);
    }
    
    // Create a new row
    const row = document.createElement('tr');
    
    // Format the timestamp
    let timestamp = trace.timestamp || new Date().toISOString();
    let displayTimestamp = timestamp;
    try {
        // Try to parse and format the timestamp
        const date = new Date(timestamp);
        displayTimestamp = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        console.error('Error parsing timestamp:', e);
    }
    
    // Format tags if present
    let tagsHtml = Utils.formatTags(trace.tags || {});
    
    // Set status class
    if (trace.status && trace.status.toLowerCase() === 'error') {
        row.classList.add('status-error');
    }
    
    // Set the row content
    row.innerHTML = `
        <td data-timestamp="${timestamp}">${displayTimestamp}</td>
        <td>${trace.name || 'unknown'}</td>
        <td>${trace.service || 'unknown'}</td>
        <td>${trace.duration_ms || '0'}</td>
        <td>${trace.status || 'OK'}</td>
        <td data-tags="${JSON.stringify(trace.tags || {})}">${tagsHtml}</td>
    `;
    
    // Add the row to the table (at the beginning to show newest first)
    tracesBody.insertBefore(row, tracesBody.firstChild);
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard); 