const express = require('express');
const loansRouter = require('./routes/loans');
const docxProcessorRouter = require('./routes/docx-processor');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// Environment configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kakotechnology:e8q3f9dRgMxcItXn@cluster0.dfv4h.mongodb.net/washa?retryWrites=true&w=majority';
const isProduction = process.env.NODE_ENV === 'production';

// Enable CORS with specific configuration for Vercel deployment
app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Status endpoints
app.get(['/status', '/health', '/api/status', '/api/health'], (req, res) => {
  res.json({ status: 'ok' });
});

app.get(['/db-status', '/api/db-status'], async (req, res) => {
  try {
    // Ensure headers are set properly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Check MongoDB connection
    const connectionState = mongoose.connection.readyState;
    const isConnected = connectionState === 1;
    
    // Send response
    res.json({
      status: isConnected ? 'connected' : 'disconnected',
      fallback: !isConnected,
      connectionState: connectionState,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      mongoUri: MONGO_URI.split('@')[1].split('/')[0] // Only show host part of connection string
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// CSV fallback endpoint
app.get('/api/csv-data', (req, res) => {
  const csvPath = path.join(__dirname, 'public', 'uploads', 'Joyce Past Data.csv');
  if (fs.existsSync(csvPath)) {
    res.sendFile(csvPath);
  } else {
    res.status(404).json({ error: 'CSV file not found' });
  }
});

// API routes
app.use('/api/loans', loansRouter);
app.use('/api/docx', docxProcessorRouter);

// MongoDB connection with improved error handling and retry logic
const connectWithRetry = (retries = 5) => {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  }).then(() => {
    console.log('Connected to MongoDB -', isProduction ? 'Production' : 'Development');
    global.useCSVFallback = false;
  }).catch(err => {
    console.error(`MongoDB connection error (attempts left: ${retries}):`, err);
    if (retries > 0) {
      console.log('Retrying connection...');
      setTimeout(() => connectWithRetry(retries - 1), 5000);
    } else {
      console.error('All connection attempts failed, using CSV fallback');
      global.useCSVFallback = true;
    }
  });
};

// Initialize database connection
connectWithRetry();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
  global.useCSVFallback = false;
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
  global.useCSVFallback = true;
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
  if (!global.useCSVFallback) {
    console.log('Attempting to reconnect...');
    connectWithRetry();
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(DEFAULT_PORT, () => {
  console.log(`Server running on port ${DEFAULT_PORT}`);
});