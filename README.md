# Washa Enterprises Loan Management System

A web application for managing loans for Washa Enterprises.

## Features

- Register new loan applicants
- Track loan status and payments
- View payment history
- Search for loans by name or phone number
- Works offline with localStorage
- Responsive design for mobile and desktop

## Deployment to Netlify

This application is configured to work on Netlify as a static site. Follow these steps to deploy:

1. **Create a Netlify account** if you don't have one at [netlify.com](https://www.netlify.com/)

2. **Deploy to Netlify** using one of these methods:

   ### Option 1: Deploy directly from GitHub
   
   1. Log in to Netlify
   2. Click "New site from Git"
   3. Choose GitHub as your Git provider
   4. Authorize Netlify to access your GitHub account
   5. Select the repository `kako-rgb/washa`
   6. Configure build settings:
      - Build command: Leave empty (or use `echo 'No build needed'`)
      - Publish directory: `.` (root directory)
   7. Click "Deploy site"

   ### Option 2: Deploy manually
   
   1. Log in to Netlify
   2. Go to the "Sites" section
   3. Drag and drop the entire project folder onto the Netlify dashboard
   4. Wait for the upload to complete
   5. Your site will be deployed automatically

3. **Configure custom domain** (optional):
   
   1. From your site dashboard, go to "Domain settings"
   2. Click "Add custom domain"
   3. Follow the instructions to set up your domain

## How It Works on Netlify

The application is configured to work differently on Netlify compared to local development:

1. **API Handling**: When deployed to Netlify, the app automatically detects it's running on Netlify and uses localStorage instead of trying to connect to a backend API.

2. **Database Fallback**: The database connection indicator will show "disconnected" on Netlify, which is normal since it's running in static mode.

3. **Data Persistence**: All data is stored in the browser's localStorage, which means:
   - Data persists between sessions on the same device/browser
   - Data is not shared between different users or devices
   - Clearing browser data will erase the stored loans

## Local Development

To run the application locally:

1. Clone the repository:
   ```
   git clone https://github.com/kako-rgb/washa.git
   cd washa
   ```

2. Open the index.html file in your browser or use a local server:
   ```
   # Using Python's built-in server
   python -m http.server
   
   # Or using Node.js with http-server
   npx http-server
   ```

3. For full functionality with the backend API, you'll need to run the server:
   ```
   node server.js
   ```

## Troubleshooting Netlify Deployment

If you encounter issues with the Netlify deployment:

1. **Check browser console** for errors
2. **Verify the netlify.toml file** is included in your deployment
3. **Clear browser cache and localStorage** if you're testing changes
4. **Check Netlify deployment logs** for any build or deployment errors

## License

This project is proprietary and owned by Washa Enterprises.
