import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('normal'); // 'normal' or 'greentext'
  const [threads, setThreads] = useState([]);

  const loadPosts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/entries');
      if (!response.ok) throw new Error('API down');

      const data = await response.json();
      const entries = data.entries || [];

      // Convert DB rows to your old thread format for rendering
      const parsedThreads = entries.map(entry => ({
        id: entry.id,
        op: {
          name: entry.name,
          date: new Date(entry.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: '2-digit',
            weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true
          }).replace(/, /g, ' '),
          no: entry.id.toString().padStart(8, '0'),
          sub: entry.sub,  // or leave '' if you want no subject
          comment: entry.greentext
            .replace(/\n/g, '<br>')
            .replace(/^>/gm, '<span class="greentext">&gt;')
            .replace(/<br><span class="greentext">/g, '<br><span class="greentext">') + '</span>'
        },
        replies: []
      }));

      setThreads(parsedThreads);

    } catch (err) {
      console.error('Load failed:', err);
      setThreads([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const comment = formData.get('com')?.trim();
    const options = formData.get('options')?.trim();
    console.log(options)

    if (options) {
      
    }
    else {
      if (!comment) {
        alert('Write something, anon.');
        return;
      }
    }



    const payload = {
      content: comment,
      options: options,
      name: formData.get('name')?.trim() || 'Anonymous',
      sub: formData.get('sub')?.trim() || ''
    };

    if (!payload.content) return;

    // Optional: disable button or show loading
    const submitBtn = e.target.querySelector('input[type="submit"]');
    const originalText = submitBtn.value;
    submitBtn.disabled = true;
    submitBtn.value = 'Posting...';

    try {
      const response = await fetch('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error');
      }

      // Success — refresh posts
      await loadPosts();
      e.target.reset();

    } catch (err) {
      console.error('Post failed:', err);
      alert('Failed to post – check console/server. Fallback greentext saved if possible.');
    } finally {
      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.value = originalText;
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="App">
      <div className="board-header">
        <img src="/logo512.jpg" alt="" style={{height: '80px', marginBottom: '10px'}} />
        <h1>/diary/ - Personal Greentext Journal</h1>
        {/* <p className="subtitle">Anonymous diary posting</p> */}
      </div>

      <form className="post-form" onSubmit={handleSubmit}>
        <table cellSpacing="0">
          <tbody>
            <tr>
              <td>Name</td>
              <td>
                <input 
                  type="text" 
                  name="name" 
                  tabIndex={1} 
                  placeholder="Anonymous" 
                  defaultValue="Anonymous" 
                />
              </td>
            </tr>
            <tr>
              <td>Options</td>
              <td>
                <input 
                  type="text" 
                  name="options" 
                  tabIndex={2} 
                  placeholder="sage" 
                />
              </td>
            </tr>
            <tr>
              <td>Subject</td>
              <td>
                <input type="text" name="sub" tabIndex={3} autoComplete="off"/>
                <input type="submit" value="Post" tabIndex={10} />
              </td>
            </tr>
            <tr>
              <td>Comment</td>
              <td>
                <textarea 
                  name="com" 
                  cols={48} 
                  rows={4} 
                  wrap="soft" 
                  tabIndex={4}
                  placeholder="Write your daily journal here...&#10;>dear diary&#10;>today I managed not to rope"
                />
              </td>
            </tr>
            <tr className="rules">
              <td colSpan={2}>
                <ul className="rules-list">
                  <li>All posts are anonymous.</li>
                  <li>Use &gt; for greentext lines.</li>
                  <li>Your diary is private – hosted on your Pi.</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </form>

      {/* search+archive */}
      <div style={{ 
        textAlign: 'left', 
        margin: '20px 0', 
        padding: '2px 0', 
        borderTop: '1px solid #ccc', 
        borderBottom: '1px solid #ccc' 
      }}>
        <input 
          type="text" 
          placeholder="Search..." 
          style={{ 
            padding: '2px', 
            width: '200px', 
            border: '1px solid #999' 
          }} 
        />
        <a href="#" style={{ marginLeft: '10px', color: '#0000EE' }}>[Archive]</a>
      </div>

      {threads.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', margin: '100px 0' }}>
          No journal entries yet. Be the first to post, anon.
        </div>
      ) : (
        threads.map((thread) => (
          <div key={thread.id} className="thread" style={{ marginBottom: '40px' }}>
            <div className="post op">
              <div className="post-info">
                {thread.op.sub && <span className="subject">{thread.op.sub}</span>}
                <span className="name">{thread.op.name}</span>
                <span className="date">{thread.op.date}</span>
                <a href={`#p${thread.op.no}`} className="post-no">No.{thread.op.no}</a>
              </div>

              <div 
                className="comment"
                dangerouslySetInnerHTML={{ 
                  __html: thread.op.comment.replace(/&gt;([^<]*)/g, '<span class="greentext">&gt;$1</span>')
                }}
              />
            </div>

            {/* <hr style={{ border: 'none', borderTop: '1px solid #ccc', clear: 'both' }} /> */}
          </div>
        ))
      )}
      </div>
  );
}

export default App;