
import { useState } from 'react';

const API_URL = 'http://127.0.0.1:8000/api/lessons/generate';

const INITIAL_TITLE =
  'Demat Account: Meaning, Working, Benefits, and How to Open One';

const INITIAL_SUMMARY =
  'Explain what a Demat account is and how it works in the Indian stock market. Cover the difference between Demat, trading, and bank accounts; the roles of NSDL, CDSL, and Depository Participants; required documents and KYC; the account opening process; electronic storage of securities; common charges; benefits; risks; and precautions when choosing a broker. Use simple language and practical examples for beginners.';

export default function CreateLesson() {
  const [title, setTitle] = useState(INITIAL_TITLE);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess(false);

    if (!title.trim() || !summary.trim()) {
      setError('Please enter both the lesson title and summary.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data?.detail === 'string'
            ? data.detail
            : `Request failed with status ${response.status}.`;

        throw new Error(message);
      }

      setSuccess(true);
    } catch {
      setError(
        'Unable to generate the lesson. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTitle(INITIAL_TITLE);
    setSummary(INITIAL_SUMMARY);
    setError('');
    setSuccess(false);
  }

  return (
    <main className="create-lesson-page">
      <div className="create-lesson-page__container">
        <header className="create-lesson-page__header">
          <div>
            <span className="create-lesson-page__eyebrow">
              ADMIN WORKSPACE
            </span>

            <h1>Create Lesson</h1>

            <p>
              Generate educational content to help learners understand
              the stock market.
            </p>
          </div>

          <div className="create-lesson-page__header-icon">
            ✦
          </div>
        </header>

        <section className="create-lesson-card">
          <div className="create-lesson-card__heading">
            <div className="create-lesson-card__icon">✎</div>

            <div>
              <h2>Lesson details</h2>
              <p>Describe the lesson you want to generate.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="lesson-form__field">
              <label htmlFor="lesson-title">
                Lesson title <span>*</span>
              </label>

              <input
                id="lesson-title"
                name="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter a descriptive lesson title"
                maxLength={200}
                required
              />

              <div className="lesson-form__hint">
                <span>Choose a clear and descriptive title.</span>
                <span>{title.length}/200</span>
              </div>
            </div>

            <div className="lesson-form__field">
              <label htmlFor="lesson-summary">
                Lesson summary and instructions <span>*</span>
              </label>

              <textarea
                id="lesson-summary"
                name="summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Explain the topics, examples, and learning objectives..."
                rows={9}
                required
              />

              <p className="lesson-form__hint">
                Include the topics to cover, the target audience,
                and practical examples.
              </p>
            </div>

            {error && (
              <div
                className="lesson-message lesson-message--error"
                role="alert"
              >
                <strong>Generation failed</strong>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div
                className="lesson-message lesson-message--success"
                role="status"
              >
                <strong>Lesson generation successful!</strong>
                <p>
                  Your lesson may now be available in Draft Lessons.
                  Please visit Draft Lessons to check its status.
                </p>
              </div>
            )}

            <div className="lesson-form__footer">
              <p className="lesson-form__required">
                <span>*</span> Required fields
              </p>

              <div className="lesson-form__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="lesson-spinner" />
                      Generating...
                    </>
                  ) : (
                    <>✦ Generate Lesson</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
