// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    importCsvData();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Function to parse date strings from various formats
function parseDate(dateString) {
  if (!dateString) return null;

  try {
    // Handle date formats like "27/02/25 Thursday"
    const parts = dateString.split(' ')[0].split('/');
    if (parts.length === 3) {
      // Assuming DD/MM/YY format
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      let year = parseInt(parts[2]);

      // Handle 2-digit years
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      return new Date(year, month, day);
    }

    // Fallback to standard date parsing
    return new Date(dateString);
  } catch (error) {
    console.warn(`Error parsing date: ${dateString}`);
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

// Function to import CSV data
function importCsvData() {
  const results = [];

  fs.createReadStream(path.join(__dirname, 'public', 'uploads', 'Joyce Past Data.csv'))
    .pipe(csv())
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      console.log(`Parsed ${results.length} records from CSV`);

      try {
        let successCount = 0;
        let errorCount = 0;

        // Process each row
        for (const row of results) {
          try {
            // Get principal amount, ensuring it's a valid number
            let principal = cleanCurrencyValue(row['Principal Amount'] || row['Amount  Issued']);
            if (isNaN(principal) || principal <= 0) {
              principal = 5000; // Default value if invalid
            }

            // No need to multiply by 1000 anymore

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

            // Map CSV columns to loan schema
            const loanData = {
              name: row['Full Names'] || '',
              phone: row['phone number'] || '',
              email: row['Email'] || '',
              address: row['Address'] || '',
              occupation: row['Occupation'] || '',
              employerName: row['Employer Name'] || '',
              refereeName: row['Referee Name'] || '',
              principal: principal,
              interest: interest,
              totalDue: totalDue,
              createdAt: parseDate(row['Date Issued']) || new Date(),
              loanPurpose: row['Loan Purpose'] || '',
              status: row['Cleared'] === 'fully paid' ? 'completed' :
                     row['Defaulted'] ? 'defaulted' : 'active',
              payments: [],
              passportPhoto: '/uploads/placeholder.svg',
              idPhotoFront: '/uploads/placeholder.svg',
              idPhotoBack: '/uploads/placeholder.svg'
            };

            // Handle payments if available
            if (row['Dates of Payment'] && row['Amount paid']) {
              const paymentDates = row['Dates of Payment'].split(',');
              const paymentAmounts = row['Amount paid'].split(',');
              const paymentMethods = row['Methods of Payment'] ? row['Methods of Payment'].split(',') : [];

              // Create payment entries
              for (let i = 0; i < Math.min(paymentDates.length, paymentAmounts.length); i++) {
                const paymentAmount = cleanCurrencyValue(paymentAmounts[i].trim());
                if (paymentAmount > 0) {
                  loanData.payments.push({
                    date: parseDate(paymentDates[i].trim()) || new Date(),
                    amount: paymentAmount,
                    transactionId: `LEGACY-${Date.now()}-${i}`,
                    depositDetails: paymentMethods[i] ? paymentMethods[i].trim() : 'Legacy import'
                  });
                }
              }
            } else if (row['Amount paid']) {
              const paymentAmount = cleanCurrencyValue(row['Amount paid']);
              if (paymentAmount > 0) {
                // If there's a payment amount but no dates, create a single payment
                loanData.payments.push({
                  date: loanData.createdAt,
                  amount: paymentAmount,
                  transactionId: `LEGACY-${Date.now()}`,
                  depositDetails: 'Legacy import'
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

        console.log(`CSV import completed: ${successCount} records imported successfully, ${errorCount} errors`);
        process.exit(0);
      } catch (error) {
        console.error('Error importing CSV data:', error);
        process.exit(1);
      }
    });
}
