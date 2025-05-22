// Global variables
let allLoans = [];
let filteredLoans = [];
let isConnectedToDatabase = false;

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount);
}

// Parse date
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

// Format date for display
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().substring(2)}`;
}

// Generate a unique ID
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// Calculate deadline date (4 weeks after date of issue)
function calculateDeadlineDate(dateIssued) {
  if (!dateIssued) return '';

  const issueDate = parseDate(dateIssued);
  const deadlineDate = new Date(issueDate);
  deadlineDate.setDate(deadlineDate.getDate() + 28); // 4 weeks = 28 days

  return formatDate(deadlineDate);
}

// Determine payment status
function getPaymentStatus(loan) {
  // Calculate payment information
  const amountPaid = loan.amountPaid ||
                    (loan.payments && loan.payments.length > 0 ?
                     loan.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) : 0);

  const remaining = loan.totalDue - amountPaid;

  // If loan is completed or fully paid
  if (loan.status === 'completed' || remaining <= 0) {
    return { status: 'up-to-date', label: 'PAID' };
  }

  // If loan is explicitly marked as defaulted
  if (loan.status === 'defaulted') {
    return { status: 'defaulter', label: 'DEFAULTER' };
  }

  // Check if past deadline date
  let deadlineDate;

  if (loan.deadlineDate) {
    // Use stored deadline date if available
    deadlineDate = parseDate(loan.deadlineDate);
  } else if (loan.expiryDate) {
    // Use expiryDate if available
    deadlineDate = new Date(loan.expiryDate);
  } else {
    // Calculate deadline date if not stored
    const issueDate = parseDate(loan.dateIssued || loan.createdAt);
    deadlineDate = new Date(issueDate);
    deadlineDate.setDate(deadlineDate.getDate() + 28); // 4 weeks = 28 days
  }

  const today = new Date();

  // If past deadline and not fully paid, consider defaulter
  if (today > deadlineDate && remaining > 0) {
    return { status: 'defaulter', label: 'DEFAULTER' };
  }

  // If no payments made at all
  if (amountPaid <= 0) {
    return { status: 'slow-payer', label: 'NO PAYMENT' };
  }

  // If more than 50% paid, consider up-to-date
  if (amountPaid >= (loan.totalDue / 2)) {
    return { status: 'up-to-date', label: 'UP TO DATE' };
  }

  // If less than 50% paid but not defaulted, consider slow payer
  return { status: 'slow-payer', label: 'SLOW PAYER' };
}

// Render loan
function renderLoan(loan, index) {
  const statusClass = loan.status === 'completed' ? 'status-completed' :
                     loan.status === 'defaulted' ? 'status-defaulted' : 'status-active';

  // Calculate payment information
  const amountPaid = loan.amountPaid ||
                    (loan.payments && loan.payments.length > 0 ?
                     loan.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) : 0);

  const originalTotalDue = loan.totalDue;
  const remaining = Math.max(0, originalTotalDue - amountPaid);

  // Calculate progress percentage
  const progressPercent = Math.min(100, Math.round((amountPaid / originalTotalDue) * 100));

  // Get deadline date (use stored value or calculate if not available)
  const deadlineDate = loan.deadlineDate || calculateDeadlineDate(loan.dateIssued);

  // Get payment status
  const paymentStatus = getPaymentStatus(loan);

  // Update loan status based on payment
  if (remaining <= 0 && loan.status !== 'completed') {
    loan.status = 'completed';
    // Save the updated status
    const originalIndex = allLoans.findIndex(l => l.id === loan.id);
    if (originalIndex !== -1) {
      allLoans[originalIndex].status = 'completed';
      saveLoansToStorage();
    }
  } else if (remaining > 0 && amountPaid > 0 && loan.status !== 'active' && loan.status !== 'defaulted') {
    loan.status = 'active';
    // Save the updated status
    const originalIndex = allLoans.findIndex(l => l.id === loan.id);
    if (originalIndex !== -1) {
      allLoans[originalIndex].status = 'active';
      saveLoansToStorage();
    }
  }

  return `
    <div class="loan ${statusClass}" data-index="${index}">
      <div class="loan-header">
        <h3><i class="fas fa-user"></i> ${loan.name}</h3>
        <span class="loan-date">${loan.dateIssued}</span>
        <span class="payment-status-badge ${paymentStatus.status}">${paymentStatus.label}</span>
      </div>
      <div class="loan-details">
        <p><i class="fas fa-phone"></i> ${loan.phone}</p>
        ${loan.idNumber ? `<p><i class="fas fa-id-card"></i> ID: ${loan.idNumber}</p>` : ''}
        <p><i class="fas fa-money-bill-wave"></i> Principal: <strong>${formatCurrency(loan.principal)}</strong></p>
        <p><i class="fas fa-money-bill-wave"></i> Original Total: <strong>${formatCurrency(originalTotalDue)}</strong></p>
        ${amountPaid > 0 ? `<p><i class="fas fa-check-circle"></i> Amount Paid: <strong>${formatCurrency(amountPaid)}</strong></p>` : ''}
        <p><i class="fas fa-hourglass-half"></i> Remaining Balance: <strong>${formatCurrency(remaining)}</strong></p>

        <div class="progress-container">
          <div class="progress-bar" style="width: ${progressPercent}%"></div>
          <span class="progress-text">${progressPercent}% Repaid</span>
        </div>

        <p><i class="fas fa-calendar-check"></i> Deadline Date: <strong>${deadlineDate}</strong></p>
        <p><i class="fas fa-info-circle"></i> Status: <span class="loan-status ${loan.status}">${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span></p>
      </div>
      <div class="loan-actions">
        <button class="btn-edit" data-index="${index}"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn-mpesa" data-index="${index}">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" class="mpesa-icon">
          Pay with M-Pesa
        </button>
      </div>
    </div>
  `;
}
// Parse CSV to loans
function parseCSVToLoans(csvText) {
  console.log('Starting CSV parsing...');

  // Split the CSV text into lines
  const lines = csvText.split(/\r?\n/);
  console.log('CSV has ' + lines.length + ' lines');

  const loans = [];
  // Split the headers but we don't need to use them directly
  lines[0].split(',');

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) {
      continue;
    }

    const values = lines[i].split(',');

    if (values.length < 3) {
      continue;
    }

    // Parse numeric values, handling currency formatting
    // Multiply by 1000 directly when parsing to ensure correct values
    const principal = parseFloat((values[3] || '0').replace(/[^0-9.-]+/g, '') || '0') * 1000;
    const totalDue = (parseFloat((values[6] || '0').replace(/[^0-9.-]+/g, '') || '0') || principal / 1000 * 1.2) * 1000;

    // Determine status
    let status = 'active';
    if (values[7] === 'fully paid') {
      status = 'completed';
    } else if (values[8] === 'yes') {
      status = 'defaulted';
    }

    // Calculate deadline date (4 weeks after date of issue)
    const dateIssued = values[2] || '';
    let deadlineDate = '';

    if (dateIssued) {
      const issueDate = parseDate(dateIssued);
      const deadline = new Date(issueDate);
      deadline.setDate(deadline.getDate() + 28); // 4 weeks = 28 days
      deadlineDate = formatDate(deadline);
    }

    // Create the loan object
    const loan = {
      id: generateId(),
      name: values[0] || '',
      phone: values[1] || '',
      dateIssued: dateIssued,
      deadlineDate: deadlineDate,
      principal: principal,
      totalDue: totalDue,
      status: status,
      idNumber: values[15] || '', // Using principalAmount field as ID number for now
      principalAdjusted: true // Mark as already adjusted since we multiplied by 1000 during parsing
    };

    loans.push(loan);
  }

  console.log('Successfully parsed ' + loans.length + ' loans');
  return loans;
}

// Display loans
function displayLoans(loans) {
  const container = document.getElementById('loanList');
  if (!container) {
    console.error('Loan list container not found');
    return;
  }

  if (loans.length > 0) {
    // Hide the data source indicator
    let loansHtml = ''; // Removed the data source indicator

    // Don't add the "Add New Loan" button - we'll use the Register button instead
    // loansHtml += '<div class="add-loan-container"><button id="addLoanBtn" class="btn-add-loan"><i class="fas fa-plus"></i> Add New Loan</button></div>';

    for (let i = 0; i < loans.length; i++) {
      loansHtml += renderLoan(loans[i], i);
    }
    container.innerHTML = loansHtml;

    // Add event listeners to edit buttons
    const editButtons = document.querySelectorAll('.btn-edit');
    editButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const index = this.getAttribute('data-index');
        openEditModal(index);
      });
    });

    // Add event listeners to M-Pesa buttons
    const mpesaButtons = document.querySelectorAll('.btn-mpesa');
    mpesaButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const index = this.getAttribute('data-index');
        openMpesaModal(index);
      });
    });

    // Add event listener to add loan button
    const addLoanBtn = document.getElementById('addLoanBtn');
    if (addLoanBtn) {
      addLoanBtn.addEventListener('click', openAddModal);
    }

    // Add event listeners to loan items for clicking
    const loanItems = document.querySelectorAll('.loan');
    loanItems.forEach(item => {
      item.addEventListener('click', function(e) {
        // Don't open edit modal if clicking on a button
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          return;
        }
        const index = this.getAttribute('data-index');
        openEditModal(index);
      });
    });

    console.log('Displayed ' + loans.length + ' loans');
  } else {
    container.innerHTML = '<p class="no-results">No loans found</p>';

    // We're not using the Add New Loan button anymore - using Register button instead

    console.log('No loans to display');
  }
}
// Filter loans based on search term
function filterLoans(searchTerm) {
  if (!searchTerm) {
    filteredLoans = [...allLoans];
    displayLoans(filteredLoans);
    return;
  }

  searchTerm = searchTerm.toLowerCase();
  filteredLoans = allLoans.filter(loan =>
    loan.name.toLowerCase().includes(searchTerm) ||
    loan.phone.toLowerCase().includes(searchTerm) ||
    (loan.idNumber && loan.idNumber.toLowerCase().includes(searchTerm))
  );

  displayLoans(filteredLoans);
}

// Open edit modal
function openEditModal(index) {
  const loan = filteredLoans[index];
  if (!loan) return;

  document.getElementById('editLoanIndex').value = index;
  document.getElementById('editName').value = loan.name;
  document.getElementById('editPhone').value = loan.phone;
  document.getElementById('editIdNumber').value = loan.idNumber || '';
  document.getElementById('editDateIssued').value = loan.dateIssued;
  document.getElementById('editPrincipal').value = loan.principal;
  document.getElementById('editTotalDue').value = loan.totalDue;
  document.getElementById('editStatus').value = loan.status;

  const modal = document.getElementById('editModal');
  modal.style.display = 'block';
}

// Open add modal
function openAddModal() {
  // Clear form
  document.getElementById('addLoanForm').reset();
  document.getElementById('addDateIssued').value = formatDate(new Date());

  const modal = document.getElementById('addModal');
  modal.style.display = 'block';
}

// Close modals
function closeModals() {
  const editModal = document.getElementById('editModal');
  const addModal = document.getElementById('addModal');
  editModal.style.display = 'none';
  addModal.style.display = 'none';
}

// Save edited loan
function saveEditedLoan(e) {
  e.preventDefault();

  const index = document.getElementById('editLoanIndex').value;
  const loan = filteredLoans[index];
  if (!loan) return;

  const dateIssued = document.getElementById('editDateIssued').value;

  // Recalculate deadline date if date issued has changed
  if (dateIssued !== loan.dateIssued) {
    const issueDate = parseDate(dateIssued);
    const deadlineDate = new Date(issueDate);
    deadlineDate.setDate(deadlineDate.getDate() + 28); // 4 weeks = 28 days
    loan.deadlineDate = formatDate(deadlineDate);
  }

  loan.name = document.getElementById('editName').value;
  loan.phone = document.getElementById('editPhone').value;
  loan.idNumber = document.getElementById('editIdNumber').value;
  loan.dateIssued = dateIssued;
  loan.principal = parseFloat(document.getElementById('editPrincipal').value);
  loan.totalDue = parseFloat(document.getElementById('editTotalDue').value);
  loan.status = document.getElementById('editStatus').value;

  // Update the loan in allLoans array
  const originalIndex = allLoans.findIndex(l => l.id === loan.id);
  if (originalIndex !== -1) {
    allLoans[originalIndex] = {...loan};
  }

  // Save to localStorage
  saveLoansToStorage();

  // Refresh display
  displayLoans(filteredLoans);

  // Close modal
  closeModals();
}

// Add new loan
function addNewLoan(e) {
  e.preventDefault();

  const dateIssued = document.getElementById('addDateIssued').value;

  // Calculate deadline date (4 weeks after date of issue)
  const issueDate = parseDate(dateIssued);
  const deadlineDate = new Date(issueDate);
  deadlineDate.setDate(deadlineDate.getDate() + 28); // 4 weeks = 28 days

  const newLoan = {
    id: generateId(),
    name: document.getElementById('addName').value,
    phone: document.getElementById('addPhone').value,
    idNumber: document.getElementById('addIdNumber').value,
    dateIssued: dateIssued,
    deadlineDate: formatDate(deadlineDate),
    principal: parseFloat(document.getElementById('addPrincipal').value),
    totalDue: parseFloat(document.getElementById('addTotalDue').value),
    status: document.getElementById('addStatus').value,
    principalAdjusted: true // Mark new loans as already adjusted so they don't get multiplied by 1000
  };

  // Add to allLoans array
  allLoans.unshift(newLoan);

  // Update filtered loans
  filterLoans(document.getElementById('search').value);

  // Save to localStorage
  saveLoansToStorage();

  // Clear the registration form
  const registerForm = document.getElementById('regForm');
  if (registerForm) {
    registerForm.reset();
  }

  // Clear any image previews
  const previewElements = document.querySelectorAll('.image-preview');
  previewElements.forEach(preview => {
    preview.innerHTML = '';
  });

  // Reset file name displays
  const fileNameElements = document.querySelectorAll('.file-name');
  fileNameElements.forEach(element => {
    element.textContent = 'No file chosen';
  });

  // Close modal
  closeModals();
}

// Save loans to localStorage
function saveLoansToStorage() {
  try {
    localStorage.setItem('loans', JSON.stringify(allLoans));
    console.log('Loans saved to localStorage');
  } catch (e) {
    console.error('Error saving loans to localStorage:', e);
  }
}

// Load loans from localStorage
function loadLoansFromStorage() {
  try {
    const storedLoans = localStorage.getItem('loans');
    return storedLoans ? JSON.parse(storedLoans) : null;
  } catch (e) {
    console.error('Error loading loans from localStorage:', e);
    return null;
  }
}
// Embedded CSV data for static deployment
const csvData = `Full Names,phone number,Date Issued,Amount  Issued,Amount paid,Amount Remaining,Total Due,Cleared,Defaulted,Occupation,Dates of Payment,Methods of Payment,Employer Name,Address,Referee Name,Principal Amount,Email,Loan Purpose
Emily Ouma,726731787,27/02/25 Thursday,"10,000/=",,,"12,000/=",fully paid,,,,,,,,,,
Carolyne Obongo,719309438,27/02/25 Thursday,"7,000/=",,,"9,000/=",fully paid,,,,,,,,,,
Zulfah Atieno Okumu,723438917,27/02/25 Thursday,"6,000/=",,,"8,000/=",fully paid,,,,,,,,,,
Deborah Achieng Odhiambo,11850110,27/02/25 Thursday,"6,000/=",,,"8,000/=",fully paid,,,,,,,,,,
Euphenoc Amango,111209680,28/02/25 Friday,"7,000/=",,,"9,000/=",,,,,,,,,,,
Florence Akoth,712722929,28/02/25 Friday,"5,000/=",,,,,,,,,,,,,,
Hagnater Akrlo Siambe,795828090,28/02/25 Friday,"7,000/=",,,,,,,,,,,,,,
Caroline Aluoch Mbso,769319604,28/02/25 Friday,"8,000/=",,,,,,,,,,,,,,
Rosemary Akinyi Yada,712862604,28/02/25 Friday,"8,000/=",,,,,,,,,,,,,,
Nancy Akinyi,795118555,3/3/2025 Monday,"5,000/=",,,,,,,,,,,,,,
Eunice Adhiambo,790541305,3/3/2025 Monday,"5,000/=",,,,,,,,,,,,,,
Rose Omulo,700261173,3/3/2025 Monday,"5,000/=",,,,,,,,,,,,,,
Eunice Anyango,757110857,3/3/2025 Monday,"5,000/=",,,,,,,,,,,,,,
Dorothy Aloiko,712525043,5/3/2025 Wednesday,"5,000/=",,,,,,,,,,,,,,
Alice Auma,720055750,5/3/2025 Wednesday,"8,000/=",,,,,,,,,,,,,,
Emojong Ngwoi,720649857,5/3/2025 Wednesday,"3,000/=",,,,,,,,,,,,,,
Irine Atieno,729348036,6/3/2025 Thursday,"5,000/=",,,,,,,,,,,,,,
Beatrice Atieno,114343421,6/3/2025 Thursday,"3,000/=",,,,,,,,,,,,,,
Lolloa Atieno,718003639,6/3/2025 Thursday,"5,000/=",,,,,,,,,,,,,,`;

// Load CSV data
async function loadCSVData() {
  try {
    console.log('Starting CSV data loading...');

    // First try to load from localStorage
    const storedLoans = loadLoansFromStorage();
    if (storedLoans && storedLoans.length > 0) {
      console.log('Loaded ' + storedLoans.length + ' loans from localStorage');

      // Adjust principal amounts and related values for existing data by multiplying by 1000
      storedLoans.forEach(loan => {
        // Add a flag to check if this loan has already been adjusted
        if (!loan.principalAdjusted) {
          // Adjust principal amount
          loan.principal = loan.principal * 1000;

          // Adjust total due amount to match the new principal
          // If totalDue was calculated as principal * 1.2, recalculate it
          if (Math.abs(loan.totalDue - (loan.principal / 1000 * 1.2)) < 0.01) {
            loan.totalDue = loan.principal * 1.2;
          } else {
            // Otherwise, scale it by the same factor
            loan.totalDue = loan.totalDue * 1000;
          }

          // If there's an amountPaid, adjust it proportionally
          if (loan.amountPaid) {
            loan.amountPaid = loan.amountPaid * 1000;
          }

          loan.principalAdjusted = true;
        }
      });

      allLoans = storedLoans;
      filteredLoans = [...allLoans];

      // Save the adjusted loans back to localStorage
      saveLoansToStorage();

      displayLoans(filteredLoans);
      return;
    }

    // If no localStorage data, use the embedded CSV data
    console.log('Using embedded CSV data');

    // Use the embedded CSV data
    const text = csvData;
    console.log('CSV data loaded, parsing...');

    allLoans = parseCSVToLoans(text);

    // No need to adjust values here since we already multiplied by 1000 during CSV parsing
    // Just make sure all loans are marked as adjusted
    allLoans.forEach(loan => {
      if (!loan.principalAdjusted) {
        loan.principalAdjusted = true;
      }
    });

    filteredLoans = [...allLoans];

    // Save to localStorage for future use
    saveLoansToStorage();

    // Log the first few loans to verify values are correct
    if (filteredLoans.length > 0) {
      console.log('Sample loan data after adjustment:');
      console.log('First loan principal:', filteredLoans[0].principal);
      console.log('First loan totalDue:', filteredLoans[0].totalDue);
    }

    displayLoans(filteredLoans);

  } catch (error) {
    console.error('Error loading CSV:', error);
    document.getElementById('loanList').innerHTML = '<p class="error-message">Failed to load loan data. Please check your connection and try again.</p>';
  }
}

// Check database connection status
async function checkDatabaseConnection() {
  try {
    isConnectedToDatabase = await checkDatabaseStatus();
    console.log('Database connection status:', isConnectedToDatabase ? 'Connected' : 'Disconnected');

    if (isConnectedToDatabase) {
      // If connected to database, fetch loans from API
      try {
        const loans = await fetchLoans();
        allLoans = loans;
        filteredLoans = [...allLoans];
        displayLoans(filteredLoans);
      } catch (error) {
        console.error('Error fetching loans from API:', error);
        // Fall back to local data if API fails
        loadCSVData();
      }
    } else {
      // If not connected to database, use local data
      loadCSVData();
    }
  } catch (error) {
    console.error('Error checking database connection:', error);
    // Fall back to local data if connection check fails
    loadCSVData();
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Check database connection and load data
  checkDatabaseConnection();

  // Set up search functionality
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterLoans(this.value);
    });
  }

  // Set up modal close buttons
  const closeButtons = document.querySelectorAll('.close-modal');
  closeButtons.forEach(button => {
    button.addEventListener('click', closeModals);
  });

  // Set up form submissions
  const editForm = document.getElementById('editLoanForm');
  if (editForm) {
    editForm.addEventListener('submit', saveEditedLoan);
  }

  const addForm = document.getElementById('addLoanForm');
  if (addForm) {
    addForm.addEventListener('submit', addNewLoan);
  }
});
