// CSV Import functionality for payments

// CSV Import functionality
function importPaymentsFromCsv(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Show preview
        const previewContainer = document.getElementById('csv-preview');
        if (previewContainer) {
            let previewHtml = '<table class="preview-table"><thead><tr>';
            headers.forEach(header => {
                previewHtml += `<th>${header}</th>`;
            });
            previewHtml += '</tr></thead><tbody>';
            
            // Show first 5 rows as preview
            for (let i = 1; i < Math.min(6, lines.length); i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim());
                    previewHtml += '<tr>';
                    values.forEach(value => {
                        previewHtml += `<td>${value}</td>`;
                    });
                    previewHtml += '</tr>';
                }
            }
            previewHtml += '</tbody></table>';
            previewContainer.innerHTML = previewHtml;
        }
        
        // Show CSV import modal
        const csvModal = document.getElementById('csv-import-modal');
        if (csvModal) {
            csvModal.classList.add('active');
        }
    };
    
    reader.readAsText(file);
}

// Handle CSV import form submission
document.addEventListener('DOMContentLoaded', () => {
    const csvImportForm = document.getElementById('csv-import-form');
    if (csvImportForm) {
        csvImportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('csv-file');
            if (fileInput && fileInput.files.length > 0) {
                processCsvFile(fileInput.files[0]);
            }
        });
    }
    
    // Close CSV modal
    const closeCsvModal = document.getElementById('close-csv-modal');
    if (closeCsvModal) {
        closeCsvModal.addEventListener('click', () => {
            const csvModal = document.getElementById('csv-import-modal');
            if (csvModal) {
                csvModal.classList.remove('active');
            }
        });
    }
    
    // Cancel CSV import
    const cancelCsvImport = document.getElementById('cancel-csv-import');
    if (cancelCsvImport) {
        cancelCsvImport.addEventListener('click', () => {
            const csvModal = document.getElementById('csv-import-modal');
            if (csvModal) {
                csvModal.classList.remove('active');
            }
        });
    }
});

function processCsvFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const payments = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const payment = {};
                
                headers.forEach((header, index) => {
                    payment[header] = values[index] || '';
                });
                
                payments.push(payment);
            }
        }
        
        // Process the payments
        console.log('Processed CSV payments:', payments);
        app.showNotification(`Processed ${payments.length} payments from CSV`, 'success');
        
        // Close modal
        const csvModal = document.getElementById('csv-import-modal');
        if (csvModal) {
            csvModal.classList.remove('active');
        }
        
        // Refresh payments table
        if (typeof loadPayments === 'function') {
            loadPayments();
        }
    };
    
    reader.readAsText(file);
}