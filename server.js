// Enhanced web server optimized for Render.com deployment
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add a status endpoint with detailed information
app.get('/status', (req, res) => {
  const botInfo = {
    status: 'online',
    message: 'Discord bot is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version,
    platform: process.platform
  };
  
  res.json(botInfo);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the page`);
  console.log('Server configured for Render.com deployment');
});

// Handle errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Import the Discord bot to keep it running
require('./src/index');