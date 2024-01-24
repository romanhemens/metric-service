// Datei: metricHandler.js
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

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
   * @param {Array} metrics Eine Array von Metrik-Objekten.
   */
  async processMetrics(metrics) {

    try {
      // Umwandeln der Metriken in InfluxDB 'Point'-Objekte
      const points = metrics.map(metric => {
        const point = new Point(metric.name) // Erstellen eines neuen Datenpunktes
          //.timestamp(metric.timestamp)      // Festlegen des Zeitstempels problematisch, da InfluxDB einen nach in Nanosekunden seit dem Unix-Epoch, welches umgewandelt werden müsste
          .tag('landscape_token', metric.landscape_token)  // Hinzufügen der Tags damit ich die Metriken weiterhin einer Visualisierung zuordnen kann
          .tag('token_secret', metric.token_secret)
          .floatField('value', metric.value); // Hinzufügen des Messwertes
        return point;
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
  
}

module.exports = MetricsHandler;
