# Metrics Service

# System requirements

The user needs to have both Docker and Docker compose installed.

# Set-Up of the InfluxDB

Starting the Services

    Run "docker-compose up --build -d" to start the services.

Initial Setup of InfluxDB

    After starting InfluxDB, open the InfluxDB web interface, usually accessible at http://localhost:8086.
    Follow the instructions to create an initial user, organization, and bucket.

    Store your value for the organization and bucket in a file .env-custom, which is ignored by git. 

Obtaining the Access Token

    After completing the setup, InfluxDB will create an access token. Copy this token in your .env-custom. 
    NOTE: This token is only visible once and cannot be obtained later!!

Updating Configuration Files

    Update the .env-custom file of your metric-service with the InfluxDB setup details (URL, token, organization, bucket).

Restarting the metric-service

    Run "docker-compose down" and then "docker-compose up --build -d" to make the changed configurations effective.


# Notes

Ensure the Docker volume influxdb-data is correctly bound to /var/lib/influxdb2 in the InfluxDB container for persistent data storage.


