// Importieren der erforderlichen Module und Klassen
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const MetricsHandler = require('./metricHandler');
const Validator = require('./validator');


// Erstellen einer Express-Anwendung
const app = express();

// Aktivieren von CORS für alle Anfragen
app.use(cors());

// Middleware zum Parsen von JSON-Anfragen
app.use(express.json());

// Erstellen eines HTTP-Servers basierend auf der Express-App
const server = http.createServer(app);

// Laden der Konfiguration aus der .env-Datei
const influxDBConfig = {
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG,
    bucket: process.env.INFLUXDB_BUCKET
  };

// Erstellen des MetricsHandler-Objekts zur Verarbeitung von Metriken
const metricsHandler = new MetricsHandler(influxDBConfig.url, influxDBConfig.token, influxDBConfig.org, influxDBConfig.bucket);


// Definieren einer Route zum Empfangen von Metrik-Daten
app.post('/metrics/v1/metrics', async (req, res) => {
    console.log("Empfangene Metriken: ", req.body);

    try {
        // Validieren der empfangenen Metriken
        await Validator.validateMetrics(req.body);

        // Verarbeiten der Metriken und Senden an den WebSocketManager
        await metricsHandler.processMetrics(req.body)
            .then(() => {

                // Senden einer Erfolgsantwort an den Client
                res.status(200).send('Metriken empfangen und verarbeitet');
                console.log('req.body');
            })
            .catch(error => {
                // Fehlerbehandlung und Senden einer Fehlerantwort
                console.error(error);
                res.status(500).send('Fehler bei der Verarbeitung der Metriken');
                console.log('req.body');
            });
    } catch (error) {
        // Fehlerbehandlung für Validierungsfehler
        console.error(error);
        res.status(400).send(error.message);
    }
});


// Endpunkt zur Abfrage von Metriken
app.get('/metrics', async (req, res) => {
    console.log(req.query);

    const { landscapeToken, secret } = req.query;

    try {
        console.log(req.body);
        // Abfrage der Metriken aus der Datenbank
        const metrics = await metricsHandler.queryMetrics(landscapeToken, secret);

        // Senden der Metriken als Antwort
        res.json(metrics);
    } catch (error) {
        console.error(error);
        res.status(500).send('Fehler bei der Abfrage der Metriken');
    }
});


// Starten des Servers auf Port 3000
server.listen(8085, () => {
    console.log('Server is running on http://localhost:8085');
});


process.on('SIGINT', async () => {
    console.log('Server wird heruntergefahren...');

    // Hier schließen Sie Ressourcen wie Ihren MetricsHandler
    await metricsHandler.close();

    // Schließen des Servers
    server.close(() => {
        console.log('Server beendet.');
        process.exit(0);
    });
});
