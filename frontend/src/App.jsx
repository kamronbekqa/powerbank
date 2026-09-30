import React, { useState, useEffect, useCallback } from 'react';
import { Send, Phone, Mail, Globe, Eye, Zap, CheckCircle, AlertTriangle, X, Info, Heart } from 'lucide-react';

const InstagramIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

import Navbar from './components/Navbar';
import HomeHero from './components/HomeHero';
import Catalog from './components/Catalog';
import SolarPanelsPage from './components/SolarPanelsPage';
import ReviewsPage from './components/ReviewsPage';
import ContactPage from './components/ContactPage';
import ProductViewModal from './components/ProductViewModal';
import ProductDetailModal from './components/ProductDetailModal';
import KYCModal from './components/KYCModal';
import AuthModal from './components/AuthModal';
import ClientOrders from './components/ClientOrders';
import AdminCRM from './components/AdminCRM';
import AdminLoginPage from './components/AdminLoginPage';
import WishlistPanel from './components/WishlistPanel';
import { translations } from './utils/translations';
import { apiUrl } from './utils/api';
import VoltMaxLogo from './components/VoltMaxLogo';


export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('voltmaxhub_active_tab') || localStorage.getItem('voltmaxhub_active_tab');
      if (saved) return saved;
    } catch (e) {}
    return 'home';
  });
  const [lang, setLang] = useState('UZ');
  const [theme, setTheme] = useState('light');

  const t = translations[lang] || translations.UZ;

  useEffect(() => {
    try {
      localStorage.setItem('voltmaxhub_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }, [theme]);

  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Authenticate user session on mount via httpOnly cookie (/api/auth/me)
  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            // If admin, ensure they land on admin-dashboard
            if (data.user.role === 'ADMIN') {
              setActiveTab(prev => prev.startsWith('admin') ? prev : 'admin-dashboard');
            }
          } else {
            setUser(null);
            // If on admin tab but not authenticated, redirect to home
            setActiveTab(prev => prev.startsWith('admin') ? 'home' : prev);
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setAuthChecking(false);
      }
    };
    verifySession();
  }, []);

  // ── Toast Notification System ────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  // ─────────────────────────────────────────────────────────────────────────────

  const [products, setProducts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [siteSettings, setSiteSettings] = useState({
    telegram: 'https://t.me/voltmaxhub_uz',
    instagram: 'https://instagram.com/voltmaxhub.uz',
    phone: '+998 71 200 50 50',
    email: 'info@voltmaxhub.uz',
    address: 'Toshkent sh., Chilonzor t., 10-mavze 4-uy',
    visitCount: 0
  });

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  // Wishlist / Cart state (persisted in localStorage)
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('voltmaxhub_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('voltmaxhub_wishlist', JSON.stringify(wishlist)); } catch {}
  }, [wishlist]);

  const handleAddToWishlist = (product, tag = 'favorite') => {
    setWishlist(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        // Toggle tag if same, or update tag
        return prev.map(i => i.id === product.id ? { ...i, tag } : i);
      }
      return [...prev, { ...product, tag, addedAt: new Date().toISOString() }];
    });
    showToast(
      tag === 'planned'
        ? (lang === 'RU' ? 'Добавлено в планы аренды!' : lang === 'EN' ? 'Added to rent plan!' : 'Ijara rejasiga qo\'shildi!')
        : (lang === 'RU' ? 'Добавлено в избранное!' : lang === 'EN' ? 'Added to favorites!' : 'Savatga qo\'shildi!'),
      'success'
    );
  };

  const handleRemoveFromWishlist = (productId) => {
    setWishlist(prev => prev.filter(i => i.id !== productId));
    showToast(lang === 'RU' ? 'Удалено из корзины' : lang === 'EN' ? 'Removed from wishlist' : 'Savatdan o\'chirildi', 'info');
  };

  const handleClearWishlist = () => {
    setWishlist([]);
    showToast(lang === 'RU' ? 'Корзина очищена' : lang === 'EN' ? 'Wishlist cleared' : 'Savat tozalandi', 'info');
  };

  // Fetch data from backend API Server & sync user with Database
  const loadData = () => {
    setDataLoading(true);
    fetch(apiUrl('/api/products'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(err => console.error('Products fetch error:', err))
      .finally(() => setDataLoading(false));

    fetch(apiUrl('/api/orders'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error('Orders fetch error:', err));

    fetch(apiUrl('/api/verifications'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVerifications(data);
      })
      .catch(err => console.error('Verifications fetch error:', err));

    fetch(apiUrl('/api/reviews'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(err => console.error('Reviews fetch error:', err));

    fetch(apiUrl('/api/contacts'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setContactMessages(data);
      })
      .catch(err => console.error('Contacts fetch error:', err));

    fetch(apiUrl('/api/users'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
          // Sync active client session with backend Database
          setUser(currentUser => {
            if (!currentUser || currentUser.role === 'ADMIN' || currentUser.isAdmin || currentUser.username === 'admin') {
              return currentUser;
            }
            const dbMatch = data.find(u => u.phone === currentUser.phone || u.id === currentUser.id);
            if (dbMatch) {
              const updated = {
                ...currentUser,
                ...dbMatch,
                isVerified: dbMatch.isVerified || currentUser.isVerified || false,
                passportSeries: dbMatch.passportSeries || currentUser.passportSeries || '',
                pinfl: dbMatch.pinfl || currentUser.pinfl || ''
              };
              return updated;
            }
            return currentUser;
          });
        }
      })
      .catch(err => console.error('Users fetch error:', err));

    fetch(apiUrl('/api/settings'))
      .then(res => res.json())
      .then(data => {
        if (data && data.id) setSiteSettings(data);
      })
      .catch(err => console.error('Settings fetch error:', err));
  };

  useEffect(() => {
    loadData();
    // Register visitor count once per browser session
    if (!sessionStorage.getItem('voltmaxhub_visited')) {
      sessionStorage.setItem('voltmaxhub_visited', 'true');
      fetch(apiUrl('/api/stats/visit'), { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.visitCount) {
            setSiteSettings(prev => ({ ...prev, visitCount: data.visitCount }));
          }
        })
        .catch(err => console.error('Visit stat increment error:', err));
    }
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (res.ok) {
        setSiteSettings(data);
        showToast(lang === 'RU' ? 'Настройки успешно сохранены!' : lang === 'EN' ? 'Settings saved successfully!' : 'Tizim sozlamalari muvaffaqiyatli saqlandi!');
      }
    } catch (err) {
      showToast('Sozlamalarni saqlashda xatolik: ' + err.message, 'error');
    }
  };


  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'ADMIN' || loggedInUser.isAdmin || loggedInUser.username === 'admin') {
      setActiveTab('admin-dashboard');
    }
    loadData();
    const name = loggedInUser.fullName || loggedInUser.phone;
    showToast(
      lang === 'RU' ? `Добро пожаловать, ${name}!` :
      lang === 'EN' ? `Welcome, ${name}!` :
      `Xush kelibsiz, ${name}!`
    );
  };

  const handleAdminLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    loadData();
    const name = loggedInUser.fullName || loggedInUser.phone;
    showToast(
      lang === 'RU' ? `Добро пожаловать в панель администратора, ${name}!` :
      lang === 'EN' ? `Welcome to Admin Panel, ${name}!` :
      `Admin paneliga xush kelibsiz, ${name}!`
    );
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setUser(null);
    setActiveTab('home');
    try { localStorage.setItem('voltmaxhub_active_tab', 'home'); } catch (e) {}
    showToast(
      lang === 'RU' ? 'Вы вышли из системы.' :
      lang === 'EN' ? 'You have been logged out.' :
      'Tizimdan chiqdingiz.',
      'info'
    );
  };

  const handleAddReview = async (reviewData) => {
    try {
      const res = await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Review submit error:', err);
    }
  };

  const handleSendMessage = async (contactData) => {
    try {
      const res = await fetch(apiUrl('/api/contacts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Contact send error:', err);
    }
  };

  const handleDeleteContactMessage = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/contacts/${id}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
        showToast(
          lang === 'RU' ? 'Сообщение удалено' :
          lang === 'EN' ? 'Message deleted' :
          'Murojaat o\'chirildi',
          'info'
        );
      }
    } catch (err) {
      console.error('Contact delete error:', err);
    }
  };

  const handleBookOrder = async (orderPayload) => {
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Buyurtma yaratishda xatolik');
      }

      if (orderPayload.type === 'BUY') {
        const providerEndpoint = orderPayload.paymentProvider === 'PAYME' ? apiUrl('/api/checkout/payme') : apiUrl('/api/checkout/click');
        const payRes = await fetch(providerEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.id, amount: orderPayload.totalAmount })
        });
        const payData = await payRes.json();
        
        setSelectedProduct(null);
        loadData();
        
        if (payData.redirectUrl) {
          showToast(`Sotib olish buyurtmasi yaratildi! ${orderPayload.paymentProvider} to'lov sahifasiga yo'naltirilasiz.`);
          window.open(payData.redirectUrl, '_blank');
        } else {
          showToast('Sotib olish buyurtmasi muvaffaqiyatli qabul qilindi!');
        }
      } else {
        setSelectedProduct(null);
        loadData();
        setActiveTab('my-orders');
        showToast('Ijara buyurtmangiz va KYC hujjatlaringiz qabul qilindi! Admin ko\'rib chiqqandan so\'ng tasdiqlanadi.');
      }
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    }
  };

  const handleUpdateUserAvatar = async (avatarUrl) => {
    try {
      const res = await fetch(apiUrl('/api/users/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user?.id, avatar: avatarUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(prev => ({ ...prev, ...data.user, avatar: avatarUrl }));
        } else {
          setUser(prev => ({ ...prev, avatar: avatarUrl }));
        }
        showToast('Profil rasmi muvaffaqiyatli yangilandi!');
      }
    } catch (err) {
      showToast('Profil rasmini saqlashda xatolik: ' + err.message, 'error');
    }
  };

  const handleSubmitKYC = async (formData) => {
    try {
      const passportFront = formData.get('passport_front') || null;
      const selfieUrl = formData.get('selfie_with_passport') || null;
      const passportSeries = String(formData.get('passport_series') || '').trim();
      const pinfl = String(formData.get('pinfl') || '').trim();
      if (!passportSeries || !/^\d{14}$/.test(pinfl) || !passportFront || !selfieUrl) {
        showToast('KYC uchun pasport seriyasi, 14 xonali PINFL, pasport rasmi va selfi majburiy.', 'error');
        return;
      }

      const payload = {
        userId: user?.id,
        phone: user?.phone,
        passportSeries,
        pinfl,
        passportFront,
        selfieUrl
      };

      const res = await fetch(apiUrl('/api/verifications'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowKYCModal(false);
        if (user) {
          const updatedUser = {
            ...user,
            isVerified: false,
            is_verified: false,
            verificationStatus: 'PENDING',
            passportSeries: payload.passportSeries,
            pinfl: payload.pinfl
          };
          setUser(updatedUser);
        }
        loadData();
        showToast(
          lang === 'RU' ? 'Документы отправлены! Ожидают проверки админом.' :
          lang === 'EN' ? 'KYC submitted! Pending admin review.' :
          'KYC hujjatlaringiz yuborildi! Admin ko\'rib chiqgach tasdiqlanadi.',
          'info'
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('KYC yuborilmadi: ' + (data.error || 'Server so‘rovni qabul qilmadi.'), 'error');
      }
    } catch (err) {
      showToast('KYC yuborishda xatolik: ' + err.message, 'error');
    }
  };

  const handleToggleUserKYC = async (userId, targetStatus) => {
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/kyc-status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isVerified: targetStatus })
      });
      if (res.ok) {
        loadData();
        showToast(
          targetStatus ? 'Foydalanuvchi KYC holati tasdiqlandi!' : 'Foydalanuvchi KYC tasdiqlanishi bekor qilindi.',
          targetStatus ? 'success' : 'warning'
        );
      }
    } catch (err) {
      showToast('KYC holatini o\'zgartirishda xatolik: ' + err.message, 'error');
    }
  };

  const handleApproveKYC = async (kycId) => {
    try {
      const res = await fetch(apiUrl(`/api/verifications/${kycId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'KYC tasdiqlanmadi');
      loadData();
      showToast('KYC Hujjati muvaffaqiyatli tasdiqlandi!');
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    }
  };

  const handleRejectKYC = async (kycId, reason) => {
    try {
      const res = await fetch(apiUrl(`/api/verifications/${kycId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'KYC rad etilmadi');
      loadData();
      showToast('KYC Hujjati rad etildi.', 'warning');
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      showToast('Statusni o\'zgartirishda xatolik: ' + err.message, 'error');
    }
  };

  const handleAddProduct = async (newProduct) => {
    try {
      const res = await fetch(apiUrl('/api/products'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        loadData();
        showToast('Yangi generator mahsuloti bazaga qo\'shildi!');
      } else {
        const error = await res.json().catch(() => ({}));
        showToast(error.error || 'Mahsulot qo\'shilmadi.', 'error');
      }
    } catch (err) {
      showToast('Mahsulot qo\'shishda xatolik: ' + err.message, 'error');
    }
  };

  const handleEditProduct = async (productId, updatedData) => {
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        loadData();
        showToast('Mahsulot ma\'lumotlari muvaffaqiyatli yangilandi!');
      } else {
        const error = await res.json().catch(() => ({}));
        showToast(error.error || 'Mahsulot yangilanmadi.', 'error');
      }
    } catch (err) {
      showToast('Mahsulotni tahrirlashda xatolik: ' + err.message, 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
        showToast('Mahsulot bazadan o\'chirildi.', 'warning');
      } else {
        const error = await res.json().catch(() => ({}));
        showToast(error.error || 'Mahsulot o\'chirilmadi.', 'error');
      }
    } catch (err) {
      showToast('Mahsulotni o\'chirishda xatolik: ' + err.message, 'error');
    }
  };

  // Show a minimal loading state while verifying session
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--meco-bg)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <VoltMaxLogo size="large" />
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(0,240,255,0.2)', borderTop: '3px solid #00F0FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginTop: '8px' }} />
          <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.5px' }}>VOLTMAXHUB yuklanyapti...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user}
        onOpenKYC={() => setShowKYCModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onUpdateAvatar={handleUpdateUserAvatar}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        t={t}
        wishlistCount={wishlist.length}
        onOpenWishlist={() => setShowWishlist(true)}
      />

      <main style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <HomeHero 
            onGoCatalog={() => setActiveTab('catalog')} 
            onGoContact={() => setActiveTab('contact')}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'catalog' && (
          <Catalog 
            products={products} 
            loading={dataLoading}
            onSelectProduct={(product) => setSelectedProduct(product)} 
            onViewProduct={(product) => setViewingProduct(product)}
            onAddToWishlist={handleAddToWishlist}
            wishlist={wishlist}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'solar-panels' && (
          <SolarPanelsPage 
            products={products} 
            onSelectProduct={(product) => setSelectedProduct(product)} 
            onViewProduct={(product) => setViewingProduct(product)}
            onAddToWishlist={handleAddToWishlist}
            wishlist={wishlist}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewsPage 
            reviews={reviews}
            onAddReview={handleAddReview}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'contact' && (
          <ContactPage 
            onSendMessage={handleSendMessage}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'my-orders' && (
          <ClientOrders 
            orders={orders.filter(o => o.user?.phone === user?.phone || o.user_phone === user?.phone)} 
            t={t}
            lang={lang}
          />
        )}

        {activeTab.startsWith('admin') && (
          user?.role === 'ADMIN' ? (
            <AdminCRM 
              verifications={verifications}
              orders={orders}
              products={products}
              users={users}
              contactMessages={contactMessages}
              siteSettings={siteSettings}
              onSaveSettings={handleSaveSettings}
              onApproveKYC={handleApproveKYC}
              onRejectKYC={handleRejectKYC}
              onToggleUserKYC={handleToggleUserKYC}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onDeleteContactMessage={handleDeleteContactMessage}
              onViewProductAsClient={(product) => setViewingProduct(product)}
              onRefreshData={loadData}
              t={t}
              lang={lang}
              theme={theme}
            />
          ) : (
            <AdminLoginPage
              onLoginSuccess={handleAdminLoginSuccess}
              onGoBack={() => setActiveTab('home')}
              lang={lang}
              t={t}
            />
          )
        )}
      </main>

      {/* Dynamic Responsive Footer with Social Media & Contact Links */}
      <footer style={{ background: '#0b0f19', color: '#94a3b8', padding: '2.5rem 2rem 1.5rem 2rem', borderTop: '1px solid #1e293b', marginTop: 'auto' }}>
        <div className="container footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <VoltMaxLogo size="medium" />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
              {lang === 'RU' ? "Платформа №1 в Узбекистане по продаже и аренде солнечных генераторов." : lang === 'EN' ? "N1 Solar Generators Sales & Rental Platform in Uzbekistan." : "O'zbekiston bo'yicha N1 Quyosh Generatorlari Sotuv va Ijara Platformasi."}
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem' }}>
              {lang === 'RU' ? "Навигация" : lang === 'EN' ? "Navigation" : "Bo'limlar"}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
              <span style={{ cursor: 'pointer', color: activeTab === 'home' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('home')}>{t.home || 'Asosiy'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'catalog' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('catalog')}>{t.catalog || 'Katalog'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'solar-panels' ? '#f59e0b' : '#94a3b8' }} onClick={() => setActiveTab('solar-panels')}>{t.solarPanels || 'Quyosh Panellari'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'reviews' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('reviews')}>{t.reviews || 'Sharhlar'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'contact' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('contact')}>{t.contact || 'Bizga Bog\'lanish'}</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem' }}>
              {lang === 'RU' ? "Контакты и Соцсети" : lang === 'EN' ? "Contact & Socials" : "Aloqa va Ijtimoiy Tarmoqlar"}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
              <a href={`tel:${siteSettings?.phone || '+998712005050'}`} style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                <Phone size={16} /> {siteSettings?.phone || '+998 71 200 50 50'}
              </a>
              <a href={siteSettings?.telegram || 'https://t.me/voltmaxhub_uz'} target="_blank" rel="noopener noreferrer" style={{ color: '#00F0FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <Send size={16} /> Telegram: {siteSettings?.telegram?.includes('t.me/') ? '@' + siteSettings.telegram.split('t.me/')[1] : siteSettings?.telegram}
              </a>
              <a href={siteSettings?.instagram || 'https://instagram.com/voltmaxhub.uz'} target="_blank" rel="noopener noreferrer" style={{ color: '#f472b6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <InstagramIcon size={16} /> Instagram: {siteSettings?.instagram?.includes('instagram.com/') ? '@' + siteSettings.instagram.split('instagram.com/')[1] : siteSettings?.instagram}
              </a>
              <a href={`mailto:${siteSettings?.email || 'info@voltmaxhub.uz'}`} style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} /> {siteSettings?.email || 'info@voltmaxhub.uz'}
              </a>
            </div>
          </div>
        </div>

        <div className="container" style={{ borderTop: '1px solid #1e293b', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>© 2026 VOLTMAXHUB Inc. {lang === 'RU' ? "Все права защищены." : lang === 'EN' ? "All rights reserved." : "Barcha huquqlar himoyalangan."}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>
            <Eye size={14} style={{ color: '#60a5fa' }} />
            <span>Tashriflar soni: <strong style={{ color: '#fff' }}>{siteSettings?.visitCount || 1420}</strong></span>
          </div>
        </div>
      </footer>


      {/* Product Details & Appliance Runtime Usage Modal */}
      {viewingProduct && (
        <ProductViewModal 
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onBuy={(p) => {
            setViewingProduct(null);
            setSelectedProduct({ ...p, selectedMode: 'BUY' });
          }}
          onRent={(p) => {
            setViewingProduct(null);
            setSelectedProduct({ ...p, selectedMode: 'RENT' });
          }}
          t={t}
          lang={lang}
        />
      )}

      {/* Order Modal (Option A: Direct Buy / Option B: Daily Rent) */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onBookOrder={handleBookOrder}
          user={user}
          siteSettings={siteSettings}
          t={t}
          lang={lang}
        />
      )}

      {/* Standalone KYC Modal */}
      {showKYCModal && (
        <KYCModal 
          user={user} 
          onClose={() => setShowKYCModal(false)} 
          onSubmitKYC={handleSubmitKYC}
          t={t}
        />
      )}

      {/* Auth Modal (Kirish va Ro'yxatdan o'tish) */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
          lang={lang}
          t={t}
        />
      )}

      {/* Wishlist / Cart Slide-in Panel */}
      {showWishlist && (
        <>
          <div
            onClick={() => setShowWishlist(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(480px, 100vw)',
            background: 'var(--meco-card-bg)',
            borderLeft: '1px solid var(--meco-border)',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
            zIndex: 9999, overflowY: 'auto',
            animation: 'slideInRight 0.3s ease'
          }}>
            {/* Panel Header */}
            <div style={{ position: 'sticky', top: 0, background: 'var(--meco-card-bg)', borderBottom: '1px solid var(--meco-border)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={20} style={{ color: '#ef4444', fill: wishlist.length > 0 ? '#ef4444' : 'none' }} />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--meco-text-main)' }}>
                  {lang === 'RU' ? 'Моя Корзина' : lang === 'EN' ? 'My Wishlist' : 'Mening Savatim'}
                </h2>
                {wishlist.length > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '800' }}>{wishlist.length}</span>
                )}
              </div>
              <button
                onClick={() => setShowWishlist(false)}
                style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--meco-text-main)' }}
              >
                <X size={17} />
              </button>
            </div>
            <WishlistPanel
              wishlist={wishlist}
              onRemove={handleRemoveFromWishlist}
              onClear={handleClearWishlist}
              onRent={(product) => {
                setShowWishlist(false);
                setSelectedProduct({ ...product, selectedMode: 'RENT' });
              }}
              onBuy={(product) => {
                setShowWishlist(false);
                setSelectedProduct({ ...product, selectedMode: 'BUY' });
              }}
              t={t}
              lang={lang}
            />
          </div>
          <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </>
      )}

      {/* ── Toast Notification Container ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 99999, pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const colors = {
            success: { bg: '#0f172a', border: '#22c55e', icon: '#22c55e', iconBg: 'rgba(34,197,94,0.15)' },
            error:   { bg: '#0f172a', border: '#ef4444', icon: '#ef4444', iconBg: 'rgba(239,68,68,0.15)' },
            warning: { bg: '#0f172a', border: '#f59e0b', icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)' },
            info:    { bg: '#0f172a', border: '#3b82f6', icon: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)' },
          }[toast.type] || { bg: '#0f172a', border: '#22c55e', icon: '#22c55e', iconBg: 'rgba(34,197,94,0.15)' };

          const IconComp = toast.type === 'error' ? AlertTriangle : toast.type === 'warning' ? AlertTriangle : toast.type === 'info' ? Info : CheckCircle;

          return (
            <div key={toast.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: '14px', padding: '14px 16px', minWidth: '280px', maxWidth: '380px',
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}20`,
              pointerEvents: 'all', animation: 'toastIn 0.3s ease',
              backdropFilter: 'blur(12px)'
            }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: colors.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={18} color={colors.icon} />
              </div>
              <span style={{ fontSize: '0.87rem', fontWeight: '600', color: '#e2e8f0', flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px', flexShrink: 0, pointerEvents: 'all' }}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
