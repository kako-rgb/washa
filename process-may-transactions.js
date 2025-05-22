// Script to process May transaction data from JSON file and update the database
// Usage: node process-may-transactions.js

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kakotechnology:e8q3f9dRgMxcItXn@cluster0.dfv4h.mongodb.net/washa?retryWrites=true&w=majority';

// Path to the JSON file
const JSON_PATH = path.join(__dirname, 'olddata', 'may_data.json');

// Statistics for reporting
const stats = {
  totalTransactions: 0,
  matchedAccounts: 0,
  updatedAccounts: 0,
  newAccounts: 0,
  errors: 0,
  totalAmountProcessed: 0
};

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

// Parse date from the format in the JSON file (e.g., "01-FEB-\n2025")
function parseTransactionDate(dateStr) {
  try {
    if (!dateStr) return new Date();

    // Handle split dates like "01-FEB-\n2025"
    const combinedDate = dateStr.replace('\n', '');

    // Parse the date in format "DD-MMM-YYYY"
    const [day, month, year] = combinedDate.split('-');

    // Map month abbreviations to month numbers
    const monthMap = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };

    const monthNum = monthMap[month.toUpperCase()];
    if (monthNum === undefined) {
      console.warn(`Invalid month in date: ${dateStr}`);
      return new Date();
    }

    return new Date(parseInt(year), monthNum, parseInt(day));
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date();
  }
}

// Clean phone number by removing 254 prefix
function cleanPhoneNumber(phoneStr) {
  if (!phoneStr) return '';

  // Extract phone number from format like "From 254795118555"
  const match = phoneStr.match(/From\s+254(\d+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If no match, return the original string with any 254 prefix removed
  return phoneStr.replace(/^254/, '');
}

// Clean amount by removing currency symbols and commas
function cleanAmount(amountStr) {
  if (!amountStr) return 0;

  try {
    // Remove currency symbols, commas, and other non-numeric characters
    const cleanValue = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
    return isNaN(cleanValue) ? 0 : cleanValue;
  } catch (error) {
    console.warn(`Error parsing amount value: ${amountStr}`);
    return 0;
  }
}

// Extract name from alias field
function extractName(aliasStr) {
  if (!aliasStr) return '';

  // Extract name from format like "NANCY AKINYI Alias"
  const match = aliasStr.match(/([A-Za-z\s]+)\s+Alias/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return aliasStr.trim();
}

// Process the JSON data
async function processJsonData() {
  try {
    // Check if the JSON file exists
    if (!fs.existsSync(JSON_PATH)) {
      console.error(`JSON file not found at ${JSON_PATH}`);
      throw new Error(`JSON file not found at ${JSON_PATH}`);
    }

    console.log(`Processing JSON file: ${JSON_PATH}`);

    // Read and parse the JSON file
    const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

    // Extract transactions from tables
    const transactions = [];

    // Process each table in the JSON data
    for (const table of jsonData.tables) {
      // Skip tables with no data
      if (!table.data || table.data.length === 0) continue;

      // Process each row in the table
      for (let i = 0; i < table.data.length; i++) {
        const row = table.data[i];

        // Check if this is a payment row (contains "Paybill Credit")
        if (row[2] && row[2].includes('Paybill Credit')) {
          // This is a transaction row
          const transaction = {
            date: parseTransactionDate(row[0]),
            transactionId: '',
            amount: cleanAmount(row[3]),
            phoneNumber: '',
            name: '',
            processed: false
          };

          // Extract transaction ID from the particulars field
          const txnMatch = row[2].match(/TB[A-Z0-9]+-\d+/);
          if (txnMatch) {
            transaction.transactionId = txnMatch[0];
          }

          // Look ahead for phone number (usually in the next row)
          if (i + 1 < table.data.length && table.data[i + 1][2] && table.data[i + 1][2].includes('From 254')) {
            transaction.phoneNumber = cleanPhoneNumber(table.data[i + 1][2]);
          }

          // Look ahead for name (usually two rows down)
          if (i + 2 < table.data.length && table.data[i + 2][2] && table.data[i + 2][2].includes('Alias')) {
            transaction.name = extractName(table.data[i + 2][2]);
          }

          // Only add valid transactions with amount > 0
          if (transaction.amount > 0) {
            transactions.push(transaction);
          }
        }
      }
    }

    console.log(`Extracted ${transactions.length} transactions from JSON data`);
    stats.totalTransactions = transactions.length;

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Skip transactions with no phone number
        if (!transaction.phoneNumber) {
          console.warn(`Skipping transaction with no phone number: ${transaction.transactionId}`);
          stats.errors++;
          continue;
        }

        // Skip transactions with no transaction ID
        if (!transaction.transactionId) {
          console.warn(`Skipping transaction with no transaction ID for phone: ${transaction.phoneNumber}`);
          stats.errors++;
          continue;
        }

        // Find loan by phone number
        let loan = await Loan.findOne({ phone: transaction.phoneNumber });

        if (loan) {
          // Existing account - check for duplicate transaction ID
          const existingPayment = loan.payments.find(p => p.transactionId === transaction.transactionId);

          if (existingPayment) {
            console.log(`Skipping duplicate transaction ${transaction.transactionId} for ${loan.name} (${loan.phone})`);
            continue;
          }

          // Update name if provided in the transaction
          if (transaction.name && transaction.name !== loan.name) {
            console.log(`Updating name for ${loan.phone} from "${loan.name}" to "${transaction.name}"`);
            loan.name = transaction.name;
          }

          // Add payment record
          loan.payments.push({
            date: transaction.date,
            amount: transaction.amount,
            transactionId: transaction.transactionId,
            depositDetails: `May Statement Import - ${transaction.date.toISOString().split('T')[0]}`
          });

          // Save the updated loan
          await loan.save();
          stats.matchedAccounts++;
          stats.updatedAccounts++;
          stats.totalAmountProcessed += transaction.amount;
          console.log(`Updated account for ${loan.name} (${loan.phone}): Added payment of ${transaction.amount}`);
        } else {
          // Check if any loan already has this transaction ID
          const existingLoanWithTransaction = await Loan.findOne({
            'payments.transactionId': transaction.transactionId
          });

          if (existingLoanWithTransaction) {
            console.log(`Skipping transaction ${transaction.transactionId} - already exists in another account: ${existingLoanWithTransaction.name} (${existingLoanWithTransaction.phone})`);
            continue;
          }

          // No matching account - create a new one
          const newLoan = new Loan({
            name: transaction.name || `Unknown (${transaction.phoneNumber})`,
            phone: transaction.phoneNumber,
            principal: 0, // To be confirmed later
            interest: 0,
            totalDue: 0,
            createdAt: transaction.date,
            expiryDate: new Date(transaction.date.getTime() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from transaction date
            status: 'active',
            isNewFromDocx: true, // Tag for identification
            payments: [{
              date: transaction.date,
              amount: transaction.amount,
              transactionId: transaction.transactionId,
              depositDetails: `May Statement Import - New Account`
            }],
            passportPhoto: '/uploads/placeholder.svg',
            idPhotoFront: '/uploads/placeholder.svg',
            idPhotoBack: '/uploads/placeholder.svg'
          });

          // Save the new loan
          await newLoan.save();
          stats.newAccounts++;
          stats.totalAmountProcessed += transaction.amount;
          console.log(`Created new account for ${newLoan.name} (${newLoan.phone}): Added payment of ${transaction.amount}`);
        }

        // Mark transaction as processed
        transaction.processed = true;
      } catch (error) {
        console.error(`Error processing transaction ${transaction.transactionId}:`, error);
        stats.errors++;
      }
    }

    // Print summary
    console.log('\nProcessing completed:');
    console.log(`- Total transactions processed: ${stats.totalTransactions}`);
    console.log(`- Matched existing accounts: ${stats.matchedAccounts}`);
    console.log(`- Updated accounts: ${stats.updatedAccounts}`);
    console.log(`- New accounts created: ${stats.newAccounts}`);
    console.log(`- Errors: ${stats.errors}`);
    console.log(`- Total amount processed: ${stats.totalAmountProcessed.toFixed(2)}`);

    return stats;
  } catch (error) {
    console.error('Error processing JSON data:', error);
    throw error;
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

    // Process the JSON data
    await processJsonData();

    console.log('Processing completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();