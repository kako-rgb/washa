// Constants and state
const api = '/api/loans';
let globalLoans = [];
let dataSource = 'unknown'; // Will be set to 'mongodb' or 'csv'

// Debug function to check globalLoans
function debugGlobalLoans() {
  console.log('Data source:', dataSource);
  console.log('globalLoans length:', globalLoans.length);
  if (globalLoans.length > 0) {
    console.log('First loan:', globalLoans[0]);
  } else {
    console.log('globalLoans is empty');
  }
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
}

function parseDate(dateString) {
  if (!dateString) return new Date();
  try {
    const parts = dateString.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      return new Date(year, month, day);
    }
    return new Date(dateString);
  } catch {
    return new Date();
  }
}

// Calculate defaulter fee
function calcDefaulterFee(loan) {
  // If the loan has an expiryDate field, use it
  if (loan.expiryDate) {
    // Check if current date is past expiry date
    const isExpired = new Date() > new Date(loan.expiryDate);
    if (isExpired) {
      // Calculate weeks past expiry
      const weeksPastExpiry = Math.floor((Date.now() - new Date(loan.expiryDate)) / (1000*60*60*24*7));
      return weeksPastExpiry * 1000;
    }
    return 0;
  } else {
    // Fallback to old calculation for backward compatibility
    const createdAt = loan.createdAt ? new Date(loan.createdAt) :
                     (loan.dateIssued ? parseDate(loan.dateIssued) : new Date());
    return Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 7)) - 4) * 1000;
  }
}

// Check if loan is defaulted
function isLoanDefaulted(loan) {
  // If loan is already marked as completed, it's not defaulted
  if (loan.status === 'completed') {
    return false;
  }

  // If the loan has isDefaulter field set, use it
  if (loan.isDefaulter !== undefined) {
    return loan.isDefaulter;
  }

  // Check if current date is past expiry date
  if (loan.expiryDate) {
    return new Date() > new Date(loan.expiryDate);
  }

  // Fallback to old calculation
  const createdAt = loan.createdAt ? new Date(loan.createdAt) :
                   (loan.dateIssued ? parseDate(loan.dateIssued) : new Date());
  const weeksElapsed = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 7));
  return weeksElapsed > 4;
}

// Display functions
function renderLoan(loan) {
  // Calculate payment information
  const repaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = loan.totalDue - repaid;
  const progressPercent = Math.min(100, Math.round((repaid / loan.totalDue) * 100));

  // Determine status class for styling
  let statusClass = 'status-active';
  if (remaining <= 0) statusClass = 'status-completed';
  else if (calcDefaulterFee(loan) > 0) statusClass = 'status-defaulted';

  // Format the date
  const dateDisplay = loan.dateIssued ? parseDate(loan.dateIssued).toLocaleDateString() :
                     (loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : 'Unknown');

  return `
    <div class="loan ${statusClass}" data-id="${loan._id}">
      <div class="loan-summary">
        <div class="loan-header">
          <h3><i class="fas fa-user"></i> ${loan.name}</h3>
          <span class="loan-date">${dateDisplay}</span>
        </div>
        <div class="loan-details">
          <p><i class="fas fa-phone"></i> ${loan.phone}</p>
          <p><i class="fas fa-money-bill-wave"></i> Total Due: <strong>${formatCurrency(loan.totalDue)}</strong></p>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
            <span class="progress-text">${progressPercent}% Repaid</span>
          </div>
          <p class="remaining"><i class="fas fa-hourglass-half"></i> Remaining: <strong>${formatCurrency(remaining)}</strong></p>
          ${calcDefaulterFee(loan) > 0 ?
            `<p class="defaulter"><i class="fas fa-exclamation-triangle"></i> Defaulter Fee: <strong>${formatCurrency(calcDefaulterFee(loan))}</strong></p>`
            : ''}
        </div>
        <div class="loan-actions">
          <button onclick="showPayment('${loan._id}')" class="btn-action">
            <i class="fas fa-credit-card"></i> Record Payment
          </button>
          <button onclick="showLoanDetails('${loan._id}')" class="btn-view">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
      <div id="pay-${loan._id}" class="payment-form" style="display:none;">
        <div class="form-row">
          <input id="amt-${loan._id}" type="number" placeholder="Amount" class="payment-input">
          <input id="tx-${loan._id}" placeholder="Transaction ID or Details" class="payment-input">
        </div>
        <button onclick="recordPayment('${loan._id}')" class="btn-submit">
          <i class="fas fa-paper-plane"></i> Submit Payment
        </button>
      </div>
    </div>
  `;
}

function displayLoans(loans = globalLoans, searchTerm = '') {
  const container = document.getElementById('loanList');
  if (!container) {
    console.error('Loan list container not found');
    return;
  }

  // Filter loans if search term is provided
  let filteredLoans = loans;
  if (searchTerm) {
    filteredLoans = [];
    for (let i = 0; i < loans.length; i++) {
      if (loans[i].name.toLowerCase().includes(searchTerm.toLowerCase())) {
        filteredLoans.push(loans[i]);
      }
    }
  }

  // Generate HTML for each loan
  if (filteredLoans.length > 0) {
    // Add data source indicator at the top
    let dataSourceHtml = '';
    if (dataSource === 'mongodb') {
      dataSourceHtml = '<div class="data-source-indicator mongodb">Data from MongoDB</div>';
    } else if (dataSource === 'csv') {
      dataSourceHtml = '<div class="data-source-indicator csv">Data from CSV file</div>';
    }

    let loansHtml = dataSourceHtml;
    for (let i = 0; i < filteredLoans.length; i++) {
      loansHtml += renderLoan(filteredLoans[i]);
    }
    container.innerHTML = loansHtml;

    console.log('Displayed ' + filteredLoans.length + ' loans from ' + dataSource);
  } else {
    container.innerHTML = '<p class="no-results">No loans found</p>';
    console.log('No loans to display');
  }

  // Add click handlers
  const loanElements = container.querySelectorAll('.loan');
  for (let i = 0; i < loanElements.length; i++) {
    loanElements[i].addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button') ||
          e.target.tagName === 'INPUT' || e.target.closest('.payment-form')) {
        return;
      }
      const loanId = this.getAttribute('data-id');
      showLoanDetails(loanId);
    });
  }
}

// Loan operations
function showPayment(id) {
  const el = document.getElementById(`pay-${id}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

function recordPayment(id) {
  const amountInput = document.getElementById(`amt-${id}`);
  const txInput = document.getElementById(`tx-${id}`);

  if (!amountInput || !txInput) {
    console.error('Payment form inputs not found');
    return;
  }

  const amount = parseFloat(amountInput.value);
  const transactionId = txInput.value;

  if (!amount || amount <= 0) {
    alert('Please enter a valid payment amount');
    return;
  }

  const loan = globalLoans.find(l => l._id.toString() === id);
  if (!loan) {
    console.error('Loan not found for payment');
    return;
  }

  const payment = {
    amount,
    transactionId,
    date: new Date(),
    depositDetails: transactionId
  };

  loan.payments = loan.payments || [];
  loan.payments.push(payment);

  // Update loan amount paid and remaining
  loan.amountPaid = (parseFloat(loan.amountPaid) || 0) + amount;
  loan.amountRemaining = loan.totalDue - loan.amountPaid;

  // Save to localStorage
  saveLoans(globalLoans);

  // Clear inputs and hide form
  amountInput.value = '';
  txInput.value = '';
  showPayment(id);

  // Refresh display
  displayLoans();

  // Show success message
  alert('Payment recorded successfully!');
}

function showLoanDetails(id) {
  const loan = globalLoans.find(l => l._id.toString() === id);
  if (!loan) return;

  const modal = getOrCreateModal();
  const repaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = loan.totalDue - repaid;

  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h2>${loan.name}</h2>
        <span class="close-modal">&times;</span>
      </div>
      <div class="modal-content">
        <div class="detail-grid">
          <div class="detail-section">
            <h4>Personal Information</h4>
            <div class="editable-field">
              <label>Name:</label>
              <input type="text" name="name" value="${loan.name}" data-original="${loan.name}">
            </div>
            <div class="editable-field">
              <label>Phone:</label>
              <input type="text" name="phone" value="${loan.phone}" data-original="${loan.phone}">
            </div>
            <div class="editable-field">
              <label>Email:</label>
              <input type="email" name="email" value="${loan.email || ''}" data-original="${loan.email || ''}">
            </div>
            <div class="editable-field">
              <label>Address:</label>
              <input type="text" name="address" value="${loan.address || ''}" data-original="${loan.address || ''}">
            </div>
            <div class="editable-field">
              <label>Occupation:</label>
              <input type="text" name="occupation" value="${loan.occupation || ''}" data-original="${loan.occupation || ''}">
            </div>
            <div class="editable-field">
              <label>Employer:</label>
              <input type="text" name="employerName" value="${loan.employerName || ''}" data-original="${loan.employerName || ''}">
            </div>
          </div>
          <div class="detail-section">
            <h4>Loan Information</h4>
            <div class="editable-field">
              <label>Principal:</label>
              <input type="number" name="principal" value="${loan.principal}" data-original="${loan.principal}">
            </div>
            <div class="editable-field">
              <label>Total Due:</label>
              <input type="number" name="totalDue" value="${loan.totalDue}" data-original="${loan.totalDue}">
            </div>
            <div class="editable-field">
              <label>Status:</label>
              <select name="status" data-original="${loan.status}">
                <option value="active" ${loan.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="completed" ${loan.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="defaulted" ${loan.status === 'defaulted' ? 'selected' : ''}>Defaulted</option>
              </select>
            </div>
            <div class="editable-field">
              <label>Loan Purpose:</label>
              <input type="text" name="loanPurpose" value="${loan.loanPurpose || ''}" data-original="${loan.loanPurpose || ''}">
            </div>
          </div>
          <div class="detail-section payments-section">
            <h4>Payment History</h4>
            <div class="payment-list">
              ${loan.payments && loan.payments.length ?
                loan.payments.map(payment => `
                  <div class="payment-item">
                    <div class="payment-date">${new Date(payment.date).toLocaleDateString()}</div>
                    <div class="payment-amount">${formatCurrency(payment.amount)}</div>
                    <div class="payment-method">${payment.depositDetails || 'N/A'}</div>
                  </div>
                `).join('') :
                '<div class="no-payments">No payments recorded</div>'
              }
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button onclick="saveLoanChanges('${id}')" class="btn-primary">
            <i class="fas fa-save"></i> Save Changes
          </button>
          <button onclick="closeModal()" class="btn-secondary">
      });
    });

    console.log('Loan loading complete');
  } catch (error) {
    console.error('Error loading loans:', error);
  }
}

function renderLoan(loan) {
  // Calculate payment information
  const repaid = (loan.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const remaining = loan.totalDue - repaid;
  const defFee = calcDefaulterFee(loan);
  const isDefaulter = isLoanDefaulted(loan);

  // Calculate status for visual indicator
  let statusClass = 'status-active';
  if (remaining <= 0) {
    statusClass = 'status-completed';
  } else if (isDefaulter || defFee > 0) {
    statusClass = 'status-defaulted';
  }

  // Calculate progress percentage
  const progressPercent = Math.min(100, Math.round((repaid / loan.totalDue) * 100));

  // Format the date
  const dateDisplay = loan.dateIssued ? parseDate(loan.dateIssued).toLocaleDateString() :
                     (loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : 'Unknown');

  // Calculate expiry date display
  const expiryDate = loan.expiryDate ? new Date(loan.expiryDate).toLocaleDateString() :
                    (loan.createdAt ? new Date(new Date(loan.createdAt).getTime() + (28 * 24 * 60 * 60 * 1000)).toLocaleDateString() : 'Unknown');

  // Create the defaulter badge HTML if needed
  const defaulterBadgeHtml = isDefaulter ?
    '<span class="defaulter-badge">DEFAULTER</span>' : '';

  // Create the defaulter fee HTML if needed
  const defaulterFeeHtml = defFee > 0 ?
    '<p class="defaulter"><i class="fas fa-exclamation-triangle"></i> Defaulter Fee: <strong>' + formatCurrency(defFee) + '</strong></p>' :
    '';

  return '\
    <div class="loan ' + statusClass + '" data-id="' + loan._id + '">\
      <div class="loan-summary">\
        <div class="loan-header">\
          <h3><i class="fas fa-user"></i> ' + loan.name + '</h3>\
          <span class="loan-date">' + dateDisplay + '</span>\
          ' + defaulterBadgeHtml + '\
        </div>\
        <div class="loan-details">\
          <p><i class="fas fa-phone"></i> ' + loan.phone + '</p>\
          <p><i class="fas fa-money-bill-wave"></i> Total Due: <strong>' + formatCurrency(loan.totalDue) + '</strong></p>\
          <p><i class="fas fa-calendar-alt"></i> Expiry Date: <strong>' + expiryDate + '</strong></p>\
          <div class="progress-container">\
            <div class="progress-bar" style="width: ' + progressPercent + '%"></div>\
            <span class="progress-text">' + progressPercent + '% Repaid</span>\
          </div>\
          <p class="remaining"><i class="fas fa-hourglass-half"></i> Remaining: <strong>' + formatCurrency(remaining) + '</strong></p>\
          ' + defaulterFeeHtml + '\
        </div>\
        <div class="loan-actions">\
          <button onclick="showPayment(\'' + loan._id + '\')" class="btn-action"><i class="fas fa-credit-card"></i> Record Payment</button>\
          <button onclick="showLoanDetails(\'' + loan._id + '\')" class="btn-view"><i class="fas fa-eye"></i> View Details</button>\
        </div>\
      </div>\
      <div id="pay-' + loan._id + '" class="payment-form" style="display:none;">\
        <div class="form-row">\
          <input id="amt-' + loan._id + '" type="number" placeholder="Amount" class="payment-input">\
          <input id="tx-' + loan._id + '" placeholder="Transaction ID or Details" class="payment-input">\
        </div>\
        <button onclick="recordPayment(\'' + loan._id + '\')" class="btn-submit"><i class="fas fa-paper-plane"></i> Submit Payment</button>\
      </div>\
    </div>\
  ';
}

// Function to show detailed loan information with editable fields
function showLoanDetails(id) {
  // Find the loan in the global loans array
  const loan = globalLoans.find(l => l._id.toString() === id);
  if (!loan) {
    console.error('Loan not found with ID:', id);
    alert('Error: Loan details not found');
    return;
  }

  // Create and show modal with loan details
  const modal = getOrCreateModal();

  // Calculate repayment info
  const repaid = (loan.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = loan.totalDue - repaid;
  const progressPercent = Math.min(100, Math.round((repaid / loan.totalDue) * 100));
  const defFee = calcDefaulterFee(loan);

  // Format dates
  const dateIssued = loan.dateIssued ? parseDate(loan.dateIssued).toLocaleDateString() :
                    (loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : 'Unknown');

  // Create status options for the select dropdown
  const activeSelected = loan.status === 'active' ? 'selected' : '';
  const completedSelected = loan.status === 'completed' ? 'selected' : '';
  const defaultedSelected = loan.status === 'defaulted' ? 'selected' : '';

  // Create payment history HTML
  let paymentHistoryHtml = '<div class="no-payments">No payments recorded</div>';
  if (loan.payments && loan.payments.length > 0) {
    paymentHistoryHtml = '';
    for (let i = 0; i < loan.payments.length; i++) {
      const payment = loan.payments[i];
      const paymentDate = new Date(payment.date).toLocaleDateString();
      const paymentAmount = formatCurrency(payment.amount);
      const paymentMethod = payment.depositDetails || 'N/A';

      paymentHistoryHtml += '<div class="payment-item">' +
        '<div class="payment-date">' + paymentDate + '</div>' +
        '<div class="payment-amount">' + paymentAmount + '</div>' +
        '<div class="payment-method">' + paymentMethod + '</div>' +
      '</div>';
    }
  }

  // Create defaulter fee HTML if needed
  const defaulterFeeHtml = defFee > 0 ?
    '<p class="defaulter"><i class="fas fa-exclamation-triangle"></i> Defaulter Fee: <strong>' + formatCurrency(defFee) + '</strong></p>' :
    '';

  // Create the modal content with all CSV fields
  modal.innerHTML =
    '<div class="modal-container">' +
      '<div class="modal-header">' +
        '<h2>' + (loan.name || '') + '</h2>' +
        '<span class="close-modal">&times;</span>' +
      '</div>' +
      '<div class="modal-content">' +
        '<div class="detail-grid">' +
          '<div class="detail-section">' +
            '<h4>Personal Information</h4>' +
            '<div class="editable-field">' +
              '<label>Full Name:</label>' +
              '<input type="text" name="name" value="' + (loan.name || '') + '" data-original="' + (loan.name || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Phone:</label>' +
              '<input type="text" name="phone" value="' + (loan.phone || '') + '" data-original="' + (loan.phone || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Email:</label>' +
              '<input type="email" name="email" value="' + (loan.email || '') + '" data-original="' + (loan.email || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Address:</label>' +
              '<input type="text" name="address" value="' + (loan.address || '') + '" data-original="' + (loan.address || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Occupation:</label>' +
              '<input type="text" name="occupation" value="' + (loan.occupation || '') + '" data-original="' + (loan.occupation || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Employer:</label>' +
              '<input type="text" name="employerName" value="' + (loan.employerName || '') + '" data-original="' + (loan.employerName || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Referee:</label>' +
              '<input type="text" name="refereeName" value="' + (loan.refereeName || '') + '" data-original="' + (loan.refereeName || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="detail-section">' +
            '<h4>Loan Information</h4>' +
            '<div class="editable-field">' +
              '<label>Date Issued:</label>' +
              '<input type="text" name="dateIssued" value="' + (loan.dateIssued || '') + '" data-original="' + (loan.dateIssued || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Principal:</label>' +
              '<input type="number" name="principal" value="' + (loan.principal || 0) + '" data-original="' + (loan.principal || 0) + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Amount Paid:</label>' +
              '<input type="number" name="amountPaid" value="' + (loan.amountPaid || repaid || 0) + '" data-original="' + (loan.amountPaid || repaid || 0) + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Amount Remaining:</label>' +
              '<input type="number" name="amountRemaining" value="' + (loan.amountRemaining || remaining || 0) + '" data-original="' + (loan.amountRemaining || remaining || 0) + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Total Due:</label>' +
              '<input type="number" name="totalDue" value="' + (loan.totalDue || 0) + '" data-original="' + (loan.totalDue || 0) + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Status:</label>' +
              '<select name="status" data-original="' + (loan.status || 'active') + '">' +
                '<option value="active" ' + activeSelected + '>Active</option>' +
                '<option value="completed" ' + completedSelected + '>Completed</option>' +
                '<option value="defaulted" ' + defaultedSelected + '>Defaulted</option>' +
              '</select>' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Loan Purpose:</label>' +
              '<input type="text" name="loanPurpose" value="' + (loan.loanPurpose || '') + '" data-original="' + (loan.loanPurpose || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Dates of Payment:</label>' +
              '<input type="text" name="datesOfPayment" value="' + (loan.datesOfPayment || '') + '" data-original="' + (loan.datesOfPayment || '') + '">' +
            '</div>' +
            '<div class="editable-field">' +
              '<label>Methods of Payment:</label>' +
              '<input type="text" name="methodsOfPayment" value="' + (loan.methodsOfPayment || '') + '" data-original="' + (loan.methodsOfPayment || '') + '">' +
            '</div>' +
          '</div>' +

          '<div class="detail-section payments-section">' +
            '<h4>Payment History</h4>' +
            '<div class="payment-list">' +
              paymentHistoryHtml +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="loan-summary-section">' +
          '<h4>Loan Summary</h4>' +
          '<div class="progress-container">' +
            '<div class="progress-bar" style="width: ' + progressPercent + '%"></div>' +
            '<span class="progress-text">' + progressPercent + '% Repaid</span>' +
          '</div>' +
          '<p class="remaining"><i class="fas fa-hourglass-half"></i> Remaining: <strong>' + formatCurrency(remaining) + '</strong></p>' +
          defaulterFeeHtml +
        '</div>' +

        '<div class="modal-actions">' +
          '<button onclick="saveLoanChanges(\'' + id + '\')" class="btn-primary">' +
            '<i class="fas fa-save"></i> Save Changes' +
          '</button>' +
          '<button onclick="closeModal()" class="btn-secondary">' +
            '<i class="fas fa-times"></i> Cancel' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Show the modal
  modal.style.display = 'block';

  // Set up close button and click outside functionality
  setupModalClose(modal);
}

// Modal utility functions
function getOrCreateModal() {
  let modal = document.getElementById('detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'detail-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  return modal;
}

function setupModalClose(modal) {
  const closeBtn = modal.querySelector('.close-modal');
  if (closeBtn) {
    closeBtn.onclick = () => closeModal();
  }
  window.onclick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };
}

function closeModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Function to save changes to a loan
function saveLoanChanges(id) {
  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  const loan = globalLoans.find(l => l._id.toString() === id);
  if (!loan) return;

  const fields = modal.querySelectorAll('.editable-field input, .editable-field select');
  let hasChanges = false;

  fields.forEach(field => {
    const name = field.getAttribute('name');
    const originalValue = field.getAttribute('data-original');
    let currentValue = field.value;

    // Convert numeric values
    if (name === 'principal' || name === 'totalDue' || name === 'amountPaid' || name === 'amountRemaining') {
      currentValue = parseFloat(currentValue);
    }

    // Check if value has changed
    if (currentValue != originalValue) { // Using != to handle type coercion
      loan[name] = currentValue;
      hasChanges = true;
    }
  });

  if (!hasChanges) {
    closeModal();
    return;
  }

  // Save to localStorage
  saveLoans(globalLoans);

  // Refresh the display
  displayLoans();

  // Close the modal
  closeModal();

  // Show success message
  alert('Loan updated successfully!');
}



// CSV loading and parsing
async function loadCSVData() {
  try {
    console.log('Starting CSV data loading...');

    // Use the server endpoint to get CSV data
    const csvEndpoint = '/api/csv-data';
    console.log('Loading CSV from endpoint:', csvEndpoint);

    let response;
    try {
      response = await fetch(csvEndpoint);
      console.log('Response status:', response.status);

      if (!response.ok) {
        console.error('Failed to load CSV from endpoint, status:', response.status);
        // Try hardcoded data instead
        console.log('Using hardcoded data instead');
        const hardcodedLoans = createHardcodedLoans();
        globalLoans = hardcodedLoans;
        saveLoans(globalLoans);
        displayLoans();
        return true;
      }
    } catch (e) {
      console.error('Error fetching CSV from endpoint:', e.message);
      // Try hardcoded data instead
      console.log('Using hardcoded data instead due to fetch error');
      const hardcodedLoans = createHardcodedLoans();
      globalLoans = hardcodedLoans;
      saveLoans(globalLoans);
      displayLoans();
      return true;
    }

    const text = await response.text();
    console.log('CSV text loaded, parsing...');

    const loans = parseCSVToLoans(text);
    console.log('Parsed ' + loans.length + ' loans from CSV');

    globalLoans = loans;

    // Save to localStorage for offline access
    saveLoans(globalLoans);

    // Display the loans
    console.log('Displaying loans...');
    displayLoans();

    return true;
  } catch (error) {
    console.error('Error loading CSV:', error);

    // Try loading from localStorage as fallback
    const storedLoans = loadLoansFromStorage();
    if (storedLoans && storedLoans.length > 0) {
      console.log('Loaded ' + storedLoans.length + ' loans from localStorage');
      globalLoans = storedLoans;
      displayLoans();
      return true;
    }

    // If all else fails, use hardcoded data
    console.log('Using hardcoded data as last resort');
    const hardcodedLoans = createHardcodedLoans();
    globalLoans = hardcodedLoans;
    saveLoans(globalLoans);
    displayLoans();

    return true;
  }
}

// Create hardcoded loans for Netlify deployment
function createHardcodedLoans() {
  return [
    {
      _id: 'hardcoded1',
      name: 'Emily Ouma',
      phone: '726731787',
      dateIssued: '27/02/25 Thursday',
      principal: 10000,
      totalDue: 12000,
      amountPaid: 0,
      amountRemaining: 12000,
      status: 'completed',
      occupation: '',
      datesOfPayment: '',
      methodsOfPayment: '',
      employerName: '',
      address: '',
      refereeName: '',
      email: '',
      loanPurpose: '',
      payments: [],
      createdAt: new Date('2025-02-27').toISOString()
    },
    {
      _id: 'hardcoded2',
      name: 'Carolyne Obongo',
      phone: '719309438',
      dateIssued: '27/02/25 Thursday',
      principal: 7000,
      totalDue: 9000,
      amountPaid: 0,
      amountRemaining: 9000,
      status: 'completed',
      occupation: '',
      datesOfPayment: '',
      methodsOfPayment: '',
      employerName: '',
      address: '',
      refereeName: '',
      email: '',
      loanPurpose: '',
      payments: [],
      createdAt: new Date('2025-02-27').toISOString()
    },
    {
      _id: 'hardcoded3',
      name: 'Zulfah Atieno Okumu',
      phone: '723438917',
      dateIssued: '27/02/25 Thursday',
      principal: 6000,
      totalDue: 8000,
      amountPaid: 0,
      amountRemaining: 8000,
      status: 'completed',
      occupation: '',
      datesOfPayment: '',
      methodsOfPayment: '',
      employerName: '',
      address: '',
      refereeName: '',
      email: '',
      loanPurpose: '',
      payments: [],
      createdAt: new Date('2025-02-27').toISOString()
    },
    {
      _id: 'hardcoded4',
      name: 'Deborah Achieng Odhiambo',
      phone: '11850110',
      dateIssued: '27/02/25 Thursday',
      principal: 6000,
      totalDue: 8000,
      amountPaid: 0,
      amountRemaining: 8000,
      status: 'completed',
      occupation: '',
      datesOfPayment: '',
      methodsOfPayment: '',
      employerName: '',
      address: '',
      refereeName: '',
      email: '',
      loanPurpose: '',
      payments: [],
      createdAt: new Date('2025-02-27').toISOString()
    },
    {
      _id: 'hardcoded5',
      name: 'Euphenoc Amango',
      phone: '111209680',
      dateIssued: '28/02/25 Friday',
      principal: 7000,
      totalDue: 9000,
      amountPaid: 0,
      amountRemaining: 9000,
      status: 'active',
      occupation: '',
      datesOfPayment: '',
      methodsOfPayment: '',
      employerName: '',
      address: '',
      refereeName: '',
      email: '',
      loanPurpose: '',
      payments: [],
      createdAt: new Date('2025-02-28').toISOString()
    }
  ];
}

function parseCSVToLoans(csvText) {
  console.log('Starting CSV parsing...');
  console.log('CSV text first 100 chars:', csvText.substring(0, 100));

  // Split the CSV text into lines, handling both \n and \r\n line endings
  const lines = csvText.split(/\r?\n/);
  console.log('CSV has ' + lines.length + ' lines');

  if (lines.length > 0) {
    console.log('First line:', lines[0]);
  }

  const loans = [];
  const headers = lines[0].split(',');
  console.log('CSV headers:', headers);

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) {
      console.log('Skipping empty line at index ' + i);
      continue;
    }

    // Handle quoted values with commas inside them
    let values = [];
    let currentValue = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add the last value
    values.push(currentValue);

    // If simple splitting didn't work, fall back to regular split
    if (values.length < 3) {
      console.log('Fallback to simple split for line ' + i);
      values = lines[i].split(',');
    }

    if (values.length < 3) {
      console.log('Skipping line with insufficient values at index ' + i);
      continue;
    }

    // Parse numeric values, handling currency formatting
    const principal = parseFloat((values[3] || '0').replace(/[^0-9.-]+/g, '') || '0');
    const amountPaid = parseFloat((values[4] || '0').replace(/[^0-9.-]+/g, '') || '0');
    const amountRemaining = parseFloat((values[5] || '0').replace(/[^0-9.-]+/g, '') || '0');
    const totalDue = parseFloat((values[6] || '0').replace(/[^0-9.-]+/g, '') || '0') || principal * 1.2;

    // Create a unique ID for the loan
    const loanId = Date.now() + i;

    // Create the loan object with all available data
    const loan = {
      _id: loanId,
      name: values[0] || '',
      phone: values[1] || '',
      dateIssued: values[2] || '',
      principal: principal,
      amountPaid: amountPaid,
      amountRemaining: amountRemaining,
      totalDue: totalDue,
      status: values[7] === 'fully paid' ? 'completed' :
             values[8] === 'yes' ? 'defaulted' : 'active',
      occupation: values[9] || '',
      datesOfPayment: values[10] || '',
      methodsOfPayment: values[11] || '',
      employerName: values[12] || '',
      address: values[13] || '',
      refereeName: values[14] || '',
      principalAmount: values[15] || principal,
      email: values[16] || '',
      loanPurpose: values[17] || '',
      payments: amountPaid > 0 ? [{
        amount: amountPaid,
        date: parseDate(values[2] || ''),
        transactionId: 'LEGACY-' + loanId,
        depositDetails: values[11] || 'Legacy payment'
      }] : [],
      createdAt: parseDate(values[2] || '').toISOString()
    };

    // Log the first few loans for debugging
    if (i <= 3) {
      console.log('Parsed loan ' + i + ':', loan.name, loan.principal, loan.totalDue);
    }

    loans.push(loan);
  }

  console.log('Successfully parsed ' + loans.length + ' loans');
  return loans;
}

// Storage functions
function saveLoans(loans) {
  try {
    localStorage.setItem('loans', JSON.stringify(loans));
    return true;
  } catch (e) {
    console.error('Error saving loans to localStorage:', e);
    return false;
  }
}

function loadLoansFromStorage() {
  try {
    const storedLoans = localStorage.getItem('loans');
    return storedLoans ? JSON.parse(storedLoans) : [];
  } catch (e) {
    console.error('Error loading loans from localStorage:', e);
    return [];
  }
}

// Initial load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded, loading data...');
  loadData();

  // Set up search functionality
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      displayLoans(globalLoans, e.target.value.trim());
    });
  }
});

// Main data loading function - tries MongoDB first, falls back to CSV
async function loadData() {
  console.log('Starting data loading...');

  // Skip MongoDB and directly load from CSV
  console.log('Loading data directly from CSV...');
  try {
    const success = await loadCSVData();
    if (success) {
      console.log('Successfully loaded data from CSV');
      dataSource = 'csv';
      return;
    }
  } catch (error) {
    console.error('Error loading from CSV:', error);
  }

  // If CSV fails, try localStorage as last resort
  console.log('Trying localStorage as last resort...');
  const storedLoans = loadLoansFromStorage();
  if (storedLoans && storedLoans.length > 0) {
    console.log('Loaded ' + storedLoans.length + ' loans from localStorage');
    globalLoans = storedLoans;
    displayLoans();
    return;
  }

  // If all else fails, show error message in the loanList element
  const loanList = document.getElementById('loanList');
  if (loanList) {
    loanList.innerHTML = '<p class="error-message">Failed to load loan data. Please check your connection and try again.</p>';
  }
}

// Load data from MongoDB API
async function loadMongoDBData() {
  console.log('Attempting to load data from MongoDB API...');
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error('API responded with status: ' + response.status);
    }

    const loans = await response.json();
    console.log('Received ' + loans.length + ' loans from MongoDB API');

    if (loans && loans.length > 0) {
      globalLoans = loans;

      // Save to localStorage for offline access
      saveLoans(globalLoans);

      // Display the loans
      displayLoans();
      return true;
    } else {
      console.log('No loans returned from MongoDB API');
      return false;
    }
  } catch (error) {
    console.error('MongoDB API error:', error);
    return false;
  }
}
