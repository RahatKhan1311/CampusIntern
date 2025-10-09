const express = require('express');
const router = express.Router();
const Internship = require('../../models/internship'); 
const authenticateToken = require('../middleware/auth'); 
const InternshipApplication = require('../../models/internshipApplication'); // Added missing model for application

// GET all internships
router.get('/', authenticateToken, async (req, res) => {
    try {
        const internships = await Internship.find({}, { 
            title: 1, 
            company: 1, 
            location: 1, 
            description: 1, 
            stipend: 1,
            status: 1 
        }).populate('company' , 'name');
        res.json({ internships });
    } catch (err) {
        console.error('Error fetching internships:', err);
        res.status(500).json({ message: 'Server error fetching internships' });
    }
});

// APPLY for an internship (Rigorously cleaned path: /:id/apply)
router.post('/:id/apply', authenticateToken, async (req, res) => {
    try {
        const internshipId = req.params.id;
        const studentId = req.user.id; // user id from JWT

        // Example: Logic to create an application document
        const newApplication = new InternshipApplication({
            student: studentId,
            internship: internshipId,
            status: 'Pending',
            appliedAt: new Date()
        });

        await newApplication.save();

        res.json({ message: 'Applied successfully!', applicationId: newApplication._id });
    } catch (err) {
        console.error('Error applying for internship:', err);
        res.status(500).json({ message: 'Server error applying for internship' });
    }
});

module.exports = router;
