import { useState } from 'react';
import './PlantAI.css';

function PlantAI() {
  const [activeTab, setActiveTab] = useState('identify');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Recommendation form state
  const [recForm, setRecForm] = useState({
    lightLevel: 'medium',
    experience: 'beginner',
    hasPets: false,
    space: 'medium',
    lifestyle: 'busy',
  });
  const [recommendations, setRecommendations] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
  }

  async function handleSubmitPhoto(e) {
    e.preventDefault();
    if (!image) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);
    if (activeTab === 'diagnose' && symptoms) {
      formData.append('symptoms', symptoms);
    }

    try {
      const endpoint = activeTab === 'identify' ? '/api/ai/identify' : '/api/ai/diagnose';
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGetRecommendations(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecommendations(null);

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const difficultyColor = { easy: '#4caf50', moderate: '#ff9800', expert: '#f44336' };
  const healthColor = { healthy: '#4caf50', 'needs attention': '#ff9800', critical: '#f44336' };

  return (
    <div className="plant-ai">
      <div className="plant-ai__hero">
        <h1 className="plant-ai__title">AI Plant Tools</h1>
        <p className="plant-ai__subtitle">Identify plants, diagnose issues, and get personalized recommendations</p>
      </div>

      <div className="container">
        <div className="plant-ai__tabs">
          {['identify', 'diagnose', 'recommend'].map(tab => (
            <button
              key={tab}
              className={`plant-ai__tab ${activeTab === tab ? 'plant-ai__tab--active' : ''}`}
              onClick={() => { setActiveTab(tab); setResult(null); setRecommendations(null); setError(''); }}
            >
              {tab === 'identify' ? '🔍 Identify' : tab === 'diagnose' ? '🩺 Diagnose' : '✨ Recommend'}
            </button>
          ))}
        </div>

        <div className="plant-ai__content">
          {/* Identify / Diagnose tabs */}
          {(activeTab === 'identify' || activeTab === 'diagnose') && (
            <form className="plant-ai__form" onSubmit={handleSubmitPhoto}>
              <div className="plant-ai__upload-area">
                <label className="plant-ai__upload-label" htmlFor="plant-image">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Plant preview" className="plant-ai__preview" />
                  ) : (
                    <div className="plant-ai__upload-placeholder">
                      <span className="plant-ai__upload-icon">📷</span>
                      <p>Click or drag a photo of your plant</p>
                      <p className="plant-ai__upload-hint">JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </label>
                <input
                  id="plant-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="plant-ai__file-input"
                />
              </div>

              {activeTab === 'diagnose' && (
                <div className="plant-ai__field">
                  <label htmlFor="symptoms">Describe the symptoms (optional)</label>
                  <textarea
                    id="symptoms"
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    placeholder="e.g. leaves are turning yellow and drooping, brown spots on edges..."
                    rows={3}
                  />
                </div>
              )}

              {error && <p className="plant-ai__error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!image || loading}
              >
                {loading ? 'Analyzing...' : activeTab === 'identify' ? 'Identify Plant' : 'Diagnose Plant'}
              </button>
            </form>
          )}

          {/* Identify result */}
          {activeTab === 'identify' && result && !result.raw && (
            <div className="plant-ai__result">
              <h2 className="plant-ai__result-name">{result.commonName}</h2>
              <p className="plant-ai__result-scientific">{result.scientificName}</p>
              <p className="plant-ai__result-desc">{result.description}</p>
              <div className="plant-ai__badges">
                <span className="plant-ai__badge" style={{ background: difficultyColor[result.difficulty] || '#888' }}>
                  {result.difficulty}
                </span>
                <span className="plant-ai__badge plant-ai__badge--outline">{result.light} light</span>
                <span className="plant-ai__badge plant-ai__badge--outline">{result.water} water</span>
                <span className="plant-ai__badge plant-ai__badge--outline">{result.petSafe === 'yes' ? '✓ Pet safe' : '✗ Not pet safe'}</span>
              </div>
              {result.careTips && (
                <div className="plant-ai__tips">
                  <h3>Care Tips</h3>
                  <ul>
                    {result.careTips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Diagnose result */}
          {activeTab === 'diagnose' && result && !result.raw && (
            <div className="plant-ai__result">
              <div className="plant-ai__health-status" style={{ borderColor: healthColor[result.healthStatus?.toLowerCase()] || '#888' }}>
                <span>Overall Health: </span>
                <strong style={{ color: healthColor[result.healthStatus?.toLowerCase()] || '#888' }}>
                  {result.healthStatus}
                </strong>
              </div>
              {result.issues?.map((issue, i) => (
                <div key={i} className="plant-ai__issue">
                  <h3>{issue.problem}</h3>
                  <p><strong>Cause:</strong> {issue.cause}</p>
                  <p><strong>Treatment:</strong> {issue.treatment}</p>
                </div>
              ))}
              {result.prevention && (
                <div className="plant-ai__tips">
                  <h3>Prevention</h3>
                  <ul>
                    {result.prevention.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw fallback */}
          {result?.raw && (
            <div className="plant-ai__result">
              <p style={{ whiteSpace: 'pre-wrap' }}>{result.raw}</p>
            </div>
          )}

          {/* Recommend tab */}
          {activeTab === 'recommend' && (
            <form className="plant-ai__form plant-ai__rec-form" onSubmit={handleGetRecommendations}>
              <div className="plant-ai__rec-grid">
                <div className="plant-ai__field">
                  <label htmlFor="light">Light in your home</label>
                  <select id="light" value={recForm.lightLevel} onChange={e => setRecForm(p => ({ ...p, lightLevel: e.target.value }))}>
                    <option value="low">Low (north-facing, dim)</option>
                    <option value="medium">Medium (indirect light)</option>
                    <option value="bright">Bright (sunny windows)</option>
                  </select>
                </div>
                <div className="plant-ai__field">
                  <label htmlFor="exp">Your experience level</label>
                  <select id="exp" value={recForm.experience} onChange={e => setRecForm(p => ({ ...p, experience: e.target.value }))}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="plant-ai__field">
                  <label htmlFor="space">Available space</label>
                  <select id="space" value={recForm.space} onChange={e => setRecForm(p => ({ ...p, space: e.target.value }))}>
                    <option value="small">Small (windowsill, desk)</option>
                    <option value="medium">Medium (side table, shelf)</option>
                    <option value="large">Large (floor plant)</option>
                  </select>
                </div>
                <div className="plant-ai__field">
                  <label htmlFor="lifestyle">Your lifestyle</label>
                  <select id="lifestyle" value={recForm.lifestyle} onChange={e => setRecForm(p => ({ ...p, lifestyle: e.target.value }))}>
                    <option value="busy">Busy (low maintenance)</option>
                    <option value="moderate">Moderate</option>
                    <option value="attentive">Love tending to plants</option>
                  </select>
                </div>
              </div>
              <label className="plant-ai__checkbox">
                <input
                  type="checkbox"
                  checked={recForm.hasPets}
                  onChange={e => setRecForm(p => ({ ...p, hasPets: e.target.checked }))}
                />
                I have pets (show pet-safe plants only)
              </label>

              {error && <p className="plant-ai__error">{error}</p>}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Finding plants...' : 'Get My Recommendations'}
              </button>
            </form>
          )}

          {activeTab === 'recommend' && recommendations && (
            <div className="plant-ai__rec-results">
              {recommendations.map((rec, i) => (
                <div key={i} className="plant-ai__rec-card">
                  <div className="plant-ai__rec-header">
                    <div>
                      <h3>{rec.name}</h3>
                      <p className="plant-ai__result-scientific">{rec.scientificName}</p>
                    </div>
                    <span className="plant-ai__badge" style={{ background: difficultyColor[rec.difficulty] || '#888' }}>
                      {rec.difficulty}
                    </span>
                  </div>
                  <p className="plant-ai__rec-reason">{rec.reason}</p>
                  <p className="plant-ai__rec-tip">💡 {rec.tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlantAI;
