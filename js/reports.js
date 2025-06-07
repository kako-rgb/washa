// Reports Module

// Global variables
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://washaenterprises.vercel.app/api';
let reportData = null;
let reportType = 'loan_summary';
let dateRange = 'today'; // Changed default to today
let startDate = null;
let endDate = null;
let chart1 = null;
let chart2 = null;

// Define mock data for development/demo purposes
const MOCK_API = true; // Set to false when real API is available

// Initialize reports when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('reports.html')) {
        initializeReports();
    }
});

// Initialize reports page
function initializeReports() {
    setupReportEventListeners();
    setupDateRangeHandling();
    
    // Set default date range to today
    const today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Update the date range dropdown to show "Today" by default
    const dateRangeSelect = document.getElementById('date-range');
    if (dateRangeSelect) {
        dateRangeSelect.value = 'today';
    }
    
    // Update the date inputs with today's date
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && endDateInput) {
        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(endDate);
    }
    
    // Automatically generate report when page loads
    setTimeout(() => {
        generateReport();
    }, 100);
    
    // Add event listeners to automatically update reports when selections change
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', () => {
            reportType = reportTypeSelect.value;
            generateReport();
        });
    }
    
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', () => {
            dateRange = dateRangeSelect.value;
            
            if (dateRange === 'custom') {
                const customDateRange = document.getElementById('custom-date-range');
                if (customDateRange) {
                    customDateRange.classList.add('active');
                }
            } else {
                const customDateRange = document.getElementById('custom-date-range');
                if (customDateRange) {
                    customDateRange.classList.remove('active');
                }
                
                // Calculate date range and generate report
                const { start, end } = calculateDateRange(dateRange);
                startDate = start;
                endDate = end;
                
                // Update date inputs
                if (startDateInput && endDateInput) {
                    startDateInput.value = formatDateForInput(startDate);
                    endDateInput.value = formatDateForInput(endDate);
                }
                
                generateReport();
            }
        });
    }
    
    // Add event listeners for custom date inputs
    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            startDate = new Date(startDateInput.value);
            generateReport();
        });
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', () => {
            endDate = new Date(endDateInput.value);
            endDate.setHours(23, 59, 59);
            generateReport();
        });
    }
}

// Setup event listeners for reports
function setupReportEventListeners() {
    // Export report button
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', () => {
            openExportModal();
        });
    }
    
    // Print report button
    const printReportBtn = document.getElementById('print-report-btn');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => {
            printReport();
        });
    }
    
    // Export modal buttons
    const confirmExportBtn = document.getElementById('confirm-export');
    const cancelExportBtn = document.getElementById('cancel-export');
    const closeExportModalBtn = document.getElementById('close-export-modal');
    
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', () => {
            exportReport();
            document.getElementById('export-modal').classList.remove('active');
        });
    }
    
    if (cancelExportBtn) {
        cancelExportBtn.addEventListener('click', () => {
            document.getElementById('export-modal').classList.remove('active');
        });
    }
    
    if (closeExportModalBtn) {
        closeExportModalBtn.addEventListener('click', () => {
            document.getElementById('export-modal').classList.remove('active');
        });
    }
}

// Setup date range handling
function setupDateRangeHandling() {
    const dateRangeSelect = document.getElementById('date-range');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (dateRangeSelect && customDateRange) {
        // Set default dates
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        startDateInput.value = formatDateForInput(firstDayOfMonth);
        endDateInput.value = formatDateForInput(lastDayOfMonth);
    }
}

// Calculate date range based on selection
function calculateDateRange(range) {
    const today = new Date();
    let start, end;
    
    switch (range) {
        case 'today':
            start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case 'this_week':
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
            start = new Date(today.getFullYear(), today.getMonth(), diff);
            end = new Date(today.getFullYear(), today.getMonth(), diff + 6, 23, 59, 59);
            break;
        case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
            break;
        case 'this_year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            start = new Date(document.getElementById('start-date').value);
            end = new Date(document.getElementById('end-date').value);
            end.setHours(23, 59, 59);
            break;
        default:
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    }
    
    return { start, end };
}

// Format date for input fields
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Generate report
function generateReport() {
    const reportLoading = document.getElementById('report-loading');
    const reportDataElement = document.getElementById('report-data');
    const chartsSection = document.getElementById('charts-section');
    
    // Show loading state
    reportLoading.style.display = 'flex';
    reportDataElement.innerHTML = '';
    
    // Update date range if custom
    if (dateRange === 'custom') {
        startDate = new Date(document.getElementById('start-date').value);
        endDate = new Date(document.getElementById('end-date').value);
        endDate.setHours(23, 59, 59);
    }
    
    // If using mock data (for development/demo), skip API call
    if (MOCK_API) {
        setTimeout(() => {
            // Hide loading state
            reportLoading.style.display = 'none';
            
            // Generate mock data based on report type
            let mockData;
            
            switch (reportType) {
                case 'loan_summary':
                    mockData = generateMockLoanSummaryData();
                    renderLoanSummaryReport(mockData);
                    break;
                case 'payment_history':
                    mockData = generateMockPaymentHistoryData();
                    renderPaymentHistoryReport(mockData);
                    break;
                case 'user_activity':
                    mockData = generateMockUserActivityData();
                    renderUserActivityReport(mockData);
                    break;
                case 'overdue_loans':
                    mockData = generateMockOverdueLoansData();
                    renderOverdueLoansReport(mockData);
                    break;
                case 'disbursement_report':
                    mockData = generateMockDisbursementData();
                    renderDisbursementReport(mockData);
                    break;
                default:
                    mockData = generateMockLoanSummaryData();
                    renderLoanSummaryReport(mockData);
            }
            
            // Store report data globally
            reportData = mockData;
            
            // Show charts section
            chartsSection.style.display = 'grid';
            
            // Save report data to localStorage for persistence
            localStorage.setItem('lastReportData', JSON.stringify({
                type: reportType,
                data: mockData,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }));
        }, 500); // Simulate API delay
        
        return;
    }
    
    // Format dates for API
    const formattedStartDate = formatDateForInput(startDate);
    const formattedEndDate = formatDateForInput(endDate);
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('type', reportType);
    queryParams.append('startDate', formattedStartDate);
    queryParams.append('endDate', formattedEndDate);
    
    // Fetch report data from API
    fetch(`${API_URL}/reports?${queryParams.toString()}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        return response.json();
    })
    .then(data => {
        // Store report data globally for access by other functions
        reportData = data;
        
        // Hide loading state
        reportLoading.style.display = 'none';
        
        // Render report based on type
        switch (reportType) {
            case 'loan_summary':
                renderLoanSummaryReport(data);
                break;
            case 'payment_history':
                renderPaymentHistoryReport(data);
                break;
            case 'user_activity':
                renderUserActivityReport(data);
                break;
            case 'overdue_loans':
                renderOverdueLoansReport(data);
                break;
            case 'disbursement_report':
                renderDisbursementReport(data);
                break;
            default:
                renderLoanSummaryReport(data);
        }
        
        // Show charts section
        chartsSection.style.display = 'grid';
        
        // Save report data to localStorage for persistence
        localStorage.setItem('lastReportData', JSON.stringify({
            type: reportType,
            data: data,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        }));
    })
    .catch(error => {
        console.error('Error generating report:', error);
        
        // Hide loading state
        reportLoading.style.display = 'none';
        
        // Generate mock data instead of showing error
        let mockData;
        
        switch (reportType) {
            case 'loan_summary':
                mockData = generateMockLoanSummaryData();
                renderLoanSummaryReport(mockData);
                break;
            case 'payment_history':
                mockData = generateMockPaymentHistoryData();
                renderPaymentHistoryReport(mockData);
                break;
            case 'user_activity':
                mockData = generateMockUserActivityData();
                renderUserActivityReport(mockData);
                break;
            case 'overdue_loans':
                mockData = generateMockOverdueLoansData();
                renderOverdueLoansReport(mockData);
                break;
            case 'disbursement_report':
                mockData = generateMockDisbursementData();
                renderDisbursementReport(mockData);
                break;
            default:
                mockData = generateMockLoanSummaryData();
                renderLoanSummaryReport(mockData);
        }
        
        // Store report data globally
        reportData = mockData;
        
        // Show charts section
        chartsSection.style.display = 'grid';
    });
}

// Generate mock loan summary data
function generateMockLoanSummaryData() {
    return {
        totalLoans: 25,
        totalAmount: 125000,
        activeLoans: 18,
        activeAmount: 95000,
        completedLoans: 5,
        completedAmount: 20000,
        defaultedLoans: 2,
        defaultedAmount: 10000,
        averageLoanAmount: 5000,
        averageTerm: 12,
        monthlyData: [
            { month: 'Jan', disbursed: 15000, collected: 8000 },
            { month: 'Feb', disbursed: 20000, collected: 10000 },
            { month: 'Mar', disbursed: 25000, collected: 12000 },
            { month: 'Apr', disbursed: 18000, collected: 15000 },
            { month: 'May', disbursed: 22000, collected: 18000 }
        ],
        loansByPurpose: [
            { purpose: 'Business', count: 12, amount: 65000 },
            { purpose: 'Education', count: 5, amount: 25000 },
            { purpose: 'Home Improvement', count: 6, amount: 30000 },
            { purpose: 'Medical', count: 2, amount: 5000 }
        ]
    };
}

// Generate mock payment history data
function generateMockPaymentHistoryData() {
    return {
        totalPayments: 120,
        totalAmountCollected: 58000,
        onTimePayments: 100,
        latePayments: 20,
        averagePaymentAmount: 483.33,
        paymentsByMethod: [
            { method: 'Bank Transfer', count: 45, amount: 22000 },
            { method: 'Mobile Money', count: 60, amount: 30000 },
            { method: 'Cash', count: 10, amount: 4000 },
            { method: 'Check', count: 5, amount: 2000 }
        ],
        recentPayments: [
            { id: '1', loanId: '1', borrower: 'Michael Johnson', amount: 458.33, date: '2025-05-20', status: 'paid' },
            { id: '2', loanId: '2', borrower: 'Sarah Williams', amount: 346.67, date: '2025-05-18', status: 'paid' },
            { id: '3', loanId: '3', borrower: 'David Brown', amount: 512.50, date: '2025-05-15', status: 'paid' },
            { id: '4', loanId: '4', borrower: 'Emily Davis', amount: 625.00, date: '2025-05-12', status: 'paid' },
            { id: '5', loanId: '5', borrower: 'Robert Wilson', amount: 375.00, date: '2025-05-10', status: 'paid' }
        ],
        monthlyData: [
            { month: 'Jan', amount: 8000, count: 20 },
            { month: 'Feb', amount: 10000, count: 22 },
            { month: 'Mar', amount: 12000, count: 25 },
            { month: 'Apr', amount: 15000, count: 28 },
            { month: 'May', amount: 13000, count: 25 }
        ]
    };
}

// Generate mock user activity data
function generateMockUserActivityData() {
    return {
        totalUsers: 50,
        activeUsers: 42,
        inactiveUsers: 8,
        usersByRole: [
            { role: 'Admin', count: 3 },
            { role: 'Loan Officer', count: 7 },
            { role: 'Customer', count: 40 }
        ],
        newUsers: [
            { id: '1', name: 'John Smith', role: 'Customer', registrationDate: '2025-05-15' },
            { id: '2', name: 'Jane Doe', role: 'Loan Officer', registrationDate: '2025-05-10' },
            { id: '3', name: 'Michael Brown', role: 'Customer', registrationDate: '2025-05-08' },
            { id: '4', name: 'Sarah Johnson', role: 'Customer', registrationDate: '2025-05-05' },
            { id: '5', name: 'David Wilson', role: 'Customer', registrationDate: '2025-05-01' }
        ],
        userActivity: [
            { date: '2025-05-01', logins: 15, transactions: 8 },
            { date: '2025-05-02', logins: 12, transactions: 6 },
            { date: '2025-05-03', logins: 10, transactions: 5 },
            { date: '2025-05-04', logins: 8, transactions: 4 },
            { date: '2025-05-05', logins: 14, transactions: 7 }
        ]
    };
}

// Generate mock overdue loans data
function generateMockOverdueLoansData() {
    return {
        totalOverdueLoans: 8,
        totalOverdueAmount: 35000,
        overdueByDuration: [
            { duration: '1-30 days', count: 4, amount: 15000 },
            { duration: '31-60 days', count: 2, amount: 10000 },
            { duration: '61-90 days', count: 1, amount: 5000 },
            { duration: '90+ days', count: 1, amount: 5000 }
        ],
        overdueLoans: [
            { id: '1', borrower: 'John Smith', amount: 5000, dueDate: '2025-04-15', daysPastDue: 45 },
            { id: '2', borrower: 'Sarah Johnson', amount: 3000, dueDate: '2025-04-20', daysPastDue: 40 },
            { id: '3', borrower: 'Michael Brown', amount: 7000, dueDate: '2025-04-25', daysPastDue: 35 },
            { id: '4', borrower: 'Emily Davis', amount: 4000, dueDate: '2025-04-30', daysPastDue: 30 },
            { id: '5', borrower: 'David Wilson', amount: 6000, dueDate: '2025-05-05', daysPastDue: 25 }
        ],
        monthlyTrend: [
            { month: 'Jan', count: 5, amount: 20000 },
            { month: 'Feb', count: 6, amount: 25000 },
            { month: 'Mar', count: 7, amount: 30000 },
            { month: 'Apr', count: 8, amount: 35000 },
            { month: 'May', count: 7, amount: 30000 }
        ]
    };
}

// Generate mock disbursement data
function generateMockDisbursementData() {
    return {
        totalDisbursements: 25,
        totalDisbursedAmount: 125000,
        disbursementsByPurpose: [
            { purpose: 'Business', count: 12, amount: 65000 },
            { purpose: 'Education', count: 5, amount: 25000 },
            { purpose: 'Home Improvement', count: 6, amount: 30000 },
            { purpose: 'Medical', count: 2, amount: 5000 }
        ],
        recentDisbursements: [
            { id: '1', borrower: 'John Smith', amount: 5000, date: '2025-05-20', purpose: 'Business' },
            { id: '2', borrower: 'Sarah Johnson', amount: 3000, date: '2025-05-18', purpose: 'Education' },
            { id: '3', borrower: 'Michael Brown', amount: 7000, date: '2025-05-15', purpose: 'Business' },
            { id: '4', borrower: 'Emily Davis', amount: 4000, date: '2025-05-12', purpose: 'Home Improvement' },
            { id: '5', borrower: 'David Wilson', amount: 6000, date: '2025-05-10', purpose: 'Medical' }
        ],
        monthlyData: [
            { month: 'Jan', amount: 15000, count: 3 },
            { month: 'Feb', amount: 20000, count: 4 },
            { month: 'Mar', amount: 25000, count: 5 },
            { month: 'Apr', amount: 30000, count: 6 },
            { month: 'May', amount: 35000, count: 7 }
        ]
    };
}

// Open export modal
function openExportModal() {
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
        exportModal.classList.add('active');
    }
}

// Export report
function exportReport() {
    const exportFormat = document.querySelector('input[name="export-format"]:checked').value;
    
    // In a real application, this would call an API endpoint to generate the export
    console.log(`Exporting report in ${exportFormat} format`);
    
    // Show notification
    app.showNotification(`Report exported successfully in ${exportFormat.toUpperCase()} format.`, 'success');
}

// Print report
function printReport() {
    window.print();
}

// Render loan summary report
function renderLoanSummaryReport(data) {
    const reportData = document.getElementById('report-data');
    
    reportData.innerHTML = `
        <h2>Loan Summary Report</h2>
        <p class="report-period">Period: ${app.formatDate(startDate)} to ${app.formatDate(endDate)}</p>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="card-content">
                    <h3>Total Loans</h3>
                    <p>${data.totalLoans}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-content">
                    <h3>Total Amount</h3>
                    <p>${app.formatCurrency(data.totalAmount)}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="card-content">
                    <h3>Active Loans</h3>
                    <p>${data.activeLoans}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="card-content">
                    <h3>Defaulted Loans</h3>
                    <p>${data.defaultedLoans}</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>Loans by Purpose</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Purpose</th>
                        <th>Number of Loans</th>
                        <th>Total Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.loansByPurpose.map(item => `
                        <tr>
                            <td>${item.purpose}</td>
                            <td>${item.count}</td>
                            <td>${app.formatCurrency(item.amount)}</td>
                            <td>${((item.amount / data.totalAmount) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Render charts
    renderLoanSummaryCharts(data);
}

// Render payment history report
function renderPaymentHistoryReport(data) {
    const reportData = document.getElementById('report-data');
    
    reportData.innerHTML = `
        <h2>Payment History Report</h2>
        <p class="report-period">Period: ${app.formatDate(startDate)} to ${app.formatDate(endDate)}</p>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="card-content">
                    <h3>Total Payments</h3>
                    <p>${data.totalPayments}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-content">
                    <h3>Total Collected</h3>
                    <p>${app.formatCurrency(data.totalAmountCollected)}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="card-content">
                    <h3>On-Time Payments</h3>
                    <p>${data.onTimePayments}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="card-content">
                    <h3>Late Payments</h3>
                    <p>${data.latePayments}</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>Recent Payments</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Payment ID</th>
                        <th>Loan ID</th>
                        <th>Borrower</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.recentPayments.map(payment => `
                        <tr>
                            <td>${payment.id}</td>
                            <td>${payment.loanId}</td>
                            <td>${payment.borrower}</td>
                            <td>${app.formatCurrency(payment.amount)}</td>
                            <td>${app.formatDate(payment.date)}</td>
                            <td><span class="status-badge status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container">
            <h3>Payments by Method</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Number of Payments</th>
                        <th>Total Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.paymentsByMethod.map(item => `
                        <tr>
                            <td>${item.method}</td>
                            <td>${item.count}</td>
                            <td>${app.formatCurrency(item.amount)}</td>
                            <td>${((item.amount / data.totalAmountCollected) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Render charts
    renderPaymentHistoryCharts(data);
}

// Render user activity report
function renderUserActivityReport(data) {
    const reportData = document.getElementById('report-data');
    
    reportData.innerHTML = `
        <h2>User Activity Report</h2>
        <p class="report-period">Period: ${app.formatDate(startDate)} to ${app.formatDate(endDate)}</p>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="card-content">
                    <h3>Total Users</h3>
                    <p>${data.totalUsers}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="card-content">
                    <h3>Active Users</h3>
                    <p>${data.activeUsers}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-user-times"></i>
                </div>
                <div class="card-content">
                    <h3>Inactive Users</h3>
                    <p>${data.inactiveUsers}</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>Users by Role</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Number of Users</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.usersByRole.map(item => `
                        <tr>
                            <td>${item.role}</td>
                            <td>${item.count}</td>
                            <td>${((item.count / data.totalUsers) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container">
            <h3>New Users</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Registration Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.newUsers.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.name}</td>
                            <td>${user.role}</td>
                            <td>${app.formatDate(user.registrationDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Render charts
    renderUserActivityCharts(data);
}

// Render overdue loans report
function renderOverdueLoansReport(data) {
    const reportData = document.getElementById('report-data');
    
    reportData.innerHTML = `
        <h2>Overdue Loans Report</h2>
        <p class="report-period">Period: ${app.formatDate(startDate)} to ${app.formatDate(endDate)}</p>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="card-content">
                    <h3>Total Overdue Loans</h3>
                    <p>${data.totalOverdueLoans}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-content">
                    <h3>Total Overdue Amount</h3>
                    <p>${app.formatCurrency(data.totalOverdueAmount)}</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>Overdue by Duration</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Duration</th>
                        <th>Number of Loans</th>
                        <th>Total Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.overdueByDuration.map(item => `
                        <tr>
                            <td>${item.duration}</td>
                            <td>${item.count}</td>
                            <td>${app.formatCurrency(item.amount)}</td>
                            <td>${((item.amount / data.totalOverdueAmount) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container">
            <h3>Overdue Loans</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Loan ID</th>
                        <th>Borrower</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Days Past Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.overdueLoans.map(loan => `
                        <tr>
                            <td>${loan.id}</td>
                            <td>${loan.borrower}</td>
                            <td>${app.formatCurrency(loan.amount)}</td>
                            <td>${app.formatDate(loan.dueDate)}</td>
                            <td>${loan.daysPastDue}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Render charts
    renderOverdueLoansCharts(data);
}

// Render disbursement report
function renderDisbursementReport(data) {
    const reportData = document.getElementById('report-data');
    
    reportData.innerHTML = `
        <h2>Disbursement Report</h2>
        <p class="report-period">Period: ${app.formatDate(startDate)} to ${app.formatDate(endDate)}</p>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="card-content">
                    <h3>Total Disbursements</h3>
                    <p>${data.totalDisbursements}</p>
                </div>
            </div>
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-content">
                    <h3>Total Disbursed Amount</h3>
                    <p>${app.formatCurrency(data.totalDisbursedAmount)}</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <h3>Disbursements by Purpose</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Purpose</th>
                        <th>Number of Loans</th>
                        <th>Total Amount</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.disbursementsByPurpose.map(item => `
                        <tr>
                            <td>${item.purpose}</td>
                            <td>${item.count}</td>
                            <td>${app.formatCurrency(item.amount)}</td>
                            <td>${((item.amount / data.totalDisbursedAmount) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="table-container">
            <h3>Recent Disbursements</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Loan ID</th>
                        <th>Borrower</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Purpose</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.recentDisbursements.map(loan => `
                        <tr>
                            <td>${loan.id}</td>
                            <td>${loan.borrower}</td>
                            <td>${app.formatCurrency(loan.amount)}</td>
                            <td>${app.formatDate(loan.date)}</td>
                            <td>${loan.purpose}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Render charts
    renderDisbursementCharts(data);
}

// Render loan summary charts
function renderLoanSummaryCharts(data) {
    // Chart 1: Monthly Disbursements vs Collections
    const chart1Canvas = document.getElementById('chart1');
    const chart1Title = document.getElementById('chart1-title');
    
    if (chart1Canvas && chart1Title) {
        chart1Title.textContent = 'Monthly Disbursements vs Collections';
        
        if (chart1) {
            chart1.destroy();
        }
        
        const months = data.monthlyData.map(item => item.month);
        const disbursedAmounts = data.monthlyData.map(item => item.disbursed);
        const collectedAmounts = data.monthlyData.map(item => item.collected);
        
        chart1 = new Chart(chart1Canvas, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Disbursed',
                        data: disbursedAmounts,
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Collected',
                        data: collectedAmounts,
                        backgroundColor: 'rgba(40, 167, 69, 0.5)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (KES)'
                        }
                    }
                }
            }
        });
    }
    
    // Chart 2: Loans by Purpose
    const chart2Canvas = document.getElementById('chart2');
    const chart2Title = document.getElementById('chart2-title');
    
    if (chart2Canvas && chart2Title) {
        chart2Title.textContent = 'Loans by Purpose';
        
        if (chart2) {
            chart2.destroy();
        }
        
        const purposes = data.loansByPurpose.map(item => item.purpose);
        const amounts = data.loansByPurpose.map(item => item.amount);
        
        chart2 = new Chart(chart2Canvas, {
            type: 'pie',
            data: {
                labels: purposes,
                datasets: [
                    {
                        data: amounts,
                        backgroundColor: [
                            'rgba(0, 123, 255, 0.7)',
                            'rgba(40, 167, 69, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(220, 53, 69, 0.7)'
                        ],
                        borderColor: [
                            'rgba(0, 123, 255, 1)',
                            'rgba(40, 167, 69, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return `${label}: ${app.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Render payment history charts
function renderPaymentHistoryCharts(data) {
    // Chart 1: Monthly Payment Amounts
    const chart1Canvas = document.getElementById('chart1');
    const chart1Title = document.getElementById('chart1-title');
    
    if (chart1Canvas && chart1Title) {
        chart1Title.textContent = 'Monthly Payment Amounts';
        
        if (chart1) {
            chart1.destroy();
        }
        
        const months = data.monthlyData.map(item => item.month);
        const amounts = data.monthlyData.map(item => item.amount);
        
        chart1 = new Chart(chart1Canvas, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Payment Amount',
                        data: amounts,
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (KES)'
                        }
                    }
                }
            }
        });
    }
    
    // Chart 2: Payments by Method
    const chart2Canvas = document.getElementById('chart2');
    const chart2Title = document.getElementById('chart2-title');
    
    if (chart2Canvas && chart2Title) {
        chart2Title.textContent = 'Payments by Method';
        
        if (chart2) {
            chart2.destroy();
        }
        
        const methods = data.paymentsByMethod.map(item => item.method);
        const amounts = data.paymentsByMethod.map(item => item.amount);
        
        chart2 = new Chart(chart2Canvas, {
            type: 'pie',
            data: {
                labels: methods,
                datasets: [
                    {
                        data: amounts,
                        backgroundColor: [
                            'rgba(0, 123, 255, 0.7)',
                            'rgba(40, 167, 69, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(220, 53, 69, 0.7)'
                        ],
                        borderColor: [
                            'rgba(0, 123, 255, 1)',
                            'rgba(40, 167, 69, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return `${label}: ${app.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Render user activity charts
function renderUserActivityCharts(data) {
    // Chart 1: Users by Role
    const chart1Canvas = document.getElementById('chart1');
    const chart1Title = document.getElementById('chart1-title');
    
    if (chart1Canvas && chart1Title) {
        chart1Title.textContent = 'Users by Role';
        
        if (chart1) {
            chart1.destroy();
        }
        
        const roles = data.usersByRole.map(item => item.role);
        const counts = data.usersByRole.map(item => item.count);
        
        chart1 = new Chart(chart1Canvas, {
            type: 'pie',
            data: {
                labels: roles,
                datasets: [
                    {
                        data: counts,
                        backgroundColor: [
                            'rgba(0, 123, 255, 0.7)',
                            'rgba(40, 167, 69, 0.7)',
                            'rgba(255, 193, 7, 0.7)'
                        ],
                        borderColor: [
                            'rgba(0, 123, 255, 1)',
                            'rgba(40, 167, 69, 1)',
                            'rgba(255, 193, 7, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Chart 2: User Activity
    const chart2Canvas = document.getElementById('chart2');
    const chart2Title = document.getElementById('chart2-title');
    
    if (chart2Canvas && chart2Title) {
        chart2Title.textContent = 'Daily User Activity';
        
        if (chart2) {
            chart2.destroy();
        }
        
        const dates = data.userActivity.map(item => item.date);
        const logins = data.userActivity.map(item => item.logins);
        const transactions = data.userActivity.map(item => item.transactions);
        
        chart2 = new Chart(chart2Canvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Logins',
                        data: logins,
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Transactions',
                        data: transactions,
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }
}

// Render overdue loans charts
function renderOverdueLoansCharts(data) {
    // Chart 1: Overdue by Duration
    const chart1Canvas = document.getElementById('chart1');
    const chart1Title = document.getElementById('chart1-title');
    
    if (chart1Canvas && chart1Title) {
        chart1Title.textContent = 'Overdue by Duration';
        
        if (chart1) {
            chart1.destroy();
        }
        
        const durations = data.overdueByDuration.map(item => item.duration);
        const amounts = data.overdueByDuration.map(item => item.amount);
        
        chart1 = new Chart(chart1Canvas, {
            type: 'bar',
            data: {
                labels: durations,
                datasets: [
                    {
                        label: 'Overdue Amount',
                        data: amounts,
                        backgroundColor: [
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(255, 153, 0, 0.7)',
                            'rgba(255, 77, 77, 0.7)',
                            'rgba(220, 53, 69, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 193, 7, 1)',
                            'rgba(255, 153, 0, 1)',
                            'rgba(255, 77, 77, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (KES)'
                        }
                    }
                }
            }
        });
    }
    
    // Chart 2: Monthly Overdue Trend
    const chart2Canvas = document.getElementById('chart2');
    const chart2Title = document.getElementById('chart2-title');
    
    if (chart2Canvas && chart2Title) {
        chart2Title.textContent = 'Monthly Overdue Trend';
        
        if (chart2) {
            chart2.destroy();
        }
        
        const months = data.monthlyTrend.map(item => item.month);
        const amounts = data.monthlyTrend.map(item => item.amount);
        const counts = data.monthlyTrend.map(item => item.count);
        
        chart2 = new Chart(chart2Canvas, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Overdue Amount',
                        data: amounts,
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 2,
                        yAxisID: 'y',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Number of Overdue Loans',
                        data: counts,
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderColor: 'rgba(255, 193, 7, 1)',
                        borderWidth: 2,
                        yAxisID: 'y1',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Amount (KES)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }
}

// Render disbursement charts
function renderDisbursementCharts(data) {
    // Chart 1: Monthly Disbursements
    const chart1Canvas = document.getElementById('chart1');
    const chart1Title = document.getElementById('chart1-title');
    
    if (chart1Canvas && chart1Title) {
        chart1Title.textContent = 'Monthly Disbursements';
        
        if (chart1) {
            chart1.destroy();
        }
        
        const months = data.monthlyData.map(item => item.month);
        const amounts = data.monthlyData.map(item => item.amount);
        const counts = data.monthlyData.map(item => item.count);
        
        chart1 = new Chart(chart1Canvas, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Disbursed Amount',
                        data: amounts,
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Number of Disbursements',
                        data: counts,
                        type: 'line',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 2,
                        yAxisID: 'y1',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Amount (KES)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }
    
    // Chart 2: Disbursements by Purpose
    const chart2Canvas = document.getElementById('chart2');
    const chart2Title = document.getElementById('chart2-title');
    
    if (chart2Canvas && chart2Title) {
        chart2Title.textContent = 'Disbursements by Purpose';
        
        if (chart2) {
            chart2.destroy();
        }
        
        const purposes = data.disbursementsByPurpose.map(item => item.purpose);
        const amounts = data.disbursementsByPurpose.map(item => item.amount);
        
        chart2 = new Chart(chart2Canvas, {
            type: 'pie',
            data: {
                labels: purposes,
                datasets: [
                    {
                        data: amounts,
                        backgroundColor: [
                            'rgba(0, 123, 255, 0.7)',
                            'rgba(40, 167, 69, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(220, 53, 69, 0.7)'
                        ],
                        borderColor: [
                            'rgba(0, 123, 255, 1)',
                            'rgba(40, 167, 69, 1)',
                            'rgba(255, 193, 7, 1)',
                            'rgba(220, 53, 69, 1)'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(2);
                                return `${label}: ${app.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}