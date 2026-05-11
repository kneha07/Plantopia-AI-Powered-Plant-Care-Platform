import { useState, useEffect, useRef } from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';
import SkipLink from './components/SkipLink/SkipLink';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Modal from './components/Modal/Modal';

import Home from './pages/Home/Home';
import Plants from './pages/Plants/Plants';
import PlantFinder from './pages/PlantFinder/PlantFinder';
import About from './pages/About/About';
import AIChat from './pages/AIChat/AIChat';
import PlantAI from './pages/PlantAI/PlantAI';
import ARView from './pages/ARView/ARView';
import MyPlants from './pages/MyPlants/MyPlants';
import Auth from './pages/Auth/Auth';

import './App.css';

const ROUTES = {
  '#/': 'home',
  '#/plants': 'plants',
  '#/finder': 'finder',
  '#/about': 'about',
  '#/chat': 'chat',
  '#/ai': 'ai',
  '#/ar': 'ar',
  '#/my-plants': 'my-plants',
  '#/auth': 'auth',
};

const HASHES = Object.fromEntries(Object.entries(ROUTES).map(([h, p]) => [p, h]));

function getPageFromHash(hash) {
  return ROUTES[hash] || 'home';
}

function AppInner() {
  const { user, logout, isAuthenticated } = useAuth();
  const initialHash = window.location.hash || '#/';
  const [currentPage, setCurrentPage] = useState(getPageFromHash(initialHash));
  const [theme, setTheme] = useState('light');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({ displayName: '', experienceLevel: 'beginner' });
  const [wateringAlert, setWateringAlert] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const titles = {
      home: 'Plantopia | Your Plant Care Guide',
      plants: 'Browse Plants | Plantopia',
      finder: 'Plant Finder Quiz | Plantopia',
      about: 'About Us | Plantopia',
      chat: 'Flora AI Chat | Plantopia',
      ai: 'AI Plant Tools | Plantopia',
      ar: 'AR Plant View | Plantopia',
      'my-plants': 'My Plants | Plantopia',
      auth: 'Sign In | Plantopia',
    };
    document.title = titles[currentPage] || 'Plantopia';
  }, [currentPage]);

  useEffect(() => {
    function handlePopState() {
      setCurrentPage(getPageFromHash(window.location.hash || '#/'));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // WebSocket for real-time watering alerts
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('plantopia_token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'watering_alert' && data.plants?.length > 0) {
        setWateringAlert(data.plants);
      }
    };

    return () => ws.close();
  }, [isAuthenticated]);

  function handleNavigate(page) {
    const hash = HASHES[page] || '#/';
    window.history.pushState(null, '', hash);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }

  function renderPage() {
    const protectedPages = ['my-plants', 'chat'];
    if (protectedPages.includes(currentPage) && !isAuthenticated) {
      return <Auth onNavigate={handleNavigate} />;
    }

    switch (currentPage) {
      case 'home': return <Home onNavigate={handleNavigate} userSettings={userSettings} />;
      case 'plants': return <Plants />;
      case 'finder': return <PlantFinder userSettings={userSettings} />;
      case 'about': return <About />;
      case 'chat': return <AIChat />;
      case 'ai': return <PlantAI />;
      case 'ar': return <ARView />;
      case 'my-plants': return <MyPlants />;
      case 'auth': return <Auth onNavigate={handleNavigate} />;
      default: return <Home onNavigate={handleNavigate} userSettings={userSettings} />;
    }
  }

  return (
    <>
      <SkipLink />
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
        onOpenSettings={() => setIsModalOpen(true)}
        userSettings={userSettings}
        user={user}
        onLogout={() => { logout(); handleNavigate('home'); }}
      />
      <main id="main-content">
        {wateringAlert && (
          <div className="watering-alert" role="alert">
            <span>💧 {wateringAlert.length} plant{wateringAlert.length > 1 ? 's' : ''} need watering: {wateringAlert.map(p => p.nickname || p.name).join(', ')}</span>
            <button onClick={() => setWateringAlert(null)} aria-label="Dismiss alert">×</button>
          </div>
        )}
        {renderPage()}
      </main>
      <Footer />
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userSettings={userSettings}
        onSave={(s) => { setUserSettings(s); setIsModalOpen(false); }}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
