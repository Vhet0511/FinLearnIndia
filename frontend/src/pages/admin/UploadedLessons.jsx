
import { useCallback, useEffect, useMemo, useState } from 'react';

const API = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Request failed.');
  }

  return data;
}

const toList = (value) =>
  Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n').map((item) => item.trim()).filter(Boolean)
      : [];

const wordCount = (text = '') =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

const normalize = (lesson) => ({
  ...lesson,
  id: lesson._id || lesson.id,
  title: lesson.title || '',
  summary: lesson.summary || '',
  content: lesson.content || '',
  bullet_points: toList(lesson.bullet_points),
  notes: toList(lesson.notes),
});

function SectionHeading({ number, title, count }) {
  return (
    <div className="lesson-section-heading">
      <span className="lesson-section-number">{number}</span>
      <h4>{title}</h4>
      {count !== undefined && (
        <span className="lesson-section-count">{count}</span>
      )}
    </div>
  );
}

export default function UploadedLessons() {
  const [lessons, setLessons] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await request('/api/lessons/uploaded');
      const items = Array.isArray(data)
        ? data
        : data.lessons || data.uploaded_lessons || [];

      setLessons(items.map(normalize));
    } catch (err) {
      setError(err.message || 'Unable to load uploaded lessons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return lessons;

    return lessons.filter((lesson) =>
      [
        lesson.title,
        lesson.summary,
        lesson.content,
        ...lesson.bullet_points,
        ...lesson.notes,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [lessons, search]);

  const toggleLesson = (id) => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };


const sendBackToDrafts = async (lesson) => {
  if (!lesson.id) {
    setError('This lesson does not have a valid ID.');
    return;
  }

  const confirmed = window.confirm(
    `Move "${lesson.title}" back to Draft Lessons?`
  );

  if (!confirmed) return;

  setBusyId(lesson.id);
  setError('');
  setNotice('');

  try {
    await request(
      `/api/lessons/uploaded/${encodeURIComponent(lesson.id)}/restore`,
      { method: 'POST' }
    );

    // Remove the lesson only after the backend confirms success.
    setLessons((current) =>
      current.filter((item) => item.id !== lesson.id)
    );

    setExpanded((current) => {
      const next = { ...current };
      delete next[lesson.id];
      return next;
    });

    setNotice(
      `"${lesson.title}" has been moved back to Draft Lessons successfully.`
    );
  } catch (err) {
    setError(
      err.message || 'Unable to move the lesson back to drafts.'
    );
  } finally {
    setBusyId(null);
  }
};


  const totalWords = lessons.reduce(
    (total, lesson) => total + wordCount(lesson.content),
    0
  );

  return (
    <main className="lesson-workspace uploaded-workspace">
      <header className="lesson-workspace-header">
        <div>
          <div className="lesson-eyebrow">
            FINLEARN INDIA / PUBLISHED CONTENT
          </div>

          <h1>Uploaded lessons</h1>

          <p>
            Explore published learning material, review its content, and
            return lessons to drafts when further changes are needed.
          </p>
        </div>

        <button
          type="button"
          className="lesson-secondary-button"
          onClick={loadLessons}
          disabled={loading}
        >
          ↻ {loading ? 'Refreshing…' : 'Refresh lessons'}
        </button>
      </header>

      {error && (
        <div className="lesson-message lesson-message-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {notice && (
        <div className="lesson-message lesson-message-success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}

      <section className="lesson-overview">
        <div>
          <span>Published lessons</span>
          <strong>{lessons.length}</strong>
          <small>Available in your library</small>
        </div>

        <div>
          <span>Search results</span>
          <strong>{filtered.length}</strong>
          <small>Matching your search</small>
        </div>

        <div>
          <span>Lesson content</span>
          <strong>{totalWords.toLocaleString('en-IN')}</strong>
          <small>Words across published lessons</small>
        </div>
      </section>

      <section className="lesson-library">
        <div className="lesson-library-header">
          <div>
            <h2>Your published library</h2>
            <p>
              Read lesson content, learning points, and study notes separately.
            </p>
          </div>

          <label className="lesson-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search published lessons…"
              aria-label="Search uploaded lessons"
            />

            {search && (
              <button type="button" onClick={() => setSearch('')}>
                Clear
              </button>
            )}
          </label>
        </div>

        {loading ? (
          <div className="lesson-empty-state">
            <span className="lesson-loading-indicator" />
            <h3>Loading published lessons</h3>
            <p>Fetching your uploaded learning material.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="lesson-empty-state">
            <span className="lesson-empty-icon">▤</span>

            <h3>
              {search
                ? 'No matching lessons'
                : 'No uploaded lessons yet'}
            </h3>

            <p>
              {search
                ? 'Try another keyword or clear your search.'
                : 'Lessons uploaded from Draft Lessons will appear here.'}
            </p>

            {search && (
              <button
                type="button"
                className="lesson-secondary-button"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="lesson-document-list">
            {filtered.map((lesson, index) => {
              const isExpanded = Boolean(expanded[lesson.id]);

              return (
                <article className="lesson-document" key={lesson.id}>
                  <div className="lesson-document-topline">
                    <span className="lesson-published-label">
                      <span />
                      PUBLISHED LESSON
                    </span>

                    <span className="lesson-created">
                      Uploaded {formatDate(
                        lesson.uploaded_at || lesson.published_at
                      )}
                    </span>
                  </div>

                  <div className="lesson-document-title">
                    <span className="lesson-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div>
                      <h3>{lesson.title || 'Untitled lesson'}</h3>
                      <p>
                        {lesson.summary || 'No summary added to this lesson.'}
                      </p>
                    </div>
                  </div>

                  <div className="lesson-document-meta">
                    <span>
                      {wordCount(lesson.content).toLocaleString('en-IN')}
                      {' '}content words
                    </span>
                    <span>{lesson.bullet_points.length} key points</span>
                    <span>{lesson.notes.length} study notes</span>
                  </div>

                  {isExpanded && (
                    <div className="lesson-reading-area">
                      <section className="lesson-reading-section">
                        <SectionHeading
                          number="01"
                          title="Lesson content"
                        />

                        <div className="lesson-prose">
                          {lesson.content ||
                            'No lesson content is available.'}
                        </div>
                      </section>

                      <section className="lesson-reading-section">
                        <SectionHeading
                          number="02"
                          title="Key learning points"
                          count={lesson.bullet_points.length}
                        />

                        {lesson.bullet_points.length ? (
                          <ul className="lesson-learning-list">
                            {lesson.bullet_points.map((point, i) => (
                              <li key={`${i}-${point}`}>
                                <span className="lesson-list-check">✓</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="lesson-no-content">
                            No key learning points available.
                          </p>
                        )}
                      </section>

                      <section className="lesson-reading-section">
                        <SectionHeading
                          number="03"
                          title="Study notes"
                          count={lesson.notes.length}
                        />

                        {lesson.notes.length ? (
                          <ol className="lesson-notes-list">
                            {lesson.notes.map((note, i) => (
                              <li key={`${i}-${note}`}>
                                <span>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <p>{note}</p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="lesson-no-content">
                            No study notes available.
                          </p>
                        )}
                      </section>
                    </div>
                  )}

                  <footer className="lesson-document-footer">
                    <button
                      type="button"
                      className="lesson-primary-text-button"
                      onClick={() => toggleLesson(lesson.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded
                        ? 'Hide lesson content ↑'
                        : 'Read full lesson ↓'}
                    </button>

                    <div className="lesson-document-actions">
                      <button
                        type="button"
                        className="lesson-secondary-button"
                        onClick={() => toggleLesson(lesson.id)}
                      >
                        {isExpanded ? 'Close review' : 'Review lesson'}
                      </button>

                      <button
                        type="button"
                        className="lesson-return-button"
                        onClick={() => sendBackToDrafts(lesson)}
                        disabled={busyId === lesson.id}
                      >
                        {busyId === lesson.id
                          ? 'Moving…'
                          : '↶ Send back to drafts'}
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
