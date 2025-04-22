// Simple web server to keep the bot online
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
  console.log('Visit http://localhost:5000 to view the page');
});

// Import the Discord bot to keep it running
require('./src/index');