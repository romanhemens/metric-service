// Importieren des WebSocket-Moduls
const WebSocket = require('ws');

// Definition der WebSocketManager-Klasse
class WebSocketManager {
    // Konstruktor der Klasse, der das WebSocket-Server-Objekt entgegennimmt
    constructor(wss) {
        this.wss = wss; // Speichern des WebSocket-Server-Objekts in der Instanz
    }

    // Methode zum Senden von Metrik-Daten an alle verbundenen WebSocket-Clients
    broadcastMetrics(metrics) {
        // Iterieren über alle verbundenen Clients des WebSocket-Servers
        this.wss.clients.forEach(client => {
            // Überprüfen, ob der Client-WebSocket geöffnet ist
            if (client.readyState === WebSocket.OPEN) {
                // Senden der Metrik-Daten als JSON-String an den Client
                client.send(JSON.stringify(metrics));
            }
        });
    }
}

// Exportieren der WebSocketManager-Klasse für die Verwendung in anderen Dateien
module.exports = WebSocketManager;
