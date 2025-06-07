// Loan Management Module

// Global variables
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://washaenterprises.vercel.app/api';
let loans = [];
let applications = [];
let disbursements = [];
let repayments = [];
let currentPage = 1;
let totalPages = 1;
let activeTab = 'applications';
let searchTerm = '';
let statusFilter = '';

// Initialize loan management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('loan-management.html')) {
        initializeLoanManagement();
    }
});

// Initialize loan management page
function initializeLoanManagement() {
    setupLoanEventListeners();
    loadLoans();
}

// Setup event listeners for loan management
function setupLoanEventListeners() {
    // New loan application button
    const newLoanBtn = document.getElementById('new-loan-application-btn');
    if (newLoanBtn) {
        newLoanBtn.addEventListener('click', () => {
            openLoanApplicationModal();
        });
    }
    
    // Loan application form submission
    const loanForm = document.getElementById('loan-application-form');
    if (loanForm) {
        loanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveLoanApplication();
        });
    }
    
    // Cancel loan form
    const cancelLoanForm = document.getElementById('cancel-loan-form');
    if (cancelLoanForm) {
        cancelLoanForm.addEventListener('click', () => {
            closeLoanModal();
        });
    }
    
    // Close loan modal
    const closeLoanModal = document.getElementById('close-loan-modal');
    if (closeLoanModal) {
        closeLoanModal.addEventListener('click', () => {
            closeLoanModal();
        });
    }
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                activeTab = button.getAttribute('data-tab');
                loadLoans();
            });
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('loan-search');
    const searchBtn = document.getElementById('search-btn');
    const searchType = document.getElementById('search-type');
    
    if (searchInput && searchBtn && searchType) {
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
                loadLoans();
                
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
            loadLoans();
        });
        
        // Keep existing Enter key functionality
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // Clear timeout and search immediately
                clearTimeout(searchTimeout);
                searchTerm = searchInput.value.trim();
                currentPage = 1;
                loadLoans();
            }
        });
    }
    
    // Status filter
    const statusFilterSelect = document.getElementById('status-filter');
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener('change', () => {
            statusFilter = statusFilterSelect.value;
            currentPage = 1;
            loadLoans();
        });
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadLoans();
            }
        });
        
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadLoans();
            }
        });
    }
    
    // Loan review modal
    const approveLoanBtn = document.getElementById('approve-loan-btn');
    const rejectLoanBtn = document.getElementById('reject-loan-btn');
    
    if (approveLoanBtn) {
        approveLoanBtn.addEventListener('click', () => {
            const loanId = approveLoanBtn.getAttribute('data-loan-id');
            const notes = document.getElementById('review-notes').value;
            updateLoanStatus(loanId, 'approved', notes);
        });
    }
    
    if (rejectLoanBtn) {
        rejectLoanBtn.addEventListener('click', () => {
            const loanId = rejectLoanBtn.getAttribute('data-loan-id');
            const notes = document.getElementById('review-notes').value;
            updateLoanStatus(loanId, 'rejected', notes);
        });
    }
    
    // Disbursement form
    const disbursementForm = document.getElementById('disbursement-form');
    if (disbursementForm) {
        disbursementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const loanId = document.getElementById('confirm-disbursement').getAttribute('data-loan-id');
            disburseLoan(loanId);
        });
    }
}

// Load loans from API based on active tab
function loadLoans() {
    let tableId, endpoint;
    
    switch (activeTab) {
        case 'applications':
            tableId = 'applications-table';
            endpoint = 'loan-applications';
            break;
        case 'active-loans':
            tableId = 'active-loans-table';
            endpoint = 'active-loans';
            break;
        case 'disbursements':
            tableId = 'disbursements-table';
            endpoint = 'disbursements';
            break;
        case 'repayments':
            tableId = 'repayments-table';
            endpoint = 'repayment-schedules';
            break;
        default:
            tableId = 'applications-table';
            endpoint = 'loan-applications';
    }
    
    const table = document.getElementById(tableId);
    const tableBody = table.querySelector('tbody');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    // Show loading state
    tableBody.innerHTML = `<tr><td colspan="8" class="loading-message">Loading ${activeTab.replace('-', ' ')}...</td></tr>`;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', currentPage);
    queryParams.append('limit', 10);
    
    if (searchTerm) {
        const searchTypeValue = document.getElementById('search-type')?.value || 'all';
        if (searchTypeValue === 'name') {
            queryParams.append('name', searchTerm);
        } else if (searchTypeValue === 'phone') {
            queryParams.append('phone', searchTerm);
        } else if (searchTypeValue === 'id') {
            queryParams.append('id', searchTerm);
        } else {
            queryParams.append('search', searchTerm);
        }
    }
    
    if (statusFilter) {
        queryParams.append('status', statusFilter);
    }
    
    // Fetch data from API
    fetch(`${API_URL}/${endpoint}?${queryParams.toString()}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load ${activeTab.replace('-', ' ')}`);
        }
        return response.json();
    })
    .then(data => {
        // Store data based on active tab
        switch (activeTab) {
            case 'applications':
                applications = data.applications || data.items || [];
                break;
            case 'active-loans':
                loans = data.loans || data.items || [];
                break;
            case 'disbursements':
                disbursements = data.disbursements || data.items || [];
                break;
            case 'repayments':
                repayments = data.repayments || data.items || [];
                break;
        }
        
        totalPages = data.totalPages || 1;
        
        // Update pagination
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        // Render data based on active tab
        switch (activeTab) {
            case 'applications':
                renderApplications(tableBody);
                break;
            case 'active-loans':
                renderActiveLoans(tableBody);
                break;
            case 'disbursements':
                renderDisbursements(tableBody);
                break;
            case 'repayments':
                renderRepayments(tableBody);
                break;
        }
    })
    .catch(error => {
        console.error(`Error loading ${activeTab.replace('-', ' ')}:`, error);
        tableBody.innerHTML = `<tr><td colspan="8" class="error-message">Error loading data: ${error.message}</td></tr>`;
        
        // For development/demo purposes, load mock data
        loadMockData();
    });
}

// Load mock data for development/demo
function loadMockData() {
    switch (activeTab) {
        case 'applications':
            applications = [
                {
                    id: '1',
                    applicant: {
                        id: 'A1B2',
                        name: 'Alice Brown'
                    },
                    amount: 3000,
                    term: 8,
                    purpose: 'Small business',
                    applicationDate: '2025-04-15',
                    status: 'pending'
                },
                {
                    id: '2',
                    applicant: {
                        id: 'D3E4',
                        name: 'David Chen'
                    },
                    amount: 7500,
                    term: 18,
                    purpose: 'Equipment purchase',
                    applicationDate: '2025-04-20',
                    status: 'approved'
                },
                {
                    id: '3',
                    applicant: {
                        id: 'J5K6',
                        name: 'Jennifer Martinez'
                    },
                    amount: 2000,
                    term: 6,
                    purpose: 'Education',
                    applicationDate: '2025-05-01',
                    status: 'pending'
                },
                {
                    id: '4',
                    applicant: {
                        id: 'M7N8',
                        name: 'Michael Johnson'
                    },
                    amount: 5000,
                    term: 12,
                    purpose: 'Business expansion',
                    applicationDate: '2025-05-05',
                    status: 'approved'
                },
                {
                    id: '5',
                    applicant: {
                        id: 'R9S1',
                        name: 'Robert Davis'
                    },
                    amount: 4500,
                    term: 10,
                    purpose: 'Home improvement',
                    applicationDate: '2025-05-10',
                    status: 'rejected'
                },
                {
                    id: '6',
                    applicant: {
                        id: 'S2T3',
                        name: 'Sarah Williams'
                    },
                    amount: 6000,
                    term: 15,
                    purpose: 'Medical expenses',
                    applicationDate: '2025-05-15',
                    status: 'pending'
                }
            ];
            
            const applicationsTable = document.getElementById('applications-table');
            const applicationsTableBody = applicationsTable.querySelector('tbody');
            renderApplications(applicationsTableBody);
            break;
            
        case 'active-loans':
            loans = [
                {
                    id: '1',
                    borrower: {
                        id: 'A1B2',
                        name: 'Alice Brown'
                    },
                    amount: 3000,
                    term: 8,
                    interestRate: 9.5,
                    startDate: '2025-04-20',
                    endDate: '2025-12-20',
                    status: 'active'
                },
                {
                    id: '2',
                    borrower: {
                        id: 'D3E4',
                        name: 'David Chen'
                    },
                    amount: 7500,
                    term: 18,
                    interestRate: 8.5,
                    startDate: '2025-04-25',
                    endDate: '2026-10-25',
                    status: 'active'
                },
                {
                    id: '3',
                    borrower: {
                        id: 'M7N8',
                        name: 'Michael Johnson'
                    },
                    amount: 5000,
                    term: 12,
                    interestRate: 10,
                    startDate: '2025-05-10',
                    endDate: '2026-05-10',
                    status: 'active'
                },
                {
                    id: '4',
                    borrower: {
                        id: 'S2T3',
                        name: 'Sarah Williams'
                    },
                    amount: 6000,
                    term: 15,
                    interestRate: 9,
                    startDate: '2025-05-20',
                    endDate: '2026-08-20',
                    status: 'active'
                }
            ];
            
            const loansTable = document.getElementById('active-loans-table');
            const loansTableBody = loansTable.querySelector('tbody');
            renderActiveLoans(loansTableBody);
            break;
            
        case 'disbursements':
            disbursements = [
                {
                    id: '1',
                    loanId: '1',
                    borrower: {
                        id: 'A1B2',
                        name: 'Alice Brown'
                    },
                    amount: 3000,
                    disbursementDate: '2025-04-20',
                    method: 'bank_transfer',
                    status: 'completed'
                },
                {
                    id: '2',
                    loanId: '2',
                    borrower: {
                        id: 'D3E4',
                        name: 'David Chen'
                    },
                    amount: 7500,
                    disbursementDate: '2025-04-25',
                    method: 'bank_transfer',
                    status: 'completed'
                },
                {
                    id: '3',
                    loanId: '3',
                    borrower: {
                        id: 'M7N8',
                        name: 'Michael Johnson'
                    },
                    amount: 5000,
                    disbursementDate: '2025-05-10',
                    method: 'mobile_money',
                    status: 'completed'
                },
                {
                    id: '4',
                    loanId: '4',
                    borrower: {
                        id: 'S2T3',
                        name: 'Sarah Williams'
                    },
                    amount: 6000,
                    disbursementDate: '2025-05-20',
                    method: 'bank_transfer',
                    status: 'pending'
                }
            ];
            
            const disbursementsTable = document.getElementById('disbursements-table');
            const disbursementsTableBody = disbursementsTable.querySelector('tbody');
            renderDisbursements(disbursementsTableBody);
            break;
            
        case 'repayments':
            repayments = [
                {
                    loanId: '1',
                    borrower: {
                        id: 'A1B2',
                        name: 'Alice Brown'
                    },
                    paymentNumber: 1,
                    dueDate: '2025-05-20',
                    amountDue: 395.50,
                    principal: 375.00,
                    interest: 20.50,
                    status: 'paid'
                },
                {
                    loanId: '1',
                    borrower: {
                        id: 'A1B2',
                        name: 'Alice Brown'
                    },
                    paymentNumber: 2,
                    dueDate: '2025-06-20',
                    amountDue: 395.50,
                    principal: 375.00,
                    interest: 20.50,
                    status: 'pending'
                },
                {
                    loanId: '2',
                    borrower: {
                        id: 'D3E4',
                        name: 'David Chen'
                    },
                    paymentNumber: 1,
                    dueDate: '2025-05-25',
                    amountDue: 468.75,
                    principal: 416.67,
                    interest: 52.08,
                    status: 'paid'
                },
                {
                    loanId: '3',
                    borrower: {
                        id: 'M7N8',
                        name: 'Michael Johnson'
                    },
                    paymentNumber: 1,
                    dueDate: '2025-06-10',
                    amountDue: 458.33,
                    principal: 416.67,
                    interest: 41.67,
                    status: 'pending'
                },
                {
                    loanId: '4',
                    borrower: {
                        id: 'S2T3',
                        name: 'Sarah Williams'
                    },
                    paymentNumber: 1,
                    dueDate: '2025-06-20',
                    amountDue: 445.00,
                    principal: 400.00,
                    interest: 45.00,
                    status: 'pending'
                }
            ];
            
            const repaymentsTable = document.getElementById('repayments-table');
            const repaymentsTableBody = repaymentsTable.querySelector('tbody');
            renderRepayments(repaymentsTableBody);
            break;
    }
    
    // Update pagination for mock data
    totalPages = 1;
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Render loan applications in table
function renderApplications(tableBody) {
    if (applications.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-message">No loan applications found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    applications.forEach(application => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${application.id}</td>
            <td>${application.applicant.name}</td>
            <td>${app.formatCurrency(application.amount)}</td>
            <td>${application.term} months</td>
            <td>${application.purpose}</td>
            <td>${app.formatDate(application.applicationDate)}</td>
            <td><span class="status-badge status-${application.status}">${application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add action buttons based on status
        const actionsCell = tr.querySelector('.actions-cell');
        let actions = [
            {
                type: 'view',
                icon: 'eye',
                label: 'View Application',
                handler: () => viewLoanApplication(application.id)
            }
        ];
        
        if (application.status === 'pending' && (auth.isAdmin() || auth.isLoanOfficer())) {
            actions.push({
                type: 'edit',
                icon: 'clipboard-check',
                label: 'Review Application',
                handler: () => reviewLoanApplication(application.id)
            });
        }
        
        if (application.status === 'approved' && (auth.isAdmin() || auth.isLoanOfficer())) {
            actions.push({
                type: 'edit',
                icon: 'money-bill-wave',
                label: 'Disburse Loan',
                handler: () => openDisbursementModal(application.id)
            });
        }
        
        const actionButtons = createActionButtons(actions);
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Render active loans in table
function renderActiveLoans(tableBody) {
    if (loans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="empty-message">No active loans found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    loans.forEach(loan => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${loan.id}</td>
            <td>${loan.borrower.name}</td>
            <td>${app.formatCurrency(loan.amount)}</td>
            <td>${loan.term} months</td>
            <td>${loan.interestRate}%</td>
            <td>${app.formatDate(loan.startDate)}</td>
            <td>${app.formatDate(loan.endDate)}</td>
            <td><span class="status-badge status-${loan.status}">${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add action buttons
        const actionsCell = tr.querySelector('.actions-cell');
        const actionButtons = createActionButtons([
            {
                type: 'view',
                icon: 'eye',
                label: 'View Loan Details',
                handler: () => viewLoanDetails(loan.id)
            },
            {
                type: 'edit',
                icon: 'file-invoice-dollar',
                label: 'View Repayment Schedule',
                handler: () => viewRepaymentSchedule(loan.id)
            }
        ]);
        
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Render disbursements in table
function renderDisbursements(tableBody) {
    if (disbursements.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-message">No disbursements found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    disbursements.forEach(disbursement => {
        const tr = document.createElement('tr');
        
        // Format method for display
        let methodDisplay = 'Unknown';
        switch(disbursement.method) {
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
        
        tr.innerHTML = `
            <td>${disbursement.id}</td>
            <td>${disbursement.loanId}</td>
            <td>${disbursement.borrower.name}</td>
            <td>${app.formatCurrency(disbursement.amount)}</td>
            <td>${app.formatDate(disbursement.disbursementDate)}</td>
            <td>${methodDisplay}</td>
            <td><span class="status-badge status-${disbursement.status}">${disbursement.status.charAt(0).toUpperCase() + disbursement.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add action buttons
        const actionsCell = tr.querySelector('.actions-cell');
        const actionButtons = createActionButtons([
            {
                type: 'view',
                icon: 'eye',
                label: 'View Disbursement Details',
                handler: () => viewDisbursementDetails(disbursement.id)
            },
            {
                type: 'edit',
                icon: 'print',
                label: 'Print Receipt',
                handler: () => printDisbursementReceipt(disbursement.id)
            }
        ]);
        
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Render repayment schedules in table
function renderRepayments(tableBody) {
    if (repayments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="empty-message">No repayment schedules found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    repayments.forEach(repayment => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${repayment.loanId}</td>
            <td>${repayment.borrower.name}</td>
            <td>${repayment.paymentNumber}</td>
            <td>${app.formatDate(repayment.dueDate)}</td>
            <td>${app.formatCurrency(repayment.amountDue)}</td>
            <td>${app.formatCurrency(repayment.principal)}</td>
            <td>${app.formatCurrency(repayment.interest)}</td>
            <td><span class="status-badge status-${repayment.status}">${repayment.status.charAt(0).toUpperCase() + repayment.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add action buttons
        const actionsCell = tr.querySelector('.actions-cell');
        let actions = [
            {
                type: 'view',
                icon: 'eye',
                label: 'View Payment Details',
                handler: () => viewPaymentDetails(repayment.loanId, repayment.paymentNumber)
            }
        ];
        
        if (repayment.status === 'pending' && (auth.isAdmin() || auth.isLoanOfficer())) {
            actions.push({
                type: 'edit',
                icon: 'money-bill',
                label: 'Record Payment',
                handler: () => recordPayment(repayment.loanId, repayment.paymentNumber)
            });
        }
        
        const actionButtons = createActionButtons(actions);
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Open loan application modal
function openLoanApplicationModal() {
    const modal = document.getElementById('loan-application-modal');
    const loanForm = document.getElementById('loan-application-form');
    
    // Reset form
    loanForm.reset();
    
    // Populate borrower dropdown
    populateBorrowerDropdown();
    
    // Show modal
    modal.classList.add('active');
}

// Close loan modal
function closeLoanModal() {
    const modal = document.getElementById('loan-application-modal');
    modal.classList.remove('active');
}

// Populate borrower dropdown
function populateBorrowerDropdown() {
    const borrowerSelect = document.getElementById('borrower');
    
    // Clear existing options except the first one
    while (borrowerSelect.options.length > 1) {
        borrowerSelect.remove(1);
    }
    
    // Fetch customers from API
    fetch(`${API_URL}/users?role=customer`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load customers');
        }
        return response.json();
    })
    .then(data => {
        const customers = data.users || [];
        
        // Add options for each customer
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            borrowerSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading customers:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes, add mock customers
        const mockCustomers = [
            { id: '3', name: 'Michael Johnson' },
            { id: '4', name: 'Sarah Williams' }
        ];
        
        mockCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            borrowerSelect.appendChild(option);
        });
    });
}

// Save loan application
function saveLoanApplication() {
    // Get form data
    const loanData = {
        borrowerId: document.getElementById('borrower').value,
        amount: parseFloat(document.getElementById('loan-amount').value),
        term: parseInt(document.getElementById('loan-term').value),
        interestRate: parseFloat(document.getElementById('interest-rate').value),
        purpose: document.getElementById('loan-purpose').value,
        applicationDate: new Date().toISOString().split('T')[0]
    };
    
    // Send request to API
    fetch(`${API_URL}/loan-applications`, {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify(loanData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save loan application');
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification('Loan application submitted successfully', 'success');
        
        // Close modal and reload applications
        closeLoanModal();
        loadLoans();
    })
    .catch(error => {
        console.error('Error saving loan application:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        const newApplication = {
            id: (Math.max(...applications.map(a => parseInt(a.id))) + 1).toString(),
            applicant: {
                id: loanData.borrowerId,
                name: document.getElementById('borrower').options[document.getElementById('borrower').selectedIndex].text
            },
            amount: loanData.amount,
            term: loanData.term,
            purpose: loanData.purpose,
            applicationDate: loanData.applicationDate,
            status: 'pending'
        };
        
        applications.push(newApplication);
        
        // Close modal and reload applications
        closeLoanModal();
        const applicationsTable = document.getElementById('applications-table');
        const tableBody = applicationsTable.querySelector('tbody');
        renderApplications(tableBody);
        app.showNotification('Loan application submitted successfully (Demo Mode)', 'success');
    });
}

// View loan application details
function viewLoanApplication(applicationId) {
    // Find application
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        app.showNotification('Application not found', 'error');
        return;
    }
    
    // Create and show modal with application details
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Loan Application Details</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="loan-details">
                    <div class="loan-details-row">
                        <div class="loan-details-label">Application ID:</div>
                        <div class="loan-details-value">${application.id}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Applicant:</div>
                        <div class="loan-details-value">${application.applicant.name}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Amount:</div>
                        <div class="loan-details-value">${app.formatCurrency(application.amount)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Term:</div>
                        <div class="loan-details-value">${application.term} months</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Purpose:</div>
                        <div class="loan-details-value">${application.purpose}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Application Date:</div>
                        <div class="loan-details-value">${app.formatDate(application.applicationDate)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Status:</div>
                        <div class="loan-details-value">
                            <span class="status-badge status-${application.status}">${application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-details">Close</button>
                    ${application.status === 'pending' && (auth.isAdmin() || auth.isLoanOfficer()) ? 
                        `<button type="button" class="btn btn-primary" id="review-from-details">Review Application</button>` : ''}
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
    
    // Setup review button if available
    const reviewBtn = viewModal.querySelector('#review-from-details');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            viewModal.remove();
            reviewLoanApplication(applicationId);
        });
    }
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Review loan application
function reviewLoanApplication(applicationId) {
    // Find application
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        app.showNotification('Application not found', 'error');
        return;
    }
    
    // Populate review modal
    const reviewModal = document.getElementById('loan-review-modal');
    const loanDetails = document.getElementById('loan-details');
    const reviewNotes = document.getElementById('review-notes');
    const approveLoanBtn = document.getElementById('approve-loan-btn');
    const rejectLoanBtn = document.getElementById('reject-loan-btn');
    
    // Reset form
    reviewNotes.value = '';
    
    // Populate loan details
    loanDetails.innerHTML = `
        <div class="loan-details-row">
            <div class="loan-details-label">Application ID:</div>
            <div class="loan-details-value">${application.id}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Applicant:</div>
            <div class="loan-details-value">${application.applicant.name}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Amount:</div>
            <div class="loan-details-value">${app.formatCurrency(application.amount)}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Term:</div>
            <div class="loan-details-value">${application.term} months</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Purpose:</div>
            <div class="loan-details-value">${application.purpose}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Application Date:</div>
            <div class="loan-details-value">${app.formatDate(application.applicationDate)}</div>
        </div>
    `;
    
    // Set loan ID for approve/reject buttons
    approveLoanBtn.setAttribute('data-loan-id', application.id);
    rejectLoanBtn.setAttribute('data-loan-id', application.id);
    
    // Show modal
    reviewModal.classList.add('active');
}

// Update loan status (approve/reject)
function updateLoanStatus(loanId, status, notes) {
    // Send request to API
    fetch(`${API_URL}/loan-applications/${loanId}/status`, {
        method: 'PUT',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify({
            status: status,
            notes: notes
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to ${status} loan application`);
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification(`Loan application ${status} successfully`, 'success');
        
        // Close modal and reload applications
        document.getElementById('loan-review-modal').classList.remove('active');
        loadLoans();
    })
    .catch(error => {
        console.error(`Error ${status}ing loan application:`, error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        const index = applications.findIndex(a => a.id === loanId);
        if (index !== -1) {
            applications[index].status = status;
            
            // Close modal and reload applications
            document.getElementById('loan-review-modal').classList.remove('active');
            const applicationsTable = document.getElementById('applications-table');
            const tableBody = applicationsTable.querySelector('tbody');
            renderApplications(tableBody);
            app.showNotification(`Loan application ${status} successfully (Demo Mode)`, 'success');
        }
    });
}

// Open disbursement modal
function openDisbursementModal(loanId) {
    // Find application
    const application = applications.find(a => a.id === loanId);
    if (!application) {
        app.showNotification('Application not found', 'error');
        return;
    }
    
    // Populate disbursement modal
    const disbursementModal = document.getElementById('disbursement-modal');
    const loanDetails = document.getElementById('disbursement-loan-details');
    const disbursementForm = document.getElementById('disbursement-form');
    const confirmDisbursementBtn = document.getElementById('confirm-disbursement');
    
    // Reset form
    disbursementForm.reset();
    
    // Set default date to today
    document.getElementById('disbursement-date').value = new Date().toISOString().split('T')[0];
    
    // Populate loan details
    loanDetails.innerHTML = `
        <div class="loan-details-row">
            <div class="loan-details-label">Loan ID:</div>
            <div class="loan-details-value">${application.id}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Borrower:</div>
            <div class="loan-details-value">${application.applicant.name}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Amount:</div>
            <div class="loan-details-value">${app.formatCurrency(application.amount)}</div>
        </div>
        <div class="loan-details-row">
            <div class="loan-details-label">Term:</div>
            <div class="loan-details-value">${application.term} months</div>
        </div>
    `;
    
    // Set loan ID for confirm button
    confirmDisbursementBtn.setAttribute('data-loan-id', application.id);
    
    // Show modal
    disbursementModal.classList.add('active');
}

// Disburse loan
function disburseLoan(loanId) {
    // Get form data
    const disbursementData = {
        method: document.getElementById('disbursement-method').value,
        disbursementDate: document.getElementById('disbursement-date').value,
        notes: document.getElementById('disbursement-notes').value
    };
    
    // Send request to API
    fetch(`${API_URL}/loans/${loanId}/disburse`, {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: JSON.stringify(disbursementData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to disburse loan');
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification('Loan disbursed successfully', 'success');
        
        // Close modal and reload applications
        document.getElementById('disbursement-modal').classList.remove('active');
        loadLoans();
    })
    .catch(error => {
        console.error('Error disbursing loan:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        const application = applications.find(a => a.id === loanId);
        if (application) {
            // Update application status
            application.status = 'disbursed';
            
            // Create new disbursement
            const newDisbursement = {
                id: (disbursements.length > 0 ? Math.max(...disbursements.map(d => parseInt(d.id))) + 1 : 1).toString(),
                loanId: loanId,
                borrower: {
                    id: application.applicant.id,
                    name: application.applicant.name
                },
                amount: application.amount,
                disbursementDate: disbursementData.disbursementDate,
                method: disbursementData.method,
                status: 'completed'
            };
            
            disbursements.push(newDisbursement);
            
            // Create new active loan
            const newLoan = {
                id: loanId,
                borrower: {
                    id: application.applicant.id,
                    name: application.applicant.name
                },
                amount: application.amount,
                term: application.term,
                interestRate: 10, // Default interest rate
                startDate: disbursementData.disbursementDate,
                endDate: new Date(new Date(disbursementData.disbursementDate).setMonth(new Date(disbursementData.disbursementDate).getMonth() + application.term)).toISOString().split('T')[0],
                status: 'active'
            };
            
            loans.push(newLoan);
            
            // Close modal and reload applications
            document.getElementById('disbursement-modal').classList.remove('active');
            loadLoans();
            app.showNotification('Loan disbursed successfully (Demo Mode)', 'success');
        }
    });
}

// View loan details
function viewLoanDetails(loanId) {
    // Find loan
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
        app.showNotification('Loan not found', 'error');
        return;
    }
    
    // Create and show modal with loan details
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Loan Details</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="loan-details">
                    <div class="loan-details-row">
                        <div class="loan-details-label">Loan ID:</div>
                        <div class="loan-details-value">${loan.id}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Borrower:</div>
                        <div class="loan-details-value">${loan.borrower.name}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Amount:</div>
                        <div class="loan-details-value">${app.formatCurrency(loan.amount)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Term:</div>
                        <div class="loan-details-value">${loan.term} months</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Interest Rate:</div>
                        <div class="loan-details-value">${loan.interestRate}%</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Start Date:</div>
                        <div class="loan-details-value">${app.formatDate(loan.startDate)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">End Date:</div>
                        <div class="loan-details-value">${app.formatDate(loan.endDate)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Status:</div>
                        <div class="loan-details-value">
                            <span class="status-badge status-${loan.status}">${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-details">Close</button>
                    <button type="button" class="btn btn-primary" id="view-schedule">View Repayment Schedule</button>
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
    
    // Setup view schedule button
    viewModal.querySelector('#view-schedule').addEventListener('click', () => {
        viewModal.remove();
        viewRepaymentSchedule(loanId);
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// View repayment schedule
function viewRepaymentSchedule(loanId) {
    // Find loan
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
        app.showNotification('Loan not found', 'error');
        return;
    }
    
    // Fetch repayment schedule from API
    fetch(`${API_URL}/loans/${loanId}/repayments`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load repayment schedule');
        }
        return response.json();
    })
    .then(data => {
        const schedule = data.repayments || [];
        displayRepaymentSchedule(loan, schedule);
    })
    .catch(error => {
        console.error('Error loading repayment schedule:', error);
        
        // For development/demo purposes, generate mock schedule
        const mockSchedule = generateMockRepaymentSchedule(loan);
        displayRepaymentSchedule(loan, mockSchedule);
    });
}

// Generate mock repayment schedule
function generateMockRepaymentSchedule(loan) {
    const schedule = [];
    const monthlyInterestRate = loan.interestRate / 100 / 12;
    const monthlyPayment = (loan.amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loan.term)) / (Math.pow(1 + monthlyInterestRate, loan.term) - 1);
    
    let remainingPrincipal = loan.amount;
    let startDate = new Date(loan.startDate);
    
    for (let i = 1; i <= loan.term; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const interest = remainingPrincipal * monthlyInterestRate;
        const principal = monthlyPayment - interest;
        remainingPrincipal -= principal;
        
        schedule.push({
            loanId: loan.id,
            borrower: loan.borrower,
            paymentNumber: i,
            dueDate: dueDate.toISOString().split('T')[0],
            amountDue: monthlyPayment,
            principal: principal,
            interest: interest,
            status: i === 1 ? 'paid' : 'pending'
        });
    }
    
    return schedule;
}

// Display repayment schedule
function displayRepaymentSchedule(loan, schedule) {
    // Create and show modal with repayment schedule
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Repayment Schedule</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="loan-details">
                    <div class="loan-details-row">
                        <div class="loan-details-label">Loan ID:</div>
                        <div class="loan-details-value">${loan.id}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Borrower:</div>
                        <div class="loan-details-value">${loan.borrower.name}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Amount:</div>
                        <div class="loan-details-value">${app.formatCurrency(loan.amount)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Term:</div>
                        <div class="loan-details-value">${loan.term} months</div>
                    </div>
                </div>
                
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Payment #</th>
                                <th>Due Date</th>
                                <th>Amount Due</th>
                                <th>Principal</th>
                                <th>Interest</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="schedule-body">
                            ${schedule.length === 0 ? 
                                '<tr><td colspan="6" class="empty-message">No repayment schedule found</td></tr>' : 
                                schedule.map(payment => `
                                    <tr>
                                        <td>${payment.paymentNumber}</td>
                                        <td>${app.formatDate(payment.dueDate)}</td>
                                        <td>${app.formatCurrency(payment.amountDue)}</td>
                                        <td>${app.formatCurrency(payment.principal)}</td>
                                        <td>${app.formatCurrency(payment.interest)}</td>
                                        <td><span class="status-badge status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-schedule">Close</button>
                    <button type="button" class="btn btn-primary" id="print-schedule">Print Schedule</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(viewModal);
    
    // Setup close button
    viewModal.querySelector('#close-view-modal').addEventListener('click', () => {
        viewModal.remove();
    });
    
    viewModal.querySelector('#close-schedule').addEventListener('click', () => {
        viewModal.remove();
    });
    
    // Setup print button
    viewModal.querySelector('#print-schedule').addEventListener('click', () => {
        printRepaymentSchedule(loan, schedule);
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Print repayment schedule
function printRepaymentSchedule(loan, schedule) {
    // Create print window
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content
    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Repayment Schedule - Loan #${loan.id}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                h1 {
                    color: #00395D;
                }
                .loan-details {
                    margin-bottom: 20px;
                }
                .loan-details-row {
                    display: flex;
                    margin-bottom: 5px;
                }
                .loan-details-label {
                    font-weight: bold;
                    width: 150px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #00395D;
                    color: white;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    text-align: center;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <h1>Repayment Schedule - Loan #${loan.id}</h1>
            
            <div class="loan-details">
                <div class="loan-details-row">
                    <div class="loan-details-label">Borrower:</div>
                    <div>${loan.borrower.name}</div>
                </div>
                <div class="loan-details-row">
                    <div class="loan-details-label">Loan Amount:</div>
                    <div>${app.formatCurrency(loan.amount)}</div>
                </div>
                <div class="loan-details-row">
                    <div class="loan-details-label">Term:</div>
                    <div>${loan.term} months</div>
                </div>
                <div class="loan-details-row">
                    <div class="loan-details-label">Interest Rate:</div>
                    <div>${loan.interestRate}%</div>
                </div>
                <div class="loan-details-row">
                    <div class="loan-details-label">Start Date:</div>
                    <div>${app.formatDate(loan.startDate)}</div>
                </div>
                <div class="loan-details-row">
                    <div class="loan-details-label">End Date:</div>
                    <div>${app.formatDate(loan.endDate)}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Payment #</th>
                        <th>Due Date</th>
                        <th>Amount Due</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedule.map(payment => `
                        <tr>
                            <td>${payment.paymentNumber}</td>
                            <td>${app.formatDate(payment.dueDate)}</td>
                            <td>${app.formatCurrency(payment.amountDue)}</td>
                            <td>${app.formatCurrency(payment.principal)}</td>
                            <td>${app.formatCurrency(payment.interest)}</td>
                            <td>${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Printed on ${new Date().toLocaleDateString()} | Washa Enterprises Loan Management System</p>
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

// View disbursement details
function viewDisbursementDetails(disbursementId) {
    // Find disbursement
    const disbursement = disbursements.find(d => d.id === disbursementId);
    if (!disbursement) {
        app.showNotification('Disbursement not found', 'error');
        return;
    }
    
    // Format method for display
    let methodDisplay = 'Unknown';
    switch(disbursement.method) {
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
    
    // Create and show modal with disbursement details
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Disbursement Details</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="loan-details">
                    <div class="loan-details-row">
                        <div class="loan-details-label">Disbursement ID:</div>
                        <div class="loan-details-value">${disbursement.id}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Loan ID:</div>
                        <div class="loan-details-value">${disbursement.loanId}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Borrower:</div>
                        <div class="loan-details-value">${disbursement.borrower.name}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Amount:</div>
                        <div class="loan-details-value">${app.formatCurrency(disbursement.amount)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Disbursement Date:</div>
                        <div class="loan-details-value">${app.formatDate(disbursement.disbursementDate)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Method:</div>
                        <div class="loan-details-value">${methodDisplay}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Status:</div>
                        <div class="loan-details-value">
                            <span class="status-badge status-${disbursement.status}">${disbursement.status.charAt(0).toUpperCase() + disbursement.status.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-details">Close</button>
                    <button type="button" class="btn btn-primary" id="print-receipt">Print Receipt</button>
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
    
    // Setup print button
    viewModal.querySelector('#print-receipt').addEventListener('click', () => {
        printDisbursementReceipt(disbursement.id);
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Print disbursement receipt
function printDisbursementReceipt(disbursementId) {
    // Find disbursement
    const disbursement = disbursements.find(d => d.id === disbursementId);
    if (!disbursement) {
        app.showNotification('Disbursement not found', 'error');
        return;
    }
    
    // Format method for display
    let methodDisplay = 'Unknown';
    switch(disbursement.method) {
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
            <title>Disbursement Receipt - #${disbursement.id}</title>
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
                    <p>Loan Disbursement Receipt</p>
                </div>
                
                <div class="details">
                    <div class="details-row">
                        <div class="details-label">Receipt Number:</div>
                        <div>${disbursement.id}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Date:</div>
                        <div>${app.formatDate(disbursement.disbursementDate)}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Loan ID:</div>
                        <div>${disbursement.loanId}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Borrower:</div>
                        <div>${disbursement.borrower.name}</div>
                    </div>
                    <div class="details-row">
                        <div class="details-label">Disbursement Method:</div>
                        <div>${methodDisplay}</div>
                    </div>
                </div>
                
                <div class="amount">
                    ${app.formatCurrency(disbursement.amount)}
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

// View payment details
function viewPaymentDetails(loanId, paymentNumber) {
    // Find payment
    const payment = repayments.find(p => p.loanId === loanId && p.paymentNumber === paymentNumber);
    if (!payment) {
        app.showNotification('Payment not found', 'error');
        return;
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
                    <div class="loan-details-row">
                        <div class="loan-details-label">Principal:</div>
                        <div class="loan-details-value">${app.formatCurrency(payment.principal)}</div>
                    </div>
                    <div class="loan-details-row">
                        <div class="loan-details-label">Interest:</div>
                        <div class="loan-details-value">${app.formatCurrency(payment.interest)}</div>
                    </div>
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
                        `<button type="button" class="btn btn-primary" id="record-payment-btn">Record Payment</button>` : ''}
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
    const recordPaymentBtn = viewModal.querySelector('#record-payment-btn');
    if (recordPaymentBtn) {
        recordPaymentBtn.addEventListener('click', () => {
            viewModal.remove();
            recordPayment(payment.loanId, payment.paymentNumber);
        });
    }
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Record payment
function recordPayment(loanId, paymentNumber) {
    // Redirect to payment processing page
    window.location.href = `payment-processing.html?loanId=${loanId}&paymentNumber=${paymentNumber}`;
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

// Export functions for use in other modules
window.loanManagement = {
    loadLoans,
    openLoanApplicationModal,
    saveLoanApplication,
    viewLoanApplication,
    reviewLoanApplication,
    updateLoanStatus,
    openDisbursementModal,
    disburseLoan,
    viewLoanDetails,
    viewRepaymentSchedule,
    viewDisbursementDetails,
    printDisbursementReceipt,
    viewPaymentDetails,
    recordPayment
};
