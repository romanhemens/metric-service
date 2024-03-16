const Long = require('long');
require('dotenv').config();
const { InfluxDB, Point, flux } = require('@influxdata/influxdb-client');

/** 
 * Handles metric data processing and storage into InfluxDB.
 */
class MetricsHandler {
  /**
   * Constructor for the MetricsHandler class.
   * Initializes the InfluxDB client with given parameters and creates a WriteApi object for writing data points.
   * @param {string} url The URL of the InfluxDB instance.
   * @param {string} token The authentication token for InfluxDB.
   * @param {string} org The name of the organization in InfluxDB.
   * @param {string} bucket The name of the bucket in InfluxDB.
   */
  constructor(url, token, org, bucket) {
    this.client = new InfluxDB({ url, token });
    this.writeApi = this.client.getWriteApi(org, bucket);
  }

  /**
   * Processes an array of metrics and stores them in InfluxDB.
   * Converts metrics to InfluxDB 'Point' objects and writes them to the database.
   * Throws an error if a metric value is undefined.
   * @param {Array} metricsArray An array of metric objects.
   */
  async processMetrics(metricsArray) {
    try {

      // The use of `flatMap` followed by `map` allows us to transform each metric in the metricsArray 
      // into a flat array of Point objects suitable for InfluxDB. This two-step process first handles 
      // the transformation of metrics at the scopeMetric level (`flatMap`), flattening any nested array 
      // structures. Within each scopeMetric, we then transform each metric into one or more Point 
      // objects (`map`). This approach effectively handles complex nested structures of metrics, 
      // converting them into a flat list of Points for InfluxDB insertion.

      const points = metricsArray.flatMap(scopeMetric => {
        return scopeMetric.metrics.flatMap(metric => {
          const dataPoints = MetricsHandler.getDataPoints(metric);

          return dataPoints.map(dataPoint => {
            let value;
            if (dataPoint.sum !== undefined) {
              value = dataPoint.sum;
            } else if (dataPoint.count !== undefined) {
              value = dataPoint.count;
            } else if (dataPoint.asDouble !== undefined) {
              value = dataPoint.asDouble;
            }

            if (value === undefined) {
              throw new Error(`Value for metric '${metric.name}' is undefined`);
            }

          // `timeUnixNano` is used to represent high-precision timestamps that cannot be accurately 
          // represented using JavaScript's standard number type due to its limited precision. 
          // The `Long` library is utilized here to handle 64-bit integer values, allowing us to 
          // maintain the high precision of timestamps. The timestamp is then converted to a 
          // JavaScript number before being assigned to the Point object. This ensures that the 
          // timestamps retain their precision and correctness when being stored in InfluxDB.

            const timeUnixNano = new Long(dataPoint.timeUnixNano.low, dataPoint.timeUnixNano.high, true);
            const timestamp = timeUnixNano.toNumber();
            const tokens = MetricsHandler.extractTokens(dataPoint.attributes);

            const point = new Point(metric.name)
              .tag('description', metric.description)
              .tag('unit', metric.unit)
              .tag('landscape_token', tokens.landscape_token)  
              .tag('token_secret', tokens.token_secret)
              .timestamp(timestamp)
              .floatField('value', value);
            
            return point;
          });
        });
      });

      this.writeApi.writePoints(points);
      await this.writeApi.flush();
    } catch (error) {
      console.error('Error writing metrics: ', error);
    }
  }

  /**
   * Closes the WriteApi to flush any buffered write operations and release resources.
   */
  async close() {
    try {
      await this.writeApi.close();
    } catch (error) {
      console.error('Error closing WriteApi: ', error);
    }
  }

  /**
   * Extracts tokens from attributes.
   * @param {Array} attributes Array of attributes containing tokens.
   * @returns {Object} An object containing `landscape_token` and `token_secret`.
   */
  static extractTokens(attributes) {
    let tokens = { landscape_token: '', token_secret: '' };
    
    attributes.forEach(attr => {
      if (attr.key === 'landscape_token') {
        tokens.landscape_token = attr.value.stringValue;
      } else if (attr.key === 'token_secret') {
        tokens.token_secret = attr.value.stringValue;
      }
    });
  
    return tokens;
  }

  /**
   * Identifies the relevant part of the metric based on the metric type.
   * @param {Object} metric The metric object to process.
   * @returns {Array} An array of data points for the given metric.
   */
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

  /**
   * Queries metrics from InfluxDB based on the given landscape token and timestamp.
   * Constructs a Flux query and collects the results to return.
   * @param {string} landscapeToken The landscape token for filtering results.
   * @param {string} timeStamp The timestamp for the query range.
   * @returns {Promise<Array>} A promise that resolves to an array of query results.
   */
  async queryMetrics(landscapeToken, timeStamp) {
    const queryApi = this.client.getQueryApi(process.env.INFLUXDB_ORG);
    const bucket = process.env.INFLUXDB_BUCKET;
    const timestamp = new Date(parseInt(timeStamp));
    const fluxQuery = flux`
      import "date"
      from(bucket: "${bucket}")
      |> range(start: date.sub(d: 1m, from: ${timestamp}), stop: ${timestamp})
      |> filter(fn: (r) => r.landscape_token == "${landscapeToken}")
      |> keep(columns: ["_measurement", "_time", "_value", "unit", "landscape_token", "description"])
      |> yield(name: "filtered_last_min")`;

    const results = [];
    await queryApi.collectRows(fluxQuery, (row) => {
      results.push(row);
    });

    return results;
  }
}

module.exports = MetricsHandler;
