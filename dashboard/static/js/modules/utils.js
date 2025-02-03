/**
 * Utils Module - Helper functions for the dashboard
 */

/**
 * Format tags object into HTML
 */
function formatTags(tags) {
    if (!tags || typeof tags !== 'object') {
        return '';
    }
    
    let html = '';
    for (const key in tags) {
        if (Object.prototype.hasOwnProperty.call(tags, key)) {
            html += `<span class="tag">${key}=${tags[key]}</span>`;
        }
    }
    return html;
}

/**
 * Load services for filter dropdowns
 */
function loadServices(serverUrl) {
    const serviceFilter = document.getElementById('service-filter');
    if (!serviceFilter) return Promise.resolve([]);
    
    return fetch(`${serverUrl}/api/v1/services`)
        .then(response => response.json())
        .then(data => {
            // Clear existing options except the first one
            while (serviceFilter.options.length > 1) {
                serviceFilter.remove(1);
            }
            
            // Add new options
            data.forEach(service => {
                const option = document.createElement('option');
                option.value = service;
                option.textContent = service;
                serviceFilter.appendChild(option);
            });
            
            return data;
        })
        .catch(error => {
            console.error('Error loading services:', error);
            return [];
        });
}

/**
 * Parse time range string into milliseconds
 */
function parseTimeRange(timeRange) {
    const units = {
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default to 1 hour
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    return value * units[unit];
}

// Export the module
export default {
    formatTags,
    loadServices,
    parseTimeRange
}; 