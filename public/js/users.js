// User Management Module

// Global variables
let API_URL;
if (typeof API_URL === 'undefined') {
    API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://washaenterprises.vercel.app/api';
}
let users = [];
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let roleFilter = '';

// Initialize user management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('user-management.html')) {
        initializeUserManagement();
    }
});

// Initialize user management page
function initializeUserManagement() {
    setupUserEventListeners();
    loadUsers();
}

// Setup event listeners for user management
function setupUserEventListeners() {
    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            openUserModal();
        });
    }
    
    // User form submission
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUser();
        });
    }
    
    // Cancel user form
    const cancelUserForm = document.getElementById('cancel-user-form');
    if (cancelUserForm) {
        cancelUserForm.addEventListener('click', () => {
            closeUserModal();
        });
    }
    
    // Close user modal
    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            closeUserModal();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('user-search');
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
                loadUsers();
                
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
            loadUsers();
        });
        
        // Keep existing Enter key functionality
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // Clear timeout and search immediately
                clearTimeout(searchTimeout);
                searchTerm = searchInput.value.trim();
                currentPage = 1;
                loadUsers();
            }
        });
    }
    
    // Role filter
    const roleFilterSelect = document.getElementById('role-filter');
    if (roleFilterSelect) {
        roleFilterSelect.addEventListener('change', () => {
            roleFilter = roleFilterSelect.value;
            currentPage = 1;
            loadUsers();
        });
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadUsers();
            }
        });
        
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadUsers();
            }
        });
    }
}

// Load users from API
function loadUsers() {
    const usersTable = document.getElementById('users-table');
    const tableBody = usersTable.querySelector('tbody');
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-message">Loading users...</td></tr>';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', currentPage);
    queryParams.append('limit', 10);
    
    if (searchTerm) {
        queryParams.append('search', searchTerm);
    }
    
    if (roleFilter) {
        queryParams.append('role', roleFilter);
    }
    
    // Fetch users from API
    fetch(`${API_URL}/users?${queryParams.toString()}`, {
        method: 'GET',
        headers: auth.getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        return response.json();
    })
    .then(data => {
        // Check if data.users exists, if not, use data directly
        if (data.users) {
            users = data.users;
        } else if (Array.isArray(data)) {
            users = data;
        } else {
            // If data is not in expected format, initialize as empty array
            users = [];
            console.warn('Unexpected data format received from API:', data);
        }
        
        totalPages = data.totalPages || 1;
        
        // Update pagination
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        // Render users
        renderUsers(tableBody);
    })
    .catch(error => {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-message">Error loading users: ${error.message}</td></tr>`;
        
        // For development/demo purposes, load mock data
        loadMockUsers();
    });
}

// Load mock users for development/demo
function loadMockUsers() {
    // Full mock users dataset
    const allMockUsers = [
        {
            id: '1',
            name: 'John Doe',
            phone: '+254712345678',
            email: 'john.doe@example.com',
            role: 'admin',
            status: 'active'
        },
        {
            id: '2',
            name: 'Jane Smith',
            phone: '+254723456789',
            email: 'jane.smith@example.com',
            role: 'loan_officer',
            status: 'active'
        },
        {
            id: '3',
            name: 'Michael Johnson',
            phone: '+254734567890',
            email: 'michael.johnson@example.com',
            role: 'customer',
            status: 'active'
        },
        {
            id: '4',
            name: 'Sarah Williams',
            phone: '+254745678901',
            email: 'sarah.williams@example.com',
            role: 'customer',
            status: 'inactive'
        },
        {
            id: '5',
            name: 'David Brown',
            phone: '+254756789012',
            email: 'david.brown@example.com',
            role: 'customer',
            status: 'active'
        },
        {
            id: '6',
            name: 'Emily Davis',
            phone: '+254767890123',
            email: 'emily.davis@example.com',
            role: 'loan_officer',
            status: 'active'
        },
        {
            id: '7',
            name: 'Robert Wilson',
            phone: '+254778901234',
            email: 'robert.wilson@example.com',
            role: 'customer',
            status: 'active'
        },
        {
            id: '8',
            name: 'Lisa Anderson',
            phone: '+254789012345',
            email: 'lisa.anderson@example.com',
            role: 'customer',
            status: 'inactive'
        }
    ];
    
    // Apply client-side filtering
    let filteredUsers = allMockUsers;
    
    // Apply search filter
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            return user.name.toLowerCase().includes(searchLower) ||
                   user.phone.toLowerCase().includes(searchLower) ||
                   user.id.toLowerCase().includes(searchLower) ||
                   user.email.toLowerCase().includes(searchLower);
        });
    }
    
    // Apply role filter
    if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }
    
    users = filteredUsers;
    totalPages = 1;
    
    // Update pagination
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Render users
    const usersTable = document.getElementById('users-table');
    const tableBody = usersTable.querySelector('tbody');
    renderUsers(tableBody);
}

// Render users in table
function renderUsers(tableBody) {
    // Check if users is defined and is an array
    if (!users || !Array.isArray(users)) {
        console.error('Users data is not an array:', users);
        tableBody.innerHTML = '<tr><td colspan="7" class="error-message">Error: Invalid user data format</td></tr>';
        return;
    }
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-message">No users found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        
        // Format role for display
        let roleDisplay = 'User';
        switch(user.role) {
            case 'admin':
                roleDisplay = 'Administrator';
                break;
            case 'loan_officer':
                roleDisplay = 'Loan Officer';
                break;
            case 'customer':
                roleDisplay = 'Customer';
                break;
        }
        
        // Check if user was imported from payment processing
        const isImported = user.isFromPaymentImport || user.source === 'payment_import';
        const importBadge = isImported ? '<span class="import-badge">IMPORTED</span>' : '';
        
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name} ${importBadge}</td>
            <td>${user.phone}</td>
            <td>${user.email}</td>
            <td>${roleDisplay}</td>
            <td><span class="status-badge status-${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
            <td class="actions-cell"></td>
        `;
        
        // Add special styling for imported users
        if (isImported) {
            tr.classList.add('imported-user');
        }
        
        // Add action buttons
        const actionsCell = tr.querySelector('.actions-cell');
        const actionButtons = createActionButtons([
            {
                type: 'view',
                icon: 'eye',
                label: 'View User',
                handler: () => viewUser(user.id)
            },
            {
                type: 'edit',
                icon: 'edit',
                label: 'Edit User',
                handler: () => editUser(user.id)
            },
            {
                type: 'delete',
                icon: 'trash-alt',
                label: 'Delete User',
                handler: () => deleteUser(user.id)
            }
        ]);
        
        actionsCell.appendChild(actionButtons);
        tableBody.appendChild(tr);
    });
}

// Open user modal for adding new user
function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const modalTitle = document.getElementById('modal-title');
    const userForm = document.getElementById('user-form');
    const userIdInput = document.getElementById('user-id');
    
    // Reset form
    userForm.reset();
    
    if (userId) {
        // Edit existing user
        modalTitle.textContent = 'Edit User';
        userIdInput.value = userId;
        
        // Find user data
        const user = users.find(u => u.id === userId);
        if (user) {
            document.getElementById('name').value = user.name;
            document.getElementById('phone').value = user.phone;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status;
            
            // Password field is optional when editing
            const passwordField = document.getElementById('password');
            passwordField.required = false;
        }
    } else {
        // Add new user
        modalTitle.textContent = 'Add New User';
        userIdInput.value = '';
        
        // Password is required for new users
        const passwordField = document.getElementById('password');
        passwordField.required = true;
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close user modal
function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('active');
}

// Save user (create or update)
function saveUser() {
    const userIdInput = document.getElementById('user-id');
    const userId = userIdInput.value;
    
    // Get form data
    const userData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        status: document.getElementById('status').value
    };
    
    // Add password if provided (required for new users)
    const password = document.getElementById('password').value;
    if (password) {
        userData.password = password;
    }
    
    // Determine if creating or updating
    const method = userId ? 'PUT' : 'POST';
    const url = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users`;
    
    // Send request to API
    fetch(url, {
        method: method,
        headers: auth.getAuthHeaders(),
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save user');
        }
        return response.json();
    })
    .then(data => {
        // Show success notification
        app.showNotification(`User ${userId ? 'updated' : 'created'} successfully`, 'success');
        
        // Close modal and reload users
        closeUserModal();
        loadUsers();
    })
    .catch(error => {
        console.error('Error saving user:', error);
        app.showNotification(`Error: ${error.message}`, 'error');
        
        // For development/demo purposes
        if (!userId) {
            // Simulate creating a new user
            const newUser = {
                id: (Math.max(...users.map(u => parseInt(u.id))) + 1).toString(),
                ...userData
            };
            users.push(newUser);
        } else {
            // Simulate updating an existing user
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index] = { ...users[index], ...userData };
            }
        }
        
        // Close modal and reload users
        closeUserModal();
        const usersTable = document.getElementById('users-table');
        const tableBody = usersTable.querySelector('tbody');
        renderUsers(tableBody);
        app.showNotification(`User ${userId ? 'updated' : 'created'} successfully (Demo Mode)`, 'success');
    });
}

// View user details
function viewUser(userId) {
    // Find user
    const user = users.find(u => u.id === userId);
    if (!user) {
        app.showNotification('User not found', 'error');
        return;
    }
    
    // Format role for display
    let roleDisplay = 'User';
    switch(user.role) {
        case 'admin':
            roleDisplay = 'Administrator';
            break;
        case 'loan_officer':
            roleDisplay = 'Loan Officer';
            break;
        case 'customer':
            roleDisplay = 'Customer';
            break;
    }
    
    // Create and show modal with user details
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>User Details</h2>
                <button class="close-btn" id="close-view-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="user-details">
                    <div class="detail-row">
                        <div class="detail-label">ID:</div>
                        <div class="detail-value">${user.id}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Name:</div>
                        <div class="detail-value">${user.name}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Phone:</div>
                        <div class="detail-value">${user.phone}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${user.email}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Role:</div>
                        <div class="detail-value">${roleDisplay}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge status-${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="close-details">Close</button>
                    <button type="button" class="btn btn-primary" id="edit-from-details">Edit User</button>
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
    
    // Setup edit button
    viewModal.querySelector('#edit-from-details').addEventListener('click', () => {
        viewModal.remove();
        editUser(userId);
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Edit user
function editUser(userId) {
    openUserModal(userId);
}

// Delete user
function deleteUser(userId) {
    // Confirm deletion
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal active';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Deletion</h2>
                <button class="close-btn" id="close-confirm-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-delete">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Setup close button
    confirmModal.querySelector('#close-confirm-modal').addEventListener('click', () => {
        confirmModal.remove();
    });
    
    confirmModal.querySelector('#cancel-delete').addEventListener('click', () => {
        confirmModal.remove();
    });
    
    // Setup confirm button
    confirmModal.querySelector('#confirm-delete').addEventListener('click', () => {
        confirmModal.remove();
        
        // Send delete request to API
        fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: auth.getAuthHeaders()
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete user');
            }
            return response.json();
        })
        .then(data => {
            // Show success notification
            app.showNotification('User deleted successfully', 'success');
            
            // Reload users
            loadUsers();
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            app.showNotification(`Error: ${error.message}`, 'error');
            
            // For development/demo purposes
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users.splice(index, 1);
                const usersTable = document.getElementById('users-table');
                const tableBody = usersTable.querySelector('tbody');
                renderUsers(tableBody);
                app.showNotification('User deleted successfully (Demo Mode)', 'success');
            }
        });
    });
    
    // Close when clicking outside
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.remove();
        }
    });
}

// Export functions for use in other modules
window.userManagement = {
    loadUsers,
    openUserModal,
    saveUser,
    viewUser,
    editUser,
    deleteUser
};
