/**
 * Settings Module - Manages application settings
 */

// Default settings
const defaultSettings = {
    serverUrl: window.location.origin,  // Use the current origin instead of hardcoded URL
    refreshRate: 1,
    maxItems: 1000,
    isPaused: false,
    filters: {}
};

// Current settings
let settings = { ...defaultSettings };

/**
 * Load settings from localStorage
 */
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
    
    return settings;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    // Get values from the form
    settings.serverUrl = document.getElementById('server-url').value;
    settings.refreshRate = parseInt(document.getElementById('refresh-rate').value, 10) || 1;
    settings.maxItems = parseInt(document.getElementById('max-items').value, 10) || 1000;
    
    // Save to localStorage
    try {
        localStorage.setItem('pulseSettings', JSON.stringify(settings));
        alert('Settings saved successfully!');
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
        return false;
    }
}

/**
 * Get current settings
 */
function getSettings() {
    return settings;
}

/**
 * Update a specific setting
 */
function updateSetting(key, value) {
    settings[key] = value;
}

// Export the module functions
export default {
    load: loadSettings,
    save: saveSettings,
    get: getSettings,
    update: updateSetting
}; 