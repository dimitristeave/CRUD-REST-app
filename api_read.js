'use strict';
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Définition du modèle MongoDB
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

const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=demo';
const symbolurl = new URL(url).searchParams.get('symbol');

// Connexion à la base de données MongoDB
mongoose.connect('mongodb://0.0.0.0:27017/bourseFinance_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connecté à la base de données MongoDB');
})
.catch(err => {
  console.error('Erreur de connexion à MongoDB:', err);
});

// Fonction pour récupérer et sauvegarder les données
function fetchDataAndSave() {
  axios.get(url)
    .then(response => {
      const stockData = response.data['Time Series (5min)'];
      const dataToSave = [];

      for (const timestamp in stockData) {
        const dataAtTimestamp = stockData[timestamp];
        const newData = {
          symbol : symbolurl,
          timestamp: new Date(timestamp),
          open: parseFloat(dataAtTimestamp['1. open']),
          high: parseFloat(dataAtTimestamp['2. high']),
          low: parseFloat(dataAtTimestamp['3. low']),
          close: parseFloat(dataAtTimestamp['4. close']),
          volume: parseInt(dataAtTimestamp['5. volume'], 10)
        };
        dataToSave.push(newData);
      }

      // Insertion en masse des données
      StockData.insertMany(dataToSave)
        .then(() => console.log('Données sauvegardées avec succès dans MongoDB'))
        .catch(error => console.error('Erreur lors de la sauvegarde des données:', error));
    })
    .catch(error => {
      console.error('Erreur:', error);
    });
}

// Planification du cron job pour exécuter fetchDataAndSave() chaque jour à 9h
cron.schedule('0 9 15 6 2024', () => {
  console.log('Exécution de la sauvegarde des données...');
  fetchDataAndSave();
}, {
  scheduled: true,
  timezone: 'Europe/Paris' // Modifier le fuseau horaire selon votre emplacement
});
