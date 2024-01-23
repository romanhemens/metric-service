// Importieren der erforderlichen Module und Klassen
require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const MetricsHandler = require('./metricHandler');
const WebSocketManager = require('./websocketManager');
const Validator = require('./validator');

// Erstellen einer Express-Anwendung
const app = express();

// Middleware zum Parsen von JSON-Anfragen
app.use(express.json());

// Erstellen eines HTTP-Servers basierend auf der Express-App
const server = http.createServer(app);

// Initialisieren des WebSocket-Servers auf dem HTTP-Server
const wss = new WebSocket.Server({ server });

// Laden der Konfiguration aus der .env-Datei
const influxDBConfig = {
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG,
    bucket: process.env.INFLUXDB_BUCKET
  };

// Erstellen des MetricsHandler-Objekts zur Verarbeitung von Metriken
const metricsHandler = new MetricsHandler(influxDBConfig.url, influxDBConfig.token, influxDBConfig.org, influxDBConfig.bucket);

// Erstellen des WebSocketManager-Objekts zur Verwaltung von WebSocket-Nachrichten
const wsManager = new WebSocketManager(wss);

// Definieren einer Route zum Empfangen von Metrik-Daten
app.post('/metrics/v1/metrics', async (req, res) => {
    console.log("Empfangene Metriken: ", req.body);

    try {
        // Validieren der empfangenen Metriken
        await Validator.validateMetrics(req.body);

        // Verarbeiten der Metriken und Senden an den WebSocketManager
        metricsHandler.processMetrics(req.body)
            .then(() => {
                // Übertragen der Metriken an verbundene WebSocket-Clients
                wsManager.broadcastMetrics(req.body);

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

// Starten des Servers auf Port 3000
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
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
