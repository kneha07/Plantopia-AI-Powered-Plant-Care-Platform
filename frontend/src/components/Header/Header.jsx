import Navigation from '../Navigation/Navigation';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import './Header.css';

function Header({ currentPage, onNavigate, theme, onToggleTheme, onOpenSettings, userSettings, user, onLogout }) {
  const greeting = user?.displayName || user?.email?.split('@')[0] || userSettings.displayName;

  return (
    <header className="header">
      <div className="header-container container">
        <a
          href="#/"
          className="header-logo"
          onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
          aria-label="Plantopia - Go to homepage"
        >
          <span className="logo-icon" aria-hidden="true">🌿</span>
          <span className="logo-text">Plantopia</span>
        </a>

        {greeting && (
          <span className="header-greeting" aria-live="polite">
            Hello, {greeting}!
          </span>
        )}

        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {user ? (
            <button className="settings-btn" onClick={onLogout} aria-label="Sign out" title="Sign out">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          ) : (
            <button className="settings-btn" onClick={() => onNavigate('auth')} aria-label="Sign in" title="Sign in">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
          )}
          <Navigation currentPage={currentPage} onNavigate={onNavigate} />
        </div>
      </div>
    </header>
  );
}

export default Header;