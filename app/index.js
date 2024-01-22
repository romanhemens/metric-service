const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const MetricsHandler = require('./metricHandler');
const WebSocketManager = require('./websocketManager');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const metricsHandler = new MetricsHandler('http://localhost:8086', 'Ihr-Token', 'Ihr-Organisation', 'Ihr-Bucket');
const wsManager = new WebSocketManager(wss);

app.post('/metrics', (req, res) => {
    metricsHandler.processMetrics(req.body)
        .then(() => {
            wsManager.broadcastMetrics(req.body);
            res.status(200).send("Metrics received and processed");
        })
        .catch(e => {
            console.error(e);
            res.status(500).send("Error processing metrics");
        });
});

// Additional Setups

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
