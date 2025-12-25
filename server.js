// server.js - Your /diary/ backend
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./diary.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to diary database');
    // Create entries table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        greentext TEXT
      )
    `);
  }
});

// API Routes

// Get all entries
app.get('/api/entries', (req, res) => {
  db.all('SELECT * FROM entries ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ entries: rows });
  });
});

// Get single entry
app.get('/api/entries/:id', (req, res) => {
  db.get('SELECT * FROM entries WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ entry: row });
  });
});

app.post('/api/entries', async (req, res) => {
  const { content, options, name, sub } = req.body;

  console.log('Received body:', req.body);  // log entire payload

  if (req.body.options.trim().toLowerCase() === 'clear') {
    console.log('Clear command triggered!');
    db.run('DELETE FROM entries', (err) => {
      if (err) {
        console.error('Clear failed:', err);
        return res.status(500).json({ error: 'Clear failed' });
      }
      console.log('Database cleared by admin command');
      res.json({ message: 'All entries deleted. Database cleared.' });
    });
    return;  // stop normal posting
  }
  
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Content is required' });
  }

const prompt = `Turn this personal journal entry into a classic 4chan-style greentext story. 
    Keep it short, ironic, self-roasting, use > at the start of every line, end with mfw/tfw if it fits.
    Keep the output length directly proportional to your input length.
    occasionaly use the format whatthefuck.fileextension to express an emotion

    for example:
    > be me
    > wake up on xmas day
    > mariahCarey24/7.mp3
    > immediately kill myself
    > at least the food is good
    > mfw christmas dinner stopped me from ropemaxxing

    Make it funny and absurd even if the day was bad. Journal entry: ${content.trim()}`;

  try {
    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3001',  // or your domain
        'X-Title': '/diary/'
      },
      body: JSON.stringify({
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 600
      })
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('LLM failed:', llmResponse.status, errText);
      throw new Error(`LLM ${llmResponse.status}`);
    }

    const data = await llmResponse.json();
    greentext = data.choices[0].message.content.trim();

  } catch (err) {
    console.error('LLM call failed, using fallback:', err);
    greentext = content.trim()
      .split('\n')
      .map(line => `>${line.trim() || 'be me'}`)
      .join('\n');
  }

  db.run(
    'INSERT INTO entries (content, greentext, name, sub) VALUES (?, ?, ?, ?)',
    [content.trim(), greentext, req.body.name || 'Anonymous', req.body.sub || ''],
    function(err) {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Failed to save' });
      }
      res.json({
        id: this.lastID,
        content: content.trim(),
        greentext,
        name: req.body.name || 'Anonymous',
        sub: req.body.sub || '',
        created_at: new Date().toISOString()
      });
    }
  );
});

// Delete entry
app.delete('/api/entries/:id', (req, res) => {
  db.run('DELETE FROM entries WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Entry deleted', changes: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`/diary/ server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});