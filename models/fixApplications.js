const mongoose = require('mongoose');
const InternshipApplication = require('./internshipApplication');
const Internship = require('./internship');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/campusintern')
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Fetch all applications
    const applications = await InternshipApplication.find({});

    for (let app of applications) {
      // Only fix if company is missing
      if (!app.company) {
        const internship = await Internship.findById(app.internship);

        if (internship && internship.company) {
          app.company = internship.company; // Copy company from internship
          await app.save();
          console.log(`✔ Fixed application: ${app._id}`);
        } else {
          console.warn(`⚠ Cannot fix application ${app._id}: internship or company missing`);
        }
      }
    }

    console.log('🎉 Done fixing applications!');
    mongoose.disconnect();
  })
  .catch(err => console.error('❌ Error:', err));
