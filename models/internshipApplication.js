const mongoose = require('mongoose');

const internshipApplicationSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    company : { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true},
    status: { type: String, default: 'Applied' },
    resumePath: { type: String, default: '' },
    companyNotes: {type: String, default: ''},
}, { timestamps: true });

module.exports = mongoose.model('InternshipApplication', internshipApplicationSchema);