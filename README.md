# HackerNews Search App

A full-stack web application for searching and interacting with articles from HackerNews. Users can search for articles, rate them, and leave comments. Authenticated users have additional privileges such as posting ratings/comments and deleting their own input.

## ✨ Features

- Search HackerNews articles by keyword
- Rate articles (1–5 stars)
- Add and delete comments
- Authentication with JWT
- Paginated search results
- Clickable logo resets search
- Automatically fetches recent articles on initial page load

---

## Project Structure

/frontend # React frontend
/server # Node.js/Express backend
/contexts # React Context for authentication


---

## Getting Started

### Prerequisites

- Node.js (>= 16)
- NPM
- MongoDB (or adjust if using a different database)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/hackernews-search-app.git
cd hackernews-search-app

    Install dependencies:

cd server
npm install

cd ../client
npm install

Running the Project

Make sure MongoDB is running on your machine.
Option 1: Start Both Servers Separately

# In one terminal
cd server
npm start

# In another terminal
cd client
npm start

Option 2: Start Both Servers with One Command

Install concurrently if needed:

npm install --save concurrently

Add this to your root package.json:

"scripts": {
  "dev": "concurrently \"npm run server\" \"npm run client\"",
  "server": "cd server && npm start",
  "client": "cd client && npm start"
}

Then run:

npm run dev

Option 3: Windows Batch File

Create a start_project.bat file:

@echo off
cd /d "%~dp0"

start cmd /k "cd server && npm start"
start cmd /k "cd client && npm start"

Double-click to start both parts of the app.
    Authentication

    Users can register and log in.

    Authenticated users receive a JWT token stored in memory (via React Context).

    Token is used to authorize rating and commenting actions.

API Overview
GET /api/search?q=query&page=0&limit=20

Search HackerNews articles.
GET /api/recent

Fetches the most recent articles.
POST /api/rate

Submit a user rating (requires JWT).
DELETE /api/rate/:itemId

Remove user's rating (requires JWT).
GET /api/ratings/:itemId

Fetch all ratings for a specific article.
GET /api/comments/:itemId

Get all comments for an article.
POST /api/comments

Add a new comment (requires JWT).
DELETE /api/comments/:commentId

Delete a comment (requires JWT).
🧪 Testing

You can test API endpoints using Postman or Insomnia. Frontend forms use these endpoints under the hood with error handling and real-time updates.
Built With

    Frontend: React + MUI + React Router

    Backend: Node.js + Express + MongoDB

    Authentication: JWT (JSON Web Tokens)

    UI: Material-UI (MUI)


License

MIT License
