import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const NAV_ITEMS = [
  { to: '/',            icon: '📊', label: 'Dashboard' },
  { to: '/campaigns',   icon: '🎯', label: 'Kampanyalar' },
  { to: '/products',    icon: '☕', label: 'Menu & Urunler' },
  { to: '/stores',      icon: '📍', label: 'Subeler' },
  { to: '/baristas',    icon: '👤', label: 'Baristalar' },
  { to: '/reviews',     icon: '⭐', label: 'Yorumlar' },
  { to: '/stats',       icon: '📈', label: 'Istatistikler' },
  { to: '/settings',    icon: '⚙️', label: 'Ayarlar' },
];

export default function Layout() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    api.logout();
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>Mottis Coffee</h2>
          <span>Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="staff-info">
            <strong>{staff?.name}</strong>
            <small>{staff?.storeName || 'Yonetici'}</small>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Cikis Yap</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
