const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const Internship = require('../../models/internship');
const InternshipApplication = require('../../models/internshipApplication');
const Student = require('../../models/student');
const path = require('path');
const multer = require('multer');
// const internship = require('../../models/internship');

const storage = multer.diskStorage({
    destination: (req,file,cb) =>{
        cb(null, path.join(__dirname, '..', '..', 'uploads', 'resumes'));
    },
    filename: (req,file,cb) =>{
        cb(null, req.user.id + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});

// Middleware to ensure the user is a student
const authorizeStudent = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Student privileges required.' });
    }
};

// Get student profile
router.get('/profile', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const studentId = req.user.id;

        const student = await Student.findById(studentId).lean(); // lean() gives plain JS object

        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        res.json({
            name: student.name,
            email: student.email,
            course: student.course || '',
            achievements: student.achievements || []
        });
    } catch (err) {
        console.error('Error fetching student profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/dashboard-stats', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const studentId = req.user.id;

        // Fetch student document
        const student = await Student.findById(studentId).lean();

        // Fetch student applications
        const applications = await InternshipApplication.find({ student: studentId }).lean();

        // Dashboard numbers
        const totalApplications = applications.length;
        const offersReceived = applications.filter(a => a.status === 'Offer').length;
        const pendingInterviews = applications.filter(a => a.status === 'Interview').length;

        // ✅ Calculate profile completion
        let profileCompletion = 0;
        if (student.name) profileCompletion += 25;
        if (student.email) profileCompletion += 25;
        if (student.course) profileCompletion += 25;
        if (student.achievements && student.achievements.length > 0) profileCompletion += 25;

        // Send JSON to frontend
        res.json({
            totalApplications,
            offersReceived,
            pendingInterviews,
            profileCompletion
        });

    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all available internships
router.get('/internships', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const internships = await Internship.find({}).populate('company', 'name');
        res.json(internships);
    } catch (err) {
        console.error('Error fetching all internships:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Apply for an internship
router.post('/internships/:internshipId/apply', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const { internshipId } = req.params;
        const studentId = req.user.id;

        const internshipDoc = await Internship.findById(internshipId);
        if (!internshipDoc) {
            return res.status(404).json({ message: 'Internship not found.' });
        }

        // Check if internship has a company
        if (!internshipDoc.company) {
            return res.status(400).json({ message: 'Cannot apply: internship has no company assigned.' });
        }

        // Check if student has already applied
        const existingApplication = await InternshipApplication.findOne({ student: studentId, internship: internshipId });
        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this internship.' });
        }

        const newApplication = new InternshipApplication({
            student: studentId,
            internship: internshipId,
            company: internshipDoc.company,
            status: 'Applied'
        });

        await newApplication.save();
        res.status(201).json({ message: 'Application submitted successfully!', application: newApplication });
    } catch (err) {
        console.error('Error submitting application:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /applications - fetch student's applications with internship and company populated
router.get('/applications', authenticateToken, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user.id;

    const applications = await InternshipApplication.find({ student: studentId })
      .populate({
        path: 'internship',
        select: 'title company',
        populate: { path: 'company', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Format data to send minimal needed info
    const formatted = applications.map(app => ({
      _id: app._id,
      internshipTitle: app.internship?.title || 'N/A',
      companyName: app.internship?.company?.name || 'N/A',
      status: app.status,
      appliedOn: app.createdAt,
      companyNotes: app.companyNotes || 'No notes',
      resumePath: app.resumePath || '',
    }));

    // console.log(formatted);
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching student applications:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Delete an application
router.delete('/applications/:applicationId', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const studentId = req.user.id;

        const application = await InternshipApplication.findOne({ _id: applicationId, student: studentId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found or you do not have permission to delete it.' });
        }

        await application.deleteOne();
        res.json({ message: 'Application deleted successfully.' });
    } catch (err) {
        console.error('Error deleting application:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/applications/:applicationId/resume', authenticateToken, authorizeStudent, upload.single('resume'), async (req, res) => {
    try {
        const { applicationId } = req.params;
        const studentId = req.user.id;

        const application = await InternshipApplication.findOne({ _id: applicationId, student: studentId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        
        application.resumePath = path.join('uploads', 'resumes', req.file.filename);
        await application.save();

        res.json({ message: 'Resume uploaded successfully!', resumePath: application.resumePath });
    } catch (err) {
        console.error('Error uploading resume:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/applications/:applicationId/resume', authenticateToken, authorizeStudent, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const studentId = req.user.id;

        const application = await InternshipApplication.findOne({ _id: applicationId, student: studentId });
        if (!application || !application.resumePath) {
            return res.status(404).json({ message: 'Resume not found.' });
        }

        // Send the file to the client
        const filePath = path.join(__dirname, '..', '..', application.resumePath);
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error fetching resume:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update student profile
router.put('/update-profile', authenticateToken, async (req, res) => {
    const studentId = req.user.id; // JWT contains the student's id
    const { name, email, course, achievements } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required.' });
    }

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Update fields
        student.name = name;
        student.email = email;
        student.course = course || student.course;
        if (Array.isArray(achievements)) {
            student.achievements = achievements;
        }

        await student.save();

        res.json({ message: 'Profile updated successfully!', student });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
});

module.exports = router;
