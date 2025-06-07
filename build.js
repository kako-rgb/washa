const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Function to copy files recursively
function copyFiles(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            copyFiles(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

// HTML files to copy
const htmlFiles = [
    'index.html',
    'dashboard.html',
    'user-management.html',
    'loan-management.html',
    'payment-processing.html',
    'reports.html',
    'admin-sessions.html',
    'active-sessions.html'
];

// Copy HTML files
htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(publicDir, file));
    }
});

// Directories to copy
const directories = ['css', 'js', 'data'];

// Copy directories
directories.forEach(dir => {
    if (fs.existsSync(dir)) {
        copyFiles(dir, path.join(publicDir, dir));
    }
});

// Copy additional files
const additionalFiles = [
    'check-payments.js',
    'convert-csv-json.js',
    'update-admin-password.js'
];

additionalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(publicDir, file));
    }
});

console.log('Build completed - public directory created with all static assets');