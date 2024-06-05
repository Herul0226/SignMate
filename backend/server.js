const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const firebaseAdmin = require('firebase-admin');
require('dotenv').config();
const path = require('path');

// Inisialisasi Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});
const dbAdmin = firebaseAdmin.firestore();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));
app.use(flash());

const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD
};

// Middleware untuk memeriksa apakah pengguna sudah login atau belum
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

// Rute untuk mendapatkan data pengguna dari Firestore (server-side)
app.get('/api/users', checkAuth, (req, res) => {
  dbAdmin.collection('users').get()
    .then(snapshot => {
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      res.json(users);
    })
    .catch(error => {
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

// Rute untuk logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.redirect('/');
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.render('login', { alertMessage: req.flash('error') });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.user = { username: username };
    res.redirect('/dashboard');
  } else {
    req.flash('error', 'Login Gagal. Username atau password salah.');
    res.redirect('/');
  }
});

app.get('/dashboard', checkAuth, (req, res) => {
  res.render('dashboard');
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
