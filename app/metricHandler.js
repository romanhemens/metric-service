// Datei: metricHandler.js
require('dotenv').config();
const { InfluxDB, Point, flux } = require('@influxdata/influxdb-client');

class MetricsHandler {
  /**
   * Konstruktor für die MetricsHandler-Klasse.
   * @param {string} url Die URL der InfluxDB-Instanz.
   * @param {string} token Der Authentifizierungstoken für InfluxDB.
   * @param {string} org Der Name der Organisation in InfluxDB.
   * @param {string} bucket Der Name des Buckets in InfluxDB.
   */
  constructor(url, token, org, bucket) {
    // Initialisieren des InfluxDB-Clients mit den gegebenen Parametern
    this.client = new InfluxDB({ url, token });
    // Erstellen eines WriteApi-Objekts für das Schreiben von Datenpunkten
    this.writeApi = this.client.getWriteApi(org, bucket);
  }

  /**
   * Verarbeitet eine Reihe von Metriken und speichert sie in InfluxDB.
   * @param {Array} metricsArray Eine Array von Metrik-Objekten.
   */
  async processMetrics(metricsArray) {

    try {

      // Umwandeln der Metriken in InfluxDB 'Point'-Objekte
      const points = metricsArray.flatMap(scopeMetric => {
        return scopeMetric.metrics.flatMap(metric => {
          const dataPoints = MetricsHandler.getDataPoints(metric);

          return dataPoints.map(dataPoint => {
            // Entscheiden, welcher Wert basierend auf dem Metriktyp verwendet werden soll
            // Entscheiden, welcher Wert basierend auf dem Metriktyp verwendet werden soll
          let value;
          if (dataPoint.sum !== undefined) {
            value = dataPoint.sum; // Verwendung von sum, wenn vorhanden
          } else if (dataPoint.count !== undefined) {
            value = dataPoint.count; // Verwendung von count, wenn vorhanden
          } else if (dataPoint.asDouble !== undefined) {
            value = dataPoint.asDouble; // Verwendung von asDouble, wenn vorhanden
          }

          // Überprüfung, ob der Wert undefiniert ist
          if (value === undefined) {
            throw new Error(`Wert für Metrik '${metric.name}' ist undefined`);
          }
            const tokens = MetricsHandler.extractTokens(dataPoint.attributes);
          
            const point = new Point(metric.name) // Erstellen eines neuen Datenpunktes (wird gespeichert als measurment)
              .tag('description', metric.description)
              .tag('unit', metric.unit) // Hinzufügen eines Tags der die Unit abspeichert
              .tag('landscape_token', tokens.landscape_token)  
              .tag('token_secret', tokens.token_secret)
              .floatField('value', value);  
              
              //.timestamp(metric.timestamp)      // Festlegen des Zeitstempels problematisch, da InfluxDB einen nach in Nanosekunden seit dem Unix-Epoch, welches umgewandelt werden müsste


            return point;
          });
        });
      });

      // Schreiben der Datenpunkte in die InfluxDB
      this.writeApi.writePoints(points);
      // Warten, bis alle Punkte geschrieben wurden
      await this.writeApi.flush();
    } catch (error) {
      //erstmal loggen, dann später auch eine Fehlerbehandlung
        console.error('Fehler beim Schreiben von Metriken: ', error);
        // weitere Fehlerbehandlung..
    }
  }

  async close() {
    try {
      await this.writeApi.close();
    } catch (error) {
      console.error('Fehler beim Schließen des WriteApi: ', error);
    }
  }

  static extractTokens(attributes) {
    let tokens = {
      landscape_token: '',
      token_secret: ''
    };
    
    attributes.forEach(attr => {
      if (attr.key === 'landscape_token') {
        tokens.landscape_token = attr.value.stringValue;
      } else if (attr.key === 'token_secret') {
        tokens.token_secret = attr.value.stringValue;
      }
    });
  
    return tokens;
  }

  // Funktion zum Identifizieren des relevanten Metrik-Teils
  static getDataPoints(metric) {
    if (metric.histogram) {
      return metric.histogram.dataPoints;
    } else if (metric.gauge) {
      return metric.gauge.dataPoints;
    } else if (metric.sum) {
      return metric.sum.dataPoints;
    } else if (metric.summary) {
      return metric.summary.dataPoints;
    }
  }



  // Methode zum Abfragen von Metriken aus InfluxDB
  async queryMetrics(landscapeToken, secret) {
    const queryApi = this.client.getQueryApi(process.env.INFLUXDB_ORG);

    const bucket = process.env.INFLUXDB_BUCKET;

    // Erstellen Sie die Flux-Abfrage
    const fluxQuery = flux`
      from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r.landscape_token == "${landscapeToken}" and r.token_secret == "${secret}")
      |> keep(columns: ["_measurement", "_time", "_value", "unit", "landscape_token"])
      |> yield(name: "filtered_last_10_sec")`;

    // Ergebnisse sammeln und zurückgeben
    const results = [];
    await queryApi.collectRows(fluxQuery, (row) => {
        results.push(row);
    });

    return results;
  }
  
}

module.exports = MetricsHandler;
