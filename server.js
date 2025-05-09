const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User');
const multer = require('multer'); // ← AQUI
const fetch = require('node-fetch');
const fs = require('fs');


const app = express();
const PORT = 3000;

// Conectar ao MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/aliceDB')
  .then(() => console.log("💾 Conectado ao MongoDB"))
  .catch((err) => console.error("Erro ao conectar no MongoDB:", err));

// Session middleware
app.use(session({
    secret: 'meusegredodarkzin', // Pode mudar isso depois
    resave: false,
    saveUninitialized: true
}));

// Setup do multer (upload de imagens)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage: storage });
app.use('/uploads', (req, res, next) => {
    if (!req.session.usuario) return res.status(403).send('Acesso negado.');
    next();
  });
//
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Middleware para ler dados do formulário
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

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

// Rota do painel (apenas quem "logou")
app.get('/painel', (req, res) => {
  if (req.session.usuario) {
    return res.sendFile(path.join(__dirname, 'views', 'painel.html'));
  } else {
    return res.redirect('/login');
  }
});

// Rota do painel de admin (apenas para admins logados)
app.get('/admin', (req, res) => {
  if (req.session.usuario && req.session.isAdmin) {
    return res.sendFile(path.join(__dirname, 'views', 'admin.html'));
  } else {
    return res.status(403).send('Acesso negado. <a href="/login">Login</a>');
  }
});

// Rota API para retornar dados dos usuários (somente admin pode ver)
app.get('/api/admin/users', async (req, res) => {
  if (!req.session.usuario || !req.session.isAdmin) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }
  
  try {
    const usuarios = await User.find({}, 'username paymentStatus isAdmin');
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// Rota de registro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Rota POST para registrar usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;  // Captura os dados do formulário

  // Verifica se já existe um usuário com esse nome
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.send('Nome de usuário já existe!');
  }

  // Cria um novo usuário
  const newUser = new User({ username, password }); 
  await newUser.save(); 

  // Sucesso
  res.send('Usuário registrado com sucesso!');
});

// Adicionar assinatura
app.post('/api/admin/add-subscription/:id', async (req, res) => {
    const { dias } = req.body;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + dias);
    await User.findByIdAndUpdate(req.params.id, {
      subscriptionExpiry: expiry,
      paymentStatus: 'ativo'
    });
    res.json({ ok: true });
  });
  
  // Cancelar assinatura
  app.post('/api/admin/cancel-subscription/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, {
      paymentStatus: 'inativo',
      subscriptionExpiry: null
    });
    res.json({ ok: true });
  });
  
  // Tornar admin
  app.post('/api/admin/set-admin/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isAdmin: true });
    res.json({ ok: true });
  });
  
  // Remover admin
  app.post('/api/admin/remove-admin/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isAdmin: false });
    res.json({ ok: true });
  });
  
//Rota do pago
app.get('/pagamento', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'pagamento.html'));
  });

// Rota Galeria (somente pagantes ou administradores podem acessar)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // garante que ele vai procurar na pasta /views

app.get('/galeria', async (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');
  
    const user = await User.findOne({ username: req.session.usuario });
    if (!user || (user.paymentStatus !== 'ativo' && !user.isAdmin)) {
      return res.redirect('/pagamento');
    }
  
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
      if (err) {
        return res.status(500).send('Erro ao ler a pasta de uploads');
      }
  
      const arquivos = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mkv', '.mov'].includes(ext);
      }).map(file => `/uploads/${file}`);
  
      res.render('galeria', { arquivos });
    });
  });
  

  

// Rota Upload ADMIN
app.use('/uploads', async (req, res, next) => {
    if (!req.session.usuario) return res.status(403).send('Acesso negado.');
  
    const user = await User.findOne({ username: req.session.usuario });
    if (!user || (user.paymentStatus !== 'ativo' && !user.isAdmin)) {
      return res.status(403).send('Acesso negado.');
    }
  
    next();
  });
// já n sei mais
app.post('/upload', upload.single('imagem'), async (req, res) => {
    if (!req.session.usuario) return res.status(403).send('Acesso negado.');
  
    const user = await User.findOne({ username: req.session.usuario });
    if (!user || !user.isAdmin) {
      return res.status(403).send('Apenas admins podem fazer upload.');
    }
  
    res.send('Upload realizado com sucesso!');
  });
  // Rota para retornar os arquivos na pasta 'uploads' em formato JSON
  app.get('/uploads', (req, res) => {
    // Lê o conteúdo da pasta 'uploads'
    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao ler a pasta de uploads' });
      }
  
      // Filtra arquivos de imagem e vídeo
      const arquivos = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mkv', '.mov'].includes(ext);
      }).map(file => `/uploads/${file}`); // Gera o caminho para os arquivos
  
      // Retorna a lista de arquivos como JSON
      res.json(arquivos);
    });
  });

  
// Rota logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Erro ao fazer logout');
    }
    res.redirect('/login'); // Volta para a página de login
  });
});

// Iniciar servidor
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Servidor rodando em http://179.221.50.80:${PORT}`);
});
