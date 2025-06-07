// Change Password Functionality
document.addEventListener('DOMContentLoaded', function() {
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancelChangePassword');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const errorElement = document.getElementById('changePasswordError');

    // Show modal when change password is clicked
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            changePasswordModal.style.display = 'block';
        });
    }

    // Close modal when X is clicked
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            changePasswordModal.style.display = 'none';
            resetForm();
        });
    }

    // Close modal when cancel button is clicked
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            changePasswordModal.style.display = 'none';
            resetForm();
        });
    }

    // Close modal when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === changePasswordModal) {
            changePasswordModal.style.display = 'none';
            resetForm();
        }
    });

    // Handle form submission
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Reset error message
            errorElement.textContent = '';
            errorElement.style.display = 'none';

            // Validate passwords
            if (newPassword !== confirmPassword) {
                showError('New passwords do not match');
                return;
            }


            try {
                const response = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });


                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error changing password');
                }

                // Show success message
                alert('Password changed successfully!');
                
                // Close modal and reset form
                changePasswordModal.style.display = 'none';
                resetForm();
                
            } catch (error) {
                console.error('Error changing password:', error);
                showError(error.message || 'Failed to change password. Please try again.');
            }
        });
    }

    // Function to show error messages
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Function to reset the form
    function resetForm() {
        if (changePasswordForm) {
            changePasswordForm.reset();
        }
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
});

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
