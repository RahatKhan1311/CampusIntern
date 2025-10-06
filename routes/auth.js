const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('./middleware/auth');

const Student = require('../../models/student');
const Admin = require('../../models/admin');
const Company = require('../../models/company');

// Student Registration
router.post('/register/student',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password } = req.body;

      // Check if email already exists
      const existingStudent = await Student.findOne({ email });
      if (existingStudent) return res.status(400).json({ message: 'Email already registered' });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create student with role
      const student = new Student({
        name,
        email,
        password: hashedPassword,
        role: 'student'
      });

      await student.save();
      res.status(201).json({ message: 'Student registered successfully' });

    } catch (err) {
      console.error('Register route error:', err.stack || err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


// Login for all roles
router.post('/login',
  body('email').isEmail(),
  body('password').exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      console.log('Login attempt for:', email);

      // Search user in all collections
      let user = await Student.findOne({ email }) ||
                 await Admin.findOne({ email }) ||
                 await Company.findOne({ email });

      console.log('User found:', user);
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      if (!user.password) return res.status(500).json({ message: 'User password missing' });

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      // Determine role safely
      const userRole = user.role || 'student';

      // JWT secret fallback
      const JWT_SECRET = 'abc';
      if (!process.env.JWT_SECRET) console.warn('Using fallback JWT_SECRET');

      // Sign JWT
      const token = jwt.sign(
        { id: user._id, role: userRole },
        'abc',
        { expiresIn: '7d' }
      );

      // Respond with token and user info
      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          role: userRole,
          name: user.name
        }
      });

    } catch (err) {
      console.error('Login route error stack:', err.stack || err);
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
);

// General profile route for all users
router.get('/profile', authenticateToken , async(req,res)=>{
  try{
    const userId = req.user.id;
    const userRole = req.user.role;

    let user;
    switch (userRole) {
        case 'student':
            user = await Student.findById(userId).select('-password');
            break;
        case 'company':
            user = await Company.findById(userId).select('-password');
            break;
        case 'admin':
            user = await Admin.findById(userId).select('-password');
            break;
        default:
            return res.status(400).json({ message: 'Invalid user role' });
    }

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch(err){
    console.log('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
