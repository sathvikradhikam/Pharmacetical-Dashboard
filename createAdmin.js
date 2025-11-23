const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
});

// Create admin user
async function createAdminUser() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@pharmacy.com' });
        
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            fullName: 'Admin User',
            username: 'admin',
            email: 'admin@pharmacy.com',
            phone: '1234567890',
            password: 'admin123',
            role: 'admin'
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@pharmacy.com');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdminUser();
