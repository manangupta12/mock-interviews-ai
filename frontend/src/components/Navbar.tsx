import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

interface NavbarProps {
  showLogout?: boolean;
  onLogoClick?: () => boolean; // Returns true if navigation should proceed
}

const Navbar = ({ showLogout = true, onLogoClick }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogoClick = () => {
    // If custom handler provided (e.g., for interview page)
    if (onLogoClick) {
      const shouldNavigate = onLogoClick();
      if (shouldNavigate) {
        navigate('/home');
      }
    } else {
      // Direct navigation for other pages
      if (location.pathname !== '/home') {
        navigate('/home');
      }
    }
  };

  return (
    <nav className="app-navbar">
      <div className="navbar-logo-container" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <div className="brand-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="url(#gradient1)"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="12">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">MockInterviews</span>
            <span className="brand-tld">.ai</span>
          </div>
        </div>
      </div>
      {showLogout && (
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      )}
    </nav>
  );
};

export default Navbar;

