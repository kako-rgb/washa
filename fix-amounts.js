// Load environment variables from .env file
require('dotenv').config();

const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kakotechnology:e8q3f9dRgMxcItXn@cluster0.dfv4h.mongodb.net/washa?retryWrites=true&w=majority';

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

// Fix loan amounts
async function fixLoanAmounts() {
  try {
    // Get all loans
    const loans = await Loan.find({});
    console.log(`Found ${loans.length} loans to update`);

    let updatedCount = 0;

    // Update each loan
    for (const loan of loans) {
      // Divide principal by 1000
      const originalPrincipal = loan.principal;
      const newPrincipal = originalPrincipal / 1000;

      // Divide interest by 1000
      const originalInterest = loan.interest;
      const newInterest = originalInterest / 1000;

      // Divide totalDue by 1000
      const originalTotalDue = loan.totalDue;
      const newTotalDue = originalTotalDue / 1000;

      // Update payments if they exist
      if (loan.payments && loan.payments.length > 0) {
        for (const payment of loan.payments) {
          payment.amount = payment.amount / 1000;
        }
      }

      // Save the updated loan
      loan.principal = newPrincipal;
      loan.interest = newInterest;
      loan.totalDue = newTotalDue;

      await loan.save();

      console.log(`Updated loan for ${loan.name}:`);
      console.log(`  Principal: ${originalPrincipal} -> ${newPrincipal}`);
      console.log(`  Interest: ${originalInterest} -> ${newInterest}`);
      console.log(`  Total Due: ${originalTotalDue} -> ${newTotalDue}`);

      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} loans`);
    return updatedCount;
  } catch (err) {
    console.error('Error fixing loan amounts:', err.message);
    return 0;
  }
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

    // Fix loan amounts
    await fixLoanAmounts();

    // Count loans to verify
    await countLoans();

    console.log('Amount correction process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();
