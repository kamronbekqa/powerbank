import React, { useState } from 'react';
import { ShoppingBag, UserCheck, ShieldAlert, Layers, User, LogOut, LogIn, Zap, Home, Star, Phone, Moon, Sun, Globe, Menu, X, ChevronDown, CheckCircle2, Clock, Upload, Camera, Heart, ShoppingCart } from 'lucide-react';
import VoltMaxLogo from './VoltMaxLogo';

const DEFAULT_AVATARS = [
  { id: 'av1', label: 'Default Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Default Female', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Business Executive', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Cyber Tech', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Minimalist 3D', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80' },
];

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  user, 
  onOpenKYC, 
  onOpenAuth, 
  onLogout,
  onUpdateAvatar,
  lang,
  setLang,
  theme,
  setTheme,
  t,
  wishlistCount,
  onOpenWishlist
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const kycStatus = String(user?.verificationStatus || user?.kycStatus || '').toUpperCase();
  const isKycRejected = kycStatus === 'REJECTED' || user?.verifications?.some(v => v.status === 'REJECTED');

  const handleCustomAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (onUpdateAvatar) onUpdateAvatar(evt.target.result);
        setShowAvatarModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="header">
      <div className="header-inner container">
        {/* Brand Logo & Tag */}
        <div className="brand" onClick={() => handleNavClick('home')} style={{ cursor: 'pointer' }}>
          <VoltMaxLogo size="medium" />
        </div>

        {/* Main Navigation Links (Desktop) */}
        <nav className="nav-links desktop-only" style={{ gap: '0.8rem' }}>
          <span 
            className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
            style={{ fontSize: '0.82rem' }}
          >
            <Home size={15} />
            {t.home || 'Asosiy'}
          </span>

          <span 
            className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => handleNavClick('catalog')}
            style={{ fontSize: '0.82rem' }}
          >
            <Layers size={15} />
            {t.catalog || 'Katalog'}
          </span>

          <span 
            className={`nav-link ${activeTab === 'solar-panels' ? 'active' : ''}`}
            onClick={() => handleNavClick('solar-panels')}
            style={{ fontSize: '0.82rem' }}
          >
            <Sun size={15} style={{ color: '#f59e0b' }} />
            {t.solarPanels || 'Quyosh Panellari'}
          </span>

          <span 
            className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => handleNavClick('reviews')}
            style={{ fontSize: '0.82rem' }}
          >
            <Star size={15} />
            {t.reviews || 'Sharhlar'}
          </span>

          <span 
            className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
            style={{ fontSize: '0.82rem' }}
          >
            <Phone size={15} />
            {t.contact || 'Bizga Bog\'lanish'}
          </span>

          {user && (
            <span 
              className={`nav-link ${activeTab === 'my-orders' ? 'active' : ''}`}
              onClick={() => handleNavClick('my-orders')}
              style={{ fontSize: '0.82rem' }}
            >
              <ShoppingBag size={15} />
              {t.myOrders || 'Mening Ijaralarim'}
            </span>
          )}
        </nav>

        {/* Right-Side Controls: Compact Admin Panel, Lang Switcher, Theme, Sleek Unified User Profile Dropdown */}
        <div className="header-right desktop-only" style={{ gap: '0.5rem' }}>
          {/* Admin CRM Panel Button */}
          <span 
            onClick={() => handleNavClick('admin-dashboard')}
            style={{ 
              color: '#2563eb', 
              fontWeight: '800', 
              background: activeTab.startsWith('admin') ? '#dbeafe' : '#eff6ff', 
              border: '1px solid #bfdbfe', 
              padding: '4px 10px', 
              borderRadius: '16px', 
              fontSize: '0.78rem', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ShieldAlert size={14} />
            {t.adminCrm || 'Admin CRM'}
          </span>

          {/* Compact Dropdown Language Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              style={{
                background: 'var(--meco-bg)',
                color: 'var(--meco-text-main)',
                border: '1px solid var(--meco-border)',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{lang === 'UZ' ? '🇺🇿 UZ' : lang === 'RU' ? '🇷🇺 RU' : '🇬🇧 EN'}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--meco-text-muted)' }}>▼</span>
            </button>

            {langDropdownOpen && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                  onClick={() => setLangDropdownOpen(false)} 
                />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--meco-card-bg)',
                  border: '1px solid var(--meco-border)',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  padding: '6px',
                  zIndex: 100,
                  minWidth: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {[
                    { code: 'UZ', flag: '🇺🇿', name: "O'zbekcha" },
                    { code: 'RU', flag: '🇷🇺', name: 'Русский' },
                    { code: 'EN', flag: '🇬🇧', name: 'English' }
                  ].map(item => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code);
                        setLangDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '7px 10px',
                        border: 'none',
                        borderRadius: '10px',
                        background: lang === item.code ? 'rgba(37,99,235,0.1)' : 'transparent',
                        color: lang === item.code ? '#2563eb' : 'var(--meco-text-main)',
                        fontWeight: lang === item.code ? '800' : '600',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{item.flag}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Switcher (Dark/Light) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? (t.themeLight || 'Yorug\' rejim') : (t.themeDark || 'Tungi rejim')}
            style={{ 
              background: 'var(--meco-bg)', 
              border: '1px solid var(--meco-border)', 
              padding: '4px 8px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--meco-text-main)'
            }}
          >
            {theme === 'dark' ? <Sun size={14} style={{ color: '#f59e0b' }} /> : <Moon size={14} style={{ color: '#6366f1' }} />}
          </button>

          {/* UNIFIED USER PROFILE DROPDOWN - Round avatar only in header, status in dropdown */}
          {user ? (
            <div style={{ position: 'relative' }}>
              {(() => {
                const isApproved = Boolean(user.is_verified || user.isVerified || user.verificationStatus === 'APPROVED');
                const isRejected = isKycRejected;
                const isPending = !isApproved && !isRejected && (user.verificationStatus === 'PENDING' || user.verifications?.some(v => v.status === 'PENDING'));
                const dotColor = isApproved ? '#16a34a' : isRejected ? '#dc2626' : isPending ? '#f59e0b' : '#94a3b8';

                return (
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    title={user.fullName || user.phone}
                    style={{
                      position: 'relative',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '2px solid #2563eb',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'visible',
                      flexShrink: 0,
                      boxShadow: userDropdownOpen ? '0 0 0 3px rgba(37,99,235,0.2)' : 'var(--shadow-sm)',
                      transition: 'box-shadow 0.2s'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={17} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </div>
                    {/* Status dot */}
                    <span style={{
                      position: 'absolute', bottom: '0px', right: '0px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: dotColor,
                      border: '2px solid var(--meco-bg)',
                      display: 'block'
                    }} />
                  </button>
                );
              })()}

              {/* USER PROFILE DROPDOWN MENU */}
              {userDropdownOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                    onClick={() => setUserDropdownOpen(false)} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--meco-card-bg)',
                    border: '1px solid var(--meco-border)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                    padding: '12px',
                    zIndex: 100,
                    minWidth: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {/* Header info with status */}
                    {(() => {
                      const isApproved = Boolean(user.is_verified || user.isVerified || user.verificationStatus === 'APPROVED');
                      const isRejected = kycStatus === 'REJECTED' || user.verifications?.some(v => v.status === 'REJECTED');
                      const isPending = !isApproved && !isRejected && (user.verificationStatus === 'PENDING' || user.verifications?.some(v => v.status === 'PENDING'));
                      const statusBg = isApproved ? 'rgba(22, 163, 74, 0.12)' : isRejected ? 'rgba(220,38,38,0.1)' : isPending ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)';
                      const statusColor = isApproved ? '#16a34a' : isRejected ? '#dc2626' : isPending ? '#d97706' : '#94a3b8';
                      const statusLabel = isApproved ? 'Faol (KYC)' : isRejected ? 'Rad etilgan' : isPending ? 'Jarayonda' : 'Nofaol';
                      const StatusIcon = isApproved ? CheckCircle2 : isRejected ? ShieldAlert : isPending ? Clock : User;
                      return (
                        <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--meco-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #2563eb', flexShrink: 0 }}>
                            {user.avatar ? (
                              <img src={user.avatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={22} />
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--meco-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.fullName || 'Mijoz'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--meco-text-muted)', marginBottom: '4px' }}>{user.phone}</div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: statusBg, color: statusColor, borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '800' }}>
                              <StatusIcon size={10} />
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Change Avatar Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAvatarModal(true);
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: '10px',
                        background: 'var(--meco-bg)',
                        color: 'var(--meco-text-main)',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Camera size={15} style={{ color: '#2563eb' }} />
                      Profil Rasmini O'zgartirish
                    </button>

                    {/* KYC Verification Button */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenKYC();
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: '10px',
                      background: (user.is_verified || user.isVerified) ? '#f0fdf4' : isKycRejected ? '#fef2f2' : '#eff6ff',
                      color: (user.is_verified || user.isVerified) ? '#16a34a' : isKycRejected ? '#dc2626' : '#2563eb',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <UserCheck size={15} />
                      {(user.is_verified || user.isVerified) ? 'KYC Tasdiqlangan' : isKycRejected ? 'KYC Rad etilgan · Qayta yuborish' : 'KYC Hujjat Topshirish'}
                    </button>

                    {/* My Orders Button */}
                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('my-orders');
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        width: '100%', padding: '8px 10px', border: 'none',
                        borderRadius: '10px', background: 'transparent',
                        color: 'var(--meco-text-main)', fontWeight: '600',
                        fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      <ShoppingBag size={15} />
                      {lang === 'RU' ? 'Мои Аренды' : lang === 'EN' ? 'My Rentals' : 'Mening Ijaralarim'}
                    </button>

                    {/* Wishlist / Cart Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenWishlist) onOpenWishlist();
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        width: '100%', padding: '8px 10px', border: 'none',
                        borderRadius: '10px', background: 'transparent',
                        color: 'var(--meco-text-main)', fontWeight: '600',
                        fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      <Heart size={15} style={{ color: '#ef4444' }} />
                      {lang === 'RU' ? 'Моя Корзина' : lang === 'EN' ? 'My Wishlist' : 'Mening Savatim'}
                      {wishlistCount > 0 && (
                        <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: '800' }}>
                          {wishlistCount}
                        </span>
                      )}
                    </button>

                    <div style={{ borderTop: '1px solid var(--meco-border)', paddingTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 10px',
                          border: 'none',
                          borderRadius: '10px',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        <LogOut size={15} />
                        Tizimdan Chiqish
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth} style={{ borderRadius: '16px', padding: '4px 10px', fontWeight: '800', fontSize: '0.78rem' }}>
              <LogIn size={13} />
              {t.loginRegister || 'Kirish'}
            </button>
          )}
        </div>

        {/* Mobile Header Right Controls: Quick Lang Switcher & Hamburger Toggle */}
        <div className="mobile-only-controls" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
          {/* Quick Language Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', borderRadius: '14px', padding: '2px' }}>
            {['UZ', 'RU', 'EN'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? '#2563eb' : 'transparent',
                  color: lang === l ? '#ffffff' : 'var(--meco-text-muted)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '2px 5px',
                  fontSize: '0.68rem',
                  fontWeight: '700'
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Toggle Hamburger Button */}
          <button 
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              background: 'var(--meco-bg)',
              border: '1px solid var(--meco-border)',
              borderRadius: '8px',
              padding: '5px',
              color: 'var(--meco-text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu-dropdown">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <span 
              className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
              style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
            >
              <Home size={17} />
              {t.home || 'Asosiy'}
            </span>

            <span 
              className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => handleNavClick('catalog')}
              style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
            >
              <Layers size={17} />
              {t.catalog || 'Katalog'}
            </span>

            <span 
              className={`nav-link ${activeTab === 'solar-panels' ? 'active' : ''}`}
              onClick={() => handleNavClick('solar-panels')}
              style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
            >
              <Sun size={17} style={{ color: '#f59e0b' }} />
              {t.solarPanels || 'Quyosh Panellari'}
            </span>

            <span 
              className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => handleNavClick('reviews')}
              style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
            >
              <Star size={17} />
              {t.reviews || 'Sharhlar'}
            </span>

            <span 
              className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => handleNavClick('contact')}
              style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
            >
              <Phone size={17} />
              {t.contact || 'Bizga Bog\'lanish'}
            </span>

            {user && (
              <span 
                className={`nav-link ${activeTab === 'my-orders' ? 'active' : ''}`}
                onClick={() => handleNavClick('my-orders')}
                style={{ padding: '0.6rem 0', fontSize: '0.95rem' }}
              >
                <ShoppingBag size={17} />
                {t.myOrders || 'Mening Ijaralarim'}
              </span>
            )}

            <span 
              onClick={() => handleNavClick('admin-dashboard')}
              style={{ 
                color: '#2563eb', 
                fontWeight: '800', 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                padding: '8px 14px', 
                borderRadius: '12px', 
                fontSize: '0.88rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginTop: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <ShieldAlert size={17} />
              {t.adminCrm || 'Admin CRM Panel'}
            </span>
          </nav>

          <div style={{ borderTop: '1px solid var(--meco-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Theme Toggle Mobile */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ 
                background: 'var(--meco-bg)', 
                border: '1px solid var(--meco-border)', 
                padding: '8px 14px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: '600',
                color: 'var(--meco-text-main)'
              }}
            >
              <span>{theme === 'dark' ? 'Rejim: Tungi (Dark)' : 'Rejim: Yorug\' (Light)'}</span>
              {theme === 'dark' ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
            </button>

            {/* Auth / Profile Mobile */}
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--meco-bg)', padding: '8px 12px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.88rem' }}>
                    <User size={15} style={{ color: '#2563eb' }} />
                    <span>{user.fullName || user.phone}</span>
                  </div>
                  <span className="badge badge-info">{user.role}</span>
                </div>

                <button 
                  className="btn btn-sm"
                  onClick={() => { onOpenKYC(); setMobileMenuOpen(false); }}
                  style={{ 
                    background: (user.is_verified || user.isVerified) ? '#f0fdf4' : isKycRejected ? '#fef2f2' : '#eff6ff', 
                    border: `1px solid ${(user.is_verified || user.isVerified) ? '#bbf7d0' : isKycRejected ? '#fecaca' : '#bfdbfe'}`, 
                    color: (user.is_verified || user.isVerified) ? '#16a34a' : isKycRejected ? '#dc2626' : '#2563eb',
                    fontWeight: '800',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    justifyContent: 'center'
                  }}
                >
                  <UserCheck size={15} />
                  {(user.is_verified || user.isVerified) ? (t.kycVerified || 'KYC: Tasdiqlangan') : isKycRejected ? 'KYC rad etilgan · Qayta yuborish' : (t.kycUnverified || 'KYC Verification')}
                </button>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  style={{ borderRadius: '12px', padding: '8px', justifyContent: 'center' }}
                >
                  <LogOut size={15} /> {t.logout || 'Chiqish'}
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} 
                style={{ borderRadius: '12px', padding: '10px', fontWeight: '800', justifyContent: 'center', width: '100%' }}
              >
                <LogIn size={17} />
                {t.loginRegister || 'Kirish / Ro\'yxatdan o\'tish'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Profil Rasmini Tanlang</h3>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAvatarModal(false)}><X size={18} /></button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--meco-text-muted)', marginBottom: '1.25rem' }}>
              Tayyor avatars uslublaridan birini tanlang yoki kompyuterdan o'z rasmingizni yuklang.
            </p>

            {/* 5 Preset Avatars Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {DEFAULT_AVATARS.map((av) => (
                <div
                  key={av.id}
                  onClick={() => {
                    if (onUpdateAvatar) onUpdateAvatar(av.url);
                    setShowAvatarModal(false);
                  }}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: user?.avatar === av.url ? '3px solid #2563eb' : '2px solid var(--meco-border)',
                    boxShadow: user?.avatar === av.url ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title={av.label}
                >
                  <img src={av.url} alt={av.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            {/* Custom Image File Upload */}
            <div style={{ borderTop: '1px dashed var(--meco-border)', paddingTop: '1rem' }}>
              <label 
                htmlFor="custom-avatar-upload" 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', fontWeight: '700', gap: '8px', cursor: 'pointer' }}
              >
                <Upload size={16} /> O'z Rasmingizni Yuklash
              </label>
              <input 
                id="custom-avatar-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleCustomAvatarUpload} 
                style={{ display: 'none' }} 
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
