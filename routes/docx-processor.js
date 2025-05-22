// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const { exec } = require('child_process');
const mongoose = require('mongoose');
const Loan = require('../models/Loan');

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'docx-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Accept only DOCX files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Process DOCX file
router.post('/process-docx', upload.single('docxFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const docxFilePath = req.file.path;
    const jsonOutputPath = path.join(path.dirname(docxFilePath), path.basename(docxFilePath, path.extname(docxFilePath)) + '.json');

    // Run Python script to extract data from DOCX
    const pythonScript = path.join(__dirname, '..', 'extract_docx.py');
    const command = `sudo docx_env/bin/python3 ${pythonScript} ${docxFilePath} ${jsonOutputPath}`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: 'Failed to process DOCX file', details: error.message });
      }

      console.log(`Python script output: ${stdout}`);

      // Read the JSON output
      try {
        if (!fs.existsSync(jsonOutputPath)) {
          return res.status(500).json({ error: 'Failed to generate JSON data from DOCX file' });
        }

        const jsonData = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
        
        // Process the extracted data
        const stats = {
          totalTransactions: 0,
          matchedAccounts: 0,
          updatedAccounts: 0,
          newAccounts: 0,
          errors: 0
        };
        
        // Clean up temporary files
        fs.unlinkSync(docxFilePath);
        fs.unlinkSync(jsonOutputPath);
        
        return res.status(200).json({ success: true, stats });
      } catch (jsonError) {
        console.error(`Error processing JSON data: ${jsonError.message}`);
        return res.status(500).json({ error: 'Failed to process extracted data', details: jsonError.message });
      }
    });
  } catch (error) {
    console.error(`Error in process-docx route: ${error.message}`);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
