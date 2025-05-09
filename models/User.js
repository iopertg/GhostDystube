const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  paymentStatus: { type: String, enum: ['ativo', 'inativo'], default: 'inativo' },
  subscriptionExpiry: { type: Date },
  isAdmin: { type: Boolean, default: false },
  
  // Canal
  canalNome: { type: String, default: '' },
  canalDescricao: { type: String, default: '' },
  fotoPerfil: { type: String, default: '' }
});

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error('Erro ao comparar senhas:', error);
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema);
