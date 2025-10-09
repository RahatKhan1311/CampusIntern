const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/auth');
const Internship = require('../../models/internship');
const InternshipApplication = require('../../models/internshipApplication');
const Company = require('../../models/company');
const path = require('path');

// Middleware to ensure the user is a company
const authorizeCompany = (req, res, next) => {
    if (req.user && req.user.role === 'company') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Company privileges required.' });
    }
};

// Post a new internship
router.post('/internships', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const { title, description, location, stipend, deadline } = req.body;
        const companyId = req.user.id;

        const newInternship = new Internship({
            company: companyId,
            title,
            description,
            location,
            stipend,
            deadline,
            postedBy: req.user.id,
            status: 'Pending',
        });

        await newInternship.save();
        res.status(201).json({ message: 'Internship posted successfully!', internship: newInternship });
    } catch (err) {
        console.error('Error posting internship:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a company's own internship listings
router.get('/internships/my-listings', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const companyId = req.user.id;
        // Populate the company field with just the name
        const internships = await Internship.find({ company: companyId }).populate('company', 'name');
        res.json(internships);
    } catch (err) {
        console.error('Error fetching company listings:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /applications - Fetch all applications for the company
router.get('/applications', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const companyId = new mongoose.Types.ObjectId(req.user.id);
        const applications = await InternshipApplication.find({ company: companyId })
            .populate('student', 'name email')
            .populate('internship', 'title location')
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (err) {
        console.error('Error fetching applications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Get applications for a specific internship (RIGOROUSLY CLEANED PATH)
router.get('/internships/:internshipId/applications', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const { internshipId } = req.params;
        const companyId = req.user.id;

        const applications = await InternshipApplication.find({ internship: internshipId, company: companyId })
        .populate('student', 'name email')
        .populate('internship', 'title');

        if (!applications || applications.length === 0) {
            return res.status(404).json({ message: 'No applications found for this internship' });
        }
        res.json(applications);
    } catch (err) {
        console.error('Error fetching applications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update an application's status and company notes (RIGOROUSLY CLEANED PATH)
router.put('/applications/:applicationId/update', authenticateToken, authorizeCompany, 
    async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status , companyNotes } = req.body;

        // Added 'Selected' status for final offer/acceptance
        const validStatuses = ['Applied','Pending', 'Shortlisted', 'Rejected', 'Selected']; 
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const application = await InternshipApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        // Check ownership
        if (application.company.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this application.' });
        }

        // Update fields
        if (status) application.status = status;
        if (typeof companyNotes === 'string') application.companyNotes = companyNotes;

        await application.save();

        res.json({ message: 'Application updated successfully.', application });
    } catch (err) {
        console.error('Error updating application:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/company/applications/recent - Get the 5 most recent applications for the company (RIGOROUSLY CLEANED PATH)
router.get('/applications/recent', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        // Correct ObjectId instantiation
        const companyId = new mongoose.Types.ObjectId(req.user.id);

        const applications = await InternshipApplication.find({ company: companyId })
            .populate('student', 'name email')
            .populate('internship', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching recent applications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// GET /api/company/applications/:id -- Get single application for company (RIGOROUSLY CLEANED PATH)
router.get('/applications/:id', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const application = await InternshipApplication.findById(req.params.id)
            .populate('student', 'name email')
            .populate({
                path: 'internship',
                select: 'title company',
                populate: { path: 'company', select: 'name' }
            })
            .lean();

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        
        // Final security check: ensure the application belongs to this company
        if (application.company.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. Application does not belong to your company.' });
        }

        res.json(application);
    } catch (err) {
        console.error('Error fetching application:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Company can view a student's resume attached to a specific application (RIGOROUSLY CLEANED PATH)
router.get('/applications/:applicationId/resume', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const companyId = req.user.id;
        const { applicationId } = req.params;

        // Find the application (no need to populate student if resume path is on application)
        const application = await InternshipApplication.findById(applicationId)
            .populate("internship");

        if (!application) {
            return res.status(404).json({ message: "Application not found." });
        }

        // verify company owns this internship (via the application's company field)
        if (application.company.toString() !== companyId) {
            return res.status(403).json({ message: "Access denied. This application doesn't belong to your company." });
        }

        // Check if a resume path exists on the application
        if (!application.resumePath) {
            return res.status(404).json({ message: "Resume not uploaded for this application." });
        }

        // Send the file to the client using the path stored on the application object
        const filePath = path.join(__dirname, "..", "..", application.resumePath);
        res.sendFile(filePath);
    } catch (err) {
        console.error("Error fetching resume for company:", err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
