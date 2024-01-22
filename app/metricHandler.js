const { InfluxDB, Point } = require('@influxdata/influxdb-client');

class MetricsHandler {
    constructor(url, token, org, bucket) {
        this.influxDB = new InfluxDB({ url, token });
        this.writeApi = this.influxDB.getWriteApi(org, bucket);
    }

    processMetrics(metrics) {
        metrics.forEach(metric => {
            const point = new Point(metric.name)
                .tag('host', metric.host)
                .floatField('value', metric.value);
            this.writeApi.writePoint(point);
        });

        return this.writeApi.flush();
    }
}

module.exports = MetricsHandler;
