const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');  // Importando a biblioteca de criptografia

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    paymentStatus: { type: String, enum: ['ativo', 'inativo'], default: 'inativo' },
    subscriptionExpiry: { type: Date }, // Data de expiração da assinatura
    isAdmin: { type: Boolean, default: false }
  });

// Criptografar a senha antes de salvar no banco de dados
UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    // Criptografa a senha com 10 rounds de salting
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Método para comparar a senha informada com a senha criptografada no banco
UserSchema.methods.comparePassword = async function (password) {
    try {
      // Compara a senha fornecida com a senha criptografada
      const isMatch = await bcrypt.compare(password, this.password);
      return isMatch;  // Retorna true ou false dependendo da comparação
    } catch (error) {
      console.error('Erro ao comparar senhas:', error); // Mais detalhes no erro
      return false;  // Retorna false em caso de erro
    }
  };
module.exports = mongoose.model('User', UserSchema);
