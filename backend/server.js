const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/robots', require('./routes/robots'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/collisions', require('./routes/collisions'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/operators', require('./routes/operators'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🤖 Robot Choreographer API running on port ${PORT}`);
});
