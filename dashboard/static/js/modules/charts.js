/**
 * Charts Module - Manages chart initialization and updates
 */

// Chart instances
let metricsChart = null;
let tracesChart = null;

/**
 * Initialize charts
 */
function initCharts() {
    // Initialize metrics chart
    const metricsCtx = document.getElementById('metrics-chart');
    if (metricsCtx) {
        console.log('Initializing metrics chart...');
        metricsChart = new Chart(metricsCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Metrics',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animation for better performance
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm:ss'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    } else {
        console.error('Could not find metrics-chart element');
    }
    
    // Initialize traces chart
    const tracesCtx = document.getElementById('traces-chart');
    if (tracesCtx) {
        console.log('Initializing traces chart...');
        tracesChart = new Chart(tracesCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Duration (ms)',
                    data: [],
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (ms)'
                        }
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
    } else {
        console.error('Could not find traces-chart element');
    }
}

/**
 * Update metrics chart with new data
 */
function updateMetricsChart(metrics) {
    if (!metricsChart) {
        console.error('Metrics chart not initialized');
        return;
    }
    
    // Group metrics by name
    const metricGroups = {};
    metrics.forEach(metric => {
        if (!metric.name) return;
        
        // Create a key for the metric
        const key = metric.name;
        
        // Initialize the group if it doesn't exist
        if (!metricGroups[key]) {
            metricGroups[key] = [];
        }
        metricGroups[key].push(metric);
    });
    
    // Clear current datasets
    metricsChart.data.datasets = [];
    
    // Create a dataset for each metric group
    Object.keys(metricGroups).forEach((name, index) => {
        const metrics = metricGroups[name];
        const color = getRandomColor();
        
        // Create data points
        const dataPoints = metrics.map(metric => ({
            x: new Date(metric.timestamp),
            y: parseFloat(metric.value) || 0
        }));
        
        // Sort by timestamp
        dataPoints.sort((a, b) => a.x - b.x);
        
        // Add dataset
        metricsChart.data.datasets.push({
            label: name,
            data: dataPoints,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.1)'),
            borderWidth: 2,
            fill: false,
            tension: 0.1
        });
    });
    
    // Update the chart
    metricsChart.update();
}

/**
 * Update traces chart with new data
 */
function updateTracesChart(traces) {
    if (!tracesChart) {
        console.error('Traces chart not initialized');
        return;
    }
    
    // Group traces by name
    const traceGroups = {};
    traces.forEach(trace => {
        if (!trace.name) return;
        
        // Create a key for the trace
        const key = trace.name;
        
        // Initialize the group if it doesn't exist
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

/**
 * Generate a random color
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = 'rgba(';
    for (let i = 0; i < 3; i++) {
        color += Math.floor(Math.random() * 200) + 55 + ',';
    }
    color += '1)';
    return color;
}

// Export the module
export default {
    init: initCharts,
    updateMetricsChart: updateMetricsChart,
    updateTracesChart: updateTracesChart
}; 