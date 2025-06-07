// Script to check imported payment data
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://kakokevin:Kako2024@cluster0.kcjqb.mongodb.net/lms_washa?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define schemas (simplified)
const borrowerSchema = new mongoose.Schema({
    fullName: String,
    phone: String,
    isFromPaymentImport: Boolean,
    importDate: Date,
    createdAt: Date
});

const loanSchema = new mongoose.Schema({
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrower' },
    amount: Number,
    status: String,
    source: String,
    notes: String,
    createdAt: Date
});

const paymentSchema = new mongoose.Schema({
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    amount: Number,
    paymentDate: Date,
    method: String,
    status: String,
    notes: String,
    receiptNumber: String,
    isFromImport: Boolean,
    importDate: Date,
    createdAt: Date
});

const Borrower = mongoose.model('Borrower', borrowerSchema);
const Loan = mongoose.model('Loan', loanSchema);
const Payment = mongoose.model('Payment', paymentSchema);

async function checkPaymentData() {
    try {
        console.log('=== PAYMENT IMPORT SUMMARY ===\n');
        
        // Count imported payments
        const importedPayments = await Payment.countDocuments({ isFromImport: true });
        const totalPayments = await Payment.countDocuments();
        console.log(`Imported Payments: ${importedPayments} out of ${totalPayments} total payments`);
        
        // Count imported borrowers
        const importedBorrowers = await Borrower.countDocuments({ isFromPaymentImport: true });
        const totalBorrowers = await Borrower.countDocuments();
        console.log(`Imported Borrowers: ${importedBorrowers} out of ${totalBorrowers} total borrowers`);
        
        // Count loans from payment import
        const importedLoans = await Loan.countDocuments({ source: 'payment_import' });
        const totalLoans = await Loan.countDocuments();
        console.log(`Imported Loans: ${importedLoans} out of ${totalLoans} total loans`);
        
        console.log('\n=== SAMPLE IMPORTED DATA ===\n');
        
        // Show sample imported borrowers
        const sampleBorrowers = await Borrower.find({ isFromPaymentImport: true }).limit(5);
        console.log('Sample Imported Borrowers:');
        sampleBorrowers.forEach((borrower, index) => {
            console.log(`${index + 1}. ${borrower.fullName} - ${borrower.phone}`);
        });
        
        console.log('\n=== PAYMENT TOTALS BY BORROWER ===\n');
        
        // Aggregate payment totals for imported borrowers
        const paymentTotals = await Payment.aggregate([
            { $match: { isFromImport: true } },
            { $lookup: { from: 'loans', localField: 'loan', foreignField: '_id', as: 'loanData' } },
            { $unwind: '$loanData' },
            { $lookup: { from: 'borrowers', localField: 'loanData.borrower', foreignField: '_id', as: 'borrowerData' } },
            { $unwind: '$borrowerData' },
            { 
                $group: { 
                    _id: '$borrowerData._id',
                    borrowerName: { $first: '$borrowerData.fullName' },
                    borrowerPhone: { $first: '$borrowerData.phone' },
                    totalPayments: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            },
            { $sort: { totalPayments: -1 } },
            { $limit: 10 }
        ]);
        
        console.log('Top 10 Borrowers by Payment Amount:');
        paymentTotals.forEach((borrower, index) => {
            console.log(`${index + 1}. ${borrower.borrowerName} (${borrower.borrowerPhone}) - $${borrower.totalPayments} (${borrower.paymentCount} payments)`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error checking payment data:', error);
        process.exit(1);
    }
}

// Wait for connection then run check
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    checkPaymentData();
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});
