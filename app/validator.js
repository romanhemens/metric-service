//const { InfluxDB } = require('@influxdata/influxdb-client');

// Definition der Validator-Klasse
class Validator {
    // Statische Methode zur Validierung der empfangenen Metriken
    static validateMetrics(metrics) {
        // Überprüfen, ob die Metriken nicht vorhanden oder ein leeres Objekt sind
        if (!metrics || Object.keys(metrics).length === 0) {
            throw new Error('Leere Metriken empfangen');
        }
        // Überprüfen, ob die Metriken ein Array sind
        if (!Array.isArray(metrics)) {
            throw new Error('Metriken sind kein Array');
        }
        // Überprüfen, ob Token und Value mit übergeben wurden und wenn ja, dann ihre Validität überprüfen
        if (!metrics.token || !metrics.value) {
            throw new Error('Fehlender Token oder Value');
        } else{
            return this.validateTokenAndValue(metrics.token, metrics.value);  
        }
    }

    async validateTokenAndValue(token, value) {
        // Implementieren der Logik, um in InfluxDB oder in Datenbank von ExplorViz zu überprüfen,
        // ob der Token und der Value valide sind
        // Beispiel: return await this.influxDB.query('...');

        return true;
    }
}

// Exportieren der Validator-Klasse für die Verwendung in anderen Dateien
module.exports = Validator;
