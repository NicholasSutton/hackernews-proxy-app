import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';

import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';

const Search = () => {
  const { token, username, logout } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentArticles(0);
  }, []);

  useEffect(() => {
    if (location.pathname === '/') {
      resetSearchState();
    }
  }, [location.pathname]);

  const resetSearchState = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setPage(0);
    setTotalPages(0);
    window.scrollTo(0, 0);
    fetchRecentArticles(0);
    navigate('/');
  };

  const fetchRecentArticles = async (pageNumber = 0) => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(
      `http://localhost:3001/api/search?page=${pageNumber}&limit=${limit}`
    );
    if (!res.ok) {
      const errorText = await res.text();
      setError('Fetch recent articles failed: ' + errorText);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setResults(data.results);
    setPage(data.page);
    setTotalPages(data.totalPages);
    await fetchRatings(data.results);
    await fetchComments(data.results);
  } catch (err) {
    setError('Fetch recent articles error: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  const handleSearch = async (searchTerm = query, pageNumber = 0) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(searchTerm)}&page=${pageNumber}&limit=${limit}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        setError('Search failed: ' + errorText);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResults(data.results);
      setPage(data.page);
      setTotalPages(data.totalPages);
      await fetchRatings(data.results);
      await fetchComments(data.results);
    } catch (err) {
      setError('Search error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async (items) => {
    const updated = {};
    const userRatingMap = {};
    for (let item of items) {
      const res = await fetch(`http://localhost:3001/api/ratings/${item.id}`);
      const data = await res.json();
      updated[item.id] = {
        average: data.length > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / data.length : null,
        count: data.length,
      };
      const userRating = data.find((r) => r.username === username);
      if (userRating) userRatingMap[item.id] = userRating.rating;
    }
    setRatings(updated);
    setUserRatings(userRatingMap);
  };

  const fetchComments = async (items) => {
    const updated = {};
    for (let item of items) {
      const res = await fetch(`http://localhost:3001/api/comments/${item.id}`);
      const data = await res.json();
      updated[item.id] = data;
    }
    setComments(updated);
  };

  const handleRate = async (itemId, rating) => {
    try {
      const res = await fetch('http://localhost:3001/api/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, rating }),
      });
      if (res.ok) {
        setUserRatings((prev) => ({ ...prev, [itemId]: rating }));
        await fetchRatings(results);
      }
    } catch (err) {
      console.error('Rating error:', err);
    }
  };

  const handleDeleteRating = async (itemId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/rate/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUserRatings((prev) => {
          const copy = { ...prev };
          delete copy[itemId];
          return copy;
        });
        await fetchRatings(results);
      }
    } catch (err) {
      console.error('Delete rating error:', err);
    }
  };

  const handleAddComment = async (itemId) => {
    const text = newComments[itemId];
    if (!text?.trim()) return;

    try {
      const res = await fetch('http://localhost:3001/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, text }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), newComment],
        }));
        setNewComments((prev) => ({ ...prev, [itemId]: '' }));
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const handleDeleteComment = async (itemId, commentId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) => ({
          ...prev,
          [itemId]: prev[itemId].filter((c) => c._id !== commentId),
        }));
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const handlePageChange = (event, value) => {
    // If query is empty, paginate recent articles; else paginate search results
    if (query.trim() === '') {
      fetchRecentArticles(value - 1);
    } else {
      handleSearch(query, value - 1);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography
            variant="h4"
            component="h1"
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={resetSearchState}
          >
            HackerNews Search
          </Typography>
        </Link>
        {token ? (
          <Button variant="outlined" color="error" onClick={logout}>
            Logout
          </Button>
        ) : (
          <>
            <Button href="/register" variant="contained" sx={{ mr: 1 }}>
              Register
            </Button>
            <Button href="/login" variant="contained" color="primary">
              Login
            </Button>
          </>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={4}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search articles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query, 0)}
          disabled={loading}
        />
        <Button variant="contained" onClick={() => handleSearch(query, 0)} disabled={loading}>
          Search
        </Button>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && results.length === 0 && (
        <Typography variant="body1" color="textSecondary">
          No results yet. Try a search above.
        </Typography>
      )}

      {results.map((item) => (
        <Card key={item.id} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="div" gutterBottom>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: '#1976d2' }}
              >
                {item.title || item.story_title || 'No Title'}
              </a>
            </Typography>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              By {item.author || 'Unknown'} on {new Date(item.created_at).toLocaleDateString()}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Average Rating:
              </Typography>
              {ratings[item.id]?.average ? (
                <>
                  {[1, 2, 3, 4, 5].map((star) =>
                    star <= Math.round(ratings[item.id].average) ? (
                      <StarIcon key={star} sx={{ color: 'gold' }} />
                    ) : (
                      <StarBorderIcon key={star} sx={{ color: 'gold' }} />
                    )
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    ({ratings[item.id].count})
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No ratings yet
                </Typography>
              )}
            </Box>

            {token && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Your Rating:
                </Typography>
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconButton
                    key={star}
                    size="small"
                    onClick={() => handleRate(item.id, star)}
                    sx={{ color: userRatings[item.id] >= star ? 'gold' : 'grey.500' }}
                    aria-label={`Rate ${star} stars`}
                  >
                    <StarIcon />
                  </IconButton>
                ))}
                {userRatings[item.id] && (
                  <Tooltip title="Remove your rating">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRating(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Comments
              </Typography>
              {comments[item.id]?.length > 0 ? (
                <List dense>
                  {comments[item.id].map((c) => (
                    <React.Fragment key={c._id}>
                      <ListItem
                        secondaryAction={
                          token && c.username === username && (
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleDeleteComment(item.id, c._id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )
                        }
                      >
                        <ListItemText primary={c.text} secondary={`By ${c.username || 'User'}`} />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No comments yet.
                </Typography>
              )}

              {token && (
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Add a comment"
                    fullWidth
                    value={newComments[item.id] || ''}
                    onChange={(e) =>
                      setNewComments((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(item.id);
                    }}
                    disabled={loading}
                  />
                  <Button
                    variant="contained"
                    onClick={() => handleAddComment(item.id)}
                    disabled={loading}
                  >
                    Post
                  </Button>
                </Stack>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}

      {results.length > 0 && totalPages > 1 && (
        <Stack alignItems="center" mt={4} mb={4}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
            disabled={loading}
          />
        </Stack>
      )}
    </Container>
  );
};

export default Search;
