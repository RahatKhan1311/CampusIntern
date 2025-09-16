const mongoose = require('mongoose');
const { Schema } = mongoose;

const InternshipSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  location: String,
  stipend: Number,
  deadline: Date,
  postedAt: { type: Date, default: Date.now },
  postedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }, 
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
});

module.exports = mongoose.model('Internship', InternshipSchema);
