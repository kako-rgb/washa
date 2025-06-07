// Payment Processor Module for JSON Payment Data
// This module processes payments from the payment.json file and updates the database

class PaymentProcessor {
    constructor() {
        this.processedPayments = [];
        this.newUsers = [];
        this.matchedUsers = [];
        this.errors = [];
        this.API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
    }

    // Main function to process all payments from JSON file
    async processPaymentsFromJSON() {
        try {
            // Show loading notification
            app.showNotification('Starting payment processing...', 'info');
            
            // Load payment data from JSON file
            const paymentData = await this.loadPaymentData();
            
            if (!paymentData || paymentData.length === 0) {
                throw new Error('No payment data found in payment.json file');
            }

            // Process each user's payments
            for (const userPayments of paymentData) {
                await this.processUserPayments(userPayments);
            }

            // Show results
            this.showProcessingResults();
            
            // Refresh the payments table
            if (typeof loadPayments === 'function') {
                loadPayments();
            }

        } catch (error) {
            console.error('Error processing payments:', error);
            app.showNotification(`Error processing payments: ${error.message}`, 'error');
        }
    }

    // Load payment data from JSON file
    async loadPaymentData() {
        try {
            const response = await fetch('/data/payments/payment.json');
            if (!response.ok) {
                throw new Error('Failed to load payment data');
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading payment data:', error);
            throw error;
        }
    }

    // Process payments for a single user
    async processUserPayments(userPayments) {
        try {
            const { phone_number, full_name, total_amount, transactions } = userPayments;
            
            // Find or create borrower
            const borrower = await this.findOrCreateBorrower(phone_number, full_name);
            
            // Find or create loan for this borrower
            const loan = await this.findOrCreateLoan(borrower, total_amount);
            
            // Process each transaction
            for (const transaction of transactions) {
                await this.processTransaction(loan, borrower, transaction);
            }

            // Update loan balance
            await this.updateLoanBalance(loan._id, total_amount);

        } catch (error) {
            console.error(`Error processing payments for ${full_name}:`, error);
            this.errors.push({
                user: full_name,
                phone: phone_number,
                error: error.message
            });
        }
    }

    // Find existing borrower or create new one
    async findOrCreateBorrower(phoneNumber, fullName) {
        try {
            // First try to find by phone number
            let borrower = await this.findBorrowerByPhone(phoneNumber);
            
            if (!borrower) {
                // Try to find by name
                borrower = await this.findBorrowerByName(fullName);
            }

            if (!borrower) {
                // Create new borrower
                borrower = await this.createNewBorrower(phoneNumber, fullName);
                this.newUsers.push({
                    id: borrower._id,
                    name: fullName,
                    phone: phoneNumber,
                    isNew: true
                });
            } else {
                this.matchedUsers.push({
                    id: borrower._id,
                    name: fullName,
                    phone: phoneNumber,
                    isNew: false
                });
            }

            return borrower;
        } catch (error) {
            console.error('Error finding/creating borrower:', error);
            throw error;
        }
    }

    // Find borrower by phone number
    async findBorrowerByPhone(phoneNumber) {
        try {
            const response = await fetch(`${this.API_URL}/borrowers/search?phone=${phoneNumber}`, {
                method: 'GET',
                headers: auth.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.borrowers && data.borrowers.length > 0 ? data.borrowers[0] : null;
            }
            return null;
        } catch (error) {
            console.error('Error finding borrower by phone:', error);
            return null;
        }
    }

    // Find borrower by name
    async findBorrowerByName(fullName) {
        try {
            const response = await fetch(`${this.API_URL}/borrowers/search?name=${encodeURIComponent(fullName)}`, {
                method: 'GET',
                headers: auth.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.borrowers && data.borrowers.length > 0 ? data.borrowers[0] : null;
            }
            return null;
        } catch (error) {
            console.error('Error finding borrower by name:', error);
            return null;
        }
    }

    // Create new borrower
    async createNewBorrower(phoneNumber, fullName) {
        try {
            const borrowerData = {
                fullName: fullName,
                phone: phoneNumber.toString(),
                email: '', // Will be updated later if needed
                address: '',
                idNumber: '',
                employmentStatus: 'Unknown',
                monthlyIncome: 0,
                isFromPaymentImport: true, // Flag to identify imported users
                importDate: new Date().toISOString()
            };

            const response = await fetch(`${this.API_URL}/borrowers`, {
                method: 'POST',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(borrowerData)
            });

            if (!response.ok) {
                throw new Error('Failed to create borrower');
            }

            const data = await response.json();
            return data.borrower;
        } catch (error) {
            console.error('Error creating borrower:', error);
            throw error;
        }
    }

    // Find or create loan for borrower
    async findOrCreateLoan(borrower, totalAmount) {
        try {
            // First try to find existing active loan
            let loan = await this.findActiveLoan(borrower._id);

            if (!loan) {
                // Create new loan
                loan = await this.createNewLoan(borrower, totalAmount);
            }

            return loan;
        } catch (error) {
            console.error('Error finding/creating loan:', error);
            throw error;
        }
    }

    // Find active loan for borrower
    async findActiveLoan(borrowerId) {
        try {
            const response = await fetch(`${this.API_URL}/loans?borrowerId=${borrowerId}&status=active`, {
                method: 'GET',
                headers: auth.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.loans && data.loans.length > 0 ? data.loans[0] : null;
            }
            return null;
        } catch (error) {
            console.error('Error finding active loan:', error);
            return null;
        }
    }

    // Create new loan
    async createNewLoan(borrower, totalAmount) {
        try {
            const loanData = {
                borrower: borrower._id,
                amount: totalAmount * 2, // Assume the payment is partial, so loan amount is higher
                interestRate: 10, // Default interest rate
                term: 30, // Default term in days
                purpose: 'Payment Import - Original loan amount estimated',
                status: 'active',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                source: 'payment_import',
                notes: 'Loan created from payment import. Original loan details unknown.'
            };

            const response = await fetch(`${this.API_URL}/loans`, {
                method: 'POST',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loanData)
            });

            if (!response.ok) {
                throw new Error('Failed to create loan');
            }

            const data = await response.json();
            return data.loan;
        } catch (error) {
            console.error('Error creating loan:', error);
            throw error;
        }
    }

    // Process individual transaction
    async processTransaction(loan, borrower, transaction) {
        try {
            const paymentData = {
                loan: loan._id,
                amount: transaction.amount,
                paymentDate: transaction.date || new Date().toISOString(),
                method: 'mobile_money', // Default method for imported payments
                status: 'completed',
                notes: `Imported payment - Transaction ID: ${transaction.transaction_id}`,
                receiptNumber: transaction.transaction_id,
                isFromImport: true,
                importDate: new Date().toISOString()
            };

            const response = await fetch(`${this.API_URL}/payments`, {
                method: 'POST',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                throw new Error('Failed to create payment record');
            }

            const data = await response.json();
            this.processedPayments.push({
                transactionId: transaction.transaction_id,
                borrower: borrower.fullName,
                amount: transaction.amount,
                paymentId: data.payment._id
            });

        } catch (error) {
            console.error('Error processing transaction:', error);
            throw error;
        }
    }

    // Update loan balance by reducing the owed amount
    async updateLoanBalance(loanId, paidAmount) {
        try {
            const response = await fetch(`${this.API_URL}/loans/${loanId}/reduce-balance`, {
                method: 'PATCH',
                headers: {
                    ...auth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    paidAmount: paidAmount,
                    source: 'payment_import'
                })
            });

            if (!response.ok) {
                console.warn('Failed to update loan balance - this may need manual adjustment');
            }
        } catch (error) {
            console.error('Error updating loan balance:', error);
        }
    }

    // Show processing results
    showProcessingResults() {
        const totalProcessed = this.processedPayments.length;
        const newUsersCount = this.newUsers.length;
        const matchedUsersCount = this.matchedUsers.length;
        const errorsCount = this.errors.length;

        // Create results modal
        this.createResultsModal(totalProcessed, newUsersCount, matchedUsersCount, errorsCount);
        
        // Show summary notification
        app.showNotification(
            `Payment processing completed! Processed: ${totalProcessed}, New users: ${newUsersCount}, Errors: ${errorsCount}`,
            errorsCount > 0 ? 'warning' : 'success'
        );
    }

    // Create results modal
    createResultsModal(totalProcessed, newUsersCount, matchedUsersCount, errorsCount) {
        // Remove existing modal if any
        const existingModal = document.getElementById('payment-results-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'payment-results-modal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Payment Processing Results</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="results-summary">
                        <div class="result-item">
                            <span class="result-label">Total Payments Processed:</span>
                            <span class="result-value">${totalProcessed}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">New Users Created:</span>
                            <span class="result-value highlight-new">${newUsersCount}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Existing Users Matched:</span>
                            <span class="result-value">${matchedUsersCount}</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Errors:</span>
                            <span class="result-value ${errorsCount > 0 ? 'highlight-error' : ''}">${errorsCount}</span>
                        </div>
                    </div>

                    ${newUsersCount > 0 ? `
                        <div class="new-users-section">
                            <h4>New Users Created (marked for review):</h4>
                            <div class="users-list">
                                ${this.newUsers.map(user => `
                                    <div class="user-item new-user">
                                        <span class="user-name">${user.name}</span>
                                        <span class="user-phone">${user.phone}</span>
                                        <span class="new-badge">NEW</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${errorsCount > 0 ? `
                        <div class="errors-section">
                            <h4>Errors Encountered:</h4>
                            <div class="errors-list">
                                ${this.errors.map(error => `
                                    <div class="error-item">
                                        <span class="error-user">${error.user} (${error.phone})</span>
                                        <span class="error-message">${error.error}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                    <button class="btn btn-secondary" onclick="window.location.href='user-management.html'">View Users</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles for the results modal
        this.addResultsModalStyles();
    }

    // Add CSS styles for results modal
    addResultsModalStyles() {
        if (document.getElementById('payment-results-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'payment-results-styles';
        styles.textContent = `
            .results-summary {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            
            .result-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 5px 0;
                border-bottom: 1px solid #e9ecef;
            }
            
            .result-label {
                font-weight: 500;
            }
            
            .result-value {
                font-weight: bold;
            }
            
            .highlight-new {
                color: #28a745;
                background: #d4edda;
                padding: 2px 8px;
                border-radius: 3px;
            }
            
            .highlight-error {
                color: #dc3545;
                background: #f8d7da;
                padding: 2px 8px;
                border-radius: 3px;
            }
            
            .new-users-section, .errors-section {
                margin-top: 20px;
                padding: 15px;
                border: 1px solid #dee2e6;
                border-radius: 5px;
            }
            
            .new-users-section h4, .errors-section h4 {
                margin-bottom: 15px;
                color: #495057;
            }
            
            .user-item, .error-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin-bottom: 8px;
                background: #fff;
                border: 1px solid #e9ecef;
                border-radius: 4px;
            }
            
            .new-user {
                border-left: 4px solid #28a745;
            }
            
            .new-badge {
                background: #28a745;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .error-item {
                border-left: 4px solid #dc3545;
                flex-direction: column;
                align-items: flex-start;
            }
            
            .error-message {
                color: #dc3545;
                font-size: 14px;
                margin-top: 5px;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Get processing statistics
    getProcessingStats() {
        return {
            totalProcessed: this.processedPayments.length,
            newUsers: this.newUsers.length,
            matchedUsers: this.matchedUsers.length,
            errors: this.errors.length,
            newUsersList: this.newUsers,
            errorsList: this.errors
        };
    }
}

// Create global instance
window.paymentProcessor = new PaymentProcessor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentProcessor;
}