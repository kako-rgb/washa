const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: Number,
  transactionId: String,
  depositDetails: String
});

const loanSchema = new mongoose.Schema({
  name: String,
  phone: String,
  passportPhoto: String,
  idPhotoFront: String,
  idPhotoBack: String,
  refereeName: String,
  principal: Number,
  interest: Number,
  totalDue: Number,
  payments: [paymentSchema],
  createdAt: { type: Date, default: Date.now },
  // Calculate expiry date as 4 weeks from creation date
  expiryDate: {
    type: Date,
    default: function() {
      const date = new Date(this.createdAt || Date.now());
      date.setDate(date.getDate() + 28); // 4 weeks = 28 days
      return date;
    }
  },
  // Additional fields for past data
  email: String,
  address: String,
  occupation: String,
  employerName: String,
  loanPurpose: String,
  status: { type: String, default: 'active', enum: ['active', 'completed', 'defaulted'] },
  isDefaulter: {
    type: Boolean,
    default: false
  },
  // Tag for new accounts created from DOCX import
  isNewFromDocx: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Loan', loanSchema);