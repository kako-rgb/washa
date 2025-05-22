// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kakotechnology:e8q3f9dRgMxcItXn@cluster0.dfv4h.mongodb.net/washa?retryWrites=true&w=majority';

// Path to the users CSV file
const USERS_CSV_PATH = path.join(__dirname, 'uploads', 'new-users.csv');

// Helper function to parse dates
function parseDate(dateString) {
  if (!dateString) return new Date();

  try {
    // Handle formats like "15th may 2025"
    const dateRegex = /(\d+)(st|nd|rd|th)?\s+([a-zA-Z]+)\s+(\d{4})/;
    const match = dateString.match(dateRegex);

    if (match) {
      const day = parseInt(match[1]);
      const month = match[3].toLowerCase();
      const year = parseInt(match[4]);

      const months = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };

      if (months[month] !== undefined) {
        return new Date(year, months[month], day);
      }
    }

    // Try standard date parsing as fallback
    return new Date(dateString);
  } catch (error) {
    console.warn(`Error parsing date: ${dateString}`, error);
    return new Date();
  }
}

// Function to clean currency values
function cleanCurrencyValue(value) {
  if (!value) return 0;

  try {
    // Remove currency symbols, commas, and other non-numeric characters
    const cleanValue = parseFloat(value.toString().replace(/[^0-9.-]+/g, ''));
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

// Import users from CSV
async function importUsersFromCSV() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(USERS_CSV_PATH)) {
      return reject(new Error(`Users CSV file not found at ${USERS_CSV_PATH}`));
    }

    const results = [];
    fs.createReadStream(USERS_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Parsed ${results.length} user records from CSV`);

        let newCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        for (const row of results) {
          try {
            // Extract data from CSV row
            const name = row['Full Names'] || '';
            const phone = row['phone number'] || '';
            const principal = cleanCurrencyValue(row['Amount borrowed']);
            const createdAt = parseDate(row['date of borrowing']);

            // Calculate expiry date (4 weeks from creation date)
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 28); // 4 weeks = 28 days

            // Calculate interest (20% of principal) and total due
            const interest = principal * 0.2;
            const totalDue = principal + interest;

            // Check if payment data exists
            let paymentAmount = cleanCurrencyValue(row['payment Amount']);
            const paymentDate = row['Payment Date'] ? parseDate(row['Payment Date']) : null;
            const paymentMethod = row['Payment Method'] || 'CSV Import';

            // Skip if name or phone is missing
            if (!name || !phone) {
              console.warn(`Skipping record with missing name or phone: ${JSON.stringify(row)}`);
              errorCount++;
              continue;
            }

            // Check if user already exists
            const existingLoan = await Loan.findOne({
              $or: [
                { name: name, phone: phone },
                { phone: phone } // Also match by phone number only
              ]
            });

            if (existingLoan) {
              // Update existing loan
              existingLoan.principal = principal;
              existingLoan.interest = interest;
              existingLoan.totalDue = totalDue;
              existingLoan.createdAt = createdAt;
              existingLoan.expiryDate = expiryDate;

              // Add payment if it exists
              if (paymentAmount > 0 && paymentDate) {
                existingLoan.payments.push({
                  date: paymentDate,
                  amount: paymentAmount,
                  transactionId: `CSV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  depositDetails: paymentMethod
                });
              }

              await existingLoan.save();
              console.log(`Updated existing loan for ${name} (${phone})`);
              updateCount++;
            } else {
              // Create new loan
              const newLoan = new Loan({
                name: name,
                phone: phone,
                principal: principal,
                interest: interest,
                totalDue: totalDue,
                createdAt: createdAt,
                expiryDate: expiryDate,
                status: 'active',
                passportPhoto: 'uploads/placeholder.svg',
                idPhotoFront: 'uploads/placeholder.svg',
                idPhotoBack: 'uploads/placeholder.svg',
                payments: []
              });

              // Add payment if it exists
              if (paymentAmount > 0 && paymentDate) {
                newLoan.payments.push({
                  date: paymentDate,
                  amount: paymentAmount,
                  transactionId: `CSV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  depositDetails: paymentMethod
                });
              }

              await newLoan.save();
              console.log(`Created new loan for ${name} (${phone})`);
              newCount++;
            }
          } catch (error) {
            console.error(`Error processing user: ${JSON.stringify(row)}`, error);
            errorCount++;
          }
        }

        resolve({
          total: results.length,
          new: newCount,
          updated: updateCount,
          errors: errorCount
        });
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
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

    // Import users from CSV
    const result = await importUsersFromCSV();

    console.log('Users import completed:');
    console.log(`- Total records: ${result.total}`);
    console.log(`- New users created: ${result.new}`);
    console.log(`- Existing users updated: ${result.updated}`);
    console.log(`- Errors: ${result.errors}`);
    console.log(`Successfully imported: ${result.new + result.updated}`);
    console.log(`Duplicates skipped: ${result.updated}`);
    console.log(`Errors: ${result.errors}`);

    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();