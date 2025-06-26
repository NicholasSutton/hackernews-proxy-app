const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { User, Rating, Comment } = require('./models');
const authenticateToken = require('./middleware/authenticateToken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

/* -------------------- AUTH -------------------- */

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ username, passwordHash });
    await user.save();

    // Generate token like login route
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, username: user.username });  // <-- send token & username here
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid username or password' });

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* -------------------- RATINGS -------------------- */

// Create or update rating
router.post('/rate', authenticateToken, async (req, res) => {
  const { itemId, rating } = req.body;
  const userId = req.user.userId;

  if (!itemId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Invalid item or rating' });
  }

  try {
    let existingRating = await Rating.findOne({ userId, itemId });
    if (existingRating) {
      existingRating.rating = rating;
      await existingRating.save();
      return res.json({ message: 'Rating updated', rating: existingRating });
    }

    const newRating = new Rating({ userId, itemId, rating });
    await newRating.save();
    res.status(201).json({ message: 'Rating created', rating: newRating });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all ratings for an item
router.get('/ratings/:itemId', async (req, res) => {
  const { itemId } = req.params;
  try {
    const ratings = await Rating.find({ itemId }).populate('userId', 'username');
    const formatted = ratings.map(r => ({
      userId: r.userId._id,
      username: r.userId.username,
      rating: r.rating
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete rating
router.delete('/rate/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.userId;
  try {
    await Rating.deleteOne({ userId, itemId });
    res.json({ message: 'Rating deleted' });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* -------------------- COMMENTS -------------------- */

// Create comment
router.post('/comments', authenticateToken, async (req, res) => {
  const { itemId, text } = req.body;
  const userId = req.user.userId;

  if (!itemId || !text) return res.status(400).json({ message: 'Item and comment text required' });

  try {
    const comment = new Comment({ userId, itemId, text });
    await comment.save();
    const user = await User.findById(userId);
    res.status(201).json({ ...comment.toObject(), username: user.username });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for item
router.get('/comments/:itemId', async (req, res) => {
  const { itemId } = req.params;
  try {
    const comments = await Comment.find({ itemId }).populate('userId', 'username');
    const formatted = comments.map(c => ({
      _id: c._id,
      text: c.text,
      createdAt: c.createdAt,
      username: c.userId.username
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment
router.put('/comments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user.userId;

  try {
    const comment = await Comment.findOne({ _id: id, userId });
    if (!comment) return res.status(404).json({ message: 'Comment not found or unauthorized' });

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();
    res.json({ message: 'Comment updated', comment });
  } catch (err) {
    console.error('Update comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment
router.delete('/comments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const result = await Comment.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Comment not found or unauthorized' });
    }
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* -------------------- SEARCH -------------------- */

router.get('/search', async (req, res) => {
  const query = req.query.q;
  const page = parseInt(req.query.page) || 0;  // default page 0
  const limit = parseInt(req.query.limit) || 20; // default 20 results per page

  try {
    let hnUrl;

    if (!query || query.trim() === '') {
      // No query provided — fetch recent posts
      hnUrl = `https://hn.algolia.com/api/v1/search_by_date?tags=story&page=${page}&hitsPerPage=${limit}`;
    } else {
      // Regular search
      hnUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&page=${page}&hitsPerPage=${limit}`;
    }
    const response = await fetch(hnUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HackerNews API error:', errorText);
      return res.status(502).json({ message: 'Upstream HackerNews API error' });
    }

    const data = await response.json();

    const results = data.hits
      .filter(hit => hit.title || hit.story_title || hit.url)
      .map(hit => ({
        id: hit.objectID,
        title: hit.title || hit.story_title || 'Untitled',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || 'Unknown',
        created_at: hit.created_at,
        text: hit.story_text || hit.comment_text || '',
      }));

    res.json({
      results,
      page: data.page,
      totalPages: data.nbPages,
      totalResults: data.nbHits
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

module.exports = router;