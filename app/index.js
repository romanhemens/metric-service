// index.js
// Import required modules and classes
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const protobuf = require('protobufjs');
const MetricsHandler = require('./metricHandler');
const Validator = require('./validator');

// Create an Express application
const app = express();

// Enable CORS for all requests
app.use(cors());

// Middleware for parsing Protobuf requests
app.use(express.raw({type: 'application/x-protobuf'}));

// Load the OpenTelemetry Protobuf schema 
// The schema is used for deserializing the incoming metrics
const root = protobuf.loadSync("./opentelemetry/proto/collector/metrics/v1/metrics_service.proto");
const MetricServiceRequest = root.lookupType("opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest");

// Create an HTTP server based on the Express app
const server = http.createServer(app);

// Load the configuration from the .env file
const influxDBConfig = {
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUXDB_TOKEN,
    org: process.env.INFLUXDB_ORG,
    bucket: process.env.INFLUXDB_BUCKET
};

// Create the MetricsHandler object for processing metrics
const metricsHandler = new MetricsHandler(influxDBConfig.url, influxDBConfig.token, influxDBConfig.org, influxDBConfig.bucket);

// Define a route for receiving metric data
app.post('/v1/metrics', async (req, res) => {

    try {
        // Decode the Protobuf message to a readable object
        const decodedMessage = MetricServiceRequest.decode(new Uint8Array(req.body));
        const metrics = MetricServiceRequest.toObject(decodedMessage);

        // Validate the metrics structure
        await Validator.validateMetrics(metrics);

        // Process the metrics
        for (const resourceMetric of metrics.resourceMetrics) {
            try {
                await metricsHandler.processMetrics(resourceMetric.scopeMetrics);
            } catch (error) {
                console.error(error);
                res.status(500).send('Error processing metrics');
                return; // Stop execution to prevent multiple responses
            }
        }
        res.status(200).send('Metrics received and processed');
    } catch (error) {
        console.error('Error processing the Protobuf message', error);
        res.status(400).send('Invalid Protobuf message');
    }
});

// Endpoint for querying metrics
app.get('/metrics', async (req, res) => {

    const { landscapeToken, timeStamp } = req.query;

    try {
        // Query metrics from the database
        const metrics = await metricsHandler.queryMetrics(landscapeToken, timeStamp);

        // Send the metrics as a response
        res.json(metrics);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying metrics');
    }
});

// Start the server on port 8085
if (require.main === module) {
    server.listen(8085, () => {
        console.log('Server is running on http://localhost:8085');
    });
}

// Graceful shutdown on SIGINT
process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    // Close resources like your MetricsHandler here
    await metricsHandler.close();

    // Close the server
    server.close(() => {
        console.log('Server shutdown.');
        process.exit(0);
    });
});

module.exports = app;