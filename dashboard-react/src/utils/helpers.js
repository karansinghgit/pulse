import { format } from 'date-fns';

/**
 * Format a timestamp to a readable date and time
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date and time
 */
export const formatTimestamp = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return timestamp || 'Unknown';
  }
};

/**
 * Format tags object to a readable string
 * @param {Object} tags - Tags object
 * @returns {string} Formatted tags string
 */
export const formatTags = (tags) => {
  if (!tags || typeof tags !== 'object') {
    return '';
  }
  
  return Object.entries(tags)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
};

/**
 * Get CSS class for log level
 * @param {string} level - Log level
 * @returns {string} CSS class name
 */
export const getLogLevelClass = (level) => {
  if (!level) return '';
  
  const normalizedLevel = level.toLowerCase();
  return `log-level log-level-${normalizedLevel}`;
};

/**
 * Mock function to load services
 * @returns {Promise<Array>} Promise resolving to array of services
 */
export const loadServices = async () => {
  // In a real app, this would be an API call
  return [
    { id: 'api', name: 'API Service' },
    { id: 'auth', name: 'Authentication Service' },
    { id: 'database', name: 'Database Service' },
    { id: 'frontend', name: 'Frontend Service' },
  ];
};

/**
 * Generate mock log data
 * @param {number} count - Number of logs to generate
 * @returns {Array} Array of log objects
 */
export const generateMockLogs = (count = 50) => {
  const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'];
  const services = ['api', 'auth', 'database', 'frontend'];
  const messages = [
    'Application started',
    'User logged in',
    'Database connection established',
    'Request processed successfully',
    'Cache miss',
    'Rate limit exceeded',
    'Invalid authentication token',
    'Database query failed',
    'API request timeout',
    'Memory usage high',
  ];
  
  const logs = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 86400000)); // Random time in last 24h
    
    logs.push({
      id: `log-${i}`,
      timestamp: timestamp.toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      tags: {
        environment: Math.random() > 0.5 ? 'production' : 'development',
        version: `v${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        ...(Math.random() > 0.7 ? { userId: `user-${Math.floor(Math.random() * 1000)}` } : {}),
      }
    });
  }
  
  // Sort by timestamp, newest first
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}; 