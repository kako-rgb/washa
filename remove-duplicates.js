// Load environment variables from .env file
require('dotenv').config();

const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;

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

// Calculate completeness score for a loan record
function getCompletenessScore(loan) {
  let score = 0;

  // Basic information
  if (loan.name) score += 1;
  if (loan.phone) score += 1;
  if (loan.email) score += 1;
  if (loan.address) score += 1;
  if (loan.occupation) score += 1;
  if (loan.employerName) score += 1;
  if (loan.refereeName) score += 1;
  if (loan.loanPurpose) score += 1;

  // Financial information
  if (loan.principal > 0) score += 2;
  if (loan.interest > 0) score += 2;
  if (loan.totalDue > 0) score += 2;

  // Payments
  if (loan.payments && loan.payments.length > 0) score += 3;

  // Photos
  if (loan.passportPhoto && loan.passportPhoto !== '/uploads/placeholder.svg') score += 1;
  if (loan.idPhotoFront && loan.idPhotoFront !== '/uploads/placeholder.svg') score += 1;
  if (loan.idPhotoBack && loan.idPhotoBack !== '/uploads/placeholder.svg') score += 1;

  return score;
}

// Find and remove duplicate names
async function removeDuplicateNames() {
  try {
    // Get all loans
    const loans = await Loan.find({});
    console.log(`Found ${loans.length} total loans`);

    // Group loans by name
    const loansByName = {};

    for (const loan of loans) {
      const name = loan.name.trim();

      if (!loansByName[name]) {
        loansByName[name] = [];
      }

      loansByName[name].push(loan);
    }

    // Identify duplicates and keep the best record
    const duplicatesToRemove = [];
    const keptLoans = [];

    for (const name in loansByName) {
      const loansForName = loansByName[name];

      if (loansForName.length > 1) {
        // Sort by completeness score (highest first), then by creation date (newest first)
        loansForName.sort((a, b) => {
          const scoreA = getCompletenessScore(a);
          const scoreB = getCompletenessScore(b);

          if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score first
          }

          // If scores are equal, prefer newer records
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Keep the first one (best record) and mark the rest for removal
        keptLoans.push(loansForName[0]);

        for (let i = 1; i < loansForName.length; i++) {
          duplicatesToRemove.push(loansForName[i]._id);
        }
      } else {
        // Only one loan with this name, keep it
        keptLoans.push(loansForName[0]);
      }
    }

    console.log(`Found ${duplicatesToRemove.length} duplicate loans to remove`);
    console.log(`Keeping ${keptLoans.length} unique loans`);

    if (duplicatesToRemove.length > 0) {
      // Remove the duplicates
      const result = await Loan.deleteMany({ _id: { $in: duplicatesToRemove } });
      console.log(`Deleted ${result.deletedCount} duplicate loans`);
    } else {
      console.log('No duplicates found');
    }

    // Count remaining loans
    const remainingCount = await Loan.countDocuments();
    console.log(`Remaining loans in database: ${remainingCount}`);

    return {
      totalBefore: loans.length,
      duplicatesRemoved: duplicatesToRemove.length,
      totalAfter: remainingCount
    };
  } catch (error) {
    console.error('Error removing duplicates:', error);
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

    // Remove duplicate names
    const result = await removeDuplicateNames();

    console.log('Summary:');
    console.log(`- Total loans before: ${result.totalBefore}`);
    console.log(`- Duplicates removed: ${result.duplicatesRemoved}`);
    console.log(`- Total loans after: ${result.totalAfter}`);

    console.log('Process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();
