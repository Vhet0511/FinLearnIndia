import { useCallback, useEffect, useMemo, useState } from 'react';

/*
  Draft Lessons (admin review page) — redesigned.
  Behaviour is unchanged: load, edit, delete and upload work against the same API.
  Styles: add draft-lessons.css to your dashboard stylesheet (classes use the dr- prefix).
*/

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

const lines = (value) =>
  Array.isArray(value) ? value.join('\n') : value || '';

const list = (value) =>
  Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n').map((item) => item.trim()).filter(Boolean)
      : [];

const countWords = (text = '') =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

const readingMinutes = (text = '') => Math.max(1, Math.round(countWords(text) / 200));

const dateLabel = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const normalize = (lesson) => ({
  ...lesson,
  id: lesson._id || lesson.id,
  title: lesson.title || '',
  summary: lesson.summary || '',
  content: lesson.content || '',
  bullet_points: list(lesson.bullet_points),
  notes: list(lesson.notes),
});

const emptyForm = {
  title: '',
  summary: '',
  content: '',
  bullet_points: '',
  notes: '',
};

/* ---------- Icons ---------- */

const ICONS = {
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.3-4.3'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  trash: ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
  chevron: ['M6 9l6 6 6-6'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z'],
  pin: ['M12 17v5', 'M9 3h6l-1 7 3 3H7l3-3z'],
  alert: ['M12 9v4', 'M12 17h.01', 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'],
  align: ['M17 10H3', 'M21 6H3', 'M21 14H3', 'M17 18H3'],
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      className="dr-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(ICONS[name] || []).map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

/* ---------- Lesson body renderer (headings, lists, bold) ---------- */

function parseContent(markdown = '') {
  const blocks = [];
  let paragraph = [];
  let listBlock = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listBlock) {
      blocks.push(listBlock);
      listBlock = null;
    }
  };

  for (const raw of markdown.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    let match;

    if (!line) {
      flushParagraph();
      flushList();
    } else if ((match = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h', level: Math.max(match[1].length, 2), text: match[2] });
    } else if ((match = line.match(/^[-*]\s+(.*)$/))) {
      flushParagraph();
      if (!listBlock || listBlock.ordered) {
        flushList();
        listBlock = { type: 'list', ordered: false, items: [] };
      }
      listBlock.items.push(match[1]);
    } else if ((match = line.match(/^\d+\.\s+(.*)$/))) {
      flushParagraph();
      if (!listBlock || !listBlock.ordered) {
        flushList();
        listBlock = { type: 'list', ordered: true, items: [] };
      }
      listBlock.items.push(match[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function LessonBody({ content }) {
  const blocks = useMemo(() => parseContent(content), [content]);

  return (
    <div className="dr-prose">
      {blocks.map((block, index) => {
        if (block.type === 'h') {
          const Tag = block.level === 2 ? 'h4' : 'h5';
          return (
            <Tag key={index}>
              <Inline text={block.text} />
            </Tag>
          );
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={index} className={block.ordered ? 'dr-steps' : 'dr-bullets'}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <span>
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={index}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function SectionHeading({ icon, title, count }) {
  return (
    <div className="dr-section-heading">
      <span className="dr-section-icon">
        <Icon name={icon} size={16} />
      </span>
      <h4>{title}</h4>
      {count !== undefined && <span className="dr-section-count">{count}</span>}
    </div>
  );
}

/* ---------- Page ---------- */

export default function DraftLessons() {
  const [lessons, setLessons] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await request('/api/lessons/drafts');
      const result = Array.isArray(data)
        ? data
        : data.drafts || data.lessons || [];

      setLessons(result.map(normalize));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Lock page scroll and allow Escape to close while the editor is open.
  useEffect(() => {
    if (!editing) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) {
        setEditing(null);
        setError('');
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [editing, saving]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return lessons;

    return lessons.filter((lesson) =>
      [lesson.title, lesson.summary, lesson.content,
        ...lesson.bullet_points, ...lesson.notes]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [lessons, search]);

  const toggleLesson = (id) => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const startEditing = (lesson) => {
    setForm({
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content,
      bullet_points: lines(lesson.bullet_points),
      notes: lines(lesson.notes),
    });
    setEditing(lesson);
    setError('');
  };

  const closeEditing = () => {
    if (saving) return;
    setEditing(null);
    setError('');
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    if (!editing?.id) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        content: form.content,
        bullet_points: list(form.bullet_points),
        notes: list(form.notes),
      };

      const updated = await request(
        `/api/lessons/drafts/${encodeURIComponent(editing.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );

      setLessons((current) =>
        current.map((lesson) =>
          lesson.id === editing.id
            ? normalize({ ...lesson, ...payload, ...(updated || {}) })
            : lesson
        )
      );

      setEditing(null);
      setNotice('Your lesson changes have been saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (lesson) => {
    if (!lesson.id) return;

    if (!window.confirm(
      `Permanently delete "${lesson.title}"? This cannot be undone.`
    )) return;

    setBusyId(lesson.id);
    setError('');
    setNotice('');

    try {
      await request(
        `/api/lessons/drafts/${encodeURIComponent(lesson.id)}`,
        { method: 'DELETE' }
      );

      setLessons((current) =>
        current.filter((item) => item.id !== lesson.id)
      );
      setNotice('Draft deleted successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const uploadDraft = async (lesson) => {
    if (!lesson.id) return;

    if (!window.confirm(
      `Upload "${lesson.title}"? It will be moved out of Draft Lessons.`
    )) return;

    setBusyId(lesson.id);
    setError('');
    setNotice('');

    try {
      await request(
        `/api/lessons/drafts/${encodeURIComponent(lesson.id)}/upload`,
        { method: 'POST' }
      );

      setLessons((current) =>
        current.filter((item) => item.id !== lesson.id)
      );
      setNotice('Lesson uploaded successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const totalWords = lessons.reduce(
    (total, lesson) =>
      total + countWords(lesson.content),
    0
  );

  return (
    <div className="dr-page">
      <header className="dr-header">
        <div>
          <span className="dr-eyebrow">
            <span className="dr-eyebrow__dot" />
            FINLEARN INDIA / CONTENT STUDIO
          </span>
          <h1>Draft lessons</h1>
          <p>
            Review your learning material, improve explanations, and prepare
            lessons for publication.
          </p>
        </div>

        <button
          type="button"
          className="dr-btn dr-btn--outline"
          onClick={loadDrafts}
          disabled={loading}
        >
          <Icon name="refresh" size={16} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && !editing && (
        <div className="dr-alert dr-alert--error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss message">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="dr-alert dr-alert--success" role="status">
          <Icon name="check" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <section className="dr-stats" aria-label="Overview">
        <div className="dr-stat">
          <span className="dr-stat__icon dr-stat__icon--green">
            <Icon name="file" size={22} />
          </span>
          <div>
            <span>Saved drafts</span>
            <strong>{lessons.length}</strong>
            <small>Lessons awaiting review</small>
          </div>
        </div>
        <div className="dr-stat">
          <span className="dr-stat__icon dr-stat__icon--blue">
            <Icon name="search" size={22} />
          </span>
          <div>
            <span>Search results</span>
            <strong>{filtered.length}</strong>
            <small>Matching your search</small>
          </div>
        </div>
        <div className="dr-stat">
          <span className="dr-stat__icon dr-stat__icon--purple">
            <Icon name="book" size={22} />
          </span>
          <div>
            <span>Lesson content</span>
            <strong>{totalWords.toLocaleString('en-IN')}</strong>
            <small>Words across all drafts</small>
          </div>
        </div>
      </section>

      <section className="dr-library">
        <div className="dr-library-header">
          <div>
            <h2>Your learning library</h2>
            <p>Each draft includes its own lesson, learning points, and notes.</p>
          </div>

          <label className="dr-search">
            <Icon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lessons or their content…"
              aria-label="Search lessons"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                <Icon name="close" size={15} />
              </button>
            )}
          </label>
        </div>

        {loading ? (
          <div className="dr-state" role="status">
            <span className="dr-spinner" />
            <h3>Loading your lessons</h3>
            <p>Fetching saved drafts from your library.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dr-state">
            <span className="dr-state__icon">
              <Icon name="file" size={26} />
            </span>
            <h3>{search ? 'No matching lessons' : 'Your library is empty'}</h3>
            <p>
              {search
                ? 'Try another keyword or clear your search.'
                : 'Generated lessons will appear here when they are saved as drafts.'}
            </p>
          </div>
        ) : (
          <div className="dr-list">
            {filtered.map((lesson, index) => {
              const isExpanded = Boolean(expanded[lesson.id]);
              const busy = busyId === lesson.id;

              return (
                <article className={`dr-card${isExpanded ? ' is-open' : ''}`} key={lesson.id}>
                  <div className="dr-card__top">
                    <span className="dr-pill">
                      <span /> DRAFT FOR REVIEW
                    </span>
                    <span className="dr-date">
                      Created {dateLabel(lesson.created_at)}
                    </span>
                  </div>

                  <div className="dr-card__title">
                    <span className="dr-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{lesson.title || 'Untitled lesson'}</h3>
                      <p>{lesson.summary || 'No summary added yet.'}</p>
                    </div>
                  </div>

                  <div className="dr-meta">
                    <span>
                      <Icon name="clock" size={14} />
                      {readingMinutes(lesson.content)} min read
                    </span>
                    <span>
                      <Icon name="align" size={14} />
                      {countWords(lesson.content).toLocaleString('en-IN')} words
                    </span>
                    <span>
                      <Icon name="bulb" size={14} />
                      {lesson.bullet_points.length} key points
                    </span>
                    <span>
                      <Icon name="pin" size={14} />
                      {lesson.notes.length} study notes
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="dr-reading">
                      <section className="dr-section">
                        <SectionHeading icon="book" title="Lesson content" />
                        {lesson.content ? (
                          <LessonBody content={lesson.content} />
                        ) : (
                          <p className="dr-none">No lesson content has been generated.</p>
                        )}
                      </section>

                      <section className="dr-section">
                        <SectionHeading
                          icon="bulb"
                          title="Key learning points"
                          count={lesson.bullet_points.length}
                        />
                        {lesson.bullet_points.length ? (
                          <ul className="dr-points">
                            {lesson.bullet_points.map((point, i) => (
                              <li key={`${i}-${point}`}>
                                <span className="dr-tick">
                                  <Icon name="check" size={12} />
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="dr-none">No key learning points available.</p>
                        )}
                      </section>

                      <section className="dr-section">
                        <SectionHeading
                          icon="pin"
                          title="Study notes"
                          count={lesson.notes.length}
                        />
                        {lesson.notes.length ? (
                          <ol className="dr-notes">
                            {lesson.notes.map((note, i) => (
                              <li key={`${i}-${note}`}>
                                <span>{String(i + 1).padStart(2, '0')}</span>
                                <p>{note}</p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="dr-none">No study notes available.</p>
                        )}
                      </section>
                    </div>
                  )}

                  <footer className="dr-card__footer">
                    <button
                      type="button"
                      className="dr-toggle"
                      onClick={() => toggleLesson(lesson.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide lesson' : 'Read full lesson'}
                      <Icon name="chevron" size={16} />
                    </button>

                    <div className="dr-actions">
                      <button
                        type="button"
                        className="dr-btn dr-btn--outline"
                        onClick={() => startEditing(lesson)}
                        disabled={busy}
                      >
                        <Icon name="edit" size={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dr-btn dr-btn--primary"
                        onClick={() => uploadDraft(lesson)}
                        disabled={busy}
                      >
                        <Icon name="upload" size={16} />
                        {busy ? 'Working…' : 'Upload'}
                      </button>
                      <button
                        type="button"
                        className="dr-btn dr-btn--danger"
                        onClick={() => deleteDraft(lesson)}
                        disabled={busy}
                        aria-label={`Delete ${lesson.title || 'lesson'}`}
                      >
                        <Icon name="trash" size={16} />
                        <span className="dr-btn__label">Delete</span>
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <div
          className="dr-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeEditing();
            }
          }}
        >
          <section
            className="dr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dr-edit-title"
          >
            <header className="dr-modal__header">
              <div>
                <span className="dr-modal__kicker">CONTENT EDITOR</span>
                <h2 id="dr-edit-title">Edit lesson</h2>
                <p>All sections can be edited before you save the draft.</p>
              </div>
              <button
                type="button"
                className="dr-modal__close"
                onClick={closeEditing}
                disabled={saving}
                aria-label="Close editor"
              >
                <Icon name="close" />
              </button>
            </header>

            <form className="dr-modal__form" onSubmit={saveDraft}>
              <div className="dr-modal__body">
                <label className="dr-field">
                  <span>Lesson title</span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    maxLength={200}
                    required
                  />
                </label>

                <label className="dr-field">
                  <span>Summary</span>
                  <textarea
                    name="summary"
                    value={form.summary}
                    onChange={(event) =>
                      setForm({ ...form, summary: event.target.value })
                    }
                    maxLength={3000}
                    rows={3}
                    required
                  />
                </label>

                <label className="dr-field">
                  <span>Lesson content</span>
                  <textarea
                    name="content"
                    className="dr-field__content"
                    value={form.content}
                    onChange={(event) =>
                      setForm({ ...form, content: event.target.value })
                    }
                    rows={14}
                  />
                  <small>
                    {countWords(form.content).toLocaleString('en-IN')} words. Use ## for headings, - for bullets
                    and **bold** for emphasis.
                  </small>
                </label>

                <label className="dr-field">
                  <span>Key learning points</span>
                  <textarea
                    name="bullet_points"
                    value={form.bullet_points}
                    onChange={(event) =>
                      setForm({ ...form, bullet_points: event.target.value })
                    }
                    rows={6}
                  />
                  <small>Enter one point per line.</small>
                </label>

                <label className="dr-field">
                  <span>Study notes</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    rows={5}
                  />
                  <small>Enter one note per line.</small>
                </label>

                {error && (
                  <div className="dr-alert dr-alert--error" role="alert">
                    <Icon name="alert" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <footer className="dr-modal__footer">
                <button
                  type="button"
                  className="dr-btn dr-btn--outline"
                  onClick={closeEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dr-btn dr-btn--primary"
                  disabled={saving}
                >
                  {saving ? 'Saving changes…' : 'Save draft'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}