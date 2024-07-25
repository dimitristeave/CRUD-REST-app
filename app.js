const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

//Utilisation de Express
const app = express();
//definition du port 3000 pour l'app
const PORT = process.env.PORT || 3000;

// Définir EJS comme moteur de modèle
app.set('view engine', 'ejs');

// Spécifier le répertoire des vues (facultatif si vos vues sont dans le dossier "views" par défaut)
app.set('views', __dirname + '/views');

// Définir le dossier des ressources statiques
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de la connexion à MongoDB
mongoose.connect('mongodb://0.0.0.0:27017/bourseFinance_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à la base de données MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Middleware pour analyser les données de formulaire HTML
app.use(express.urlencoded({ extended: true }));
//configuration de la session pour les connexions
app.use(session({
  secret: 'steave',
  resave: false,
  saveUninitialized: true
}));

// Middleware pour la gestion de l'authentification
const isAuthenticated = (req, res, next) => {
  // Vérifier si l'utilisateur est authentifié, si oui redirection vers la table de données
  if (req.session && req.session.username === 'mama@gmail.com' && req.session.password === 'mama') {
    // Continuer vers la prochaine étape du middleware si l'utilisateur est authentifié
    next();
  } else {
    // Rediriger vers la page d'authentification si l'utilisateur n'est pas authentifié
    res.redirect('/');
  }
};

// Définition du modèle MongoDB avec Mongoose
const StockDataSchema = new mongoose.Schema({
  symbol: String,
  timestamp: Date,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number
});
const StockData = mongoose.model('bourse', StockDataSchema);
// Middleware pour parser les requêtes JSON
app.use(express.json());

// route pour la page d'authentification
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Route de gestion de la soumission du formulaire de connexion
app.post('/login', async (req, res) => {
  //copie des données du formulaire dans 2 variables
  const {username, password} = req.body;
  // Vérifier les identifiants de l'administrateur
  if (username === 'mama@gmail.com' && password === 'mama') {
    // Enregistrer les informations d'authentification dans la session
    req.session.username = username;
    req.session.password = password;
    const data = await StockData.find();
    // Rediriger vers la page du tableau si les identifiants sont corrects
    res.redirect('/records');
  } else {
    // Rediriger vers la page d'authentification si les identifiants sont incorrects
    res.redirect('/');
  }
});

// Middleware pour restreindre l'accès aux routes nécessitant une authentification
app.use(isAuthenticated);

//Route pour afficheer les données de la BD sous forme de tableau
app.get('/records', async (req, res) => {
  try {
    //variable qui contient les données de la bd
    const data = await StockData.find();
    //affichage de la table, avec en argument les données de la BD pour remplir le tableau dans le table.ejs
    res.render('table', { data: data });
  } catch (err) {
    console.error('Erreur lors de la création de l\'enregistrement:', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'enregistrement' });
  }
});

//Route pour obtenir le formulaire d'enregistrement
app.get('/records/create', (req, res) => {
  //affichage du formulaire d'enregistrement
  res.sendFile(__dirname + '/create.html');
});

// Route pour créer un nouvel enregistrement
app.post('/records/create', async (req, res) => {
  try {
    //copie des données du formulaire dans les variables
    const { symbol, timestamp, open, high, low, close, volume } = req.body;
    //nouvel enregistrement avec les données du formulaire copiées
    const newRecord = new StockData({ symbol, timestamp, open, high, low, close, volume });
    //enregistrement dans la BD
    const savedRecord = await newRecord.save();
    const data = await StockData.find();
    //redirection vers le tableau de données
    res.redirect('/records');
  } catch (err) {
    console.error('Erreur lors de la création de l\'enregistrement:', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'enregistrement' });
  }
});

// Route DELETE pour supprimer un enregistrement de la base de données
app.delete('/record/:id', async (req, res) => {
  try {
    //recuperer l'id de l enregistrement
    const recordId = req.params.id;
    //suppression de la donnée selectionnée
    await StockData.findByIdAndDelete(recordId);
    console.log("deleted");
    //redirection vers le tableau de records
    res.redirect('/records');
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'enregistrement:', err);
    res.status(500).send('Erreur lors de la suppression de l\'enregistrement');
  }
});

// Route GET pour obtenir le formulaire de modification d'un enregistrement
app.get('/records/:id', async (req, res) => {
  try {
    //recuperer l'id de l enregistrement
    const recordId = req.params.id;
    // Récupérer les données de l'enregistrement à modifier depuis la base de données
    const recordToUpdate = await StockData.findById(recordId);
    console.log(recordToUpdate)
    // Afficher le formulaire de modification avec les données de l'enregistrement pré-remplies
    res.render('update', { record: recordToUpdate });
  } catch (err) {
    console.error('Erreur lors de l\'affichage du formulaire de modification:', err);
    res.status(500).send('Erreur lors de l\'affichage du formulaire de modification');
  }
});

// Route pour mettre à jour un enregistrement dans la base de données
app.post('/records/:id', async (req, res) => {
  try {
    //recuperer l'id de l enregistrement
    const recordId = req.params.id;
    //copie des données du formulaire
    const updatedData = req.body;
    // Mettre à jour l'enregistrement dans la base de données avec les nouvelles données
    await StockData.findByIdAndUpdate(recordId, updatedData, { new: true });
    //redirection vers le tableau des enregistrements
    res.redirect('/records');
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'enregistrement:', err);
    res.status(500).send('Erreur lors de la mise à jour de l\'enregistrement');
  }
});

//route pour obtenir les détails d'un enregistrement
app.get('/records_/:id', async (req, res) => {
  try {
    //recuperer l'id de l enregistrement
    const recordId = req.params.id;
    // Récupérer les données de l'enregistrement à modifier depuis la base de données
    const recordToUpdate = await StockData.findById(recordId);
    console.log(recordToUpdate)
    // Afficher le formulaire de modification avec les données de l'enregistrement pré-remplies
    res.render('details', { record: recordToUpdate });
  } catch (err) {
    console.error('Erreur lors de l\'affichage du formulaire de modification:', err);
    res.status(500).send('Erreur lors de l\'affichage du formulaire de modification');
  }
});


app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
