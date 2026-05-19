// Shared WebSocket broadcast module (avoids circular dependency)
const clients = new Set();

const addClient = (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
};

const broadcastRobotUpdate = (robot) => {
  const message = JSON.stringify({ type: 'robot_update', robot });
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try { client.send(message); } catch (_) {}
    }
  });
};

module.exports = { addClient, broadcastRobotUpdate };
