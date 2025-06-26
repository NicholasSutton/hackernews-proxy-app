const mongoose = require('mongoose');

// User schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
});

// Rating schema
const RatingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: String, required: true },  // ID from HackerNews
  rating: { type: Number, min: 1, max: 5, required: true },
});

// Comment schema
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: String, required: true },
  text: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Rating = mongoose.model('Rating', RatingSchema);
const Comment = mongoose.model('Comment', commentSchema);

module.exports = { User, Rating, Comment }; 
