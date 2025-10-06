const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth'); 
const bcrypt = require('bcryptjs');

const Student = require('../../models/student');
const Company = require('../../models/company');
const Internship = require('../../models/internship');
const InternshipApplication = require('../../models/internshipApplication');
const Admin = require('../../models/admin');
const Announcement = require('../../models/announcement');

// Middleware to ensure only admins can access these routes
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

// Route to get dashboard counts (students, companies, applications)
router.get('/dashboard-counts', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const studentCount = await Student.countDocuments();
        const companyCount = await Company.countDocuments();
        const internshipCount = await Internship.countDocuments();
        const applicationCount = await InternshipApplication.countDocuments();
        
        res.json({ studentCount, companyCount, internshipCount ,applicationCount });
    } catch (err) {
        console.error('Error fetching dashboard counts:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get all users (students and companies)
router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const students = await Student.find({}, 'name email isBlocked').lean();
        students.forEach( s => s.role = 'student');

        const companies = await Company.find({}, 'name email isBlocked').lean();
        companies.forEach( c => c.role = 'company');
        
        const allUsers = [...students, ...companies];
        res.json(allUsers);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Route to get all internship applications (for admin)
router.get('/applications', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        // Populate related student, internship and company info if needed
        const applications = await InternshipApplication.find()
            .populate('student', 'name') // get student name
            .populate({
                path: 'internship',
                select: 'title company',
                populate: {path: 'company', select: 'name'}
            }) // get internship info
            .lean();

        // Map data to a simpler structure for frontend
        const formattedApplications = applications.map(app => ({
            _id: app._id,
            studentName: app.student?.name || 'N/A',
            internshipTitle: app.internship?.title || 'N/A',
            companyName: app.internship?.company?.name || 'N/A',
            status: app.status,
            offerLetter: app.offerLetterUrl || null, // adjust field name if needed
        }));

        res.json(formattedApplications);
    } catch (err) {
        console.error('Error fetching applications:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get a single internship application by ID (for admin)
router.get('/applications/:id', authenticateToken, authorizeAdmin, async (req, res) => {
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


// Route to get all internships (for admin)
router.get('/internships', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const internships = await Internship.find()
    .populate('company','name')
    .populate('postedBy','name email')
    .lean();
    const formattedInternships = internships.map(internship => ({
      _id: internship._id,
      title: internship.title,
      companyName: internship.company ? internship.company.name : 'N/A',
      postedBy: internship.postedBy ? internship.postedBy.name : 'N/A',
      status: internship.status || 'N/A',
    }));

    res.json(formattedInternships);
  } catch (err) {
    console.error('Error fetching internships:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/internships/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name')
      .populate('postedBy', 'name email')
      .lean();

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }

    const formatted = {
      _id: internship._id,
      title: internship.title,
      companyName: internship.company ? internship.company.name : 'N/A',
      postedBy: internship.postedBy ? internship.postedBy.name : 'N/A',
      status: internship.status || 'N/A',
      description: internship.description,
      location: internship.location,
      stipend: internship.stipend,
      deadline: internship.deadline,
    };

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



// Route to toggle user block status (block/unblock)
router.put('/users/:userId/toggle-block', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Try Student collection
    let user = await Student.findById(userId).select('isBlocked');
    if (user) {
      const updatedUser = await Student.findByIdAndUpdate(
        userId,
        { isBlocked: !user.isBlocked },
        { new: true }
      );
      return res.json({ message: `Student has been ${updatedUser.isBlocked ? 'blocked' : 'unblocked'}.`, user: updatedUser });
    }

    // Try Company collection 
    user = await Company.findById(userId).select('isBlocked');
    if (user) {
      const updatedUser = await Company.findByIdAndUpdate(
        userId,
        { isBlocked: !user.isBlocked },
        { new: true }
      );
      return res.json({ message: `Company has been ${updatedUser.isBlocked ? 'blocked' : 'unblocked'}.`, user: updatedUser });
    }

    res.status(404).json({ message: 'User not found' });

  } catch (err) {
    console.error('Error toggling user block status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



router.put('/internships/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  const internshipId = req.params.id;
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const updated = await Internship.findByIdAndUpdate(
      internshipId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Internship not found.' });
    }

    res.json({ message: `Internship status updated to ${status}.` });
  } catch (err) {
    console.error('Error updating internship status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/applications/:id/update', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, companyNotes } = req.body;

    const validStatuses = ['Pending', 'Shortlisted', 'Rejected', 'Selected']; // Adjust as needed
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const application = await InternshipApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (status) application.status = status;
    if (typeof companyNotes === 'string') application.companyNotes = companyNotes;

    await application.save();

    res.json({ message: 'Application updated successfully.', application });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//Add new announcement
router.post('/announcements', authenticateToken, authorizeAdmin, async(req,res)=>{
  try{
    const newAnnouncement = new Announcement({message: req.body.message});
    await newAnnouncement.save(); 
    res.status(201).json(newAnnouncement); 
  } catch(err) {
    console.error(err);
    res.status(500).json({message: "Error serving announcement"});
  }
});

//Get all announcements
router.get('/announcements', authenticateToken, async(req,res)=>{
  try{
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch(err){
    console.error(err);
    res.status(500).json({message: "Error fetching announcements"});
  }
});

router.post('/add-admin' , authenticateToken, authorizeAdmin,
  async(req,res)=>{
    try{
      const { name,email,password } = req.body;
      if(!name || !email || !password){
        return res.status(400).json({message: 'Name, email, and password are required'});
      }

      //check if admin already exists
      const existing = await Admin.findOne({ email });
      if(existing) {
        return res.status(400).json({message: 'Admin already exists with this email.'});
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      });

      await newAdmin.save();

      res.json({
        message: 'Admin created successfully',
        admin: { name: newAdmin.name, email: newAdmin.email, role: newAdmin.role }
      });
    } catch (err) {
      console.log('Error adding admin:',err);
      res.status(500).json({message:'Server error'});
    }
});

// Company-wise offers
router.get('/reports/company-offers', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const offers = await InternshipApplication.aggregate([
            { $match: { status: "Selected" } },
            {
                $lookup: {
                    from: "companies",
                    localField: "company",
                    foreignField: "_id",
                    as: "companyData"
                }
            },
            { $unwind: "$companyData" },
            {
                $group: {
                    _id: "$companyData.name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json(offers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Applications trend (per month)
router.get('/reports/applications-trend', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const trend = await InternshipApplication.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" }, // month number 1-12
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Optional: convert month number to name
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const formattedTrend = trend.map(t => ({ month: months[t._id - 1], count: t.count }));

        res.json(formattedTrend);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;