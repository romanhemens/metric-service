// validator.test.js
const Validator = require('../app/validator');
const validMetricsData = require('./metric.json')

describe('Validator', () => {
  it('should throw an error for invalid metric data without resourceMetrics', () => {
    // Define invalid metrics data
    const invalidMetricsData = {};

    // Expect validateMetrics to throw an error
    expect(() => {
      Validator.validateMetrics(invalidMetricsData);
    }).toThrow('Invalid metric data: No resourceMetrics found');
  });

  it('should not throw an error for valid metric data', () => { 

    // Expect validateMetrics not to throw an error
    expect(() => {
      Validator.validateMetrics(validMetricsData);
    }).not.toThrow();
  });
});
