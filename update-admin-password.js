const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kakotechnology:Gladyswi11y2020@cluster0.dfv4h.mongodb.net/?retryWrites=true&w=majority&washa=Cluster0';

// Define User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'loan_officer', 'customer'], default: 'customer' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

const User = mongoose.model('User', userSchema);

async function updateAdminPassword() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'washaLoans'
        });
        
        console.log('Connected to MongoDB Atlas');
        
        // Find the admin user
        const admin = await User.findOne({ username: 'admin' });
        
        if (!admin) {
            console.log('Admin user not found. Creating a new admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Qwerty12345', salt);
            
            const newAdmin = new User({
                username: 'admin',
                password: hashedPassword,
                fullName: 'System Administrator',
                email: 'admin@washaenterprises.com',
                role: 'admin'
            });
            
            await newAdmin.save();
            console.log('New admin user created with password: Qwerty12345');
        } else {
            // Update existing admin password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Qwerty12345', salt);
            
            admin.password = hashedPassword;
            await admin.save();
            console.log('Admin password updated successfully to: Qwerty12345');
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error updating admin password:', error);
        process.exit(1);
    }
}

updateAdminPassword();
