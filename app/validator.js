/** 
 * Definition of the Validator class used to validate metrics data received.
 */
class Validator {

    /**
     * Static method to validate metrics received.
     * Validates the presence and structure of `resourceMetrics` within the metrics data.
     * Throws an error if the validation fails.
     * @param {Object} metrics - The metrics data to validate.
     */
    static validateMetrics(metrics) {
        if (!metrics || !metrics.resourceMetrics) {
            throw new Error('Invalid metric data: No resourceMetrics found');
        }

        metrics.resourceMetrics.forEach((resourceMetric) => {
            if (!resourceMetric.resource || !resourceMetric.resource.attributes) {
                throw new Error('Invalid Resource: No attributes found');
            }

            const serviceNameAttribute = resourceMetric.resource.attributes.find(attr => attr.key === 'service.name');
            if (!serviceNameAttribute || !serviceNameAttribute.value || !serviceNameAttribute.value.stringValue) {
                throw new Error('Invalid Service Name: Not present or empty');
            }

            resourceMetric.scopeMetrics.forEach((scopeMetric) => {
                scopeMetric.metrics.forEach((metric) => {
                    if (!metric.name || !metric.description) {
                        throw new Error('Invalid Metric: Name or description is missing');
                    }

                    if (!metric.unit) {
                        throw new Error('Invalid Metric: Unit is missing');
                    }

                    if (!metric.sum && !metric.gauge && !metric.histogram && !metric.summary) {
                        throw new Error("Invalid Metric: Data is missing or is unknown");
                    } else {
                        let validMetricTypes = ['sum', 'gauge', 'histogram', 'summary'];
                        validMetricTypes.forEach(type => {
                            if (metric[type] && metric[type].dataPoints) {
                                metric[type].dataPoints.forEach(dataPoint => {
                                    const requiredKeys = ['landscape_token', 'token_secret'];
                                    const areRequiredKeysPresent = this.checkRequiredKeys(dataPoint.attributes, requiredKeys);

                                    if (!areRequiredKeysPresent) {
                                        throw new Error("Invalid Metric: Required keys are missing");
                                    }
                                    // Advanced Kafka logic to validate keys that are created by frontend
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    /**
     * Checks if the required keys are present in the attributes.
     * @param {Array} attributes - The array of attributes to check.
     * @param {Array} requiredKeys - The required keys to be present.
     * @returns {boolean} Returns true if all required keys are present, false otherwise.
     */
    static checkRequiredKeys(attributes, requiredKeys) {
        return requiredKeys.every(key => 
          attributes.some(attr => attr.key === key)
        );
    }
}

module.exports = Validator;
