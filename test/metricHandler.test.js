//metricsHandler.test.js
const { InfluxDB, flux } = require('@influxdata/influxdb-client');
const MetricsHandler = require('../app/metricHandler');
const metricData = require('./mock.json');
const { Point } = jest.requireActual('@influxdata/influxdb-client');

// Mock the '@influxdata/influxdb-client' module to prevent real database operations during tests.
// This setup uses the actual implementations where necessary but replaces functions that 
// perform database operations with jest functions for mocking purposes.
jest.mock('@influxdata/influxdb-client', () => {
  const originalModule = jest.requireActual('@influxdata/influxdb-client');

  return {
    ...originalModule,
    InfluxDB: jest.fn().mockImplementation(() => ({
      // Mock the WriteApi to simulate the database write operations without actually performing them.
      getWriteApi: () => ({
        writePoints: jest.fn().mockResolvedValue(true),
        flush: jest.fn().mockResolvedValue(true),
        close: jest.fn().mockResolvedValue(true),
      }),
      // Mock the QueryApi to simulate database query operations.
      // The callback function is called with the mock data from demo supplier, which must be imported here in the scope of mocking the database
      getQueryApi: () => ({
        collectRows: jest.fn().mockImplementation((query, callback) => {
            const metricData = require('./mock.json'); 
            callback(metricData);
        }),
      }),
    })),
  };
});


describe('MetricsHandler', () => {
  let metricsHandler;

  beforeEach(() => {
    // Initialize a new MetricsHandler object before each test with dummy parameters.
    metricsHandler = new MetricsHandler('url', 'token', 'org', 'bucket');
  });

  it('should call writePoints with correct parameters', async () => {
    // observe calls to the writePoints function of the WriteApi.
    const writePointsSpy = jest.spyOn(metricsHandler.writeApi, 'writePoints');

    const sampleMetricsArray = [{
        metrics: [{
            name: 'exampleMetric',
            description: 'An example metric',
            unit: 'ms',
            sum: {
                dataPoints: [{
                    attributes: [{
                        key: 'landscape_token',
                        value: { stringValue: 'exampleToken' }
                    }, {
                        key: 'token_secret',
                        value: { stringValue: 'secretToken' }
                    }],
                    timeUnixNano: { low: 123456789, high: 0, unsigned: true },
                    asDouble: 123.45 
                }]
            }
        }]
    }];
    
    // Call processMetrics with the sample metrics array to simulate the processing of metrics.
    await metricsHandler.processMetrics(sampleMetricsArray);

    // Verify that writePoints was indeed called, indicating that the metrics were processed as expected.
    expect(writePointsSpy).toHaveBeenCalled();
  });

  it('should correctly query metrics from InfluxDB', async () => {
    // Simulate a query to the database by calling queryMetrics with sample parameters from demo-supplier
    const metrics = await metricsHandler.queryMetrics('0ad5c1cd-e2de-4404-9cc8-6da758d82010', '1708675770000');

    expect(metrics).toEqual([metricData,]);
  });

  afterAll(() => {
    // Restore all mocks to their original state after all tests have run to ensure clean test runs.
    jest.restoreAllMocks();
  });
});
