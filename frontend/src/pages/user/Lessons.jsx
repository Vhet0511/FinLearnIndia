import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/*
  Lessons (user-facing reader)
  - Fetches published lessons from GET /api/lessons/uploaded
  - Library view (search + cards) -> Reader view (one lesson)
  - AI: quiz (POST /api/lessons/:id/quiz), ask (POST /api/lessons/:id/ask)
  - Hindi summary: /api/lessons/:id/summary-hi -> { lesson_id, language, summary }
  Styles: append lessons-reader.css to your dashboard stylesheet.
*/

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const LESSONS_URL = `${API_BASE}/api/lessons/uploaded`;
const WORDS_PER_MINUTE = 200;

/* ---------- Icons ---------- */

const ICONS = {
  quiz: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  translate: ['M5 8l6 6', 'M4 14l6-6 2-3', 'M2 5h12', 'M7 2h1', 'M22 22l-5-10-5 10', 'M14 18h6'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.3-4.3'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z'],
  check: ['M20 6L9 17l-5-5'],
  pin: ['M12 17v5', 'M9 3h6l-1 7 3 3H7l3-3z'],
  arrow: ['M5 12h14', 'M12 5l7 7-7 7'],
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      className="lr-icon"
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
      {(ICONS[name] || []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/* ---------- Content helpers ---------- */

function parseContent(markdown = '') {
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
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
      if (!list || list.ordered) {
        flushList();
        list = { type: 'list', ordered: false, items: [] };
      }
      list.items.push(match[1]);
    } else if ((match = line.match(/^\d+\.\s+(.*)$/))) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { type: 'list', ordered: true, items: [] };
      }
      list.items.push(match[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks.map((block, index) => (block.type === 'h' ? { ...block, id: `section-${index}` } : block));
}

const stripMarkdown = (text = '') => text.replace(/\*\*/g, '').replace(/\*/g, '');

function getExcerpt(blocks, maxLength = 170) {
  const first = blocks.find((block) => block.type === 'p');
  if (!first) return '';
  const text = stripMarkdown(first.text);
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function getReadingMinutes(content = '') {
  const words = stripMarkdown(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Turns the Hindi summary text (title line, "•" bullets, plain paragraphs) into blocks. */
function parseSummary(summary = '') {
  const lines = summary.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  lines.forEach((line, index) => {
    const bullet = line.match(/^[•\-*]\s+(.*)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'list') last.items.push(bullet[1]);
      else blocks.push({ type: 'list', items: [bullet[1]] });
    } else {
      blocks.push({ type: index === 0 ? 'title' : 'p', text: line });
    }
  });
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

/* ---------- AI action buttons ---------- */

function AiActions({ onAction, onGenerateQuiz, quizLoading, compact = false }) {
  return (
    <div className={`lr-actions${compact ? ' lr-actions--compact' : ''}`}>
      <button
        type="button"
        className="lr-btn lr-btn--primary"
        onClick={onGenerateQuiz}
        disabled={quizLoading}
      >
        <Icon name="quiz" />
        {quizLoading ? 'Generating quiz…' : 'Make a quiz with AI'}
      </button>
      <button type="button" className="lr-btn lr-btn--outline" onClick={() => onAction('ask')}>
        <Icon name="chat" />
        Ask AI a question
      </button>
      <button type="button" className="lr-btn lr-btn--outline" onClick={() => onAction('hindi')}>
        <Icon name="translate" />
        Summarise in Hindi
      </button>
    </div>
  );
}

/* ---------- Reader ---------- */

function LessonReader({ lesson, onBack, onAction, onGenerateQuiz, quizLoading }) {
  const articleRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');

  const blocks = useMemo(() => parseContent(lesson.content), [lesson.content]);
  const headings = useMemo(() => blocks.filter((block) => block.type === 'h'), [blocks]);
  const minutes = getReadingMinutes(lesson.content);
  const takeaways = lesson.bullet_points ?? [];
  const notes = lesson.notes ?? [];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lesson._id]);

  useEffect(() => {
    const update = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight * 0.6;
      const value = scrollable > 0 ? (-rect.top + window.innerHeight * 0.2) / scrollable : 1;
      setProgress(Math.min(1, Math.max(0, value)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!headings.length || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lr-reader">
      <div className="lr-progress" aria-hidden="true">
        <div className="lr-progress__bar" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <button type="button" className="lr-back" onClick={onBack}>
        <Icon name="back" />
        All lessons
      </button>

      <header className="lr-hero">
        <span className="lr-eyebrow">
          <span className="lr-eyebrow__dot" />
          FINANCIAL EDUCATION
        </span>
        <h1>{lesson.title}</h1>
        <div className="lr-meta">
          <span className="lr-chip">
            <Icon name="clock" size={15} />
            {minutes} min read
          </span>
          {headings.length > 0 && (
            <span className="lr-chip">
              <Icon name="book" size={15} />
              {headings.length} sections
            </span>
          )}
          {formatDate(lesson.uploaded_at) && <span className="lr-chip">{formatDate(lesson.uploaded_at)}</span>}
        </div>
        <AiActions onAction={onAction} onGenerateQuiz={onGenerateQuiz} quizLoading={quizLoading} />
      </header>

      <div className="lr-layout">
        <div className="lr-main">
          {takeaways.length > 0 && (
            <section className="lr-takeaways" aria-labelledby="lr-takeaways-title">
              <h2 id="lr-takeaways-title">
                <Icon name="bulb" size={20} />
                Key takeaways
              </h2>
              <ul>
                {takeaways.map((point, index) => (
                  <li key={index}>
                    <span className="lr-tick">
                      <Icon name="check" size={13} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <article className="lr-article" ref={articleRef}>
            {blocks.map((block, index) => {
              if (block.type === 'h') {
                const Tag = block.level === 2 ? 'h2' : 'h3';
                return (
                  <Tag key={block.id} id={block.id} className={`lr-heading lr-heading--${Tag}`}>
                    <Inline text={block.text} />
                  </Tag>
                );
              }
              if (block.type === 'list') {
                const Tag = block.ordered ? 'ol' : 'ul';
                return (
                  <Tag key={index} className={`lr-list${block.ordered ? ' lr-list--ordered' : ''}`}>
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
          </article>

          {notes.length > 0 && (
            <section className="lr-notes" aria-labelledby="lr-notes-title">
              <h2 id="lr-notes-title">
                <Icon name="pin" size={20} />
                Remember this
              </h2>
              <div className="lr-notes__grid">
                {notes.map((note, index) => (
                  <div className="lr-note" key={index}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="lr-help">
            <div>
              <h2>Finished reading?</h2>
              <p>Test what you learned or get help with anything that felt unclear.</p>
            </div>
            <AiActions onAction={onAction} onGenerateQuiz={onGenerateQuiz} quizLoading={quizLoading} compact />
          </section>
        </div>

        {headings.length > 0 && (
          <aside className="lr-toc" aria-label="In this lesson">
            <h2>
              <Icon name="list" size={16} />
              In this lesson
            </h2>
            <ul>
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level > 2 ? 'lr-toc__sub' : ''}>
                  <button
                    type="button"
                    className={activeId === heading.id ? 'is-active' : ''}
                    onClick={() => jumpTo(heading.id)}
                  >
                    {stripMarkdown(heading.text)}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---------- Library + page ---------- */

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');

  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState('');

  const [hindiOpen, setHindiOpen] = useState(false);
  const [hindiSummary, setHindiSummary] = useState('');
  const [hindiLoading, setHindiLoading] = useState(false);
  const [hindiError, setHindiError] = useState('');

  const loadLessons = useCallback(async (signal) => {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(LESSONS_URL, { signal });
      if (!response.ok) throw new Error(`Request failed (${response.status}) for ${LESSONS_URL}`);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server did not return JSON. It started with: ${text.slice(0, 80)}`);
      }
      const list = Array.isArray(data) ? data : data?.lessons;
      if (!Array.isArray(list)) {
        throw new Error(`Unexpected response shape. Keys received: ${Object.keys(data || {}).join(', ') || 'none'}`);
      }
      setLessons(list);
      setStatus('ready');
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Lessons load failed:', err);
      setError(
        err instanceof TypeError
          ? `The browser could not read the response from ${LESSONS_URL} (${err.message}). This is almost always CORS: allow ${window.location.origin} in the backend.`
          : err.message || 'Something went wrong while loading lessons.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadLessons(controller.signal);
    return () => controller.abort();
  }, [loadLessons]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const closeAsk = () => {
    if (askLoading) return;
    setAskOpen(false);
  };

  const closeQuiz = () => {
    if (quizLoading) return;
    setQuiz(null);
    setQuizError('');
  };

  const closeHindi = () => {
    if (hindiLoading) return;
    setHindiOpen(false);
  };

  const handleHindiSummary = async () => {
    if (!selectedId) return;

    setHindiOpen(true);
    setHindiSummary('');
    setHindiError('');
    setHindiLoading(true);

    try {
      const url = `${API_BASE}/api/lessons/${selectedId}/summary-hi`;
      // Try POST first (matches the quiz/ask endpoints); fall back to GET if the route is GET-only.
      let response = await fetch(url, { method: 'POST' });
      if (response.status === 405) response = await fetch(url);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate the Hindi summary.');
      }
      if (typeof data.summary !== 'string' || !data.summary.trim()) {
        throw new Error('The server returned an empty summary.');
      }
      setHindiSummary(data.summary);
    } catch (err) {
      console.error('Hindi summary failed:', err);
      setHindiError(err.message || 'Failed to generate the Hindi summary.');
    } finally {
      setHindiLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action === 'ask') {
      setAskQuestion('');
      setAskAnswer('');
      setAskError('');
      setAskOpen(true);
      return;
    }
    if (action === 'hindi') {
      handleHindiSummary();
      return;
    }
    showToast('This feature is coming soon.');
  };

  const handleGenerateQuiz = async () => {
    if (!selectedId) {
      setQuizError('Please open a lesson first.');
      return;
    }

    setQuiz(null);
    setQuizError('');
    setQuizLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/lessons/${selectedId}/quiz`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate quiz.');
      }
      if (!Array.isArray(data.questions)) {
        throw new Error('The server returned an invalid quiz response.');
      }
      setQuiz(data);
    } catch (err) {
      console.error('Quiz generation failed:', err);
      setQuizError(err.message || 'Failed to generate quiz.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAskQuestion = async (event) => {
    event.preventDefault();
    if (!selectedId || !askQuestion.trim() || askLoading) return;

    setAskLoading(true);
    setAskError('');
    setAskAnswer('');

    try {
      const response = await fetch(`${API_BASE}/api/lessons/${selectedId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: askQuestion.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to get an AI answer.');
      }
      setAskAnswer(data.answer || 'The AI returned an empty answer.');
    } catch (err) {
      console.error('Ask AI failed:', err);
      setAskError(err.message || 'Failed to answer the question.');
    } finally {
      setAskLoading(false);
    }
  };

  const cards = useMemo(
    () =>
      lessons.map((lesson) => {
        const blocks = parseContent(lesson.content);
        return {
          lesson,
          excerpt: getExcerpt(blocks),
          minutes: getReadingMinutes(lesson.content),
          sections: blocks.filter((block) => block.type === 'h').length,
        };
      }),
    [lessons],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      ({ lesson, excerpt }) => lesson.title?.toLowerCase().includes(q) || excerpt.toLowerCase().includes(q),
    );
  }, [cards, query]);

  const selected = lessons.find((lesson) => lesson._id === selectedId);

  return (
    <div className="lr-page">
      {selected ? (
        <LessonReader
          lesson={selected}
          onBack={() => {
            setSelectedId(null);
            setQuiz(null);
            setQuizError('');
            setAskOpen(false);
            setAskQuestion('');
            setAskAnswer('');
            setAskError('');
            setHindiOpen(false);
            setHindiSummary('');
            setHindiError('');
          }}
          onAction={handleAction}
          onGenerateQuiz={handleGenerateQuiz}
          quizLoading={quizLoading}
        />
      ) : (
        <>
          <header className="lr-page-header">
            <span className="lr-eyebrow">
              <span className="lr-eyebrow__dot" />
              LEARN
            </span>
            <h1>Lessons</h1>
            <p>Published financial education lessons, explained in simple language with practical Indian examples.</p>
          </header>

          {status === 'loading' && (
            <div className="lr-state" role="status">
              <div className="lr-spinner" />
              <h3>Loading lessons…</h3>
            </div>
          )}

          {status === 'error' && (
            <div className="lr-state lr-state--error" role="alert">
              <h3>Couldn&apos;t load lessons</h3>
              <p>{error}</p>
              <button type="button" className="lr-btn lr-btn--primary" onClick={() => loadLessons()}>
                Try again
              </button>
            </div>
          )}

          {status === 'ready' && lessons.length === 0 && (
            <div className="lr-state">
              <div className="lr-state__icon">
                <Icon name="book" size={26} />
              </div>
              <h3>No lessons yet</h3>
              <p>New lessons will show up here as soon as they are published.</p>
            </div>
          )}

          {status === 'ready' && lessons.length > 0 && (
            <>
              <div className="lr-toolbar">
                <label className="lr-search">
                  <Icon name="search" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search lessons"
                    aria-label="Search lessons"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                      <Icon name="close" size={15} />
                    </button>
                  )}
                </label>
                <span className="lr-count">
                  {filtered.length} {filtered.length === 1 ? 'lesson' : 'lessons'}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="lr-state">
                  <h3>No matches</h3>
                  <p>Try a different search term.</p>
                </div>
              ) : (
                <div className="lr-grid">
                  {filtered.map(({ lesson, excerpt, minutes, sections }) => (
                    <article className="lr-card" key={lesson._id}>
                      <div className="lr-card__meta">
                        <span className="lr-chip">
                          <Icon name="clock" size={14} />
                          {minutes} min read
                        </span>
                        {sections > 0 && <span className="lr-chip">{sections} sections</span>}
                      </div>
                      <h3>{lesson.title}</h3>
                      <p>{excerpt}</p>
                      <button type="button" className="lr-btn lr-btn--primary" onClick={() => setSelectedId(lesson._id)}>
                        Read lesson
                        <Icon name="arrow" size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ---------- Quiz modal ---------- */}
      {(quiz || quizLoading || quizError) && (
        <div className="quiz-overlay" onClick={closeQuiz}>
          <div
            className="quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quiz-modal-header">
              <div>
                <h2 id="quiz-title">AI generated quiz</h2>
                <p>Test your understanding of this lesson.</p>
              </div>
              <button
                type="button"
                className="quiz-close"
                aria-label="Close quiz"
                disabled={quizLoading}
                onClick={closeQuiz}
              >
                &times;
              </button>
            </div>

            {quizLoading && <p role="status">Generating your quiz. Please wait…</p>}

            {quizError && (
              <p className="quiz-error" role="alert">
                {quizError}
              </p>
            )}

            {quiz && (
              <div className="quiz-content">
                {quiz.questions.map((question, index) => (
                  <section className="quiz-question" key={index}>
                    <h3>
                      {index + 1}. {question.question}
                    </h3>

                    <div className="quiz-options">
                      {(Array.isArray(question.options) ? question.options : []).map((option, optionIndex) => (
                        <div className="quiz-option" key={optionIndex}>
                          {String.fromCharCode(65 + optionIndex)}. {option}
                        </div>
                      ))}
                    </div>

                    <details className="quiz-answer">
                      <summary>Show correct answer and explanation</summary>
                      <p>
                        <strong>Answer:</strong> {question.correct_answer}
                      </p>
                      <p>
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </details>
                  </section>
                ))}
              </div>
            )}

            <div className="quiz-modal-footer">
              <button type="button" className="lr-btn lr-btn--primary" disabled={quizLoading} onClick={closeQuiz}>
                Close quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Ask AI modal ---------- */}
      {askOpen && (
        <div className="quiz-overlay" onClick={closeAsk}>
          <div
            className="quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quiz-modal-header">
              <div>
                <h2 id="ask-title">Ask AI about this lesson</h2>
                <p>Ask anything that felt unclear. Answers are based on this lesson.</p>
              </div>
              <button
                type="button"
                className="quiz-close"
                aria-label="Close"
                disabled={askLoading}
                onClick={closeAsk}
              >
                &times;
              </button>
            </div>

            <form className="ask-form" onSubmit={handleAskQuestion}>
              <textarea
                className="ask-input"
                rows={3}
                value={askQuestion}
                onChange={(event) => setAskQuestion(event.target.value)}
                placeholder="e.g. What is the difference between SIP and lump sum?"
                aria-label="Your question"
                disabled={askLoading}
              />
              <button
                type="submit"
                className="lr-btn lr-btn--primary"
                disabled={askLoading || !askQuestion.trim()}
              >
                {askLoading ? 'Thinking…' : 'Ask question'}
              </button>
            </form>

            {askError && (
              <p className="quiz-error" role="alert">
                {askError}
              </p>
            )}

            {askAnswer && (
              <div className="ask-answer" role="status">
                <h3>Answer</h3>
                <p>{askAnswer}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Hindi summary modal ---------- */}
      {hindiOpen && (
        <div className="quiz-overlay" onClick={closeHindi}>
          <div
            className="quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hindi-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quiz-modal-header">
              <div>
                <h2 id="hindi-title">हिंदी सारांश</h2>
                <p>Hindi summary of this lesson.</p>
              </div>
              <button
                type="button"
                className="quiz-close"
                aria-label="Close summary"
                disabled={hindiLoading}
                onClick={closeHindi}
              >
                &times;
              </button>
            </div>

            {hindiLoading && <p role="status">Preparing your Hindi summary. Please wait…</p>}

            {hindiError && (
              <p className="quiz-error" role="alert">
                {hindiError}
              </p>
            )}

            {hindiSummary && (
              <div className="hindi-summary" lang="hi">
                {parseSummary(hindiSummary).map((block, index) => {
                  if (block.type === 'title') return <h3 key={index}>{block.text}</h3>;
                  if (block.type === 'list') {
                    return (
                      <ul key={index}>
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={index}>{block.text}</p>;
                })}
              </div>
            )}

            <div className="quiz-modal-footer">
              {hindiError && (
                <button type="button" className="lr-btn lr-btn--outline" disabled={hindiLoading} onClick={handleHindiSummary}>
                  Try again
                </button>
              )}
              <button type="button" className="lr-btn lr-btn--primary" disabled={hindiLoading} onClick={closeHindi}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="lr-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}