// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;

// Path to the payments CSV file
const PAYMENTS_CSV_PATH = path.join(__dirname, 'uploads', 'payments.csv');

// Function to parse date from string
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

// Function to clean currency values
function cleanCurrencyValue(value) {
  if (!value) return 0;

  try {
    // Remove currency symbols, commas, and other non-numeric characters
    const cleanValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
    return isNaN(cleanValue) ? 0 : cleanValue;
  } catch (error) {
    console.warn(`Error parsing currency value: ${value}`);
    return 0;
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

// Import payments from CSV
async function importPaymentsFromCSV() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PAYMENTS_CSV_PATH)) {
      return reject(new Error(`Payments CSV file not found at ${PAYMENTS_CSV_PATH}`));
    }

    const results = [];
    fs.createReadStream(PAYMENTS_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Parsed ${results.length} payment records from CSV`);

        let successCount = 0;
        let errorCount = 0;
        let notFoundCount = 0;

        for (const row of results) {
          try {
            // Extract data from CSV row
            const name = row['Name'] || '';
            const phone = row['Phone'] || '';
            const paymentAmount = cleanCurrencyValue(row['Payment Amount']);
            const paymentDate = parseDate(row['Payment Date']);
            const paymentMethod = row['Payment Method'] || 'CSV Import';

            if (!name || paymentAmount <= 0) {
              console.warn(`Skipping invalid payment record: ${JSON.stringify(row)}`);
              errorCount++;
              continue;
            }

            // Find the loan by phone number first, regardless of name
            let loan;
            if (phone) {
              // First try to find by exact phone number match
              loan = await Loan.findOne({
                phone: { $regex: new RegExp(phone, 'i') }
              });

              // If found by phone but names differ slightly, still use this loan
              if (loan) {
                console.log(`Found loan by phone number ${phone} for ${loan.name} (CSV name: ${name})`);
              } else {
                // If not found by phone, try to find by name
                loan = await Loan.findOne({
                  name: { $regex: new RegExp(name, 'i') }
                });
              }
            } else {
              // If no phone number provided, find by name
              loan = await Loan.findOne({
                name: { $regex: new RegExp(name, 'i') }
              });
            }

            if (!loan) {
              console.warn(`No loan found for ${name} (${phone})`);
              notFoundCount++;
              continue;
            }

            // Add the payment
            loan.payments.push({
              amount: paymentAmount,
              date: paymentDate,
              transactionId: `CSV-IMPORT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              depositDetails: paymentMethod
            });

            // Calculate total repaid amount
            const repaid = loan.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const remaining = loan.totalDue - repaid;

            // Update loan status based on payment
            if (remaining <= 0) {
              loan.status = 'completed';
            } else {
              // Check if loan is defaulted
              const isExpired = loan.expiryDate ? new Date() > new Date(loan.expiryDate) : false;
              loan.isDefaulter = isExpired;
              if (loan.isDefaulter) {
                loan.status = 'defaulted';
              } else {
                loan.status = 'active';
              }
            }

            await loan.save();
            console.log(`Added payment of ${paymentAmount} to loan for ${name}`);
            successCount++;
          } catch (error) {
            console.error(`Error processing payment for ${row['Name']}: ${error.message}`);
            errorCount++;
          }
        }

        resolve({
          total: results.length,
          success: successCount,
          errors: errorCount,
          notFound: notFoundCount
        });
      })
      .on('error', (error) => {
        console.error('Error reading payments CSV:', error);
        reject(error);
      });
  });
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

    // Import payments from CSV
    const result = await importPaymentsFromCSV();

    console.log('Payments import completed:');
    console.log(`- Total payment records: ${result.total}`);
    console.log(`- Successfully processed: ${result.success}`);
    console.log(`- Errors: ${result.errors}`);
    console.log(`- Loans not found: ${result.notFound}`);

    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();
