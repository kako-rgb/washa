// Payment Processing Module

// Global variables
let payments = [];
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let statusFilter = '';
let selectedLoanId = null;
let selectedPaymentNumber = null;

// Initialize payment processing when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('payment-processing.html')) {
        initializePaymentProcessing();
    }
});

// Initialize payment processing page
function initializePaymentProcessing() {
    setupPaymentEventListeners();
    
    // Check if specific loan payment was requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('loanId') && urlParams.has('paymentNumber')) {
        selectedLoanId = urlParams.get('loanId');
        selectedPaymentNumber = urlParams.get('paymentNumber');
        
        // Open payment modal for the selected loan payment
        loadSpecificPayment(selectedLoanId, selectedPaymentNumber);
    } else {
        // Load all payments
        loadPayments();
    }
}

// Setup event listeners for payment processing
function setupPaymentEventListeners() {
    // Record payment button
    const recordPaymentBtn = document.getElementById('record-payment-btn');
    if (recordPaymentBtn) {
        recordPaymentBtn.addEventListener('click', () => {
            openPaymentModal();
        });
    }
    
    // Payment form submission
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            savePayment();
        });
    }
    
    // Cancel payment form
    const cancelPaymentForm = document.getElementById('cancel-payment-form');
    if (cancelPaymentForm) {
        cancelPaymentForm.addEventListener('click', () => {
            closePaymentModal();
        });
    }
    
    // Close payment modal
    const closeModal = document.getElementById('close-payment-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            closePaymentModal();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('payment-search');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchInput && searchBtn) {
        // Real-time search as user types
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            // Clear previous timeout to avoid excessive API calls
            clearTimeout(searchTimeout);
            
            // Add visual feedback that search is active
            searchInput.classList.add('searching');
            
            // Set a small delay to wait for user to finish typing
            searchTimeout = setTimeout(() => {
                searchTerm = searchInput.value.trim();
                currentPage = 1;
                loadPayments();
                
                // Remove searching class after search completes
                setTimeout(() => {
                    searchInput.classList.remove('searching');
                }, 100);
            }, 300); // 300ms delay
        });
        
        // Keep existing search button functionality
        searchBtn.addEventListener('click', () => {
            searchTerm = searchInput.value.trim();
            currentPage = 1;
            loadPayments();
        });
        
        // Keep existing Enter key functionality
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // Clear timeout and search immediately
                clearTimeout(searchTimeout);
                searchTerm = searchInput.value.trim();
                currentPage = 1;
                loadPayments();
            }
        });
    }
    
    // Status filter
    const statusFilterSelect = document.getElementById('status-filter');
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener('change', () => {
            statusFilter = statusFilterSelect.value;
            currentPage = 1;
            loadPayments();
        });
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadPayments();
            }
        });
        
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadPayments();
            }
        });
    }
    
    // CSV import
    const importCsvBtn = document.getElementById('import-csv-btn');
    const csvFileInput = document.getElementById('csv-file');
    
    if (importCsvBtn && csvFileInput) {
        importCsvBtn.addEventListener('click', () => {
            csvFileInput.click();
        });
        
        csvFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importPaymentsFromCsv(e.target.files[0]);
            }
        });
    }
    
    // JSON payment processing
    const processJsonPaymentsBtn = document.getElementById('process-json-payments-btn');
    if (processJsonPaymentsBtn) {
        processJsonPaymentsBtn.addEventListener('click', () => {
            processJsonPayments();
        });
    }
}

// Load payments from API
function loadPayments() {
    const paymentsTable = document.getElementById('recent-payments-table');
    if (!paymentsTable) {
        console.error('Payments table not found');
        return;
    }
    
    const tableBody = paymentsTable.querySelector('tbody');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="8" class="loading-message">Loading payments...</td></tr>';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', currentPage);
    queryParams.append('limit', 10);
    
    if (searchTerm) {
        queryParams.append('search', searchTerm);
    }
    
    if (statusFilter) {
        queryParams.append('status', statusFilter);
    }
    
    // Fetch payments from API
    fetch(`${API_URL}/payments?${queryParams.toString()}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load payments');
        }
        return response.json();
    })
    .then(data => {
        payments = data.payments || data.items || [];
        totalPages = data.totalPages || 1;
        
        // Update pagination
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        // Render payments
        renderPayments(tableBody);
    })
    .catch(error => {
        console.error('Error loading payments:', error);
        tableBody.innerHTML = `<tr><td colspan="8" class="error-message">Error loading payments: ${error.message}</td></tr>`;
        
        // For development/demo purposes, load mock data
        loadMockPayments();
    });
}

// Load specific payment for processing
function loadSpecificPayment(loanId, paymentNumber) {
    // Fetch payment details from API
    fetch(`${API_URL}/loans/${loanId}/payments/${paymentNumber}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load payment details');
        }
        return response.json();
    })
    .then(data => {
        const payment = data.payment;
        openPaymentModal(payment);
    })
    .catch(error => {
        console.error('Error loading payment details:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes, create mock payment
        const mockPayment = {
            loanId: loanId,
            paymentNumber: parseInt(paymentNumber),
            borrower: {
                id: '3',
                name: 'Michael Johnson'
            },
            dueDate: '2025-06-05',
            amountDue: 458.33,
            principal: 416.67,
            interest: 41.67,
            status: 'pending'
        };
        
        openPaymentModal(mockPayment);
    });
}

// Load mock payments for development/demo
function loadMockPayments() {
    payments = [
        {
            id: '1',
            loanId: '1',
            paymentNumber: 1,
            borrower: {
                id: '3',
                name: 'Michael Johnson'
            },
            paymentDate: '2025-06-01',
            dueDate: '2025-06-05',
            amountPaid: 458.33,
            amountDue: 458.33,
            method: 'bank_transfer',
            status: 'paid'
        },
        {
            id: '2',
            loanId: '2',
            paymentNumber: 1,
            borrower: {
                id: '4',
                name: 'Sarah Williams'
            },
            paymentDate: null,
            dueDate: '2025-06-15',
            amountPaid: 0,
            amountDue: 346.67,
            method: null,
            status: 'pending'
        },
        {
            id: '3',
            loanId: '1',
            paymentNumber: 2,
            borrower: {
                id: '3',
                name: 'Michael Johnson'
            },
            paymentDate: null,
            dueDate: '2025-07-05',
            amountPaid: 0,
            amountDue: 458.33,
            method: null,
            status: 'pending'
        }
    ];
    
    totalPages = 1;
    
    // Update pagination
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Render payments
    const paymentsTable = document.getElementById('recent-payments-table');
    if (paymentsTable) {
        const tableBody = paymentsTable.querySelector('tbody');
        if (tableBody) {
            renderPayments(tableBody);
        }
    }
}

// Render payments in table
function renderPayments(tableBody) {
    if (payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-message">No payments found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    payments.forEach(payment => {
        const tr = document.createElement('tr');
        
        // Format method for display
        let methodDisplay = '-';
        if (payment.method) {
            switch(payment.method) {
                case 'bank_transfer':
                    methodDisplay = 'Bank Transfer';
                    break;
                case 'mobile_money':
                    methodDisplay = 'Mobile Money';
                    break;
                case 'cash':
                    methodDisplay = 'Cash';
                    break;
                case 'check':
                    methodDisplay = 'Check';
                    break;
            }
        }
        
        tr.innerHTML = `
            <td>${payment.id || '-'}</td>
            <td>${payment.loanId}</td>
            <td>${payment.borrower.name}</td>
            <td>${payment.paymentNumber}</td>
            <td>${app.formatDate(payment.dueDate)}</td>
            <td>${app.formatCurrency(payment.amountDue)}</td>
            <td>${payment.paymentDate ? app.formatDate(payment.paymentDate) : '-'}</td>
            <td>${payment.amountPaid ? app.formatCurrency(payment.amountPaid) : '-'}</td>
            <td>${methodDisplay}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add action buttons
        const actionsCell = tr.querySelector('.actions-cell');
        let actions = [
            {
                type: 'view',
                icon: 'eye',
                label: 'View Payment Details',
                handler: () => viewPaymentDetails(payment.id || `${payment.loanId}-${payment.paymentNumber}`)
            }
        ];
        
        if (payment.status === 'pending' && (auth.isAdmin() || auth.isLoanOfficer())) {
            actions.push({
                type: 'edit',
                icon: 'money-bill',
                label: 'Record Payment',
                handler: () => openPaymentModal(payment)
            });
        }
        
        if (payment.status === 'paid' && (auth.isAdmin() || auth.isLoanOfficer())) {
            actions.push({
                type: 'edit',
                icon: 'print',
                label: 'Print Receipt',
                handler: () => printPaymentReceipt(payment.id || `${payment.loanId}-${payment.paymentNumber}`)
            });
        }
        
        const actionButtons = createActionButtons(actions);
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Open payment modal
function openPaymentModal(payment = null) {
    const modal = document.getElementById('payment-modal');
    const modalTitle = document.getElementById('payment-modal-title');
    const paymentForm = document.getElementById('payment-form');
    const paymentIdInput = document.getElementById('payment-id');
    const loanIdInput = document.getElementById('loan-id');
    const paymentNumberInput = document.getElementById('payment-number');
    const borrowerNameInput = document.getElementById('borrower-name');
    const dueDateInput = document.getElementById('due-date');
    const amountDueInput = document.getElementById('amount-due');
    
    // Reset form
    paymentForm.reset();
    
    if (payment) {
        // Record existing payment
        modalTitle.textContent = 'Record Payment';
        paymentIdInput.value = payment.id || '';
        loanIdInput.value = payment.loanId;
        paymentNumberInput.value = payment.paymentNumber;
        borrowerNameInput.value = payment.borrower.name;
        dueDateInput.value = payment.dueDate;
        amountDueInput.value = payment.amountDue;
        
        // Set default payment date to today
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
        
        // Set default amount paid to amount due
        document.getElementById('amount-paid').value = payment.amountDue;
    } else {
        // New payment (manual entry)
        modalTitle.textContent = 'Record New Payment';
        paymentIdInput.value = '';
        loanIdInput.value = '';
        paymentNumberInput.value = '';
        borrowerNameInput.value = '';
        dueDateInput.value = '';
        amountDueInput.value = '';
        
        // Set default payment date to today
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
        
        // Enable loan selection fields
        loanIdInput.disabled = false;
        paymentNumberInput.disabled = false;
        
        // Populate loan dropdown
        populateLoanDropdown();
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('active');
    
    // If we were directed here from loan management, go back
    if (selectedLoanId && selectedPaymentNumber) {
        window.location.href = 'loan-management.html';
    }
}

// Populate loan dropdown
function populateLoanDropdown() {
    const loanIdInput = document.getElementById('loan-id');
    
    // Fetch active loans from API
    fetch(`${API_URL}/loans?status=active`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load loans');
        }
        return response.json();
    })
    .then(data => {
        const loans = data.loans || [];
        
        // Create datalist for loan IDs
        const datalist = document.createElement('datalist');
        datalist.id = 'loan-list';
        
        loans.forEach(loan => {
            const option = document.createElement('option');
            option.value = loan.id;
            option.textContent = `${loan.id} - ${loan.borrower.name}`;
            datalist.appendChild(option);
        });
        
        // Add datalist to document
        document.body.appendChild(datalist);
        
        // Connect input to datalist
        loanIdInput.setAttribute('list', 'loan-list');
        
        // Add event listener to load payment details when loan is selected
        loanIdInput.addEventListener('change', () => {
            const selectedLoanId = loanIdInput.value;
            if (selectedLoanId) {
                loadLoanPaymentDetails(selectedLoanId);
            }
        });
    })
    .catch(error => {
        console.error('Error loading loans:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes, add mock loans
        const datalist = document.createElement('datalist');
        datalist.id = 'loan-list';
        
        const mockLoans = [
            { id: '1', borrower: { name: 'Michael Johnson' } },
            { id: '2', borrower: { name: 'Sarah Williams' } }
        ];
        
        mockLoans.forEach(loan => {
            const option = document.createElement('option');
            option.value = loan.id;
            option.textContent = `${loan.id} - ${loan.borrower.name}`;
            datalist.appendChild(option);
        });
        
        // Add datalist to document
        document.body.appendChild(datalist);
        
        // Connect input to datalist
        loanIdInput.setAttribute('list', 'loan-list');
        
        // Add event listener to load payment details when loan is selected
        loanIdInput.addEventListener('change', () => {
            const selectedLoanId = loanIdInput.value;
            if (selectedLoanId) {
                loadLoanPaymentDetails(selectedLoanId);
            }
        });
    });
}

// Load loan payment details
function loadLoanPaymentDetails(loanId) {
    const paymentNumberInput = document.getElementById('payment-number');
    
    // Fetch loan details from API
    fetch(`${API_URL}/loans/${loanId}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load loan details');
        }
        return response.json();
    })
    .then(data => {
        const loan = data.loan;
        
        // Set borrower name
        document.getElementById('borrower-name').value = loan.borrower.name;
        
        // Fetch payment schedule
        return fetch(`${API_URL}/loans/${loanId}/payments?status=pending`, {
            method: 'GET',
            headers: auth.getAuthHeaders()
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load payment schedule');
        }
        return response.json();
    })
    .then(data => {
        const pendingPayments = data.payments || [];
        
        // Create datalist for payment numbers
        const datalist = document.createElement('datalist');
        datalist.id = 'payment-list';
        
        pendingPayments.forEach(payment => {
            const option = document.createElement('option');
            option.value = payment.paymentNumber;
            option.textContent = `${payment.paymentNumber} - Due: ${app.formatDate(payment.dueDate)}`;
            datalist.appendChild(option);
        });
        
        // Add datalist to document
        document.body.appendChild(datalist);
        
        // Connect input to datalist
        paymentNumberInput.setAttribute('list', 'payment-list');
        
        // Add event listener to load payment details when payment is selected
        paymentNumberInput.addEventListener('change', () => {
            const selectedPaymentNumber = paymentNumberInput.value;
            if (selectedPaymentNumber) {
                const payment = pendingPayments.find(p => p.paymentNumber.toString() === selectedPaymentNumber);
                if (payment) {
                    document.getElementById('due-date').value = payment.dueDate;
                    document.getElementById('amount-due').value = payment.amountDue;
                    document.getElementById('amount-paid').value = payment.amountDue;
                }
            }
        });
    })
    .catch(error => {
        console.error('Error loading loan payment details:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        if (loanId === '1') {
            document.getElementById('borrower-name').value = 'Michael Johnson';
            
            // Create datalist for payment numbers
            const datalist = document.createElement('datalist');
            datalist.id = 'payment-list';
            
            const mockPayments = [
                { paymentNumber: 2, dueDate: '2025-07-05', amountDue: 458.33 },
                { paymentNumber: 3, dueDate: '2025-08-05', amountDue: 458.33 }
            ];
            
            mockPayments.forEach(payment => {
                const option = document.createElement('option');
                option.value = payment.paymentNumber;
                option.textContent = `${payment.paymentNumber} - Due: ${app.formatDate(payment.dueDate)}`;
                datalist.appendChild(option);
            });
            
            // Add datalist to document
            document.body.appendChild(datalist);
            
            // Connect input to datalist
            paymentNumberInput.setAttribute('list', 'payment-list');
            
            // Add event listener to load payment details when payment is selected
            paymentNumberInput.addEventListener('change', () => {
                const selectedPaymentNumber = paymentNumberInput.value;
                if (selectedPaymentNumber) {
                    const payment = mockPayments.find(p => p.paymentNumber.toString() === selectedPaymentNumber);
                    if (payment) {
                        document.getElementById('due-date').value = payment.dueDate;
                        document.getElementById('amount-due').value = payment.amountDue;
                        document.getElementById('amount-paid').value = payment.amountDue;
                    }
                }
            });
        } else if (loanId === '2') {
            document.getElementById('borrower-name').value = 'Sarah Williams';
            
            // Create datalist for payment numbers
            const datalist = document.createElement('datalist');
            datalist.id = 'payment-list';
            
            const mockPayments = [
                { paymentNumber: 1, dueDate: '2025-06-15', amountDue: 346.67 },
                { paymentNumber: 2, dueDate: '2025-07-15', amountDue: 346.67 }
            ];
            
            mockPayments.forEach(payment => {
                const option = document.createElement('option');
                option.value = payment.paymentNumber;
                option.textContent = `${payment.paymentNumber} - Due: ${app.formatDate(payment.dueDate)}`;
                datalist.appendChild(option);
            });
            
            // Add datalist to document
            document.body.appendChild(datalist);
            
            // Connect input to datalist
            paymentNumberInput.setAttribute('list', 'payment-list');
            
            // Add event listener to load payment details when payment is selected
            paymentNumberInput.addEventListener('change', () => {
                const selectedPaymentNumber = paymentNumberInput.value;
                if (selectedPaymentNumber) {
                    const payment = mockPayments.find(p => p.paymentNumber.toString() === selectedPaymentNumber);
                    if (payment) {
                        document.getElementById('due-date').value = payment.dueDate;
                        document.getElementById('amount-due').value = payment.amountDue;
                        document.getElementById('amount-paid').value = payment.amountDue;
                    }
                }
            });
        }
    });
}

// Save payment
function savePayment() {
    // Get form data
    const paymentData = {
        loanId: document.getElementById('loan-id').value,
        paymentNumber: parseInt(document.getElementById('payment-number').value),
        paymentDate: document.getElementById('payment-date').value,
        amountPaid: parseFloat(document.getElementById('amount-paid').value),
        method: document.getElementById('payment-method').value,
        notes: document.getElementById('payment-notes').value
    };
    
    // Validate form data
    if (!paymentData.loanId || !paymentData.paymentNumber || !paymentData.paymentDate || !paymentData.amountPaid || !paymentData.method) {
        app.showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Send request to API
    fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify(paymentData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save payment');
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification('Payment recorded successfully', 'success');
        
        // Close modal and reload payments
        closePaymentModal();
        loadPayments();
    })
    .catch(error => {
        console.error('Error saving payment:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        const newPayment = {
            id: (Math.max(...payments.map(p => parseInt(p.id || '0'))) + 1).toString(),
            loanId: paymentData.loanId,
            paymentNumber: paymentData.paymentNumber,
            borrower: {
                id: '3',
                name: document.getElementById('borrower-name').value
            },
            paymentDate: paymentData.paymentDate,
            dueDate: document.getElementById('due-date').value,
            amountPaid: paymentData.amountPaid,
            amountDue: parseFloat(document.getElementById('amount-due').value),
            method: paymentData.method,
            status: 'paid'
        };
        
        payments.push(newPayment);
        
        // Close modal and reload payments
        closePaymentModal();
        const paymentsTable = document.getElementById('payments-table');
        const tableBody = paymentsTable.querySelector('tbody');
        renderPayments(tableBody);
        app.showNotification('Payment recorded successfully (Demo Mode)', 'success');
    });
}

// View payment details
function viewPaymentDetails(paymentId) {
    // Find payment
    const payment = payments.find(p => (p.id && p.id === paymentId) || (!p.id && `${p.loanId}-${p.paymentNumber}` === paymentId));
    if (!payment) {
        app.showNotification('Payment not found', 'error');
        return;
    }
    
    // Format method for display
    let methodDisplay = '-';
    if (payment.method) {
        switch(payment.method) {
            case 'bank_transfer':
                methodDisplay = 'Bank Transfer';
                break;
            case 'mobile_money':
                methodDisplay = 'Mobile Money';
                break;
            case 'cash':
                methodDisplay = 'Cash';
                break;
            case 'check':
                methodDisplay = 'Check';
                break;
        }
    }
    
    // Create and show modal with payment details
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Payment Details</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="loan-details">
                    <div class="loan-details-row">
                        <div class="loan-details-label">Payment ID:</div>
                        <div class="loan-details-value">${payment.id || `${payment.loanId}-${payment.paymentNumber}`}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Loan ID:</div>
                        <div class="loan-details-value">${payment.loanId}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Borrower:</div>
                        <div class="loan-details-value">${payment.borrower.name}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Payment Number:</div>
                        <div class="loan-details-value">${payment.paymentNumber}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Due Date:</div>
                        <div class="loan-details-value">${app.formatDate(payment.dueDate)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Amount Due:</div>
                        <div class="loan-details-value">${app.formatCurrency(payment.amountDue)}</div>
                    </div>
                    ${payment.status === 'paid' ? `
                        <div class="loan-details-row">
                            <div class="loan-details-label">Payment Date:</div>
                            <div class="loan-details-value">${app.formatDate(payment.paymentDate)}</div>
                        </div>
                        <div class="loan-details-row">
                            <div class="loan-details-label">Amount Paid:</div>
                            <div class="loan-details-value">${app.formatCurrency(payment.amountPaid)}</div>
                        </div>
                        <div class="loan-details-row">
                            <div class="loan-details-label">Payment Method:</div>
                            <div class="loan-details-value">${methodDisplay}</div>
                        </div>
                    ` : ''}
                    <div class="loan-details-row">
                        <div class="loan-details-label">Status:</div>
                        <div class="loan-details-value">
                            <span class="status-badge status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-details">Close</button>
                    ${payment.status === 'pending' && (auth.isAdmin() || auth.isLoanOfficer()) ? 
                        `<button type="button" class="btn btn-primary" id="record-from-details">Record Payment</button>` : ''}
                    ${payment.status === 'paid' && (auth.isAdmin() || auth.isLoanOfficer()) ? 
                        `<button type="button" class="btn btn-primary" id="print-from-details">Print Receipt</button>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(viewModal);
    
    // Setup close button
    viewModal.querySelector('#close-view-modal').addEventListener('click', () => {
        viewModal.remove();
    });
    
    viewModal.querySelector('#close-details').addEventListener('click', () => {
        viewModal.remove();
    });
    
    // Setup record payment button if available
    const recordBtn = viewModal.querySelector('#record-from-details');
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            viewModal.remove();
            openPaymentModal(payment);
        });
    }
    
    // Setup print receipt button if available
    const printBtn = viewModal.querySelector('#print-from-details');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            viewModal.remove();
            printPaymentReceipt(payment.id || `${payment.loanId}-${payment.paymentNumber}`);
        });
    }
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Print payment receipt
function printPaymentReceipt(paymentId) {
    // Find payment
    const payment = payments.find(p => (p.id && p.id === paymentId) || (!p.id && `${p.loanId}-${p.paymentNumber}` === paymentId));
    if (!payment) {
        app.showNotification('Payment not found', 'error');
        return;
    }
    
    // Format method for display
    let methodDisplay = 'Unknown';
    switch(payment.method) {
        case 'bank_transfer':
            methodDisplay = 'Bank Transfer';
            break;
        case 'mobile_money':
            methodDisplay = 'Mobile Money';
            break;
        case 'cash':
            methodDisplay = 'Cash';
            break;
        case 'check':
            methodDisplay = 'Check';
            break;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content
    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - #${payment.id || `${payment.loanId}-${payment.paymentNumber}`}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                .receipt {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .header h1 {
                    color: #00395D;
                    margin-bottom: 5px;
                }
                .header p {
                    color: #666;
                    margin-top: 0;
                }
                .details {
                    margin-bottom: 20px;
                }
                .details-row {
                    display: flex;
                    margin-bottom: 5px;
                }
                .details-label {
                    font-weight: bold;
                    width: 200px;
                }
                .amount {
                    font-size: 24px;
                    text-align: center;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    text-align: center;
                    color: #666;
                }
                .signatures {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 50px;
                }
                .signature {
                    width: 45%;
                }
                .signature-line {
                    border-top: 1px solid #000;
                    margin-top: 50px;
                    margin-bottom: 5px;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>Washa Enterprises</h1>
                    <p>Payment Receipt</p>
                </div>
                
                <div class="details">
                    <div class="details-row">
                        <div class="details-label">Receipt Number:</div>
                        <div>${payment.id || `${payment.loanId}-${payment.paymentNumber}`}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Date:</div>
                        <div>${app.formatDate(payment.paymentDate)}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Loan ID:</div>
                        <div>${payment.loanId}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Borrower:</div>
                        <div>${payment.borrower.name}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Payment Number:</div>
                        <div>${payment.paymentNumber}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Payment Method:</div>
                        <div>${methodDisplay}</div>
                    </div>
                </div>
                
                <div class="amount">
                    ${app.formatCurrency(payment.amountPaid)}
                </div>
                
                <div class="signatures">
                    <div class="signature">
                        <div class="signature-line"></div>
                        <div>Authorized Signature</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line"></div>
                        <div>Borrower Signature</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an official receipt of Washa Enterprises Loan Management System</p>
                    <p>Printed on ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    
    // Write content to print window
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
}

// Import payments from CSV
function importPaymentsFromCsv(file) {
    // Show CSV import modal
    const csvModal = document.getElementById('csv-import-modal');
    const csvPreview = document.getElementById('csv-preview');
    
    // Clear previous preview
    csvPreview.innerHTML = '';
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        const contents = e.target.result;
        const lines = contents.split('\n');
        
        // Preview CSV data
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Parse header
        const headerRow = document.createElement('tr');
        const headers = lines[0].split(',');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.trim();
            headerRow.appendChild(th);
        });
        
        const thead = document.createElement('thead');
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Parse data rows
        const tbody = document.createElement('tbody');
        
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
            if (lines[i].trim() === '') continue;
            
            const dataRow = document.createElement('tr');
            const cells = lines[i].split(',');
            
            cells.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell.trim();
                dataRow.appendChild(td);
            });
            
            tbody.appendChild(dataRow);
        }
        
        table.appendChild(tbody);
        csvPreview.appendChild(table);
        
        // Show modal
        csvModal.classList.add('active');
        
        // Setup import button
        const importBtn = document.getElementById('confirm-import');
        importBtn.onclick = function() {
            processImportedPayments(lines);
            csvModal.classList.remove('active');
        };
        
        // Setup cancel button
        const cancelBtn = document.getElementById('cancel-import');
        cancelBtn.onclick = function() {
            csvModal.classList.remove('active');
        };
        
        // Setup close button
        const closeBtn = document.getElementById('close-csv-modal');
        closeBtn.onclick = function() {
            csvModal.classList.remove('active');
        };
    };
    
    reader.readAsText(file);
}

// Process imported payments from CSV
function processImportedPayments(lines) {
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Required columns
    const requiredColumns = ['loanId', 'paymentNumber', 'paymentDate', 'amountPaid', 'method'];
    
    // Check if required columns exist
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
        app.showNotification(`Missing required columns: ${missingColumns.join(', ')}`, 'error');
        return;
    }
    
    // Parse data rows
    const importedPayments = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const cells = lines[i].split(',');
        const payment = {};
        
        headers.forEach((header, index) => {
            payment[header] = cells[index] ? cells[index].trim() : '';
        });
        
        // Validate required fields
        if (requiredColumns.every(col => payment[col])) {
            importedPayments.push(payment);
        }
    }
    
    if (importedPayments.length === 0) {
        app.showNotification('No valid payments found in CSV file', 'error');
        return;
    }
    
    // Send imported payments to API
    fetch(`${API_URL}/payments/import`, {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify({ payments: importedPayments })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to import payments');
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification(`Successfully imported ${data.imported} payments`, 'success');
        
        // Reload payments
        loadPayments();
    })
    .catch(error => {
        console.error('Error importing payments:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        app.showNotification(`Successfully imported ${importedPayments.length} payments (Demo Mode)`, 'success');
        
        // Create mock payments from imported data
        importedPayments.forEach(importedPayment => {
            const newPayment = {
                id: (Math.max(...payments.map(p => parseInt(p.id || '0'))) + 1).toString(),
                loanId: importedPayment.loanId,
                paymentNumber: parseInt(importedPayment.paymentNumber),
                borrower: {
                    id: '3',
                    name: 'Imported Borrower'
                },
                paymentDate: importedPayment.paymentDate,
                dueDate: importedPayment.dueDate || new Date().toISOString().split('T')[0],
                amountPaid: parseFloat(importedPayment.amountPaid),
                amountDue: parseFloat(importedPayment.amountDue || importedPayment.amountPaid),
                method: importedPayment.method,
                status: 'paid'
            };
            
            payments.push(newPayment);
        });
        
        // Reload payments
        const paymentsTable = document.getElementById('payments-table');
        const tableBody = paymentsTable.querySelector('tbody');
        renderPayments(tableBody);
    });
}

// Helper function to create action buttons
function createActionButtons(actions) {
    const container = document.createElement('div');
    container.className = 'action-buttons-container';
    
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `action-btn ${action.type}`;
        button.innerHTML = `<i class="fas fa-${action.icon}"></i>`;
        button.title = action.label;
        
        if (action.handler) {
            button.addEventListener('click', action.handler);
        }
        
        container.appendChild(button);
    });
    
    return container;
}

// Process JSON payments from payment.json file
async function processJsonPayments() {
    try {
        // Show confirmation dialog
        const confirmed = confirm(
            'This will process all payments from the payment.json file and update the database. ' +
            'New users will be created for payments that don\'t match existing accounts. ' +
            'Are you sure you want to continue?'
        );
        
        if (!confirmed) {
            return;
        }

        // Show loading notification
        app.showNotification('Loading payment data...', 'info');
        
        // Load payment data from JSON file
        const response = await fetch('/data/payments/payment.json');
        if (!response.ok) {
            throw new Error('Failed to load payment data from payment.json');
        }
        
        const paymentData = await response.json();
        
        if (!paymentData || paymentData.length === 0) {
            throw new Error('No payment data found in payment.json file');
        }

        // Show processing notification
        app.showNotification(`Processing ${paymentData.length} payment records...`, 'info');

        // Send data to backend for processing
        const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
        const processResponse = await fetch(`${API_URL}/payments/process-json`, {
            method: 'POST',
            headers: {
                ...auth.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentData: paymentData })
        });

        if (!processResponse.ok) {
            const errorData = await processResponse.json();
            throw new Error(errorData.message || 'Failed to process payments');
        }

        const results = await processResponse.json();
        
        // Show results using the payment processor's result display
        if (window.paymentProcessor) {
            // Update the processor with results
            window.paymentProcessor.processedPayments = results.results.processedPayments || [];
            window.paymentProcessor.newUsers = results.results.newUsersList || [];
            window.paymentProcessor.matchedUsers = Array(results.results.matchedUsers || 0).fill(null).map((_, i) => ({ id: i }));
            window.paymentProcessor.errors = results.results.errors || [];
            
            // Show results modal
            window.paymentProcessor.showProcessingResults();
        } else {
            // Fallback notification
            app.showNotification(
                `Processing completed! Processed: ${results.results.processed}, New users: ${results.results.newUsers}, Errors: ${results.results.errors.length}`,
                results.results.errors.length > 0 ? 'warning' : 'success'
            );
        }

        // Refresh the payments table
        loadPayments();

    } catch (error) {
        console.error('Error processing JSON payments:', error);
        app.showNotification(`Error processing payments: ${error.message}`, 'error');
    }
}

// Export functions for use in other modules
window.paymentProcessing = {
    loadPayments,
    openPaymentModal,
    savePayment,
    viewPaymentDetails,
    printPaymentReceipt,
    importPaymentsFromCsv,
    processJsonPayments
};
