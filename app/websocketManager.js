class WebSocketManager {
    constructor(wss) {
        this.wss = wss;
    }

    broadcastMetrics(metrics) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(metrics));
            }
        });
    }
}

module.exports = WebSocketManager;
