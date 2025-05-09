const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User');
const multer = require('multer'); // ← AQUI

const app = express();
const PORT = 3000;

// Conectar ao MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/aliceDB2')
  .then(() => console.log("💾 Conectado ao MongoDB"))
  .catch((err) => console.error("Erro ao conectar no MongoDB:", err));

// Session middleware
app.use(session({
    secret: 'meusegredodarkzin', // Pode mudar isso depois
    resave: false,
    saveUninitialized: true
}));

// Middleware para ler dados do formulário
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar multer para upload de vídeos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware para verificar se o usuário está logado
const verificarLogin = (req, res, next) => {
    if (!req.session.usuario) return res.redirect('/login');
    next();
};

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota POST para login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.send('Usuário não encontrado. <a href="/login">Tente novamente</a>');
    }

    // Compara a senha
    const isMatch = await user.comparePassword(password);

    if (isMatch) {
      req.session.usuario = username; // Marca como logado
      req.session.isAdmin = user.isAdmin;
      return res.redirect('/painel');
    } else {
      return res.send('Senha incorreta. <a href="/login">Tente novamente</a>');
    }
});

// Rota de registro (mostra a página de registro)
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Rota POST para registrar um novo usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Verifica se o usuário já existe
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.send('Nome de usuário já existe. <a href="/register">Tente novamente</a>');
  }

  // Cria um novo usuário
  const newUser = new User({ username, password });

  // Salva no banco de dados
  await newUser.save();

  // Sucesso, redireciona para a página de login
  res.send('Usuário registrado com sucesso! <a href="/login">Faça login</a>');
});

// Rota do painel (apenas quem "logou")
app.get('/painel', verificarLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'painel.html'));
});

// Rota de upload de vídeos (somente para usuários logados)
app.post('/upload', verificarLogin, upload.single('video'), (req, res) => {
  res.send('Upload de vídeo realizado com sucesso!');
});

// Rota para o painel de administração (somente para admins)
app.get('/admin', verificarLogin, (req, res) => {
  if (req.session.isAdmin) {
    return res.sendFile(path.join(__dirname, 'views', 'admin.html'));
  }
  res.status(403).send('Acesso negado');
});

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Erro ao fazer logout');
    }
    res.redirect('/login');
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
