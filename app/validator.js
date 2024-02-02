// Definition der Validator-Klasse
class Validator {
    // Statische Methode zur Validierung der empfangenen Metriken
    static validateMetrics(metrics) {
        if (!metrics || !metrics.resourceMetrics) {
            throw new Error('Ungültige Metrikdaten: Keine resourceMetrics gefunden');
        }

        metrics.resourceMetrics.forEach((resourceMetric) => {
            if (!resourceMetric.resource || !resourceMetric.resource.attributes) {
                throw new Error('Ungültige Ressource: Keine Attribute gefunden');
            }

            const serviceNameAttribute = resourceMetric.resource.attributes.find(attr => attr.key === 'service.name');
            if (!serviceNameAttribute || !serviceNameAttribute.value || !serviceNameAttribute.value.stringValue) {
                throw new Error('Ungültiger Service-Name: Nicht vorhanden oder leer');
            }


            resourceMetric.scopeMetrics.forEach((scopeMetric) => {
                scopeMetric.metrics.forEach((metric) => {
                    if (!metric.name || !metric.description) {
                        throw new Error('Ungültige Metrik: Name oder Beschreibung fehlt');
                    }

                    if (!metric.unit) {
                        throw new Error ('Invalid metric: Unit is missing');
                    }

                    if (!metric.sum && !metric.gauge && !metric.histogram && !metric.summary) {
                        throw new Error("Invalid metric: Data is missing or is unknown");
                    } else{
                        let validMetricTypes = ['sum', 'gauge', 'histogram', 'summary'];
                        validMetricTypes.forEach(type => {
                            if (metric[type] && metric[type].dataPoints) {
                                metric[type].dataPoints.forEach(dataPoint => {
                                    const requiredKeys = ['landscape_token', 'token_secret'];
                                    const areRequiredKeysPresent = this.checkRequiredKeys(dataPoint.attributes, requiredKeys);

                                    if (!areRequiredKeysPresent) {
                                        throw new Error("Invalid metric: Required keys are missing");
                                    }
                                    // Advanced Kafka logic to validate keys
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    static checkRequiredKeys(attributes, requiredKeys) {
        return requiredKeys.every(key => 
          attributes.some(attr => attr.key === key)
        );
    }
}

module.exports = Validator;
