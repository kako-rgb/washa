// Payment Integration Module
// This module handles the integration between loans and payments

let paymentsData = [];
let loansData = [];

// Load payments data
async function loadPaymentsData() {
    try {
        const response = await fetch('/data/payments/payment.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        paymentsData = await response.json();
        console.log('Payments data loaded:', paymentsData.length, 'customers');
        return paymentsData;
    } catch (error) {
        console.error('Error loading payments data:', error);
        paymentsData = [];
        return [];
    }
}

// Normalize phone number for comparison
function normalizePhoneNumber(phone) {
    if (!phone) return '';
    
    // Convert to string and remove all non-digit characters
    let normalized = phone.toString().replace(/\D/g, '');
    
    // Handle different formats
    if (normalized.startsWith('254')) {
        // Already in international format
        return normalized;
    } else if (normalized.startsWith('0')) {
        // Remove leading 0 and add 254
        return '254' + normalized.substring(1);
    } else if (normalized.length === 9) {
        // Add 254 prefix
        return '254' + normalized;
    }
    
    return normalized;
}

// Find payment data for a loan based on phone number
function findPaymentDataForLoan(loan) {
    const loanPhone = normalizePhoneNumber(
        loan.borrowerPhone || 
        (loan.borrower ? loan.borrower.phone : '') || 
        loan.phone || 
        ''
    );
    
    if (!loanPhone) return null;
    
    return paymentsData.find(payment => {
        const paymentPhone = normalizePhoneNumber(payment.phone_number);
        return paymentPhone === loanPhone;
    });
}

// Calculate loan status based on payments
function calculateLoanStatus(loan, paymentData) {
    if (!paymentData) {
        // No payments found - check if loan is overdue
        const currentDate = new Date();
        const loanEndDate = loan.endDate ? new Date(loan.endDate) : null;
        
        if (loanEndDate && currentDate > loanEndDate) {
            return 'defaulted';
        }
        return loan.status || 'pending';
    }
    
    const loanAmount = parseFloat(loan.amount || 0);
    const totalPaid = parseFloat(paymentData.total_amount || 0);
    const paymentPercentage = loanAmount > 0 ? (totalPaid / loanAmount) * 100 : 0;
    
    // Check if loan is overdue
    const currentDate = new Date();
    const loanEndDate = loan.endDate ? new Date(loan.endDate) : null;
    const isOverdue = loanEndDate && currentDate > loanEndDate;
    
    if (paymentPercentage >= 100) {
        return 'completed';
    } else if (paymentPercentage >= 1 && !isOverdue) {
        return 'paying';
    } else if (isOverdue && paymentPercentage < 100) {
        return 'defaulted';
    } else {
        return loan.status || 'pending';
    }
}

// Update loan with payment information
function updateLoanWithPaymentInfo(loan) {
    const paymentData = findPaymentDataForLoan(loan);
    
    if (paymentData) {
        // Update borrower name to match payment name
        const paymentName = paymentData.full_name;
        if (paymentName && paymentName.trim()) {
            loan.borrowerName = paymentName;
            if (loan.borrower) {
                loan.borrower.fullName = paymentName;
            }
            loan.fullName = paymentName;
        }
        
        // Calculate and update status
        const newStatus = calculateLoanStatus(loan, paymentData);
        loan.status = newStatus;
        
        // Add payment summary to loan
        loan.paymentSummary = {
            totalPaid: paymentData.total_amount || 0,
            transactionCount: paymentData.transaction_count || 0,
            paymentPercentage: loan.amount > 0 ? ((paymentData.total_amount || 0) / loan.amount) * 100 : 0,
            remainingAmount: Math.max(0, (loan.amount || 0) - (paymentData.total_amount || 0)),
            transactions: paymentData.transactions || []
        };
    } else {
        // No payment data found - check if overdue
        const newStatus = calculateLoanStatus(loan, null);
        loan.status = newStatus;
        
        loan.paymentSummary = {
            totalPaid: 0,
            transactionCount: 0,
            paymentPercentage: 0,
            remainingAmount: loan.amount || 0,
            transactions: []
        };
    }
    
    return loan;
}

// Process all loans with payment integration
function processLoansWithPayments(loans) {
    if (!Array.isArray(loans)) return loans;
    
    return loans.map(loan => updateLoanWithPaymentInfo(loan));
}

// Get payment history for a specific loan
function getPaymentHistoryForLoan(loan) {
    const paymentData = findPaymentDataForLoan(loan);
    
    if (!paymentData) {
        return {
            borrowerName: loan.borrowerName || loan.fullName || 'Unknown',
            phone: loan.borrowerPhone || loan.phone || 'N/A',
            totalPaid: 0,
            transactionCount: 0,
            transactions: []
        };
    }
    
    return {
        borrowerName: paymentData.full_name,
        phone: paymentData.phone_number,
        totalPaid: paymentData.total_amount || 0,
        transactionCount: paymentData.transaction_count || 0,
        transactions: paymentData.transactions || []
    };
}

// Format currency
function formatCurrency(amount) {
    return `KSh ${parseFloat(amount || 0).toLocaleString()}`;
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return 'N/A';
    
    const normalized = normalizePhoneNumber(phone);
    if (normalized.startsWith('254')) {
        return `+${normalized}`;
    }
    return phone;
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusClasses = {
        'completed': 'status-completed',
        'paying': 'status-paying',
        'defaulted': 'status-defaulted',
        'pending': 'status-pending',
        'approved': 'status-approved',
        'rejected': 'status-rejected',
        'disbursed': 'status-disbursed'
    };
    
    const statusLabels = {
        'completed': 'Completed',
        'paying': 'Paying',
        'defaulted': 'Defaulted',
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'disbursed': 'Disbursed'
    };
    
    const className = statusClasses[status] || 'status-pending';
    const label = statusLabels[status] || status || 'Pending';
    
    return `<span class="status-badge ${className}">${label}</span>`;
}

// Initialize payment integration
async function initializePaymentIntegration() {
    console.log('Initializing payment integration...');
    await loadPaymentsData();
    console.log('Payment integration initialized');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPaymentsData,
        findPaymentDataForLoan,
        calculateLoanStatus,
        updateLoanWithPaymentInfo,
        processLoansWithPayments,
        getPaymentHistoryForLoan,
        formatCurrency,
        formatPhoneNumber,
        getStatusBadge,
        initializePaymentIntegration
    };
}