const fs = require('fs');
const path = require('path');

// Function to ensure directory exists
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to copy file with directory creation
function copyFileWithDir(src, dest) {
    ensureDirectoryExists(path.dirname(dest));
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${src} to ${dest}`);
    } else {
        console.warn(`Warning: Source file ${src} does not exist`);
    }
}

// Function to copy directory recursively
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`Warning: Source directory ${src} does not exist`);
        return;
    }

    ensureDirectoryExists(dest);
    console.log(`Copying directory ${src} to ${dest}`);
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${srcPath} to ${destPath}`);
        }
    }
}

// Main build process
async function build() {
    console.log('Starting build process...');
    const rootDir = process.cwd();
    const publicDir = path.join(rootDir, 'public');
    
    // Ensure public directory exists
    ensureDirectoryExists(publicDir);
    console.log('Created public directory at:', publicDir);

    // Copy static directories with verbose logging
    ['css', 'js', 'data'].forEach(dir => {
        const srcDir = path.join(rootDir, dir);
        const destDir = path.join(publicDir, dir);
        console.log(`Processing directory: ${dir}`);
        if (fs.existsSync(srcDir)) {
            copyDirRecursive(srcDir, destDir);
        } else {
            console.warn(`Warning: Directory ${dir} not found in source`);
        }
    });

    // Copy HTML files
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

    console.log('Copying HTML files...');
    htmlFiles.forEach(file => {
        copyFileWithDir(
            path.join(rootDir, file),
            path.join(publicDir, file)
        );
    });

    // Copy additional files
    const additionalFiles = [
        'check-payments.js',
        'convert-csv-json.js',
        'update-admin-password.js'
    ];

    console.log('Copying additional files...');
    additionalFiles.forEach(file => {
        copyFileWithDir(
            path.join(rootDir, file),
            path.join(publicDir, file)
        );
    });

    // Create a build info file
    const buildInfo = {
        buildTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
    };

    fs.writeFileSync(
        path.join(publicDir, 'build-info.json'),
        JSON.stringify(buildInfo, null, 2)
    );

    console.log('Build completed successfully');
    console.log('Build info:', buildInfo);
}

// Run build with error handling
build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
