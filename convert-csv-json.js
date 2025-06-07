const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function convertCsvToJson(csvFilePath, outputDir) {
    return new Promise((resolve, reject) => {
        const results = [];
        const fileName = path.basename(csvFilePath, '.csv').replace(/ /g, '-');
        const jsonFilePath = path.join(outputDir, `${fileName}.json`);
        
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                // Process the data to match the expected format
                const processedData = results.map((item, index) => ({
                    _id: `fallback-${fileName}-${index}`,
                    fullName: item['Full Names'] || 'Unknown',
                    phone: item['phone number'] || '',
                    amount: parseFloat((item['Amount borrowed'] || item['Amount  Issued'] || '0').replace(/[^0-9.]/g, '')) || 0,
                    date: item['date of borrowing'] || item['Date Issued'] || new Date().toISOString(),
                    status: 'pending',
                    source: `fallback-${fileName}`,
                    borrower: {
                        fullName: item['Full Names'] || 'Unknown',
                        email: item['Email'] || '',
                        phone: item['phone number'] || ''
                    },
                    purpose: item['Loan Purpose'] || 'Not specified',
                    term: '30'
                }));
                
                fs.writeFileSync(jsonFilePath, JSON.stringify(processedData, null, 2));
                console.log(`Converted ${csvFilePath} to ${jsonFilePath}`);
                resolve(jsonFilePath);
            })
            .on('error', (error) => {
                console.error(`Error processing ${csvFilePath}:`, error);
                reject(error);
            });
    });
}

async function main() {
    try {
        const baseDir = '/opt/lampp/htdocs/lms-washa';
        const dataDir = path.join(baseDir, 'old-data');
        const outputDir = path.join(baseDir, 'data');
        
        console.log('Starting CSV to JSON conversion...');
        
        // Convert both CSV files
        await convertCsvToJson(path.join(dataDir, 'updated loans.csv'), outputDir);
        await convertCsvToJson(path.join(dataDir, 'Joyce Past Data2.csv'), outputDir);
        
        console.log('All CSV files have been converted to JSON');
        console.log(`JSON files saved to: ${outputDir}`);
    } catch (error) {
        console.error('Error converting CSV files:', error);
        process.exit(1);
    }
}

main();