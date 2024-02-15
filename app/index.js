// Importieren der erforderlichen Module und Klassen
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const protobuf = require('protobufjs');
const util = require('util');
const MetricsHandler = require('./metricHandler');
const Validator = require('./validator');


// Erstellen einer Express-Anwendung
const app = express();

// Aktivieren von CORS für alle Anfragen
app.use(cors());

// Middleware zum Parsen von Protobuf-Anfragen
app.use(express.raw({type: 'application/x-protobuf' }));

// app.use((req, res, next) => {
//     console.log("Rohdaten der Anfrage: ", req.body);
//     next();
// })

// Laden des OpenTelemetry Protobuf-Schemas
const root = protobuf.loadSync("./opentelemetry/proto/collector/metrics/v1/metrics_service.proto");
const MetricServiceRequest = root.lookupType("opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest");


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
app.post('/v1/metrics', async (req, res) => {
    // console.log("Empfangene Metriken: ", req.body);

    try {

        //Dekodieren der Protobuf-Nachricht
        const decodedMessage = MetricServiceRequest.decode(new Uint8Array(req.body));
        const metrics = MetricServiceRequest.toObject(decodedMessage);
        
        // console.log("Empfangene Metriken: ", util.inspect(metrics, {showHidden: false, depth: null, colors: true}));
        console.log("Empfangene Metriken: ", metrics);

        await Validator.validateMetrics(metrics);
        

        // Verarbeiten der Metriken
        for (const resourceMetric of metrics.resourceMetrics) {
            try {
                await metricsHandler.processMetrics(resourceMetric.scopeMetrics);
                
              } catch (error) {
                console.error(error);
                res.status(500).send('Fehler bei der Verarbeitung der Metriken');
                return; // Beenden der Ausführung, um mehrfache Antwortversuche zu verhindern
              }
            }
        // Erfolgreich alle Metriken verarbeitet
        res.status(200).send('Metriken empfangen und verarbeitet');
    
    } catch (error) {
        console.error('Fehler bei der Verarbeitung der Protobuf-Nachricht', error);
        res.status(400).send('Ungültige Protobuf-Nachricht');
    }
});


// Endpunkt zur Abfrage von Metriken
app.get('/metrics', async (req, res) => {
    console.log(req.query);

    const { landscapeToken, timeStamp } = req.query;

    try {
        console.log(req.body);
        // Abfrage der Metriken aus der Datenbank
        const metrics = await metricsHandler.queryMetrics(landscapeToken, timeStamp);

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
