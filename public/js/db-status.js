// Database connection status component
class DBStatusIndicator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.connected = false;
        this.checkInterval = null;
    }

    connectedCallback() {
        this.render();
        this.checkStatus();
        // Check status every 30 seconds
        this.checkInterval = setInterval(() => this.checkStatus(), 30000);
    }

    disconnectedCallback() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/db/status');
            const data = await response.json();
            this.connected = data.connected;
            this.render();
        } catch (error) {
            console.error('Error checking DB status:', error);
            this.connected = false;
            this.render();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .db-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-left: 10px;
                    font-size: 12px;
                    color: #666;
                }
                .status-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    display: inline-block;
                }
                .status-dot.connected {
                    background-color: #4CAF50;
                    box-shadow: 0 0 5px #4CAF50;
                }
                .status-dot.disconnected {
                    background-color: #f44336;
                    box-shadow: 0 0 5px #f44336;
                }
            </style>
            <div class="db-status">
                <span class="status-dot ${this.connected ? 'connected' : 'disconnected'}"></span>
                <span>${this.connected ? 'Database Connected' : 'Offline Mode'}</span>
            </div>
        `;
    }
}

// Register the custom element
if (!customElements.get('db-status')) {
    customElements.define('db-status', DBStatusIndicator);
}

// Function to check database status and load data accordingly
async function loadLoansWithFallback() {
    try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }

        const response = await fetch('/api/loans/with-fallback', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle the response data structure correctly
        if (data.success) {
            console.log(`Loaded data from ${data.source}:`, data.data);
            
            // Check if data has a nested loans property (from database)
            let loansData;
            if (data.data && data.data.loans) {
                loansData = data.data.loans;
                console.log("DB Status: Using nested loans data structure");
            } else {
                // Direct data array (from previous changes)
                loansData = Array.isArray(data.data) ? data.data : [data.data];
                console.log("DB Status: Using direct data array structure");
            }
            
            updateLoansUI(loansData);
            
            if (data.source !== 'database') {
                showNotification('Working in offline mode. Some features may be limited.', 'warning');
            } else {
                console.log('Connected to database - using live data');
            }
        } else {
            throw new Error(data.message || 'Failed to load loan data');
        }
    } catch (error) {
        console.error('Error loading loans:', error);
        showNotification(error.message || 'Failed to load loan data. Please try again later.', 'error');
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // You can implement a notification system here
    // For now, we'll just log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Function to update the loans UI
function updateLoansUI(loans) {
    const loansTable = document.querySelector('#applications-table tbody');
    if (!loansTable) {
        console.warn('Loans table not found in the DOM');
        return;
    }

    // Clear existing rows
    loansTable.innerHTML = '';

    if (!loans || loans.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">No loan data available</td>';
        loansTable.appendChild(row);
        return;
    }
    
    console.log('Updating UI with loans:', loans);
    
    loans.forEach((loan, index) => {
        const row = document.createElement('tr');
        
        // Handle different data structures
        const borrower = loan.borrower || {};
        const borrowerName = borrower.fullName || loan.borrowerName || loan.fullName || 'N/A';
        const loanId = loan._id || loan.id || `L-${index + 1}`;
        
        // Handle different date formats
        const dateField = loan.date || loan.startDate || loan.disbursementDate || loan.createdAt || new Date();
        const formattedDate = new Date(dateField).toLocaleDateString();
        
        row.innerHTML = `
            <td>${loanId}</td>
            <td>${borrowerName}</td>
            <td>KSh ${(loan.amount || 0).toLocaleString()}</td>
            <td>${loan.term || '30'} days</td>
            <td>${loan.purpose || 'General'}</td>
            <td>${formattedDate}</td>
            <td><span class="status-badge ${loan.status || 'pending'}">${loan.status || 'Pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-view" data-id="${loanId}">View</button>
            </td>
        `;
        loansTable.appendChild(row);
    });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add the DB status indicator to the header
    const header = document.querySelector('.main-header .user-info');
    if (header) {
        const dbStatus = document.createElement('db-status');
        header.appendChild(dbStatus);
    }
    
    // Don't load loans here - let loan-management.js handle that
    // This prevents duplicate loading of loans
});
// This function is already defined above - removing duplicate