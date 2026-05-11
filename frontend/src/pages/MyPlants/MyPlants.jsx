import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './MyPlants.css';

function MyPlants() {
  const { authFetch, user } = useAuth();
  const [collection, setCollection] = useState([]);
  const [due, setDue] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-plants');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ plantId: '', nickname: '', location: '', acquiredDate: '' });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [colRes, dueRes, plantsRes] = await Promise.all([
        authFetch('/api/plants/collection/all'),
        authFetch('/api/plants/schedule/due'),
        fetch('/api/plants'),
      ]);
      setCollection(await colRes.json());
      setDue(await dueRes.json());
      setPlants(await plantsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPlant(e) {
    e.preventDefault();
    await authFetch('/api/plants/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, plantId: Number(addForm.plantId) }),
    });
    setShowAddModal(false);
    setAddForm({ plantId: '', nickname: '', location: '', acquiredDate: '' });
    fetchAll();
  }

  async function handleWater(userPlantId) {
    await authFetch(`/api/plants/collection/${userPlantId}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    fetchAll();
  }

  async function handleRemove(userPlantId) {
    await authFetch(`/api/plants/collection/${userPlantId}`, { method: 'DELETE' });
    fetchAll();
  }

  const waterFreqLabel = { low: 'Every ~2 weeks', moderate: 'Every ~1 week', frequent: 'Every ~3 days' };

  if (loading) return <div className="my-plants__loading">Loading your plants...</div>;

  return (
    <div className="my-plants">
      <div className="my-plants__hero">
        <h1>My Plant Collection</h1>
        <p>Welcome back, {user?.displayName || user?.email}! Track your plants and never miss a watering.</p>
      </div>

      <div className="container">
        <div className="my-plants__tabs">
          <button
            className={`my-plants__tab ${activeTab === 'my-plants' ? 'my-plants__tab--active' : ''}`}
            onClick={() => setActiveTab('my-plants')}
          >
            My Plants ({collection.length})
          </button>
          <button
            className={`my-plants__tab ${activeTab === 'schedule' ? 'my-plants__tab--active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Watering Due {due.length > 0 && <span className="my-plants__badge">{due.length}</span>}
          </button>
        </div>

        {activeTab === 'my-plants' && (
          <div className="my-plants__content">
            <button className="btn btn-primary my-plants__add-btn" onClick={() => setShowAddModal(true)}>
              + Add Plant
            </button>

            {collection.length === 0 ? (
              <div className="my-plants__empty">
                <p>No plants yet. Add your first plant to start tracking!</p>
              </div>
            ) : (
              <div className="my-plants__grid">
                {collection.map(plant => (
                  <div key={plant.userPlantId} className="my-plants__card">
                    <img src={plant.image} alt={plant.name} className="my-plants__card-img" />
                    <div className="my-plants__card-body">
                      <h3>{plant.nickname || plant.name}</h3>
                      {plant.nickname && <p className="my-plants__species">{plant.name}</p>}
                      {plant.location && <p className="my-plants__location">📍 {plant.location}</p>}
                      <p className="my-plants__freq">{waterFreqLabel[plant.water]}</p>
                      {plant.lastWatered && (
                        <p className="my-plants__last-watered">
                          Last watered: {new Date(plant.lastWatered).toLocaleDateString()}
                        </p>
                      )}
                      <div className="my-plants__actions">
                        <button
                          className="btn btn-primary my-plants__water-btn"
                          onClick={() => handleWater(plant.userPlantId)}
                        >
                          💧 Log Watering
                        </button>
                        <button
                          className="my-plants__remove-btn"
                          onClick={() => handleRemove(plant.userPlantId)}
                          aria-label="Remove plant"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="my-plants__content">
            {due.length === 0 ? (
              <div className="my-plants__empty">
                <p>All caught up! No plants need watering right now.</p>
              </div>
            ) : (
              <div className="my-plants__due-list">
                {due.map(plant => (
                  <div key={plant.userPlantId} className="my-plants__due-card">
                    <img src={plant.image} alt={plant.name} className="my-plants__due-img" />
                    <div className="my-plants__due-info">
                      <h3>{plant.name}</h3>
                      {plant.location && <p>📍 {plant.location}</p>}
                      <p className="my-plants__due-since">
                        {plant.lastWatered
                          ? `Last watered ${new Date(plant.lastWatered).toLocaleDateString()}`
                          : 'Never watered'}
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleWater(plant.userPlantId)}>
                      💧 Water Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="my-plants__modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="my-plants__modal" onClick={e => e.stopPropagation()}>
            <h2>Add Plant to Collection</h2>
            <form onSubmit={handleAddPlant} className="my-plants__modal-form">
              <label>
                Plant *
                <select
                  value={addForm.plantId}
                  onChange={e => setAddForm(p => ({ ...p, plantId: e.target.value }))}
                  required
                >
                  <option value="">Select a plant...</option>
                  {plants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Nickname
                <input
                  type="text"
                  value={addForm.nickname}
                  onChange={e => setAddForm(p => ({ ...p, nickname: e.target.value }))}
                  placeholder="e.g. My little buddy"
                />
              </label>
              <label>
                Location
                <input
                  type="text"
                  value={addForm.location}
                  onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Living room, Bedroom"
                />
              </label>
              <label>
                Date Acquired
                <input
                  type="date"
                  value={addForm.acquiredDate}
                  onChange={e => setAddForm(p => ({ ...p, acquiredDate: e.target.value }))}
                />
              </label>
              <div className="my-plants__modal-actions">
                <button type="submit" className="btn btn-primary">Add Plant</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPlants;
