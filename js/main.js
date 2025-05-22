// Add popup HTML to the document
document.body.insertAdjacentHTML('beforeend', `
  <div id="loanDetailPopup" class="modal" style="display:none">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Loan Details</h2>
      <form id="loanDetailForm">
        <div class="form-group">
          <label for="name">Full Name:</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="phone">Phone Number:</label>
          <input type="tel" id="phone" name="phone" required>
        </div>
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email">
        </div>
        <div class="form-group">
          <label for="address">Address:</label>
          <input type="text" id="address" name="address">
        </div>
        <div class="form-group">
          <label for="occupation">Occupation:</label>
          <input type="text" id="occupation" name="occupation">
        </div>
        <div class="form-group">
          <label for="employerName">Employer Name:</label>
          <input type="text" id="employerName" name="employerName">
        </div>
        <div class="form-group">
          <label for="refereeName">Referee Name:</label>
          <input type="text" id="refereeName" name="refereeName">
        </div>
        <div class="form-group">
          <label for="principal">Principal Amount:</label>
          <input type="number" id="principal" name="principal" required>
        </div>
        <div class="form-group">
          <label for="totalDue">Total Due:</label>
          <input type="number" id="totalDue" name="totalDue" required>
        </div>
        <div class="form-group">
          <label for="loanPurpose">Loan Purpose:</label>
          <textarea id="loanPurpose" name="loanPurpose"></textarea>
        </div>
        <div class="form-group">
          <label for="status">Status:</label>
          <select id="status" name="status">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Update Loan</button>
      </form>
    </div>
  </div>
`);

// Add CSS styles
const styles = `
  .modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
  }
  
  .modal-content {
    background-color: #fefefe;
    margin: 5% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
`;

// Add error message styles
const errorStyles = `
  #error-message {
    display: none;
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #f44336;
    color: white;
    padding: 15px;
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  #error-message.show {
    display: block;
    animation: fadeInOut 3s ease-in-out;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles + errorStyles;
document.head.appendChild(styleSheet);

function showErrorMessage(message) {
    // Create error message div if it doesn't exist
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        document.body.appendChild(errorDiv);
    }

    // Set message and show error
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 3000);
}

// Listen for database connection errors
fetch('/api/db-status')
    .catch(error => {
        showErrorMessage('Database connection failed. Using fallback mode.');
    });

// Modify the displayLoans function to add click handlers
function displayLoans(loans) {
  const loansContainer = document.getElementById('loans-container');
  loansContainer.innerHTML = loans.map(loan => `
    <div class="loan-card" data-id="${loan._id}">
      <h3>${loan.name}</h3>
      <p>Phone: ${loan.phone}</p>
      <p>Amount: ${loan.principal}</p>
      <p>Status: ${loan.status}</p>
      <button class="view-details-btn">View Details</button>
    </div>
  `).join('');

  // Add click handlers for view details buttons
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const loanId = e.target.closest('.loan-card').dataset.id;
      const loan = loans.find(l => l._id === loanId);
      showLoanDetails(loan);
    });
  });
}

// Function to show loan details popup
function showLoanDetails(loan) {
  const popup = document.getElementById('loanDetailPopup');
  const form = document.getElementById('loanDetailForm');
  
  // Fill form with loan details
  Object.keys(loan).forEach(key => {
    const input = form.elements[key];
    if (input) {
      input.value = loan[key];
    }
  });
  
  // Show popup
  popup.style.display = 'block';
  
  // Close button handler
  popup.querySelector('.close').onclick = () => {
    popup.style.display = 'none';
  };
  
  // Form submit handler
  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const updatedLoan = Object.fromEntries(formData);
    
    try {
      const response = await fetch(`/api/loans/${loan._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedLoan)
      });
      
      if (response.ok) {
        // Refresh loans list
        fetchLoans();
        popup.style.display = 'none';
      } else {
        throw new Error('Failed to update loan');
      }
    } catch (error) {
      console.error('Error updating loan:', error);
      alert('Failed to update loan details');
    }
  };
}

// Close popup when clicking outside
window.onclick = (e) => {
  const popup = document.getElementById('loanDetailPopup');
  if (e.target === popup) {
    popup.style.display = 'none';
  }
};