// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kakotechnology:e8q3f9dRgMxcItXn@cluster0.dfv4h.mongodb.net/washa?retryWrites=true&w=majority';

// Path to the CSV file
const CSV_PATH = path.join(__dirname, 'olddata', 'Joyce Past Data.csv');

// Helper function to parse dates
function parseDate(dateString) {
  if (!dateString || dateString === 'N/A') return new Date();

  try {
    // Handle formats like "27/02/25 Thursday"
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

    // Try standard date parsing as fallback
    return new Date(dateString);
  } catch (error) {
    console.warn(`Error parsing date: ${dateString}`, error);
    return new Date();
  }
}

// Function to clean currency values
function cleanCurrencyValue(value) {
  if (!value || value === 'N/A') return 0;

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

// Import missing users from CSV
async function importMissingUsersFromCSV() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CSV_PATH)) {
      return reject(new Error(`CSV file not found at ${CSV_PATH}`));
    }

    const results = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Parsed ${results.length} records from CSV`);

        let newCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const row of results) {
          try {
            // Extract data from CSV row
            const name = row['Full Names'] || '';
            const phone = row['phone number'] || '';

            // Skip if name or phone is missing or N/A
            if (!name || name === 'N/A' || !phone || phone === 'N/A') {
              console.warn(`Skipping record with missing name or phone: ${JSON.stringify(row)}`);
              errorCount++;
              continue;
            }

            // Check if user already exists in database
            const existingLoan = await Loan.findOne({
              $or: [
                { name: name, phone: phone },
                { phone: phone } // Also match by phone number only
              ]
            });

            if (existingLoan) {
              // Skip existing users - no updates
              console.log(`Skipping existing user: ${name} (${phone})`);
              skipCount++;
              continue;
            }

            // Get principal amount, ensuring it's a valid number
            let principal = cleanCurrencyValue(row['Amount  Issued'] || row['Principal Amount']);
            if (isNaN(principal) || principal <= 0) {
              principal = 5000; // Default value if invalid
            }

            // Get total due amount, ensuring it's a valid number
            let totalDue = cleanCurrencyValue(row['Total Due']);
            if (isNaN(totalDue) || totalDue <= 0) {
              totalDue = principal * 1.2; // Default 20% interest if invalid
            }

            // Calculate interest
            let interest = totalDue - principal;
            if (isNaN(interest) || interest < 0) {
              interest = principal * 0.2; // Default 20% interest if invalid
              totalDue = principal + interest;
            }

            const createdAt = parseDate(row['Date Issued']);

            // Calculate expiry date (4 weeks from creation date)
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 28); // 4 weeks = 28 days

            // Create new loan
            const newLoan = new Loan({
              name: name,
              phone: phone,
              email: row['Email'] || '',
              address: row['Address'] || '',
              occupation: row['Occupation'] || '',
              employerName: row['Employer Name'] || '',
              refereeName: row['Referee Name'] || '',
              loanPurpose: row['Loan Purpose'] || '',
              principal: principal,
              interest: interest,
              totalDue: totalDue,
              createdAt: createdAt,
              expiryDate: expiryDate,
              status: row['Cleared'] === 'fully paid' ? 'completed' :
                     row['Defaulted'] === 'yes' ? 'defaulted' : 'active',
              passportPhoto: 'uploads/placeholder.svg',
              idPhotoFront: 'uploads/placeholder.svg',
              idPhotoBack: 'uploads/placeholder.svg',
              payments: []
            });

            // Add payment if it exists
            const paymentAmount = cleanCurrencyValue(row['Amount paid']);
            if (paymentAmount > 0) {
              newLoan.payments.push({
                date: createdAt,
                amount: paymentAmount,
                transactionId: `LEGACY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                depositDetails: row['Methods of Payment'] || 'Legacy import'
              });
            }

            await newLoan.save();
            console.log(`Added new user: ${name} (${phone})`);
            newCount++;
          } catch (error) {
            console.error(`Error processing user: ${JSON.stringify(row)}`, error);
            errorCount++;
          }
        }

        resolve({
          total: results.length,
          new: newCount,
          skipped: skipCount,
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

    // Import missing users from CSV
    const result = await importMissingUsersFromCSV();

    console.log('Import completed:');
    console.log(`- Total records in CSV: ${result.total}`);
    console.log(`- New users added: ${result.new}`);
    console.log(`- Existing users skipped: ${result.skipped}`);
    console.log(`- Errors: ${result.errors}`);

    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();