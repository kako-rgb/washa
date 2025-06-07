# Washa Enterprises Loan Management System

## Overview
This is a comprehensive loan management system for Washa Enterprises, featuring user authentication, loan processing, payment management, and reporting capabilities. The system is built with a modern web stack and connects to MongoDB Atlas for data storage.

## System Requirements
- Node.js (v14 or higher)
- MongoDB Atlas account
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

## File Structure
```
loan-management-system/
├── css/                      # CSS stylesheets
│   ├── styles.css            # Main styles
│   ├── responsive.css        # Responsive design styles
│   └── animations.css        # Animation styles
├── js/                       # JavaScript files
│   ├── app.js                # Main application logic
│   ├── auth.js               # Authentication module
│   ├── users.js              # User management module
│   ├── loans.js              # Loan management module
│   ├── payments.js           # Payment processing module
│   └── reports.js            # Reporting module
├── index.html                # Login page
├── dashboard.html            # Main dashboard
├── user-management.html      # User management page
├── loan-management.html      # Loan management page
├── payment-processing.html   # Payment processing page
├── reports.html              # Reports page
├── server.js                 # Backend API server
├── package.json              # Node.js dependencies
└── .env                      # Environment variables (create this file)
```

## Setup Instructions

### Backend Setup
1. Install Node.js dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://kakotechnology:Gladyswi11y2020@cluster0.dfv4h.mongodb.net/?retryWrites=true&w=majority&washa=Cluster0
   JWT_SECRET=washa-enterprises-secret-key
   ```

3. Start the backend server:
   ```
   npm start
   ```
   The server will run on http://localhost:3000

### Frontend Setup
1. The frontend is static HTML, CSS, and JavaScript, so no additional setup is required.
2. Open `index.html` in your web browser to access the login page.
3. For development, you can use a simple HTTP server:
   ```
   npx http-server -p 8080
   ```
   Then access the application at http://localhost:8080

### MongoDB Atlas Connection
The system is pre-configured to connect to the MongoDB Atlas cluster using the connection string:
```
mongodb+srv://kakotechnology:Gladyswi11y2020@cluster0.dfv4h.mongodb.net/?retryWrites=true&w=majority&washa=Cluster0
```

The system will automatically:
- Connect to the MongoDB Atlas cluster
- Create a database named "washaLoans"
- Set up collections for users, borrowers, loans, and payments
- Create an admin user if one doesn't exist

## Default Admin Credentials
- Username: admin
- Password: admin123

## System Features

### User Authentication and Management
- Secure login with JWT authentication
- Role-based access control (Admin, Loan Officer, Customer)
- User registration and profile management
- Password reset functionality

### Borrower Management
- Add, edit, and view borrower information
- Store contact details, ID numbers, employment status, and income information
- Search and filter borrowers

### Loan Management
- Create and process loan applications
- Configure loan terms, interest rates, and payment schedules
- Loan approval workflow
- Loan disbursement tracking
- Loan status monitoring (pending, approved, active, completed, rejected, defaulted)

### Payment Processing
- Record loan payments
- Track payment history
- Generate payment receipts
- Support multiple payment methods (bank transfer, mobile money, cash, check)
- Import payments from CSV files

### Reporting
- Generate comprehensive reports:
  - Loan summary reports
  - Payment history reports
  - User activity reports
  - Overdue loans reports
  - Disbursement reports
- Export reports in various formats
- Interactive charts and visualizations

### Search Functionality
- Global search across borrowers, loans, and payments
- Advanced filtering options
- Quick access to frequently used records

### CSV Import
- Import payment data from CSV files
- Validate and process bulk payment records
- Error handling for invalid data

## Color Scheme
The system uses a Barclays-themed color scheme:
- Primary Blue: #00AEEF
- Secondary Blue: #00395D
- Accent Blue: #007AC9
- Light Gray: #F5F5F5
- Dark Gray: #333333

## Troubleshooting

### Connection Issues
- Ensure MongoDB Atlas connection string is correct in the `.env` file
- Check that your IP address is whitelisted in MongoDB Atlas
- Verify internet connectivity

### Login Problems
- Default admin credentials: username "admin", password "admin123"
- If you can't log in, try resetting the database to recreate the admin user

### Data Import Errors
- Ensure CSV files follow the required format
- Check for special characters or formatting issues in your data
- Verify that all required fields are present

## Security Notes
- The system uses JWT for authentication with a 24-hour token expiration
- Passwords are hashed using bcrypt before storage
- MongoDB Atlas connection is secured with username/password authentication
- Sensitive operations require appropriate role permissions

## Support
For any issues or questions, please contact Washa Enterprises technical support.
