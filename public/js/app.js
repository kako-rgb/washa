// Main Application Logic

// Global variables
let sidebarActive = true;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize application components
function initializeApp() {
    setupSidebar();
    setupTabNavigation();
    setupModals();
    setupMobileNavbarActions();
    
    // Initialize page-specific functionality
    if (window.location.pathname.includes('dashboard.html')) {
        initializeDashboard();
    } else if (window.location.pathname.includes('user-management.html')) {
        initializeUserManagement();
    } else if (window.location.pathname.includes('loan-management.html')) {
        initializeLoanManagement();
    } else if (window.location.pathname.includes('payment-processing.html')) {
        initializePaymentProcessing();
    } else if (window.location.pathname.includes('reports.html')) {
        initializeReports();
    }
}

// Setup mobile navbar actions
function setupMobileNavbarActions() {
    // Mobile change password button
    const mobileChangePasswordBtn = document.getElementById('mobile-change-password-btn');
    if (mobileChangePasswordBtn) {
        mobileChangePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const changePasswordModal = document.getElementById('changePasswordModal');
            if (changePasswordModal) {
                changePasswordModal.style.display = 'block';
            }
        });
    }
    
    // Mobile logout button
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined' && auth.logout) {
                auth.logout();
            } else {
                // Fallback if auth object is not available
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    }
}

// Setup sidebar toggle functionality
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile view - slide in/out
                sidebar.classList.toggle('active');
            } else {
                // Desktop view - collapse/expand
                sidebar.classList.toggle('sidebar-collapsed');
                sidebarActive = !sidebarActive;
            }
        });
    }
}

// Setup tab navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and buttons
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                // Add active class to selected tab and button
                button.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }
}

// Setup modal functionality
function setupModals() {
    // Get all modal triggers and modals
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const closeButtons = document.querySelectorAll('.close-btn, [data-close-modal]');
    const cancelButtons = document.querySelectorAll('[data-cancel]');
    
    // Setup modal open triggers
    if (modalTriggers.length > 0) {
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const modalId = trigger.getAttribute('data-modal');
                const modal = document.getElementById(modalId);
                
                if (modal) {
                    modal.classList.add('active');
                }
            });
        });
    }
    
    // Setup close buttons
    if (closeButtons.length > 0) {
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    // Setup cancel buttons
    if (cancelButtons.length > 0) {
        cancelButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    // Close modal when clicking outside content
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
            e.target.classList.remove('active');
        }
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="close-notification">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add active class after a small delay for animation
    setTimeout(() => {
        notification.classList.add('active');
    }, 10);
    
    // Setup close button
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.classList.remove('active');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Create status badge element
function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-${status.toLowerCase()}`;
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    return badge;
}

// Create action buttons for tables
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

// Initialize dashboard
function initializeDashboard() {
    // This will be implemented when connecting to the backend
    console.log('Dashboard initialized');
}

// Initialize user management
function initializeUserManagement() {
    // This will be implemented when connecting to the backend
    console.log('User Management initialized');
}

// Initialize loan management
function initializeLoanManagement() {
    // This will be implemented when connecting to the backend
    console.log('Loan Management initialized');
}

// Initialize payment processing
function initializePaymentProcessing() {
    // This will be implemented when connecting to the backend
    console.log('Payment Processing initialized');
}

// Initialize reports
function initializeReports() {
    // This will be implemented when connecting to the backend
    console.log('Reports initialized');
    
    // Setup date range selection
    const dateRangeSelect = document.getElementById('date-range');
    const customDateRange = document.getElementById('custom-date-range');
    
    if (dateRangeSelect && customDateRange) {
        dateRangeSelect.addEventListener('change', () => {
            if (dateRangeSelect.value === 'custom') {
                customDateRange.classList.add('active');
            } else {
                customDateRange.classList.remove('active');
            }
        });
    }
}

// Export utility functions for use in other modules
window.app = {
    formatCurrency,
    formatDate,
    showNotification,
    createStatusBadge,
    createActionButtons
};
