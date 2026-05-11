import { useState, useEffect } from 'react';
import './ARView.css';

// Free GLTF plant models from Google's model-viewer examples & Sketchfab public domain
const AR_PLANTS = [
  {
    id: 1,
    name: 'Monstera',
    model: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', // placeholder
    // Real plant models below — using free CC0 models from poly.pizza
    realModel: 'https://cdn.jsdelivr.net/gh/nicktgr15/three.js@r128/examples/models/gltf/Parrot.glb',
    thumbnail: '/images/monstera.jpg',
    description: 'Iconic split-leaf tropical plant',
    scale: '0.5 0.5 0.5',
  },
  {
    id: 2,
    name: 'Snake Plant',
    thumbnail: '/images/snake-plant.jpg',
    description: 'Tall, architectural succulent',
    scale: '0.4 0.4 0.4',
  },
  {
    id: 3,
    name: 'Peace Lily',
    thumbnail: '/images/peace-lily.jpg',
    description: 'Elegant flowering plant',
    scale: '0.45 0.45 0.45',
  },
  {
    id: 4,
    name: 'Pothos',
    thumbnail: '/images/pothos.jpg',
    description: 'Trailing vine with heart-shaped leaves',
    scale: '0.5 0.5 0.5',
  },
];

// Free CC0 GLB models from KhronosGroup glTF sample library
// CC0 plant GLB models served locally from /public/models/
const PLANT_MODELS = {
  Monstera: '/models/plant.glb',
  'Snake Plant': '/models/plant.glb',
  'Peace Lily': '/models/flowers.glb',
  Pothos: '/models/flowers.glb',
};

function ARView() {
  const [selected, setSelected] = useState(AR_PLANTS[0]);
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false);
  const [isAR, setIsAR] = useState(false);

  useEffect(() => {
    // Dynamically load model-viewer web component
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => setModelViewerLoaded(true);
      document.head.appendChild(script);
    } else {
      setModelViewerLoaded(true);
    }
  }, []);

  const modelSrc = PLANT_MODELS[selected.name];

  return (
    <div className="ar-view">
      <div className="ar-view__hero">
        <h1>AR Plant Visualizer</h1>
        <p>See how plants look in your space before buying</p>
      </div>

      <div className="ar-view__layout">
        {/* Plant selector sidebar */}
        <aside className="ar-view__sidebar">
          <h2 className="ar-view__sidebar-title">Choose a Plant</h2>
          <div className="ar-view__plant-list">
            {AR_PLANTS.map(plant => (
              <button
                key={plant.id}
                className={`ar-view__plant-item ${selected.id === plant.id ? 'ar-view__plant-item--active' : ''}`}
                onClick={() => setSelected(plant)}
              >
                <img src={plant.thumbnail} alt={plant.name} className="ar-view__plant-thumb" />
                <div>
                  <p className="ar-view__plant-name">{plant.name}</p>
                  <p className="ar-view__plant-desc">{plant.description}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 3D Viewer */}
        <div className="ar-view__viewer-area">
          <div className="ar-view__viewer-card">
            <div className="ar-view__viewer-header">
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
            </div>

            {modelViewerLoaded ? (
              <div className="ar-view__model-container">
                <model-viewer
                  src={modelSrc}
                  alt={`3D model of ${selected.name}`}
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  environment-image="neutral"
                  style={{ width: '100%', height: '400px', background: 'var(--color-bg-alt)', borderRadius: '12px' }}
                  loading="eager"
                >
                  <button
                    slot="ar-button"
                    className="ar-view__ar-button"
                  >
                    View in AR
                  </button>
                  <div slot="progress-bar" className="ar-view__progress">
                    <div className="ar-view__progress-bar"></div>
                  </div>
                </model-viewer>
              </div>
            ) : (
              <div className="ar-view__loading-model">
                <div className="ar-view__spinner"></div>
                <p>Loading 3D viewer...</p>
              </div>
            )}

            <div className="ar-view__instructions">
              <div className="ar-view__instruction-item">
                <span className="ar-view__instruction-icon">🖱️</span>
                <p>Drag to rotate • Scroll to zoom</p>
              </div>
              <div className="ar-view__instruction-item">
                <span className="ar-view__instruction-icon">📱</span>
                <p>Tap "View in AR" on mobile to place in your room</p>
              </div>
              <div className="ar-view__instruction-item">
                <span className="ar-view__instruction-icon">✨</span>
                <p>Works with ARCore (Android) and ARKit (iOS)</p>
              </div>
            </div>
          </div>

          <div className="ar-view__info-card">
            <h3>How AR Works</h3>
            <p>
              Point your phone camera at a flat surface (floor, table, shelf) and tap to place
              the plant in your real environment. Walk around it, resize it, and see exactly how it will look.
            </p>
            <div className="ar-view__compatibility">
              <div className="ar-view__compat-item">
                <span>🤖</span>
                <div>
                  <strong>Android</strong>
                  <p>Requires ARCore — most modern Android phones</p>
                </div>
              </div>
              <div className="ar-view__compat-item">
                <span>🍎</span>
                <div>
                  <strong>iOS</strong>
                  <p>Requires iOS 12+ with ARKit support</p>
                </div>
              </div>
              <div className="ar-view__compat-item">
                <span>💻</span>
                <div>
                  <strong>Desktop</strong>
                  <p>Interactive 3D viewer (no AR)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ARView;
