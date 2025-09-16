const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'company' },
  isBlocked: { type: Boolean, default: false } 
}, { timestamps: true });

//hashed pass before saving
companySchema.pre('save', async function(next) {
  if(!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password,10);
  next();  
})

module.exports = mongoose.model('Company', companySchema);
