const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic test route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

const routes = require('./routes');
app.use('/api', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
