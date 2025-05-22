const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const Loan = require('../models/Loan');
const mongoose = require('mongoose');
const { exec } = require('child_process');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for CSV files
const csvFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' ||
      file.originalname.endsWith('.csv') ||
      file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed!'), false);
  }
};

// Configure uploads for images
const uploadImages = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Configure uploads for CSV files
const uploadCSV = multer({
  storage: storage,
  fileFilter: csvFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Helper: calculate defaulter fee
function calcDefaulterFee(loan) {
  // If the loan has an expiryDate field, use it
  if (loan.expiryDate) {
    // Check if current date is past expiry date
    const isExpired = new Date() > new Date(loan.expiryDate);
    if (isExpired) {
      // Calculate weeks past expiry
      const weeksPastExpiry = Math.floor((Date.now() - new Date(loan.expiryDate)) / (1000*60*60*24*7));
      return weeksPastExpiry * 1000;
    }
    return 0;
  } else {
    // Fallback to old calculation for backward compatibility
    const weeksElapsed = Math.floor((Date.now() - new Date(loan.createdAt)) / (1000*60*60*24*7));
    const overdueWeeks = Math.max(0, weeksElapsed - 4);
    return overdueWeeks * 1000;
  }
}

// Helper: check if loan is defaulted
function isLoanDefaulted(loan) {
  // If loan is already marked as completed, it's not defaulted
  if (loan.status === 'completed') {
    return false;
  }

  // Check if current date is past expiry date
  const isExpired = loan.expiryDate ? new Date() > new Date(loan.expiryDate) : false;

  // If no expiry date, use the old calculation
  if (!loan.expiryDate) {
    const weeksElapsed = Math.floor((Date.now() - new Date(loan.createdAt)) / (1000*60*60*24*7));
    return weeksElapsed > 4;
  }

  return isExpired;
}

// Helper: Read CSV data
function readCSVData() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, '..', 'uploads', 'Joyce Past Data.csv'))
      .pipe(csv())
      .on('data', (data) => {
        // Clean and parse amount values
        const principal = parseFloat((data['Amount  Issued'] || '0').replace(/[^0-9.-]+/g, ''));
        const totalDue = parseFloat((data['Total Due'] || '0').replace(/[^0-9.-]+/g, '')) || principal * 1.2;
        const interest = totalDue - principal;

        // Parse date
        const dateStr = data['Date Issued'];
        let createdAt = new Date();
        if (dateStr) {
          const parts = dateStr.split(' ')[0].split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            let year = parseInt(parts[2]);
            if (year < 100) {
              year = year < 50 ? 2000 + year : 1900 + year;
            }
            createdAt = new Date(year, month, day);
          }
        }

        // Create loan object
        const loan = {
          _id: Date.now() + Math.random().toString().slice(2),
          name: data['Full Names'] || '',
          phone: data['phone number'] || '',
          principal: principal,
          interest: interest,
          totalDue: totalDue,
          createdAt: createdAt,
          status: data['Cleared'] === 'fully paid' ? 'completed' :
                 data['Defaulted'] ? 'defaulted' : 'active',
          payments: [],
          passportPhoto: 'uploads/placeholder.svg',
          idPhotoFront: 'uploads/placeholder.svg',
          idPhotoBack: 'uploads/placeholder.svg',
          email: data['Email'] || '',
          address: data['Address'] || '',
          occupation: data['Occupation'] || '',
          employerName: data['Employer Name'] || '',
          refereeName: data['Referee Name'] || '',
          loanPurpose: data['Loan Purpose'] || ''
        };

        // Handle payments if they exist
        if (data['Amount paid']) {
          const paymentAmount = parseFloat(data['Amount paid'].replace(/[^0-9.-]+/g, '') || '0');
          if (paymentAmount > 0) {
            loan.payments.push({
              amount: paymentAmount,
              date: createdAt,
              transactionId: `LEGACY-${Date.now()}`,
              depositDetails: data['Methods of Payment'] || 'Legacy payment'
            });
          }
        }

        results.push(loan);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// GET all loans or search by name
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (global.useCSVFallback) {
      // Use CSV data if MongoDB is not available
      const loans = await readCSVData();
      const filteredLoans = q
        ? loans.filter(loan => loan.name.toLowerCase().includes(q.toLowerCase()))
        : loans;
      return res.json(filteredLoans.sort((a, b) => a.name.localeCompare(b.name)));
    }

    // Use MongoDB if available
    const query = q ? { name: new RegExp(q, 'i') } : {};
    const loans = await Loan.find(query).sort({ name: 1 });
    res.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST register new applicant
router.post('/', uploadImages.fields([
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'idPhotoFront', maxCount: 1 },
  { name: 'idPhotoBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, phone, refereeName } = req.body;
    const principal = parseFloat(req.body.principal);
    const interest = principal * 0.2;
    const totalDue = principal + interest;

    // Get file paths if files were uploaded
    const passportPhoto = req.files?.passportPhoto ? `uploads/${req.files.passportPhoto[0].filename}` : '';
    const idPhotoFront = req.files?.idPhotoFront ? `uploads/${req.files.idPhotoFront[0].filename}` : '';
    const idPhotoBack = req.files?.idPhotoBack ? `uploads/${req.files.idPhotoBack[0].filename}` : '';

    if (global.useCSVFallback) {
      const newLoan = {
        _id: Date.now().toString(),
        name,
        phone,
        passportPhoto,
        idPhotoFront,
        idPhotoBack,
        refereeName,
        principal,
        interest,
        totalDue,
        payments: [],
        createdAt: new Date(),
        status: 'active'
      };

      // Append to CSV file
      const csvRow = [
        name,
        phone,
        new Date().toLocaleDateString(),
        `${principal}/=`,
        '',
        '',
        `${totalDue}/=`,
        '',
        '',
        '',
        '',
        '',
        refereeName,
        '',
        '',
        `${principal}/=`,
        '',
        ''
      ].join(',') + '\n';

      fs.appendFileSync(
        path.join(__dirname, '..', 'uploads', 'Joyce Past Data.csv'),
        csvRow,
        'utf8'
      );

      return res.status(201).json(newLoan);
    }

    // Use MongoDB if available
    const loan = new Loan({
      name,
      phone,
      passportPhoto,
      idPhotoFront,
      idPhotoBack,
      refereeName,
      principal,
      interest,
      totalDue
    });

    await loan.save();
    res.status(201).json(loan);
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET single loan by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (global.useCSVFallback) {
      const loans = await readCSVData();
      const loan = loans.find(l => l._id === id);
      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      return res.json(loan);
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(loan);
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update loan by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (global.useCSVFallback) {
      const loans = await readCSVData();
      const loanIndex = loans.findIndex(l => l._id === id);
      if (loanIndex === -1) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      loans[loanIndex] = {
        ...loans[loanIndex],
        ...updateData,
        _id: id // Preserve the ID
      };

      // Update CSV file
      const csvData = loans.map(loan => [
        loan.name,
        loan.phone,
        new Date(loan.createdAt).toLocaleDateString(),
        `${loan.principal}/=`,
        loan.payments.reduce((sum, p) => sum + p.amount, 0) + '/=',
        '',
        `${loan.totalDue}/=`,
        loan.status === 'completed' ? 'fully paid' : '',
        loan.status === 'defaulted' ? 'yes' : '',
        loan.occupation || '',
        '',
        '',
        loan.employerName || '',
        loan.address || '',
        loan.refereeName || '',
        `${loan.principal}/=`,
        loan.email || '',
        loan.loanPurpose || ''
      ].join(','));

      fs.writeFileSync(
        path.join(__dirname, '..', 'uploads', 'Joyce Past Data.csv'),
        'Full Names,phone number,Date Issued,Amount  Issued,Amount paid,Amount Remaining,Total Due,Cleared,Defaulted,Occupation,Dates of Payment,Methods of Payment,Employer Name,Address,Referee Name,Principal Amount,Email,Loan Purpose\n' +
        csvData.join('\n'),
        'utf8'
      );

      return res.json(loans[loanIndex]);
    }

    const loan = await Loan.findByIdAndUpdate(id, updateData, { new: true });
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST record payment
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, transactionId, depositDetails } = req.body;
    let loan;

    if (global.useCSVFallback) {
      const loans = await readCSVData();
      loan = loans.find(l => l._id === req.params.id);
      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      const payment = {
        amount: parseFloat(amount),
        transactionId,
        depositDetails,
        date: new Date()
      };

      loan.payments.push(payment);

      // Update CSV file with new payment
      const csvData = loans.map(l => [
        l.name,
        l.phone,
        new Date(l.createdAt).toLocaleDateString(),
        `${l.principal}/=`,
        l.payments.reduce((sum, p) => sum + p.amount, 0) + '/=',
        '',
        `${l.totalDue}/=`,
        l.status === 'completed' ? 'fully paid' : '',
        l.status === 'defaulted' ? 'yes' : '',
        l.occupation || '',
        l._id === loan._id ? new Date().toLocaleDateString() : '',
        l._id === loan._id ? depositDetails : '',
        l.employerName || '',
        l.address || '',
        l.refereeName || '',
        `${l.principal}/=`,
        l.email || '',
        l.loanPurpose || ''
      ].join(','));

      fs.writeFileSync(
        path.join(__dirname, '..', 'uploads', 'Joyce Past Data.csv'),
        'Full Names,phone number,Date Issued,Amount  Issued,Amount paid,Amount Remaining,Total Due,Cleared,Defaulted,Occupation,Dates of Payment,Methods of Payment,Employer Name,Address,Referee Name,Principal Amount,Email,Loan Purpose\n' +
        csvData.join('\n'),
        'utf8'
      );
    } else {
      loan = await Loan.findById(req.params.id);
      if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      // Add the payment
      const paymentAmount = parseFloat(amount);
      loan.payments.push({
        amount: paymentAmount,
        transactionId,
        depositDetails,
        date: new Date()
      });

      // Calculate total repaid amount
      const repaid = loan.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const remaining = loan.totalDue - repaid;

      // Update loan status based on payment
      if (remaining <= 0) {
        loan.status = 'completed';
      } else {
        // Check if loan is defaulted
        loan.isDefaulter = isLoanDefaulted(loan);
        if (loan.isDefaulter) {
          loan.status = 'defaulted';
        } else {
          loan.status = 'active';
        }
      }

      await loan.save();
    }

    const repaid = loan.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = loan.totalDue - repaid;

    // Update isDefaulter status
    if (!global.useCSVFallback && loan._id) {
      loan.isDefaulter = isLoanDefaulted(loan);
      await Loan.findByIdAndUpdate(loan._id, { isDefaulter: loan.isDefaulter });
    }

    res.json({
      loan,
      repaid,
      remaining,
      defaulterFee: calcDefaulterFee(loan),
      isDefaulter: loan.isDefaulter || isLoanDefaulted(loan)
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload payments CSV
router.post('/upload-payments', uploadCSV.single('paymentsFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv') &&
        req.file.mimetype !== 'text/csv' &&
        req.file.mimetype !== 'application/vnd.ms-excel') {
      // Remove the uploaded file if it's not a CSV
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing invalid file:', unlinkError);
      }
      return res.status(400).json({ error: 'Invalid file format. Please upload a CSV file.' });
    }

    // Rename the uploaded file to payments.csv
    const uploadedFilePath = req.file.path;
    const paymentsFilePath = path.join(__dirname, '..', 'uploads', 'payments.csv');

    try {
      fs.renameSync(uploadedFilePath, paymentsFilePath);
    } catch (renameError) {
      console.error('Error renaming file:', renameError);
      return res.status(500).json({ error: 'Error processing the uploaded file' });
    }

    // Check if import-payments.js exists
    const importScriptPath = path.join(__dirname, '..', 'import-payments.js');
    if (!fs.existsSync(importScriptPath)) {
      console.error('Import script not found:', importScriptPath);
      return res.status(500).json({
        error: 'Import script not found. Please contact the administrator.',
        details: 'The import-payments.js script is missing.'
      });
    }

    // Run the import-payments.js script
    exec('node import-payments.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing import-payments.js: ${error.message}`);
        return res.status(500).json({
          error: 'Error processing payments file',
          details: error.message,
          stdout,
          stderr
        });
      }

      if (stderr) {
        console.error(`import-payments.js stderr: ${stderr}`);
      }

      console.log(`import-payments.js stdout: ${stdout}`);

      // Parse the results from stdout
      let results = { success: 0, errors: 0, notFound: 0 };
      try {
        const successMatch = stdout.match(/Successfully processed: (\d+)/);
        const errorsMatch = stdout.match(/Errors: (\d+)/);
        const notFoundMatch = stdout.match(/Loans not found: (\d+)/);

        if (successMatch) results.success = parseInt(successMatch[1]);
        if (errorsMatch) results.errors = parseInt(errorsMatch[1]);
        if (notFoundMatch) results.notFound = parseInt(notFoundMatch[1]);
      } catch (parseError) {
        console.error('Error parsing import results:', parseError);
      }

      res.json({
        message: 'Payments processed successfully',
        file: req.file.originalname,
        results
      });
    });
  } catch (error) {
    console.error('Error uploading payments file:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload new users CSV
router.post('/upload-users', uploadCSV.single('usersFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv') &&
        req.file.mimetype !== 'text/csv' &&
        req.file.mimetype !== 'application/vnd.ms-excel') {
      // Remove the uploaded file if it's not a CSV
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing invalid file:', unlinkError);
      }
      return res.status(400).json({ error: 'Invalid file format. Please upload a CSV file.' });
    }

    // Rename the uploaded file to new-users.csv
    const uploadedFilePath = req.file.path;
    const usersFilePath = path.join(__dirname, '..', 'uploads', 'new-users.csv');

    try {
      fs.renameSync(uploadedFilePath, usersFilePath);
    } catch (renameError) {
      console.error('Error renaming file:', renameError);
      return res.status(500).json({ error: 'Error processing the uploaded file' });
    }

    // Check if import-users.js exists
    const importScriptPath = path.join(__dirname, '..', 'import-users.js');
    if (!fs.existsSync(importScriptPath)) {
      console.error('Import script not found:', importScriptPath);
      return res.status(500).json({
        error: 'Import script not found. Please contact the administrator.',
        details: 'The import-users.js script is missing.'
      });
    }

    // Run the import-users.js script
    exec('node import-users.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing import-users.js: ${error.message}`);
        return res.status(500).json({
          error: 'Error processing users file',
          details: error.message,
          stdout,
          stderr
        });
      }

      if (stderr) {
        console.error(`import-users.js stderr: ${stderr}`);
      }

      console.log(`import-users.js stdout: ${stdout}`);

      // Parse the results from stdout
      let results = { success: 0, duplicates: 0, errors: 0 };
      try {
        const successMatch = stdout.match(/Successfully imported: (\d+)/);
        const duplicatesMatch = stdout.match(/Duplicates skipped: (\d+)/);
        const errorsMatch = stdout.match(/Errors: (\d+)/);

        if (successMatch) results.success = parseInt(successMatch[1]);
        if (duplicatesMatch) results.duplicates = parseInt(duplicatesMatch[1]);
        if (errorsMatch) results.errors = parseInt(errorsMatch[1]);
      } catch (parseError) {
        console.error('Error parsing import results:', parseError);
      }

      res.json({
        message: 'Users processed successfully',
        file: req.file.originalname,
        results
      });
    });
  } catch (error) {
    console.error('Error uploading users file:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload new loans CSV
router.post('/upload-new-loans', uploadCSV.single('newLoansFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv') &&
        req.file.mimetype !== 'text/csv' &&
        req.file.mimetype !== 'application/vnd.ms-excel') {
      // Remove the uploaded file if it's not a CSV
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing invalid file:', unlinkError);
      }
      return res.status(400).json({ error: 'Invalid file format. Please upload a CSV file.' });
    }

    // Rename the uploaded file to new-loans.csv
    const uploadedFilePath = req.file.path;
    const newLoansFilePath = path.join(__dirname, '..', 'uploads', 'new-loans.csv');

    try {
      fs.renameSync(uploadedFilePath, newLoansFilePath);
    } catch (renameError) {
      console.error('Error renaming file:', renameError);
      return res.status(500).json({ error: 'Error processing the uploaded file' });
    }

    // Check if import-new-loans.js exists
    const importScriptPath = path.join(__dirname, '..', 'import-new-loans.js');
    if (!fs.existsSync(importScriptPath)) {
      console.error('Import script not found:', importScriptPath);
      return res.status(500).json({
        error: 'Import script not found. Please contact the administrator.',
        details: 'The import-new-loans.js script is missing.'
      });
    }

    // Run the import-new-loans.js script
    exec('node import-new-loans.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing import-new-loans.js: ${error.message}`);
        return res.status(500).json({
          error: 'Error processing new loans file',
          details: error.message,
          stdout,
          stderr
        });
      }

      if (stderr) {
        console.error(`import-new-loans.js stderr: ${stderr}`);
      }

      console.log(`import-new-loans.js stdout: ${stdout}`);

      // Parse the results from stdout
      let results = { success: 0, duplicates: 0, errors: 0 };
      try {
        const successMatch = stdout.match(/Successfully imported: (\d+)/);
        const duplicatesMatch = stdout.match(/Duplicates skipped: (\d+)/);
        const errorsMatch = stdout.match(/Errors: (\d+)/);

        if (successMatch) results.success = parseInt(successMatch[1]);
        if (duplicatesMatch) results.duplicates = parseInt(duplicatesMatch[1]);
        if (errorsMatch) results.errors = parseInt(errorsMatch[1]);
      } catch (parseError) {
        console.error('Error parsing import results:', parseError);
      }

      res.json({
        message: 'New loans processed successfully',
        file: req.file.originalname,
        results
      });
    });
  } catch (error) {
    console.error('Error uploading new loans file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;