const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
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
        const internships = await Internship.find({ company: companyId }).populate('company', 'name');
        res.json(internships);
    } catch (err) {
        console.error('Error fetching company listings:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

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



// Get applications for a specific internship
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

// Update an application's status and company notes
router.put('/applications/:applicationId/update', authenticateToken, authorizeCompany, 
    async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status , companyNotes } = req.body;

        const validStatuses = ['Applied','Pending', 'Shortlisted', 'Rejected'];
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


router.get('/applications/:applicationId/resume', authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const companyId = req.user.id;

        // Find the application and populate the internship to check if it belongs to the company
        const application = await InternshipApplication.findById(applicationId).populate('internship');

        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        // Check if the internship belongs to the logged-in company
        if (application.company.toString() !== companyId) {
            return res.status(403).json({ message: 'Access denied. This application does not belong to your company.' });
        }

        // Check if a resume path exists
        if (!application.resumePath) {
            return res.status(404).json({ message: 'Resume not found for this application.' });
        }

        // Send the file to the client
        const filePath = path.join(__dirname, '..', '..', application.resumePath);
        res.sendFile(filePath);

    } catch (err) {
        console.error('Error fetching resume:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

const mongoose = require('mongoose');

router.get('/applications/recent', authenticateToken, async (req, res) => {
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



// GET /api/company/applications/:id -- Get single application for company
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
    res.json(application);
  } catch (err) {
    console.error('Error fetching application:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//company can view a student's resume
router.get("/applications/:applicationId/resume", authenticateToken, authorizeCompany, async (req, res) => {
    try {
        const companyId = req.user.id;
        const { applicationId } = req.params;

        const application = await InternshipApplication.findById(applicationId)
            .populate("internship")
            .populate("student"); // populate student too

        if (!application) {
            return res.status(404).json({ message: "Application not found." });
        }

        // verify company owns this internship
        if (application.internship.company.toString() !== companyId) {
            return res.status(403).json({ message: "Access denied. This application doesn't belong to your company." });
        }

        // check student's resume
        if (!application.student || !application.student.resumePath) {
            return res.status(404).json({ message: "Resume not uploaded by this student." });
        }

        const filePath = path.join(__dirname, "..", "..", application.student.resumePath);
        res.sendFile(filePath);
    } catch (err) {
        console.error("Error fetching resume for company:", err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;