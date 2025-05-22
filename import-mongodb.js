// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;

// Path to CSV file
const CSV_PATH = path.join(__dirname, 'olddata', 'Joyce Past Data.csv');

// Helper function to clean currency values
function cleanCurrencyValue(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/[^0-9.-]+/g, '') || '0');
}

// Helper function to parse dates
function parseDate(dateString) {
  if (!dateString) return new Date();
  try {
    const parts = dateString.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      return new Date(year, month, day);
    }
    return new Date(dateString);
  } catch {
    return new Date();
  }
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return false;
  }
}

// Delete all existing loans
async function deleteAllLoans() {
  try {
    const result = await Loan.deleteMany({});
    console.log(`Deleted ${result.deletedCount} loans from MongoDB`);
    return true;
  } catch (err) {
    console.error('Error deleting loans:', err.message);
    return false;
  }
}

// Import CSV data to MongoDB
async function importCSVData() {
  return new Promise((resolve, reject) => {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        console.log(`CSV file successfully processed. Found ${results.length} rows.`);

        for (const row of results) {
          try {
            // Parse numeric values - no longer multiplying by 1000
            const principal = cleanCurrencyValue(row['Amount  Issued']);
            const totalDue = cleanCurrencyValue(row['Total Due']) || principal * 1.2;
            const interest = totalDue - principal;

            // Parse date
            const createdAt = parseDate(row['Date Issued']);

            // Determine status
            let status = 'active';
            if (row['Cleared'] === 'fully paid') {
              status = 'completed';
            } else if (row['Defaulted'] === 'yes') {
              status = 'defaulted';
            }

            // Create loan data object
            const loanData = {
              name: row['Full Names'] || '',
              phone: row['phone number'] || '',
              principal: principal,
              interest: interest,
              totalDue: totalDue,
              createdAt: createdAt,
              status: status,
              payments: [],
              passportPhoto: '/uploads/placeholder.svg',
              idPhotoFront: '/uploads/placeholder.svg',
              idPhotoBack: '/uploads/placeholder.svg',
              email: row['Email'] || '',
              address: row['Address'] || '',
              occupation: row['Occupation'] || '',
              employerName: row['Employer Name'] || '',
              refereeName: row['Referee Name'] || '',
              loanPurpose: row['Loan Purpose'] || ''
            };

            // Handle payments if they exist
            if (row['Amount paid']) {
              const paymentAmount = cleanCurrencyValue(row['Amount paid']);
              if (paymentAmount > 0) {
                loanData.payments.push({
                  amount: paymentAmount,
                  date: createdAt,
                  transactionId: `LEGACY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  depositDetails: row['Methods of Payment'] || 'Legacy payment'
                });
              }
            }

            // Create and save the loan
            const loan = new Loan(loanData);
            await loan.save();
            console.log(`Imported loan for ${loanData.name}`);
            successCount++;
          } catch (error) {
            console.error(`Error importing loan for ${row['Full Names']}: ${error.message}`);
            errorCount++;
          }
        }

        console.log(`Import completed. Success: ${successCount}, Errors: ${errorCount}`);
        resolve({ successCount, errorCount });
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Count loans in MongoDB
async function countLoans() {
  try {
    const count = await Loan.countDocuments();
    console.log(`Total loans in MongoDB: ${count}`);
    return count;
  } catch (err) {
    console.error('Error counting loans:', err.message);
    return -1;
  }
}

// Main function
async function main() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Exiting...');
      process.exit(1);
    }

    // Delete all existing loans
    await deleteAllLoans();

    // Import CSV data
    await importCSVData();

    // Count loans to verify import
    await countLoans();

    console.log('Import process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();
