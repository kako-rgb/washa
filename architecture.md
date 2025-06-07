# Washa Enterprises Loan Management System - File Structure

```
loan-management-system/
├── index.html                  # Main entry point for the application
├── login.html                  # Login page
├── dashboard.html              # Dashboard for administrators
├── user-management.html        # User management page
├── loan-management.html        # Loan management page
├── payment-processing.html     # Payment processing page
├── reports.html                # Reports and analytics page
├── css/
│   ├── styles.css              # Main stylesheet
│   ├── login.css               # Login page styles
│   ├── dashboard.css           # Dashboard styles
│   ├── animations.css          # Animation styles
│   └── responsive.css          # Responsive design styles
├── js/
│   ├── app.js                  # Main application logic
│   ├── auth.js                 # Authentication logic
│   ├── users.js                # User management logic
│   ├── loans.js                # Loan management logic
│   ├── payments.js             # Payment processing logic
│   ├── reports.js              # Reporting and analytics logic
│   ├── csv-import.js           # CSV import functionality
│   ├── db.js                   # MongoDB connection and operations
│   └── utils.js                # Utility functions
├── assets/
│   ├── images/                 # Image assets
│   ├── icons/                  # Icon assets
│   └── fonts/                  # Font assets
└── server/
    ├── server.js               # Backend server for API endpoints
    ├── db.js                   # Database connection and models
    ├── routes/                 # API routes
    │   ├── auth.js             # Authentication routes
    │   ├── users.js            # User management routes
    │   ├── loans.js            # Loan management routes
    │   ├── payments.js         # Payment processing routes
    │   └── reports.js          # Reporting routes
    └── middleware/             # Middleware functions
        ├── auth.js             # Authentication middleware
        └── validation.js       # Input validation middleware
```

## Application Architecture

### Frontend
- **HTML**: Separate pages for different sections of the application
- **CSS**: Modular stylesheets with responsive design and animations
- **JavaScript**: Modular scripts for different functionalities

### Backend
- **Node.js**: Server for handling API requests
- **Express.js**: Web framework for routing and middleware
- **MongoDB Atlas**: Cloud database for storing application data

### Authentication
- JWT (JSON Web Tokens) for secure authentication
- Role-based access control for different user types

### Data Flow
1. User authenticates through login page
2. Frontend makes API calls to backend server
3. Backend server interacts with MongoDB Atlas
4. Data is returned to frontend for display

### Features Implementation
- **User Management**: CRUD operations for user profiles
- **Loan Management**: Application, approval, disbursement, and repayment tracking
- **Payment Processing**: Manual entry and CSV import
- **Reporting**: Dashboard with visualizations and detailed reports
- **Responsive Design**: Mobile-friendly interface with smooth animations
