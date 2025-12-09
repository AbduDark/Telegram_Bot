import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Share2,
  Settings,
  LogOut,
  Menu,
  X,
  History,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin-panel', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { path: '/admin-panel/users', icon: Users, label: 'المستخدمون' },
  { path: '/admin-panel/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
  { path: '/admin-panel/referrals', icon: Share2, label: 'الإحالات' },
  { path: '/admin-panel/search-history', icon: History, label: 'سجل البحث' },
  { path: '/admin-panel/settings', icon: Settings, label: 'الإعدادات' },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    navigate('/admin-panel/login');
  };

  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>لوحة الإدارة</h2>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="header-info">
            <span className="admin-name">{adminUser.username || 'المدير'}</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
