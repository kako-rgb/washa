// Dashboard functionality for Washa Enterprises

// Global variables
let dashboardData = {
    totalUsers: 0,
    activeLoans: 0,
    totalDisbursed: 0,
    overdueLoans: 0,
    totalDefaultedAmount: 0,
    connectedUsers: 0,
    recentActivities: []
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardData();
    
    // Set up auto-refresh every 5 minutes
    setInterval(loadDashboardData, 5 * 60 * 1000);
    
    // Set up manual refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }
    
    // Set up import data button
    const importBtn = document.getElementById('import-data');
    if (importBtn) {
        importBtn.addEventListener('click', importData);
    }
});

// Function to import data from JSON files
async function importData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading state
        updateLoadingState(true);
        
        // Change button text
        const importBtn = document.getElementById('import-data');
        if (importBtn) {
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Importing...';
        }
        
        // Call the import API
        const response = await fetch('/api/import-data', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Import completed:', data);
            
            // Show success message
            showMessage(`Import completed successfully. Imported: ${data.stats.imported}, Skipped: ${data.stats.skipped}, Errors: ${data.stats.errors}`, 'success');
            
            // Refresh dashboard data
            loadDashboardData();
        } else {
            const errorData = await response.json();
            console.error('Import failed:', errorData);
            showMessage(`Import failed: ${errorData.message}`, 'error');
        }
    } catch (error) {
        console.error('Error importing data:', error);
        showMessage(`Error importing data: ${error.message}`, 'error');
    } finally {
        // Reset button
        const importBtn = document.getElementById('import-data');
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.innerHTML = '<i class="fas fa-file-import me-1"></i> Import Data';
        }
        
        // Hide loading state
        updateLoadingState(false);
    }
}

// Load dashboard data from the server with optimizations
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading state
        updateLoadingState(true);
        
        try {
            // Fetch only the data we need for the initial view
            const [summaryResponse, recentLoansResponse, usersResponse, activeSessionsResponse] = await Promise.all([
                // Get summary statistics
                fetch('/api/dashboard/summary', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // Get only recent loans (last 5)
                fetch('/api/loans/recent?limit=5', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // Get user count (lightweight)
                fetch('/api/users/count', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // Get active sessions count
                fetch('/api/sessions/active', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(err => {
                    console.warn('Could not fetch active sessions:', err);
                    return { ok: false };
                })
            ]);
            
            // Process summary data
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                
                // Ensure numeric values are properly parsed
                const processedData = {
                    ...summaryData,
                    activeLoans: parseInt(summaryData.activeLoans) || 0,
                    issuedLoans: parseInt(summaryData.issuedLoans) || 0,
                    overdueLoans: parseInt(summaryData.overdueLoans) || 0,
                    totalDisbursed: parseFloat(summaryData.totalDisbursed) || 0,
                    totalDefaultedAmount: parseFloat(summaryData.totalDefaultedAmount) || 0
                };
                
                dashboardData = { ...dashboardData, ...processedData };
                console.log('Dashboard data loaded:', dashboardData);
            } else {
                throw new Error('Failed to fetch summary data');
            }
            
            // Process recent loans
            if (recentLoansResponse.ok) {
                const recentLoans = await recentLoansResponse.json();
                dashboardData.recentActivities = recentLoans.data.map(loan => ({
                    id: loan._id,
                    type: 'loan',
                    title: `New ${loan.status || 'pending'} loan`,
                    description: `${loan.borrower?.fullName || 'Unknown'} - KSh ${(loan.amount || 0).toLocaleString()}`,
                    date: new Date(loan.date || new Date()).toLocaleDateString(),
                    icon: getActivityIcon('loan')
                }));
            }
            
            // Process user count - this will be the total registered users
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                dashboardData.totalUsers = usersData.count || 0;
            }
            
            // Process active sessions count - this will be the connected users
            if (activeSessionsResponse && activeSessionsResponse.ok) {
                const sessionsData = await activeSessionsResponse.json();
                dashboardData.connectedUsers = sessionsData.count || 1; // Default to 1 (current user)
            } else {
                // If we can't get active sessions, default to 1 (current user)
                dashboardData.connectedUsers = 1;
            }
            
            // Update the UI with the initial data
            updateDashboardUI();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data. Some features may be limited.');
            
            // Set default values for all dashboard metrics
            dashboardData.connectedUsers = 1; // At least the current user
            dashboardData.activeLoans = dashboardData.activeLoans || 0;
            dashboardData.issuedLoans = dashboardData.issuedLoans || 0; // Total number of loan users
            dashboardData.overdueLoans = dashboardData.overdueLoans || 0;
            dashboardData.totalDisbursed = dashboardData.totalDisbursed || 0;
            dashboardData.totalDefaultedAmount = dashboardData.totalDefaultedAmount || 0;
            
            // Update UI with default values
            updateDashboardUI();
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
        showError('An unexpected error occurred. Please try again.');
    } finally {
        updateLoadingState(false);
    }
}


// Process the dashboard data (kept for backward compatibility)
function processDashboardData(loans, users) {
    // This function is kept for backward compatibility
    // Most processing is now done on the server side
    dashboardData.totalUsers = users && users.length > 0 ? users.length : 1;
    
    // Total number of loans
    dashboardData.activeLoans = loans.length;
    
    // Count unique borrowers (loan users)
    const uniqueBorrowers = new Set();
    loans.forEach(loan => {
        if (loan.borrower && loan.borrower._id) {
            uniqueBorrowers.add(loan.borrower._id);
        } else if (loan.borrower && loan.borrower.phone) {
            uniqueBorrowers.add(loan.borrower.phone);
        } else if (loan.phone) {
            uniqueBorrowers.add(loan.phone);
        }
    });
    dashboardData.issuedLoans = uniqueBorrowers.size;
    
    // Count overdue loans
    dashboardData.overdueLoans = loans.filter(loan => {
        if (!loan.dueDate && !loan.disbursementDate && !loan.date) return false;
        
        // Use disbursementDate if available, otherwise fallback to dueDate or date
        const loanDate = loan.disbursementDate ? new Date(loan.disbursementDate) : 
                        (loan.dueDate ? new Date(loan.dueDate) : 
                        (loan.date ? new Date(loan.date) : null));
        
        if (!loanDate) return false;
        
        const fourWeeksLater = new Date(loanDate);
        fourWeeksLater.setDate(fourWeeksLater.getDate() + 28); // 4 weeks = 28 days
        
        return new Date() > fourWeeksLater && 
               loan.status && loan.status.toLowerCase() !== 'paid';
    }).length;
    
    // Calculate total disbursed amount - ensure we're working with numbers
    dashboardData.totalDisbursed = loans.reduce((sum, loan) => {
        // Make sure to parse the amount as a float and default to 0 if invalid
        const amount = parseFloat(loan.amount) || 0;
        return sum + amount;
    }, 0);
    
    dashboardData.recentActivities = loans
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5)
        .map(loan => ({
            id: loan._id,
            type: 'loan',
            title: `New ${loan.status || 'pending'} loan`,
            description: `${loan.borrower?.fullName || 'Unknown'} - KSh ${(loan.amount || 0).toLocaleString()}`,
            date: new Date(loan.date || new Date()).toLocaleDateString(),
            icon: getActivityIcon('loan')
        }));
    
    const statusCounts = {};
    loans.forEach(loan => {
        const status = loan.status ? loan.status.toLowerCase() : 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    dashboardData.loanDistribution = statusCounts;
}

// Update the dashboard UI with the latest data
function updateDashboardUI() {
    // Update connected users
    document.getElementById('total-users').textContent = dashboardData.connectedUsers.toLocaleString();
    
    // Update loan users (total number of unique borrowers)
    const issuedLoans = parseInt(dashboardData.issuedLoans) || 0;
    document.getElementById('active-loans').textContent = issuedLoans.toLocaleString() + ' users';
    
    // Update total disbursed (total amount of all loans)
    const totalDisbursed = parseFloat(dashboardData.totalDisbursed) || 0;
    document.getElementById('total-disbursed').textContent = `KSh ${totalDisbursed.toLocaleString()} total`;
    
    // Update overdue loans
    document.getElementById('overdue-loans').textContent = dashboardData.overdueLoans.toLocaleString();
    
    // Update defaulted amount (overdue loans amount)
    const defaultedAmountElement = document.getElementById('defaulted-amount');
    if (defaultedAmountElement) {
        const totalDefaultedAmount = parseFloat(dashboardData.totalDefaultedAmount) || 0;
        defaultedAmountElement.textContent = `KSh ${totalDefaultedAmount.toLocaleString()}`;
    }
    
    // Update recent activities
    const activityList = document.getElementById('activity-list');
    if (activityList) {
        if (dashboardData.recentActivities.length > 0) {
            activityList.innerHTML = dashboardData.recentActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <small>${activity.date}</small>
                    </div>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <p>No recent activities found</p>
                    </div>
                </div>`;
        }
    }
}


// Helper function to get activity icon
function getActivityIcon(type) {
    const icons = {
        'loan': 'fas fa-money-bill-wave',
        'payment': 'fas fa-credit-card',
        'user': 'fas fa-user',
        'default': 'fas fa-info-circle'
    };
    return icons[type] || icons.default;
}

// Update loading state
function updateLoadingState(isLoading) {
    const loadingElement = document.getElementById('loading-indicator');
    const contentElement = document.getElementById('dashboard-content');
    
    if (loadingElement && contentElement) {
        loadingElement.style.display = isLoading ? 'flex' : 'none';
        contentElement.style.opacity = isLoading ? '0.5' : '1';
        contentElement.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
}

// Show error message
function showError(message) {
    showMessage(message, 'error');
}

// Show message (success or error)
function showMessage(message, type = 'error') {
    const messageElement = document.getElementById('error-message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // Set color based on message type
        if (type === 'success') {
            messageElement.style.backgroundColor = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.borderColor = '#c3e6cb';
        } else {
            messageElement.style.backgroundColor = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.borderColor = '#f5c6cb';
        }
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}
