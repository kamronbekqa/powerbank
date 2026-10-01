import React, { useState, useEffect, useCallback } from 'react';
import { Send, Phone, Mail, Globe, Zap, CheckCircle, AlertTriangle, X, Info, Heart, ShoppingCart } from 'lucide-react';
import CartPanel from './components/CartPanel';

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
import GeneratorRentalPage from './components/GeneratorRentalPage';
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
import { apiUrl, apiFetch } from './utils/api';
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
        const data0 = await apiFetch('/api/auth/me').catch(() => ({ success: false }));
        {
          const data = data0;
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
  const [showCart, setShowCart] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(null);
  // Cart: guests persist in localStorage, signed-in users in the DB (CartItem).
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('voltmaxhub_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

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

  // Persist the guest cart locally; for a signed-in user the server is the
  // source of truth, so we skip local writes to avoid fighting it.
  useEffect(() => {
    if (user) return;
    try { localStorage.setItem('voltmaxhub_cart', JSON.stringify(cart)); } catch {}
  }, [cart, user]);

  // On login, hydrate the cart and wishlist from the server.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const remote = await apiFetch('/api/cart');
        if (Array.isArray(remote) && remote.length) {
          setCart(remote.map(i => ({ id: i.id, productId: i.productId, product: i.product, quantity: i.quantity, type: i.type })));
        } else {
          // Nothing saved server-side: promote the guest cart.
          for (const item of cart) {
            await apiFetch('/api/cart', { method: 'POST', body: { productId: item.productId, quantity: item.quantity, type: item.type } });
          }
        }
        const remoteWish = await apiFetch('/api/wishlist');
        if (Array.isArray(remoteWish)) {
          setWishlist(remoteWish.map(i => ({ ...i.product, tag: 'favorite', wishlistId: i.id })));
        }
      } catch (err) {
        console.error('Cart/wishlist hydrate error:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Wishlist is for signed-in users only (task 6): guests are sent to login.
  const handleAddToWishlist = (product, tag = 'favorite') => {
    if (!user) {
      setLoginPrompt({ product, action: 'wishlist' });
      return;
    }
    setWishlist(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        // Toggle tag if same, or update tag
        return prev.map(i => i.id === product.id ? { ...i, tag } : i);
      }
      return [...prev, { ...product, tag, addedAt: new Date().toISOString() }];
    });
    apiFetch('/api/wishlist', { method: 'POST', body: { productId: product.id } })
      .catch(err => console.error('Wishlist sync error:', err));
    showToast(
      tag === 'planned'
        ? (lang === 'RU' ? 'Добавлено в планы аренды!' : lang === 'EN' ? 'Added to rent plan!' : 'Ijara rejasiga qo\'shildi!')
        : (lang === 'RU' ? 'Добавлено в избранное!' : lang === 'EN' ? 'Added to favorites!' : 'Yoqtirganlarga qo\'shildi!'),
      'success'
    );
  };

  const handleRemoveFromWishlist = (productId) => {
    setWishlist(prev => prev.filter(i => i.id !== productId));
    apiFetch(`/api/wishlist/${productId}`, { method: 'DELETE' })
      .catch(err => console.error('Wishlist remove error:', err));
    showToast(lang === 'RU' ? 'Удалено из избранного' : lang === 'EN' ? 'Removed from wishlist' : 'Yoqtirganlardan o\'chirildi', 'info');
  };

  const handleClearWishlist = () => {
    for (const item of wishlist) {
      apiFetch(`/api/wishlist/${item.id}`, { method: 'DELETE' }).catch(() => {});
    }
    setWishlist([]);
    showToast(lang === 'RU' ? 'Избранное очищено' : lang === 'EN' ? 'Wishlist cleared' : 'Yoqtirganlar tozalandi', 'info');
  };

  // ── Cart ────────────────────────────────────────────────────────────────
  const handleAddToCart = (product, type = 'RENT') => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.type === type);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: (Number(next[idx].quantity) || 1) + 1 };
        return next;
      }
      return [...prev, {
        id: product.id, productId: product.id, product,
        quantity: 1, type, addedAt: new Date().toISOString()
      }];
    });
    if (user) {
      apiFetch('/api/cart', { method: 'POST', body: { productId: product.id, quantity: 1, type } })
        .catch(err => console.error('Cart sync error:', err));
    }
    showToast(
      lang === 'RU' ? 'Добавлено в корзину!' : lang === 'EN' ? 'Added to cart!' : 'Savatga qo\'shildi!',
      'success'
    );
    setShowCart(true);
  };

  const handleCartQuantity = async (item, quantity) => {
    setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity } : i));
    if (user) {
      try { await apiFetch(`/api/cart/${item.id}`, { method: 'PATCH', body: { quantity } }); }
      catch (err) { console.error('Cart qty error:', err); }
    }
  };

  const handleRemoveFromCart = async (item) => {
    if (item === null) {
      // Clear the whole cart.
      for (const i of cart) {
        if (user) apiFetch(`/api/cart/${i.id}`, { method: 'DELETE' }).catch(() => {});
      }
      setCart([]);
      showToast(lang === 'RU' ? 'Корзина очищена' : lang === 'EN' ? 'Cart cleared' : 'Savat tozalandi', 'info');
      return;
    }
    setCart(prev => prev.filter(i => i.id !== item.id));
    if (user) {
      apiFetch(`/api/cart/${item.id}`, { method: 'DELETE' }).catch(err => console.error('Cart remove error:', err));
    }
    showToast(lang === 'RU' ? 'Удалено' : lang === 'EN' ? 'Removed' : 'O\'chirildi', 'info');
  };

  const handleCartCheckout = () => {
    setShowCart(false);
    setActiveTab('catalog');
    showToast(
      lang === 'RU' ? 'Выберите товар для оформления' : lang === 'EN' ? 'Pick a product to place your order' : 'Buyurtma berish uchun mahsulotni tanlang',
      'info'
    );
  };

  // Fetch data from backend API Server & sync user with Database
  const loadData = () => {
    setDataLoading(true);
    apiFetch('/api/products')
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(err => console.error('Products fetch error:', err))
      .finally(() => setDataLoading(false));

    apiFetch('/api/orders')
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error('Orders fetch error:', err));

    apiFetch('/api/verifications')
      .then(data => {
        if (Array.isArray(data)) setVerifications(data);
      })
      .catch(err => console.error('Verifications fetch error:', err));

    apiFetch('/api/reviews')
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(err => console.error('Reviews fetch error:', err));

    apiFetch('/api/contacts')
      .then(data => {
        if (Array.isArray(data)) setContactMessages(data);
      })
      .catch(err => console.error('Contacts fetch error:', err));

    apiFetch('/api/users')
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

    // Admins additionally need admin-only fields (visitCount); anonymous
    // visitors only ever receive the public subset.
    const settingsUrl = user?.role === 'ADMIN' ? '/api/settings' : '/api/settings/public';
    apiFetch(settingsUrl)
      .then(data => { if (data) setSiteSettings(prev => ({ ...prev, ...data })); })
      .catch(() => {});
  };

  // Re-fetch when the role changes so an admin picks up the admin-only fields
  // (visitCount) that anonymous visitors never receive.
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Count one visit per browser session (the project's existing rule).
  useEffect(() => {
    if (sessionStorage.getItem('voltmaxhub_visited')) return;
    sessionStorage.setItem('voltmaxhub_visited', 'true');
    apiFetch('/api/stats/visit', { method: 'POST' })
      .then(data => {
        if (data && typeof data.visitCount === 'number') {
          setSiteSettings(prev => ({ ...prev, visitCount: data.visitCount }));
        }
      })
      .catch(err => console.error('Visit stat increment error:', err));
  }, []);

  // Each settings card saves itself through its own endpoint and passes the
  // authoritative server state back, so the UI never drifts from the database.
  const handleSaveSettings = (serverState) => {
    if (serverState && typeof serverState === 'object') {
      setSiteSettings(prev => ({ ...prev, ...serverState }));
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
      await apiFetch('/api/auth/logout', { method: 'POST' });
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
      await apiFetch('/api/reviews', {
  method: 'POST',
  body: reviewData
});
      loadData();
    } catch (err) {
      console.error('Review submit error:', err);
    }
  };

  const handleSendMessage = async (contactData) => {
    try {
      await apiFetch('/api/contacts', {
  method: 'POST',
  body: contactData
});
      loadData();
    } catch (err) {
      console.error('Contact send error:', err);
    }
  };

  const handleDeleteContactMessage = async (id) => {
    try {
      await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
      loadData();
      showToast(
        lang === 'RU' ? 'Сообщение удалено' :
        lang === 'EN' ? 'Message deleted' :
        'Murojaat o\'chirildi',
        'info'
      );
    } catch (err) {
      console.error('Contact delete error:', err);
    }
  };

  const handleBookOrder = async (orderPayload) => {
    try {
      const data = await apiFetch('/api/orders', {
        method: 'POST',
        body: orderPayload
      });

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
      const data = await apiFetch('/api/users/profile', {
        method: 'PATCH',
        body: { avatar: avatarUrl }
      });
      if (data.user) {
        setUser(prev => ({ ...prev, ...data.user, avatar: avatarUrl }));
      } else {
        setUser(prev => ({ ...prev, avatar: avatarUrl }));
      }
      showToast('Profil rasmi muvaffaqiyatli yangilandi!');
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

      await apiFetch('/api/verifications', {
        method: 'POST',
        body: payload
      });
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
    } catch (err) {
      showToast('KYC yuborishda xatolik: ' + err.message, 'error');
    }
  };

  const handleToggleUserKYC = async (userId, targetStatus) => {
    try {
      await apiFetch(`/api/users/${userId}/kyc-status`, {
  method: 'PATCH',
  body: { isVerified: targetStatus }
});
      loadData();
      showToast(
        targetStatus ? 'Foydalanuvchi KYC holati tasdiqlandi!' : 'Foydalanuvchi KYC tasdiqlanishi bekor qilindi.',
        targetStatus ? 'success' : 'warning'
      );
    } catch (err) {
      showToast('KYC holatini o\'zgartirishda xatolik: ' + err.message, 'error');
    }
  };

  const handleApproveKYC = async (kycId) => {
    try {
      await apiFetch(`/api/verifications/${kycId}`, {
  method: 'PATCH',
  body: { status: 'APPROVED' }
});
      loadData();
      showToast('KYC Hujjati muvaffaqiyatli tasdiqlandi!');
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    }
  };

  const handleRejectKYC = async (kycId, reason) => {
    try {
      await apiFetch(`/api/verifications/${kycId}`, {
  method: 'PATCH',
  body: { status: 'REJECTED', rejectionReason: reason }
});
      loadData();
      showToast('KYC Hujjati rad etildi.', 'warning');
    } catch (err) {
      showToast('Xatolik: ' + err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
  method: 'PATCH',
  body: { status: newStatus }
});
      loadData();
    } catch (err) {
      showToast('Statusni o\'zgartirishda xatolik: ' + err.message, 'error');
    }
  };

  const handleAddProduct = async (newProduct) => {
    try {
      await apiFetch('/api/products', {
  method: 'POST',
  body: newProduct
});
      loadData();
      showToast('Yangi generator mahsuloti bazaga qo\'shildi!');
    } catch (err) {
      showToast('Mahsulot qo\'shishda xatolik: ' + err.message, 'error');
    }
  };

  const handleEditProduct = async (productId, updatedData) => {
    try {
      await apiFetch(`/api/products/${productId}`, {
  method: 'PATCH',
  body: updatedData
});
      loadData();
      showToast('Mahsulot ma\'lumotlari muvaffaqiyatli yangilandi!');
    } catch (err) {
      showToast('Mahsulotni tahrirlashda xatolik: ' + err.message, 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
      loadData();
      showToast('Mahsulot bazadan o\'chirildi.', 'warning');
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
        onOpenCart={() => setShowCart(true)}
        cartCount={cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
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
            onAddToCart={handleAddToCart}
            wishlist={wishlist}
            t={t}
            lang={lang}
          />
        )}

        {activeTab === 'solar-panels' && (
          <GeneratorRentalPage 
            products={products} 
            onSelectProduct={(product) => setSelectedProduct(product)} 
            onViewProduct={(product) => setViewingProduct(product)}
            onAddToWishlist={handleAddToWishlist}
            onAddToCart={handleAddToCart}
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
              {lang === 'RU' ? "Платформа аренды тихих и инверторных генераторов в Узбекистане." : lang === 'EN' ? "Quiet & inverter generator rental platform in Uzbekistan." : "O'zbekiston bo'yicha shovqinsiz va inverterli generatorlar ijarasi platformasi."}
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '700', marginBottom: '1rem' }}>
              {lang === 'RU' ? "Навигация" : lang === 'EN' ? "Navigation" : "Bo'limlar"}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
              <span style={{ cursor: 'pointer', color: activeTab === 'home' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('home')}>{t.home || 'Asosiy'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'catalog' ? '#00F0FF' : '#94a3b8' }} onClick={() => setActiveTab('catalog')}>{t.catalog || 'Katalog'}</span>
              <span style={{ cursor: 'pointer', color: activeTab === 'solar-panels' ? '#f59e0b' : '#94a3b8' }} onClick={() => setActiveTab('solar-panels')}>{t.solarPanels || 'Generatorlar'}</span>
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

        <div className="container" style={{ borderTop: '1px solid #1e293b', paddingTop: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>© 2026 VOLTMAXHUB Inc. {lang === 'RU' ? "Все права защищены." : lang === 'EN' ? "All rights reserved." : "Barcha huquqlar himoyalangan."}</div>
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

      {/* Cart Slide-in Panel */}
      <CartPanel
        open={showCart}
        onClose={() => setShowCart(false)}
        items={cart}
        onUpdateQuantity={handleCartQuantity}
        onRemove={handleRemoveFromCart}
        onCheckout={handleCartCheckout}
        t={t}
        lang={lang}
      />

      {/* Guest wishlist -> login prompt */}
      {loginPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '1.5rem' }}>
          <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '18px', padding: '1.75rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: '800' }}>
                  {lang === 'RU' ? 'Войдите в аккаунт' : lang === 'EN' ? 'Please sign in' : 'Tizimga kiring'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--meco-text-sub)', lineHeight: 1.55 }}>
                  {lang === 'RU'
                    ? 'Избранное доступно только зарегистрированным пользователям.'
                    : lang === 'EN'
                    ? 'Wishlist is only available to signed-in users.'
                    : 'Yoqtirganlar faqat tizimga kiringan foydalanuvchilar uchun mavjud.'}
                </p>
              </div>
              <button type="button" onClick={() => setLoginPrompt(null)} aria-label="Close"
                style={{ background: 'transparent', border: 'none', color: 'var(--meco-text-sub)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
              <button type="button" onClick={() => { setLoginPrompt(null); setShowAuthModal(true); }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#0f172a', fontWeight: '800', cursor: 'pointer' }}>
                {lang === 'RU' ? 'Войти' : lang === 'EN' ? 'Sign in' : 'Kirish'}
              </button>
              <button type="button" onClick={() => { setLoginPrompt(null); setShowAuthModal(true); }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--meco-border)', background: 'transparent', color: 'var(--meco-text-main)', fontWeight: '700', cursor: 'pointer' }}>
                {lang === 'RU' ? 'Регистрация' : lang === 'EN' ? 'Register' : 'Ro\'yxatdan o\'tish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Slide-in Panel */}
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
