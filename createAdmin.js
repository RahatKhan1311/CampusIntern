const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin'); 

mongoose.connect('mongodb://127.0.0.1:27017/campusintern', {})
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

async function createAdmin() {
    try {
        const name = 'Admin';   
        const email = 'admintest@gmail.com'; 
        const password = 'admin123';   

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Admin with this email already exists.');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            name,
            email,
            password: hashedPassword
        });

        await admin.save();
        console.log('Admin created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}
createAdmin();
