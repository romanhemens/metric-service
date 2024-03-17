// index.test.js
const request = require('supertest');
const app = require('../app/index'); 
const MetricsHandler = require('../app/metricHandler');
const protobuf = require('protobufjs');
const metricData = require('./mock.json');


// Mocking of Protobufjs library, to skip decoding and object mapping
jest.mock('protobufjs', () => {
  const validMetric = require('./metric.json');
  return {
    loadSync: jest.fn().mockReturnValue({
      lookupType: jest.fn().mockReturnValue({
        decode: jest.fn().mockReturnValue({}),
        toObject: jest.fn().mockReturnValue(validMetric) 
      })
    })
  };
});

// prepare mocks for metricHandler methods
MetricsHandler.prototype.processMetrics = jest.fn().mockResolvedValue(true);
MetricsHandler.prototype.queryMetrics = jest.fn().mockResolvedValue(metricData);

// Test if POST request without errors is handled accordingly
describe('Express App API', () => {
  describe('POST /v1/metrics endpoint', () => {
    it('should return 200 for successful metrics processing', async () => {
      const response = await request(app)
        .post('/v1/metrics')
        .send(Buffer.from('protobuf-data', 'base64'))
        .set('Content-Type', 'application/x-protobuf');

      expect(response.statusCode).toBe(200);
      expect(response.text).toEqual('Metrics received and processed');
      expect(MetricsHandler.prototype.processMetrics).toHaveBeenCalled();
    });
  });

  // Test if GET request returns the mocked data
  describe('GET /metrics endpoint', () => {
    it('should return mocked metrics data for a valid query', async () => {
      const queryParams = { landscapeToken: '0ad5c1cd-e2de-4404-9cc8-6da758d82010', timeStamp: '1708675770000' };

      const response = await request(app)
        .get('/metrics')
        .query(queryParams);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(metricData);
      expect(MetricsHandler.prototype.queryMetrics).toHaveBeenCalledWith('0ad5c1cd-e2de-4404-9cc8-6da758d82010', '1708675770000');
    });
  });
});
