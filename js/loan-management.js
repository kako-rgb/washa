// Loan Management Module

// Global variables
let loans = [];
let activeLoans = [];
let disbursements = [];
let repayments = [];
let currentPage = 1;
let itemsPerPage = 20; // Set to 20 loans per page
let totalPages = 1;
let allLoans = []; // Store all loans for searching/filtering
let totalLoans = 0; // Total number of loans in the database
let currentTab = 'applications'; // Track the current active tab
let dbConnected = false; // Track database connection status

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('applications-table')) {
        console.log("Loan Management: Initializing loan management");
        
        // Initialize payment integration first
        if (typeof initializePaymentIntegration === 'function') {
            await initializePaymentIntegration();
        }
        
        checkDatabaseStatus();
        setupEventListeners();
    } else {
        console.warn("Loan Management: applications-table not found in DOM");
    }
});

// Check database status before loading data
async function checkDatabaseStatus() {
    try {
        const response = await fetch('/api/db/status');
        const data = await response.json();
        dbConnected = data.connected;
        console.log(`Database connection status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
        
        // Load data based on database connection status
        loadTabData(currentTab);
    } catch (error) {
        console.error('Error checking database status:', error);
        dbConnected = false;
        loadTabData(currentTab);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // New loan button
    const newLoanBtn = document.getElementById('new-loan-application-btn');
    if (newLoanBtn) {
        newLoanBtn.addEventListener('click', () => {
            openLoanApplicationModal();
        });
    }
    
    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch();
        });
    }
    
    // Enter key for search
    const searchInput = document.getElementById('loan-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            performSearch();
        });
    }
    
    // Close loan modal
    const closeLoanModal = document.getElementById('close-loan-modal');
    if (closeLoanModal) {
        closeLoanModal.addEventListener('click', () => {
            document.getElementById('loan-application-modal').style.display = 'none';
        });
    }
    
    // Cancel loan form
    const cancelLoanForm = document.getElementById('cancel-loan-form');
    if (cancelLoanForm) {
        cancelLoanForm.addEventListener('click', () => {
            document.getElementById('loan-application-modal').style.display = 'none';
        });
    }
    
    // Loan application form submission
    const loanForm = document.getElementById('loan-application-form');
    if (loanForm) {
        loanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitLoanApplication();
        });
    }
}

// Load data based on the current tab
function loadTabData(tabId) {
    currentTab = tabId;
    
    // Reset pagination only when switching tabs
    currentPage = 1;
    
    loadCurrentTabData();
}

// Load data for the current tab without resetting pagination
function loadCurrentTabData() {
    switch(currentTab) {
        case 'applications':
            loadApplications();
            break;
        case 'active-loans':
            loadActiveLoans();
            break;
        case 'disbursements':
            loadDisbursements();
            break;
        case 'repayments':
            loadRepaymentSchedules();
            break;
        default:
            loadApplications();
    }
}

// Load loan applications from the database
async function loadApplications() {
    const tbody = document.querySelector('#applications-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="8" class="loading-message">Loading applications...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Fetch data from the API
        const response = await fetch(`/api/loans/with-fallback?page=${currentPage}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Loaded applications from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                // Server-side pagination
                allLoans = data.data.loans;
                totalLoans = data.data.total;
                totalPages = data.data.pages;
            } else {
                // Client-side pagination for fallback data
                const fullDataset = Array.isArray(data.data) ? data.data : [data.data];
                
                // Process all loans with payment integration first
                let processedLoans = fullDataset;
                if (typeof processLoansWithPayments === 'function') {
                    processedLoans = processLoansWithPayments(fullDataset);
                }
                
                // Calculate pagination
                totalLoans = processedLoans.length;
                totalPages = Math.ceil(totalLoans / itemsPerPage);
                
                // Get loans for current page
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                allLoans = processedLoans.slice(startIndex, endIndex);
            }
            
            // Process loans with payment integration (for server-side data)
            if (data.data && data.data.loans && typeof processLoansWithPayments === 'function') {
                allLoans = processLoansWithPayments(allLoans);
            }
            
            // Update the UI
            updateApplicationsTable();
            updatePagination();
            
            // Show notification if using fallback data
            if (data.source !== 'database') {
                console.warn('Using fallback data for applications');
            }
        } else {
            throw new Error(data.message || 'Failed to load loan applications');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="error-message">
                    Error loading applications: ${error.message}
                </td>
            </tr>`;
    }
}

// Load active loans from the database
async function loadActiveLoans() {
    const tbody = document.querySelector('#active-loans-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="9" class="loading-message">Loading active loans...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Fetch data from the API
        const response = await fetch(`/api/loans/with-fallback?status=active&page=${currentPage}&limit=${itemsPerPage}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Loaded active loans from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                // Server-side pagination
                activeLoans = data.data.loans;
                totalLoans = data.data.total;
                totalPages = data.data.pages;
            } else {
                // Client-side pagination for fallback data
                const fullDataset = Array.isArray(data.data) ? data.data : [data.data];
                
                // Process all loans with payment integration first
                let processedLoans = fullDataset;
                if (typeof processLoansWithPayments === 'function') {
                    processedLoans = processLoansWithPayments(fullDataset);
                }
                
                // Filter for active loans (including new statuses from payment integration)
                const filteredLoans = processedLoans.filter(loan => 
                    loan.status === 'active' || 
                    loan.status === 'disbursed' || 
                    loan.status === 'paying' || 
                    loan.status === 'completed' || 
                    loan.status === 'defaulted'
                );
                
                // Calculate pagination
                totalLoans = filteredLoans.length;
                totalPages = Math.ceil(totalLoans / itemsPerPage);
                
                // Get loans for current page
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                activeLoans = filteredLoans.slice(startIndex, endIndex);
            }
            
            // Process loans with payment integration (for server-side data)
            if (data.data && data.data.loans && typeof processLoansWithPayments === 'function') {
                activeLoans = processLoansWithPayments(activeLoans);
                
                // Filter for active loans (for server-side data)
                activeLoans = activeLoans.filter(loan => 
                    loan.status === 'active' || 
                    loan.status === 'disbursed' || 
                    loan.status === 'paying' || 
                    loan.status === 'completed' || 
                    loan.status === 'defaulted'
                );
            }
            
            // Update the UI
            updateActiveLoansTable();
            updatePagination();
            
            // Show notification if using fallback data
            if (data.source !== 'database') {
                console.warn('Using fallback data for active loans');
            }
        } else {
            throw new Error(data.message || 'Failed to load active loans');
        }
    } catch (error) {
        console.error('Error loading active loans:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="error-message">
                    Error loading active loans: ${error.message}
                </td>
            </tr>`;
    }
}

// Load disbursements from the database
async function loadDisbursements() {
    const tbody = document.querySelector('#disbursements-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="8" class="loading-message">Loading disbursements...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Fetch data from the API
        const response = await fetch('/api/loans/with-fallback?status=disbursed', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Loaded disbursements from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                disbursements = data.data.loans.filter(loan => 
                    loan.status === 'disbursed' && loan.disbursementDate
                ).map(loan => ({
                    id: `D-${loan._id || loan.id}`,
                    loanId: loan._id || loan.id,
                    borrowerName: loan.borrowerName || (loan.borrower ? loan.borrower.fullName : 'Unknown'),
                    amount: loan.amount,
                    disbursementDate: loan.disbursementDate || loan.startDate || loan.createdAt,
                    method: loan.disbursementMethod || 'bank_transfer',
                    status: 'completed',
                    idNumber: loan.idNumber || (loan.borrower ? loan.borrower.idNumber : '')
                }));
            } else {
                // If no disbursement data is available, create empty array
                disbursements = [];
            }
            
            // Update the UI
            updateDisbursementsTable();
            
            // Show notification if using fallback data
            if (data.source !== 'database') {
                console.warn('Using fallback data for disbursements');
            }
        } else {
            throw new Error(data.message || 'Failed to load disbursements');
        }
    } catch (error) {
        console.error('Error loading disbursements:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="error-message">
                    Error loading disbursements: ${error.message}
                </td>
            </tr>`;
    }
}

// Load repayment schedules from the database
async function loadRepaymentSchedules() {
    const tbody = document.querySelector('#repayments-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="9" class="loading-message">Loading repayment schedules...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Fetch data from the API
        const response = await fetch('/api/loans/with-fallback?status=active,disbursed', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Loaded active loans for repayments from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                // Generate repayment schedules from active loans
                repayments = generateRepaymentSchedules(data.data.loans);
            } else {
                // If no active loans are available, create empty array
                repayments = [];
            }
            
            // Update the UI
            updateRepaymentsTable();
            
            // Show notification if using fallback data
            if (data.source !== 'database') {
                console.warn('Using fallback data for repayment schedules');
            }
        } else {
            throw new Error(data.message || 'Failed to load repayment schedules');
        }
    } catch (error) {
        console.error('Error loading repayment schedules:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="error-message">
                    Error loading repayment schedules: ${error.message}
                </td>
            </tr>`;
    }
}

// Generate repayment schedules from active loans
function generateRepaymentSchedules(activeLoans) {
    const repayments = [];
    
    activeLoans.forEach(loan => {
        if (loan.status === 'active' || loan.status === 'disbursed') {
            const loanAmount = loan.amount || 0;
            const interestRate = loan.interestRate || 10; // Default to 10% if not specified
            const term = loan.term || 30; // Default to 30 days if not specified
            
            // Calculate total interest
            const totalInterest = (loanAmount * interestRate / 100) * (term / 30); // Monthly interest
            
            // Calculate number of payments (assume monthly payments)
            const numPayments = Math.ceil(term / 30);
            
            // Calculate amount per payment
            const totalAmount = loanAmount + totalInterest;
            const amountPerPayment = totalAmount / numPayments;
            
            // Calculate principal and interest per payment
            const principalPerPayment = loanAmount / numPayments;
            const interestPerPayment = totalInterest / numPayments;
            
            // Get start date
            const startDate = new Date(loan.startDate || loan.disbursementDate || loan.createdAt || Date.now());
            
            // Generate payment schedule
            for (let i = 1; i <= numPayments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setDate(dueDate.getDate() + (i * 30)); // Add 30 days for each payment
                
                // Determine payment status
                let status = 'pending';
                if (dueDate < new Date()) {
                    status = 'overdue';
                }
                
                repayments.push({
                    loanId: loan._id || loan.id,
                    borrowerName: loan.borrowerName || (loan.borrower ? loan.borrower.fullName : 'Unknown'),
                    paymentNumber: i,
                    dueDate: dueDate.toISOString().split('T')[0],
                    amountDue: Math.round(amountPerPayment),
                    principal: Math.round(principalPerPayment),
                    interest: Math.round(interestPerPayment),
                    status: status,
                    idNumber: loan.idNumber || (loan.borrower ? loan.borrower.idNumber : '')
                });
            }
        }
    });
    
    return repayments;
}

// Update the applications table
function updateApplicationsTable() {
    const tbody = document.querySelector('#applications-table tbody');
    if (!tbody) {
        console.error("Loan Management: Cannot find applications-table tbody element");
        return;
    }
    
    if (!allLoans || allLoans.length === 0) {
        console.warn("Loan Management: No loans data available");
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No loan applications found</td>
            </tr>`;
        return;
    }
    
    console.log(`Loan Management: Updating applications table with ${allLoans.length} loans`);
    
    // Generate table rows
    tbody.innerHTML = allLoans.map(loan => {
        // Format date
        const applicationDate = new Date(loan.applicationDate || loan.createdAt || loan.date || Date.now());
        const formattedDate = applicationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Get borrower name
        const borrowerName = loan.borrowerName || 
                            (loan.borrower ? loan.borrower.fullName : '') || 
                            loan.fullName || 
                            'Unknown';
        
        // Get loan ID
        const loanId = loan._id || loan.id || 'Unknown';
        
        return `
            <tr>
                <td>${loanId}</td>
                <td>${borrowerName}</td>
                <td>KSh ${(loan.amount || 0).toLocaleString()}</td>
                <td>${loan.term || '30'} days</td>
                <td>${loan.purpose || 'Not specified'}</td>
                <td>${formattedDate}</td>
                <td>${typeof getStatusBadge === 'function' ? getStatusBadge(loan.status) : `<span class="status-badge ${loan.status || 'pending'}">${loan.status || 'Pending'}</span>`}</td>
                <td>
                    <button class="btn btn-sm btn-view" data-id="${loanId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    // Add event listeners to view buttons
    const viewButtons = document.querySelectorAll('#applications-table .btn-view');
    console.log(`Loan Management: Attaching event listeners to ${viewButtons.length} view buttons`);
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const loanId = target.getAttribute('data-id');
            console.log(`Loan Management: View button clicked for loan ID: ${loanId}`);
            viewLoanWithPaymentHistory(loanId, 'applications');
        });
    });
}

// Update the active loans table
function updateActiveLoansTable() {
    const tbody = document.querySelector('#active-loans-table tbody');
    if (!tbody) {
        console.error("Loan Management: Cannot find active-loans-table tbody element");
        return;
    }
    
    if (!activeLoans || activeLoans.length === 0) {
        console.warn("Loan Management: No active loans data available");
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">No active loans found</td>
            </tr>`;
        return;
    }
    
    console.log(`Loan Management: Updating active loans table with ${activeLoans.length} loans`);
    
    // Generate table rows
    tbody.innerHTML = activeLoans.map(loan => {
        // Format dates
        const startDate = new Date(loan.startDate || loan.disbursementDate || loan.createdAt || Date.now());
        
        // Calculate end date based on term
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (loan.term || 30));
        
        const formattedStartDate = startDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const formattedEndDate = endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Get borrower name
        const borrowerName = loan.borrowerName || 
                            (loan.borrower ? loan.borrower.fullName : '') || 
                            loan.fullName || 
                            'Unknown';
        
        // Get loan ID
        const loanId = loan._id || loan.id || 'Unknown';
        
        return `
            <tr>
                <td>${loanId}</td>
                <td>${borrowerName}</td>
                <td>KSh ${(loan.amount || 0).toLocaleString()}</td>
                <td>${loan.term || '30'} days</td>
                <td>${loan.interestRate || '0'}%</td>
                <td>${formattedStartDate}</td>
                <td>${formattedEndDate}</td>
                <td><span class="status-badge ${loan.status || 'active'}">${loan.status || 'Active'}</span></td>
                <td>
                    <button class="btn btn-sm btn-view" data-id="${loanId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    // Add event listeners to view buttons
    const viewButtons = document.querySelectorAll('#active-loans-table .btn-view');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const loanId = target.getAttribute('data-id');
            viewLoanWithPaymentHistory(loanId, 'active-loans');
        });
    });
}

// Update the disbursements table
function updateDisbursementsTable() {
    const tbody = document.querySelector('#disbursements-table tbody');
    if (!tbody) {
        console.error("Loan Management: Cannot find disbursements-table tbody element");
        return;
    }
    
    if (!disbursements || disbursements.length === 0) {
        console.warn("Loan Management: No disbursements data available");
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No disbursements found</td>
            </tr>`;
        return;
    }
    
    console.log(`Loan Management: Updating disbursements table with ${disbursements.length} disbursements`);
    
    // Generate table rows
    tbody.innerHTML = disbursements.map(disbursement => {
        // Format date
        const disbursementDate = new Date(disbursement.disbursementDate || Date.now());
        const formattedDate = disbursementDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Format method
        let method = 'Unknown';
        switch(disbursement.method) {
            case 'bank_transfer':
                method = 'Bank Transfer';
                break;
            case 'mobile_money':
                method = 'Mobile Money';
                break;
            case 'cash':
                method = 'Cash';
                break;
            case 'check':
                method = 'Check';
                break;
        }
        
        return `
            <tr>
                <td>${disbursement.id}</td>
                <td>${disbursement.loanId}</td>
                <td>${disbursement.borrowerName}</td>
                <td>KSh ${(disbursement.amount || 0).toLocaleString()}</td>
                <td>${formattedDate}</td>
                <td>${method}</td>
                <td><span class="status-badge ${disbursement.status || 'pending'}">${disbursement.status || 'Pending'}</span></td>
                <td>
                    <button class="btn btn-sm btn-view" data-id="${disbursement.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    // Add event listeners to view buttons
    const viewButtons = document.querySelectorAll('#disbursements-table .btn-view');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const disbursementId = target.getAttribute('data-id');
            viewDisbursementDetails(disbursementId);
        });
    });
}

// Update the repayments table
function updateRepaymentsTable() {
    const tbody = document.querySelector('#repayments-table tbody');
    if (!tbody) {
        console.error("Loan Management: Cannot find repayments-table tbody element");
        return;
    }
    
    if (!repayments || repayments.length === 0) {
        console.warn("Loan Management: No repayments data available");
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">No repayment schedules found</td>
            </tr>`;
        return;
    }
    
    console.log(`Loan Management: Updating repayments table with ${repayments.length} repayments`);
    
    // Generate table rows
    tbody.innerHTML = repayments.map(repayment => {
        // Format date
        const dueDate = new Date(repayment.dueDate || Date.now());
        const formattedDate = dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>${repayment.loanId}</td>
                <td>${repayment.borrowerName}</td>
                <td>${repayment.paymentNumber}</td>
                <td>${formattedDate}</td>
                <td>KSh ${(repayment.amountDue || 0).toLocaleString()}</td>
                <td>KSh ${(repayment.principal || 0).toLocaleString()}</td>
                <td>KSh ${(repayment.interest || 0).toLocaleString()}</td>
                <td><span class="status-badge ${repayment.status || 'pending'}">${repayment.status || 'Pending'}</span></td>
                <td>
                    <button class="btn btn-sm btn-view" data-id="${repayment.loanId}-${repayment.paymentNumber}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${repayment.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary" data-id="${repayment.loanId}-${repayment.paymentNumber}">
                        <i class="fas fa-money-bill-wave"></i> Record Payment
                    </button>
                    ` : ''}
                </td>
            </tr>`;
    }).join('');
    
    // Add event listeners to view buttons
    const viewButtons = document.querySelectorAll('#repayments-table .btn-view');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const repaymentId = target.getAttribute('data-id');
            viewRepaymentDetails(repaymentId);
        });
    });
    
    // Add event listeners to record payment buttons
    const paymentButtons = document.querySelectorAll('#repayments-table .btn-primary');
    
    paymentButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            const repaymentId = target.getAttribute('data-id');
            recordPayment(repaymentId);
        });
    });
}

// Update pagination controls
function updatePagination() {
    console.log(`Updating pagination: Page ${currentPage} of ${totalPages} (Total items: ${totalLoans})`);
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('pagination-info');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        // Remove any existing event listeners
        prevBtn.replaceWith(prevBtn.cloneNode(true));
        const newPrevBtn = document.getElementById('prev-page');
        
        // Add event listener
        if (newPrevBtn) {
            newPrevBtn.addEventListener('click', () => {
                console.log(`Previous button clicked. Current page: ${currentPage}`);
                if (currentPage > 1) {
                    currentPage--;
                    console.log(`Moving to page: ${currentPage}`);
                    loadCurrentTabData();
                }
            });
        }
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        // Remove any existing event listeners
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        const newNextBtn = document.getElementById('next-page');
        
        // Add event listener
        if (newNextBtn) {
            newNextBtn.addEventListener('click', () => {
                console.log(`Next button clicked. Current page: ${currentPage}, Total pages: ${totalPages}`);
                if (currentPage < totalPages) {
                    currentPage++;
                    console.log(`Moving to page: ${currentPage}`);
                    loadCurrentTabData();
                }
            });
        }
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    console.log(`Pagination updated: Page ${currentPage}/${totalPages}, Total loans: ${totalLoans}`);
}

// Switch between tabs
function switchTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab pane and activate its button
    const selectedPane = document.getElementById(`${tabId}-tab`);
    const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    
    if (selectedPane) selectedPane.classList.add('active');
    if (selectedBtn) selectedBtn.classList.add('active');
    
    // Load data for the selected tab
    loadTabData(tabId);
}

// Perform search across all tabs
function performSearch() {
    const searchTerm = document.getElementById('loan-search').value.toLowerCase();
    const searchType = document.getElementById('search-type').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    console.log(`Performing search: Term="${searchTerm}", Type=${searchType}, Status=${statusFilter}`);
    
    // Reset pagination
    currentPage = 1;
    
    // Apply search based on the current tab
    switch(currentTab) {
        case 'applications':
            searchApplications(searchTerm, searchType, statusFilter);
            break;
        case 'active-loans':
            searchActiveLoans(searchTerm, searchType, statusFilter);
            break;
        case 'disbursements':
            searchDisbursements(searchTerm, searchType, statusFilter);
            break;
        case 'repayments':
            searchRepayments(searchTerm, searchType, statusFilter);
            break;
    }
}

// Search applications
async function searchApplications(searchTerm, searchType, statusFilter) {
    const tbody = document.querySelector('#applications-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="8" class="loading-message">Searching applications...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Build query parameters
        let queryParams = `page=${currentPage}&limit=${itemsPerPage}`;
        
        if (statusFilter) {
            queryParams += `&status=${statusFilter}`;
        }
        
        if (searchTerm) {
            queryParams += `&search=${encodeURIComponent(searchTerm)}`;
            queryParams += `&searchType=${searchType}`;
        }
        
        // Fetch data from the API
        const response = await fetch(`/api/loans/with-fallback?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Search results from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                allLoans = data.data.loans;
                totalLoans = data.data.total;
                totalPages = data.data.pages;
            } else {
                allLoans = Array.isArray(data.data) ? data.data : [data.data];
                totalLoans = allLoans.length;
                totalPages = Math.ceil(totalLoans / itemsPerPage);
            }
            
            // If server doesn't support search, filter locally
            if (!data.data.filtered) {
                allLoans = filterLoans(allLoans, searchTerm, searchType, statusFilter);
                totalLoans = allLoans.length;
                totalPages = Math.ceil(totalLoans / itemsPerPage) || 1;
            }
            
            // Update the UI
            updateApplicationsTable();
            updatePagination();
        } else {
            throw new Error(data.message || 'Failed to search loan applications');
        }
    } catch (error) {
        console.error('Error searching applications:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="error-message">
                    Error searching applications: ${error.message}
                </td>
            </tr>`;
    }
}

// Search active loans
async function searchActiveLoans(searchTerm, searchType, statusFilter) {
    const tbody = document.querySelector('#active-loans-table tbody');
    if (!tbody) return;
    
    // Show loading message
    tbody.innerHTML = '<tr><td colspan="9" class="loading-message">Searching active loans...</td></tr>';
    
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }
        
        // Build query parameters
        let queryParams = `status=active,disbursed`;
        
        if (searchTerm) {
            queryParams += `&search=${encodeURIComponent(searchTerm)}`;
            queryParams += `&searchType=${searchType}`;
        }
        
        // Fetch data from the API
        const response = await fetch(`/api/loans/with-fallback?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Search results for active loans from ${data.source}:`, data.data);
            
            // Update global variables
            if (data.data && data.data.loans) {
                activeLoans = data.data.loans.filter(loan => 
                    loan.status === 'active' || loan.status === 'disbursed'
                );
            } else {
                activeLoans = Array.isArray(data.data) ? data.data : [data.data];
                activeLoans = activeLoans.filter(loan => 
                    loan.status === 'active' || loan.status === 'disbursed'
                );
            }
            
            // If server doesn't support search, filter locally
            if (!data.data.filtered) {
                activeLoans = filterLoans(activeLoans, searchTerm, searchType, statusFilter);
            }
            
            // Update the UI
            updateActiveLoansTable();
        } else {
            throw new Error(data.message || 'Failed to search active loans');
        }
    } catch (error) {
        console.error('Error searching active loans:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="error-message">
                    Error searching active loans: ${error.message}
                </td>
            </tr>`;
    }
}

// Search disbursements
function searchDisbursements(searchTerm, searchType, statusFilter) {
    // Filter disbursements locally
    let filteredDisbursements = [...disbursements];
    
    // Apply status filter if selected
    if (statusFilter) {
        filteredDisbursements = filteredDisbursements.filter(disbursement => disbursement.status === statusFilter);
    }
    
    // Apply search term if provided
    if (searchTerm) {
        filteredDisbursements = filteredDisbursements.filter(disbursement => {
            // Search based on the selected type
            switch(searchType) {
                case 'id':
                    return disbursement.id.toLowerCase().includes(searchTerm) || 
                           disbursement.loanId.toLowerCase().includes(searchTerm) ||
                           (disbursement.idNumber && disbursement.idNumber.toLowerCase().includes(searchTerm));
                case 'name':
                    return disbursement.borrowerName.toLowerCase().includes(searchTerm);
                case 'phone':
                    // Disbursements don't have phone numbers directly
                    return false;
                case 'all':
                default:
                    return disbursement.id.toLowerCase().includes(searchTerm) || 
                           disbursement.loanId.toLowerCase().includes(searchTerm) ||
                           (disbursement.idNumber && disbursement.idNumber.toLowerCase().includes(searchTerm)) ||
                           disbursement.borrowerName.toLowerCase().includes(searchTerm);
            }
        });
    }
    
    // Update the global disbursements variable with the filtered results
    disbursements = filteredDisbursements;
    
    // Update the UI
    updateDisbursementsTable();
}

// Search repayments
function searchRepayments(searchTerm, searchType, statusFilter) {
    // Filter repayments locally
    let filteredRepayments = [...repayments];
    
    // Apply status filter if selected
    if (statusFilter) {
        filteredRepayments = filteredRepayments.filter(repayment => repayment.status === statusFilter);
    }
    
    // Apply search term if provided
    if (searchTerm) {
        filteredRepayments = filteredRepayments.filter(repayment => {
            // Search based on the selected type
            switch(searchType) {
                case 'id':
                    return repayment.loanId.toLowerCase().includes(searchTerm) ||
                           (repayment.idNumber && repayment.idNumber.toLowerCase().includes(searchTerm));
                case 'name':
                    return repayment.borrowerName.toLowerCase().includes(searchTerm);
                case 'phone':
                    // Repayments don't have phone numbers directly
                    return false;
                case 'all':
                default:
                    return repayment.loanId.toLowerCase().includes(searchTerm) ||
                           (repayment.idNumber && repayment.idNumber.toLowerCase().includes(searchTerm)) ||
                           repayment.borrowerName.toLowerCase().includes(searchTerm);
            }
        });
    }
    
    // Update the global repayments variable with the filtered results
    repayments = filteredRepayments;
    
    // Update the UI
    updateRepaymentsTable();
}

// Helper function to filter loans locally
function filterLoans(loans, searchTerm, searchType, statusFilter) {
    let filteredLoans = [...loans];
    
    // Apply status filter if selected
    if (statusFilter) {
        filteredLoans = filteredLoans.filter(loan => loan.status === statusFilter);
    }
    
    // Apply search term if provided
    if (searchTerm) {
        filteredLoans = filteredLoans.filter(loan => {
            // Get borrower name and ID
            const borrowerName = loan.borrowerName || 
                                (loan.borrower ? loan.borrower.fullName : '') || 
                                loan.fullName || 
                                '';
            
            const borrowerPhone = loan.borrowerPhone || 
                                 (loan.borrower ? loan.borrower.phone : '') || 
                                 loan.phone || 
                                 '';
            
            const idNumber = loan.idNumber || 
                            (loan.borrower ? loan.borrower.idNumber : '') || 
                            '';
            
            // Search based on the selected type
            switch(searchType) {
                case 'id':
                    return (loan._id && loan._id.toLowerCase().includes(searchTerm)) || 
                           (loan.id && loan.id.toLowerCase().includes(searchTerm)) || 
                           idNumber.toLowerCase().includes(searchTerm);
                case 'name':
                    return borrowerName.toLowerCase().includes(searchTerm);
                case 'phone':
                    return borrowerPhone.includes(searchTerm);
                case 'all':
                default:
                    return (loan._id && loan._id.toLowerCase().includes(searchTerm)) || 
                           (loan.id && loan.id.toLowerCase().includes(searchTerm)) || 
                           idNumber.toLowerCase().includes(searchTerm) ||
                           borrowerName.toLowerCase().includes(searchTerm) || 
                           borrowerPhone.includes(searchTerm);
            }
        });
    }
    
    return filteredLoans;
}

// View loan details in a modal
function viewLoanDetails(loanId, tabType) {
    let loan;
    
    // Find the loan based on the tab type
    if (tabType === 'applications') {
        loan = allLoans.find(l => (l._id === loanId || l.id === loanId));
    } else if (tabType === 'active-loans') {
        loan = activeLoans.find(l => (l._id === loanId || l.id === loanId));
    }
    
    if (!loan) {
        alert('Loan details not found');
        return;
    }
    
    // Get borrower name and contact info
    const borrowerName = loan.borrowerName || 
                        (loan.borrower ? loan.borrower.fullName : '') || 
                        loan.fullName || 
                        'Unknown';
    
    const borrowerPhone = loan.borrowerPhone || 
                         (loan.borrower ? loan.borrower.phone : '') || 
                         loan.phone || 
                         'N/A';
    
    const borrowerEmail = loan.borrowerEmail || 
                         (loan.borrower ? loan.borrower.email : '') || 
                         loan.email || 
                         'N/A';
    
    const idNumber = loan.idNumber || 
                    (loan.borrower ? loan.borrower.idNumber : '') || 
                    'N/A';
    
    // Create modal HTML
    const modalHtml = `
        <div id="loan-details-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Loan Details #${loan._id || loan.id}</h2>
                    <span class="close-btn" onclick="document.getElementById('loan-details-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Borrower:</span>
                            <span class="detail-value">${borrowerName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${borrowerPhone}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${borrowerEmail}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ID Number:</span>
                            <span class="detail-value">${idNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">KSh ${(loan.amount || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Term:</span>
                            <span class="detail-value">${loan.term || '30'} days</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Interest Rate:</span>
                            <span class="detail-value">${loan.interestRate || '0'}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Purpose:</span>
                            <span class="detail-value">${loan.purpose || 'Not specified'}</span>
                        </div>
                        ${loan.applicationDate || loan.createdAt ? `
                        <div class="detail-item">
                            <span class="detail-label">Application Date:</span>
                            <span class="detail-value">${new Date(loan.applicationDate || loan.createdAt).toLocaleDateString()}</span>
                        </div>
                        ` : ''}
                        ${loan.startDate ? `
                        <div class="detail-item">
                            <span class="detail-label">Start Date:</span>
                            <span class="detail-value">${new Date(loan.startDate).toLocaleDateString()}</span>
                        </div>
                        ` : ''}
                        ${loan.endDate ? `
                        <div class="detail-item">
                            <span class="detail-label">End Date:</span>
                            <span class="detail-value">${new Date(loan.endDate).toLocaleDateString()}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="status-badge ${loan.status || 'pending'}">${loan.status || 'Pending'}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('loan-details-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Close modal when clicking outside
    modalContainer.querySelector('.modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// View loan with payment history
function viewLoanWithPaymentHistory(loanId, tabType) {
    let loan;
    
    // Find the loan based on the tab type
    if (tabType === 'applications') {
        loan = allLoans.find(l => (l._id === loanId || l.id === loanId));
    } else if (tabType === 'active-loans') {
        loan = activeLoans.find(l => (l._id === loanId || l.id === loanId));
    }
    
    if (!loan) {
        alert('Loan details not found');
        return;
    }
    
    // Get payment history for this loan
    const paymentHistory = typeof getPaymentHistoryForLoan === 'function' 
        ? getPaymentHistoryForLoan(loan) 
        : { borrowerName: loan.borrowerName || loan.fullName || 'Unknown', phone: 'N/A', totalPaid: 0, transactionCount: 0, transactions: [] };
    
    // Get borrower info
    const borrowerName = paymentHistory.borrowerName || loan.borrowerName || loan.fullName || 'Unknown';
    const borrowerPhone = typeof formatPhoneNumber === 'function' 
        ? formatPhoneNumber(paymentHistory.phone || loan.borrowerPhone || loan.phone)
        : (paymentHistory.phone || loan.borrowerPhone || loan.phone || 'N/A');
    
    const loanAmount = parseFloat(loan.amount || 0);
    const totalPaid = parseFloat(paymentHistory.totalPaid || 0);
    const remainingAmount = Math.max(0, loanAmount - totalPaid);
    const paymentPercentage = loanAmount > 0 ? ((totalPaid / loanAmount) * 100).toFixed(1) : 0;
    
    // Format currency
    const formatCurrencyLocal = typeof formatCurrency === 'function' 
        ? formatCurrency 
        : (amount) => `KSh ${parseFloat(amount || 0).toLocaleString()}`;
    
    // Generate transactions HTML
    const transactionsHtml = paymentHistory.transactions && paymentHistory.transactions.length > 0
        ? paymentHistory.transactions.map(transaction => `
            <tr>
                <td>${transaction.transaction_id || 'N/A'}</td>
                <td>${formatCurrencyLocal(transaction.amount)}</td>
                <td>${transaction.date || 'Date not available'}</td>
                <td><span class="status-badge ${transaction.is_complete ? 'status-completed' : 'status-pending'}">${transaction.is_complete ? 'Complete' : 'Pending'}</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="4" class="no-data">No payment transactions found</td></tr>';
    
    // Create modal HTML
    const modalHtml = `
        <div id="payment-history-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>Payment History - ${borrowerName}</h2>
                    <span class="close-btn" onclick="document.getElementById('payment-history-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Payment Summary -->
                    <div class="payment-summary">
                        <h3>Payment Summary</h3>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <span class="summary-label">Borrower:</span>
                                <span class="summary-value">${borrowerName}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Phone:</span>
                                <span class="summary-value">${borrowerPhone}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Loan Amount:</span>
                                <span class="summary-value">${formatCurrencyLocal(loanAmount)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Total Paid:</span>
                                <span class="summary-value">${formatCurrencyLocal(totalPaid)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Remaining:</span>
                                <span class="summary-value">${formatCurrencyLocal(remainingAmount)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Payment Progress:</span>
                                <span class="summary-value">${paymentPercentage}%</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Total Transactions:</span>
                                <span class="summary-value">${paymentHistory.transactionCount || 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Status:</span>
                                <span class="summary-value">${typeof getStatusBadge === 'function' ? getStatusBadge(loan.status) : loan.status || 'Pending'}</span>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="progress-container">
                            <div class="progress-label">Payment Progress</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(100, paymentPercentage)}%"></div>
                            </div>
                            <div class="progress-text">${paymentPercentage}% Complete</div>
                        </div>
                    </div>
                    
                    <!-- Transaction History -->
                    <div class="transaction-history">
                        <h3>Transaction History</h3>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Transaction ID</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactionsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('payment-history-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Close modal when clicking outside
    modalContainer.querySelector('.modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// View disbursement details
function viewDisbursementDetails(disbursementId) {
    const disbursement = disbursements.find(d => d.id === disbursementId);
    
    if (!disbursement) {
        alert('Disbursement details not found');
        return;
    }
    
    // Format method
    let method = 'Unknown';
    switch(disbursement.method) {
        case 'bank_transfer':
            method = 'Bank Transfer';
            break;
        case 'mobile_money':
            method = 'Mobile Money';
            break;
        case 'cash':
            method = 'Cash';
            break;
        case 'check':
            method = 'Check';
            break;
    }
    
    // Create modal HTML
    const modalHtml = `
        <div id="disbursement-details-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Disbursement Details #${disbursement.id}</h2>
                    <span class="close-btn" onclick="document.getElementById('disbursement-details-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Loan ID:</span>
                            <span class="detail-value">${disbursement.loanId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Borrower:</span>
                            <span class="detail-value">${disbursement.borrowerName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">KSh ${(disbursement.amount || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Disbursement Date:</span>
                            <span class="detail-value">${new Date(disbursement.disbursementDate).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Method:</span>
                            <span class="detail-value">${method}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="status-badge ${disbursement.status || 'pending'}">${disbursement.status || 'Pending'}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('disbursement-details-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Close modal when clicking outside
    modalContainer.querySelector('.modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// View repayment details
function viewRepaymentDetails(repaymentId) {
    // Extract loan ID and payment number from the repayment ID
    const [loanId, paymentNumber] = repaymentId.split('-');
    
    // Find the repayment
    const repayment = repayments.find(r => r.loanId === loanId && r.paymentNumber.toString() === paymentNumber);
    
    if (!repayment) {
        alert('Repayment details not found');
        return;
    }
    
    // Create modal HTML
    const modalHtml = `
        <div id="repayment-details-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Repayment Details #${repayment.loanId}-${repayment.paymentNumber}</h2>
                    <span class="close-btn" onclick="document.getElementById('repayment-details-modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="detail-label">Loan ID:</span>
                            <span class="detail-value">${repayment.loanId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Borrower:</span>
                            <span class="detail-value">${repayment.borrowerName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Payment Number:</span>
                            <span class="detail-value">${repayment.paymentNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Due Date:</span>
                            <span class="detail-value">${new Date(repayment.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Amount Due:</span>
                            <span class="detail-value">KSh ${(repayment.amountDue || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Principal:</span>
                            <span class="detail-value">KSh ${(repayment.principal || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Interest:</span>
                            <span class="detail-value">KSh ${(repayment.interest || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="status-badge ${repayment.status || 'pending'}">${repayment.status || 'Pending'}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('repayment-details-modal').remove()">Close</button>
                    ${repayment.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="recordPayment('${repaymentId}'); document.getElementById('repayment-details-modal').remove();">
                        <i class="fas fa-money-bill-wave"></i> Record Payment
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Close modal when clicking outside
    modalContainer.querySelector('.modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// Record a payment
function recordPayment(repaymentId) {
    // Extract loan ID and payment number from the repayment ID
    const [loanId, paymentNumber] = repaymentId.split('-');
    
    // Find the repayment
    const repaymentIndex = repayments.findIndex(r => r.loanId === loanId && r.paymentNumber.toString() === paymentNumber);
    
    if (repaymentIndex === -1) {
        alert('Repayment not found');
        return;
    }
    
    // In a real application, this would open a payment form and process the payment
    // For now, we'll just update the status
    repayments[repaymentIndex].status = 'paid';
    
    // Update the UI
    updateRepaymentsTable();
    
    // Show success message
    alert(`Payment for ${loanId} (Payment #${paymentNumber}) has been recorded successfully.`);
}

// Open the loan application modal
function openLoanApplicationModal() {
    // Populate borrowers dropdown (in a real app, this would be from an API)
    const borrowerSelect = document.getElementById('borrower');
    if (borrowerSelect) {
        borrowerSelect.innerHTML = `
            <option value="">Select Borrower</option>
            <option value="1">John Doe (ID12345678)</option>
            <option value="2">Jane Smith (ID23456789)</option>
            <option value="3">Michael Johnson (ID34567890)</option>
            <option value="4">Sarah Williams (ID45678901)</option>
            <option value="5">David Brown (ID56789012)</option>
        `;
    }
    
    // Reset form
    const loanForm = document.getElementById('loan-application-form');
    if (loanForm) {
        loanForm.reset();
    }
    
    // Show modal
    const modal = document.getElementById('loan-application-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Submit loan application
function submitLoanApplication() {
    // Get form data
    const borrowerId = document.getElementById('borrower').value;
    const amount = document.getElementById('loan-amount').value;
    const term = document.getElementById('loan-term').value;
    const interestRate = document.getElementById('interest-rate').value;
    const purpose = document.getElementById('loan-purpose').value;
    
    // Validate form data
    if (!borrowerId || !amount || !term || !interestRate || !purpose) {
        alert('Please fill in all required fields');
        return;
    }
    
    // In a real application, this would be an API call to create a new loan
    // For now, we'll just add it to our sample data
    const newLoan = {
        id: `L-${Math.floor(Math.random() * 1000)}`,
        borrowerName: document.getElementById('borrower').options[document.getElementById('borrower').selectedIndex].text.split(' (')[0],
        borrowerPhone: '+254' + Math.floor(Math.random() * 900000000 + 100000000),
        borrowerEmail: document.getElementById('borrower').options[document.getElementById('borrower').selectedIndex].text.split(' (')[0].replace(' ', '.').toLowerCase() + '@example.com',
        amount: parseFloat(amount),
        term: parseInt(term),
        interestRate: parseFloat(interestRate),
        purpose: purpose,
        applicationDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        idNumber: document.getElementById('borrower').options[document.getElementById('borrower').selectedIndex].text.split('(')[1].replace(')', '')
    };
    
    // Add to sample data
    allLoans.unshift(newLoan);
    
    // Close modal
    document.getElementById('loan-application-modal').style.display = 'none';
    
    // Reload loans
    loadApplications();
    
    // Show success message
    alert(`Loan application for ${newLoan.borrowerName} has been submitted successfully.`);
}

// Export functions for testing or other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadTabData,
        updateApplicationsTable,
        updateActiveLoansTable,
        updateDisbursementsTable,
        updateRepaymentsTable,
        switchTab,
        performSearch,
        viewLoanDetails,
        viewDisbursementDetails,
        viewRepaymentDetails,
        recordPayment
    };
}