import React, { useState } from 'react';
import { 
  Users, ShieldAlert, ShoppingBag, FileText, CheckCircle, XCircle, 
  Eye, Download, Plus, Layers, DollarSign, Clock, AlertTriangle, RefreshCw,
  Image as ImageIcon, Trash2, UploadCloud, Edit3, BarChart2, Check, ExternalLink,
  Zap, BatteryCharging, ShoppingCart, Calendar, ArrowLeft, Settings, Globe, Moon, Sun,
  Building, Phone, Mail, MapPin, Save, Send, MessageSquare,
  Smartphone, Laptop, Tv, Fan, Home, Coffee, Car, Flame
} from 'lucide-react';
import { apiUrl, apiFetch } from '../utils/api';

export default function AdminCRM({ 
  verifications = [], 
  orders = [], 
  products = [], 
  users = [],
  contactMessages = [],
  siteSettings = {},
  onSaveSettings,
  onApproveKYC, 
  onRejectKYC, 
  onToggleUserKYC,
  onUpdateOrderStatus, 
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onDeleteContactMessage,
  onViewProductAsClient,
  onRefreshData,
  t = {},
  lang = 'UZ',
  theme = 'light'
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [companyPhone, setCompanyPhone] = useState(siteSettings?.phone || '+998 71 200 50 50');
  const [companyEmail, setCompanyEmail] = useState(siteSettings?.email || 'info@voltmaxhub.uz');
  const [companyAddress, setCompanyAddress] = useState(siteSettings?.address || 'Toshkent sh., Chilonzor t., 10-mavze 4-uy');
  const [companyTelegram, setCompanyTelegram] = useState(siteSettings?.telegram || 'https://t.me/voltmaxhub_uz');
  const [companyInstagram, setCompanyInstagram] = useState(siteSettings?.instagram || 'https://instagram.com/voltmaxhub');
  const [companyName, setCompanyName] = useState(siteSettings?.companyName || 'VOLTMAXHUB');
  const [visitCountInput, setVisitCountInput] = useState(siteSettings?.visitCount !== undefined ? siteSettings.visitCount : 1420);
  const [botChatId, setBotChatId] = useState(siteSettings?.botChatId || '');
  const [botToken, setBotToken] = useState('');
  const [penaltyRate, setPenaltyRate] = useState(siteSettings?.penaltyRate !== undefined ? siteSettings.penaltyRate : 0.5);
  const [legalNoticeDays, setLegalNoticeDays] = useState(siteSettings?.legalNoticeDays !== undefined ? siteSettings.legalNoticeDays : 3);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState('');
  const [botValidationMsg, setBotValidationMsg] = useState('');

  // Per-block loading + message state so each card saves independently.
  const [busyMap, setBusyMap] = useState({});
  const [msgMap, setMsgMap] = useState({});
  const [refreshToken, setRefreshToken] = useState(0);

  // Inline status line for a settings card.
  const BlockStatus = ({ block }) => {
    const m = msgMap[block];
    if (!m) return null;
    return (
      <div
        role="status"
        style={{
          marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px',
          fontSize: '0.82rem', fontWeight: 700,
          background: m.type === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: m.type === 'ok' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${m.type === 'ok' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`
        }}
      >
        {m.type === 'ok' ? '✅ ' : '⚠️ '}{m.text}
      </div>
    );
  };

  // ── Per-block save helpers ───────────────────────────────────────
  // Each block posts only its own fields to its own endpoint, then shows a
  // loading -> success/error state. apiFetch attaches the session cookie and CSRF token.
  const saveBlock = async (endpoint, payload, busyKey, msgKey) => {
    setBusyMap(b => ({ ...b, [busyKey]: true }));
    setMsgMap(m => ({ ...m, [msgKey]: null }));
    try {
      const data = await apiFetch(endpoint, { method: 'PATCH', body: payload });
      setMsgMap(m => ({ ...m, [msgKey]: { type: 'ok', text: data?.message || 'Saqlandi.' } }));
      if (data?.settings && onSaveSettings) {
        onSaveSettings(data.settings);
        setRefreshToken(t => t + 1);
      }
      return true;
    } catch (err) {
      setMsgMap(m => ({ ...m, [msgKey]: { type: 'err', text: err.message || 'Saqlashda xatolik yuz berdi.' } }));
      return false;
    } finally {
      setBusyMap(b => ({ ...b, [busyKey]: false }));
    }
  };

  const saveFooter = () => saveBlock('/api/settings/footer', {
    companyName, phone: companyPhone, email: companyEmail,
    telegram: companyTelegram, instagram: companyInstagram, address: companyAddress
  }, 'footer', 'footer');

  const saveVisitor = () => saveBlock('/api/settings/visitor',
    { visitCount: visitCountInput }, 'visitor', 'visitor');

  const saveDelivery = () => saveBlock('/api/settings/delivery', {
    deliveryStartHour, deliveryEndHour, deliverySlotLabel, minRentalDays, maxRentalDays
  }, 'delivery', 'delivery');

  const saveTelegram = () => saveBlock('/api/settings/telegram', {
    botChatId, penaltyRate, legalNoticeDays,
    ...(botToken.trim() ? { botToken: botToken.trim() } : {})
  }, 'telegram', 'telegram').then(ok => { if (ok) setBotToken(''); });

  const saveMyId = () => saveBlock('/api/settings/myid', {
    myIdEnabled, myIdClientId,
    ...(myIdClientSecret.trim() ? { myIdClientSecret: myIdClientSecret.trim() } : {})
  }, 'myid', 'myid').then(ok => { if (ok) setMyIdClientSecret(''); });

  const validateBotSettings = async () => {
    if (!botToken.trim() || !botChatId.trim()) {
      setBotValidationMsg('❌ Bot token va Chat ID maydonlarini to\'ldiring.');
      return;
    }
    setTelegramBusy(true);
    setBotValidationMsg('');
    try {
      const data = await apiFetch('/api/settings/validate-telegram', {
        method: 'POST',
        body: { botToken: botToken.trim(), botChatId: botChatId.trim() }
      });
      setBotValidationMsg(`✅ ${data.message}${data.botInfo?.username ? ' Bot: @' + data.botInfo.username : ''}`);
    } catch (err) {
      setBotValidationMsg(`❌ ${err.message}`);
    } finally {
      setTelegramBusy(false);
    }
  };

  const refreshTelegramStatus = async () => {
    setTelegramBusy(true);
    try {
      // New endpoint returns safe metadata only (never the bot token).
      const data = await apiFetch('/api/settings/telegram');
      setTelegramStatus({
        tokenConfigured: data?.tokenConfigured,
        tokenSource: data?.tokenSource,
        chatIdSource: data?.chatIdSource
      });
    } catch (error) {
      setTelegramMessage(`Bot holatini tekshirib bo‘lmadi: ${error.message}`);
    } finally { setTelegramBusy(false); }
  };

  React.useEffect(() => { refreshTelegramStatus(); }, []);

  const setupTelegramWebhook = async () => {
    setTelegramBusy(true);
    setTelegramMessage('');
    try {
      const data = await apiFetch('/api/telegram/setup-webhook', { method: 'POST' });
      setTelegramMessage(data.message);
      await refreshTelegramStatus();
    } catch (error) { setTelegramMessage(error.message); }
    finally { setTelegramBusy(false); }
  };
  
  // Delivery & Rental duration settings state
  const [deliveryStartHour, setDeliveryStartHour] = useState(siteSettings?.deliveryStartHour !== undefined ? siteSettings.deliveryStartHour : 6);
  const [deliveryEndHour, setDeliveryEndHour] = useState(siteSettings?.deliveryEndHour !== undefined ? siteSettings.deliveryEndHour : 9);
  const [deliverySlotLabel, setDeliverySlotLabel] = useState(siteSettings?.deliverySlotLabel || "06:00 - 09:00 (Ertalabki)");
  const [maxRentalDays, setMaxRentalDays] = useState(siteSettings?.maxRentalDays !== undefined ? siteSettings.maxRentalDays : 30);
  const [minRentalDays, setMinRentalDays] = useState(siteSettings?.minRentalDays !== undefined ? siteSettings.minRentalDays : 1);

  // MyID integration settings state
  const [myIdEnabled, setMyIdEnabled] = useState(siteSettings?.myIdEnabled !== undefined ? siteSettings.myIdEnabled : true);
  const [myIdClientId, setMyIdClientId] = useState(siteSettings?.myIdClientId || '');
  const [myIdClientSecret, setMyIdClientSecret] = useState(siteSettings?.myIdClientSecret || '');

  const [newAdminLogin, setNewAdminLogin] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminCredMsg, setAdminCredMsg] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  // Sync with siteSettings prop changes
  React.useEffect(() => {
    if (siteSettings?.phone) setCompanyPhone(siteSettings.phone);
    if (siteSettings?.email) setCompanyEmail(siteSettings.email);
    if (siteSettings?.address) setCompanyAddress(siteSettings.address);
    if (siteSettings?.telegram) setCompanyTelegram(siteSettings.telegram);
    if (siteSettings?.instagram) setCompanyInstagram(siteSettings.instagram);
    if (siteSettings?.companyName) setCompanyName(siteSettings.companyName);
    if (siteSettings?.visitCount !== undefined) setVisitCountInput(siteSettings.visitCount);
    if (siteSettings?.botChatId) setBotChatId(siteSettings.botChatId);
    if (siteSettings?.penaltyRate !== undefined) setPenaltyRate(siteSettings.penaltyRate);
    if (siteSettings?.legalNoticeDays !== undefined) setLegalNoticeDays(siteSettings.legalNoticeDays);
    if (siteSettings?.deliveryStartHour !== undefined) setDeliveryStartHour(siteSettings.deliveryStartHour);
    if (siteSettings?.deliveryEndHour !== undefined) setDeliveryEndHour(siteSettings.deliveryEndHour);
    if (siteSettings?.deliverySlotLabel) setDeliverySlotLabel(siteSettings.deliverySlotLabel);
    if (siteSettings?.maxRentalDays !== undefined) setMaxRentalDays(siteSettings.maxRentalDays);
    if (siteSettings?.minRentalDays !== undefined) setMinRentalDays(siteSettings.minRentalDays);
    if (siteSettings?.myIdEnabled !== undefined) setMyIdEnabled(siteSettings.myIdEnabled);
    if (siteSettings?.myIdClientId) setMyIdClientId(siteSettings.myIdClientId);
    if (siteSettings?.myIdClientSecret) setMyIdClientSecret(siteSettings.myIdClientSecret);
  }, [siteSettings]);


  // Translations for admin panel
  const AT = {
    UZ: {
      dashboard: 'Umumiy Ko\'rinish', products: 'Mahsulotlar', kyc: 'KYC Tekshiruv',
      rentals: 'Ijaralar', legal: 'Huquqiy', addProduct: 'Yangi Qo\'shish', settings: 'Sozlamalar',
      dashTitle: 'Analitika va Umumiy Ko\'rinish', totalRevenue: 'Jami Tushum',
      activeRentals: 'Faol Ijaralar', pendingKYC: 'Kutilayotgan KYC', overdueAlerts: 'Muddati O\'tgan',
      devices: 'ta qurilma', docs: 'ta hujjat', petitions: 'ta ariza',
      productsTitle: 'Admin Generatorlar Boshqaruvi', addNewBtn: 'Yangi Generator Qo\'shish',
      viewAsClient: 'Mijoz ko\'rinishi', edit: 'Tahrirlash', delete: 'O\'chirish',
      kycTitle: 'KYC Verification — Mijozlar Hujjatlari', approve: 'Tasdiqlash', reject: 'Rad etish',
      viewPhotos: 'Rasmlar', done: 'Bajarilgan',
      rentalsTitle: 'Rental Tracker — Ijaradagi Qurilmalar',
      settingsTitle: 'Tizim Sozlamalari', companyInfo: 'Kompaniya Ma\'lumotlari',
      companyName: 'Kompaniya Nomi', companyPhone: 'Aloqa Raqami',
      companyEmail: 'Elektron Pochta', companyAddress: 'Manzil',
      saveSettings: 'Saqlash', saved: 'Saqlandi!',
      legalTitle: 'Legal Auto-PDF — Sud Arizalari'
    },
    RU: {
      dashboard: 'Обзор', products: 'Продукты', kyc: 'Верификация KYC',
      rentals: 'Аренды', legal: 'Юридический', addProduct: 'Добавить', settings: 'Настройки',
      dashTitle: 'Аналитика и Обзор', totalRevenue: 'Общий Доход',
      activeRentals: 'Активная Аренда', pendingKYC: 'Ожидающие KYC', overdueAlerts: 'Просрочено',
      devices: 'ед.', docs: 'докум.', petitions: 'исков',
      productsTitle: 'Управление Генераторами', addNewBtn: 'Добавить Генератор',
      viewAsClient: 'Вид клиента', edit: 'Редактировать', delete: 'Удалить',
      kycTitle: 'Верификация KYC — Документы Клиентов', approve: 'Одобрить', reject: 'Отклонить',
      viewPhotos: 'Фото', done: 'Выполнено',
      rentalsTitle: 'Трекер Аренды — Арендованные Устройства',
      settingsTitle: 'Настройки Системы', companyInfo: 'Информация о Компании',
      companyName: 'Название Компании', companyPhone: 'Телефон', 
      companyEmail: 'Электронная Почта', companyAddress: 'Адрес',
      saveSettings: 'Сохранить', saved: 'Сохранено!',
      legalTitle: 'Legal Auto-PDF — Исковые Заявления'
    },
    EN: {
      dashboard: 'Overview', products: 'Products', kyc: 'KYC Verification',
      rentals: 'Rentals', legal: 'Legal', addProduct: 'Add New', settings: 'Settings',
      dashTitle: 'Analytics & Overview', totalRevenue: 'Total Revenue',
      activeRentals: 'Active Rentals', pendingKYC: 'Pending KYC', overdueAlerts: 'Overdue Alerts',
      devices: 'devices', docs: 'docs', petitions: 'petitions',
      productsTitle: 'Generators Management', addNewBtn: 'Add Generator',
      viewAsClient: 'Client view', edit: 'Edit', delete: 'Delete',
      kycTitle: 'KYC Verification — Customer Documents', approve: 'Approve', reject: 'Reject',
      viewPhotos: 'Photos', done: 'Done',
      rentalsTitle: 'Rental Tracker — Active Devices',
      settingsTitle: 'System Settings', companyInfo: 'Company Information',
      companyName: 'Company Name', companyPhone: 'Phone Number',
      companyEmail: 'Email Address', companyAddress: 'Address',
      saveSettings: 'Save Settings', saved: 'Saved!',
      legalTitle: 'Legal Auto-PDF — Court Petitions'
    }
  };
  const at = AT[lang] || AT.UZ;
  const orderStatusLabels = lang === 'RU' ? {
    PENDING: 'Ожидает', APPROVED: 'Подтверждён', ACTIVE: 'Активная аренда', COMPLETED: 'Завершён',
    OVERDUE: 'Просрочен', LEGAL_PROCESS: 'Юридический процесс', CANCELLED: 'Отменён'
  } : lang === 'EN' ? {
    PENDING: 'Pending', APPROVED: 'Approved', ACTIVE: 'Active rental', COMPLETED: 'Completed',
    OVERDUE: 'Overdue', LEGAL_PROCESS: 'Legal process', CANCELLED: 'Cancelled'
  } : {
    PENDING: 'Kutilmoqda', APPROVED: 'Tasdiqlangan', ACTIVE: 'Faol ijara', COMPLETED: 'Yakunlangan',
    OVERDUE: 'Muddati o‘tgan', LEGAL_PROCESS: 'Huquqiy jarayonda', CANCELLED: 'Bekor qilingan'
  };
  const [selectedKycDoc, setSelectedKycDoc] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // New Product Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERATOR');
  const [capacity, setCapacity] = useState('1kWh / 1000W');
  const [stock, setStock] = useState(10);
  const [buyPrice, setBuyPrice] = useState('');
  const [oldBuyPrice, setOldBuyPrice] = useState('');
  const [rentPrice, setRentPrice] = useState('');
  const [oldRentPrice, setOldRentPrice] = useState('');
  const [description, setDescription] = useState('');
  const [usageSpecs, setUsageSpecs] = useState([]);
  const [showIconPicker, setShowIconPicker] = useState(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');

  // 5 Images Drag & Drop State for New Product
  const [imagesList, setImagesList] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Edit Product Images State
  const [editImagesList, setEditImagesList] = useState([]);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [editUrlInput, setEditUrlInput] = useState('');

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, o) => {
    if (o.status === 'COMPLETED' || o.status === 'ACTIVE' || o.status === 'APPROVED') {
      return sum + Number(o.totalAmount || o.total_price || 0);
    }
    return sum;
  }, 0);

  const activeRentals = orders.filter(o => o.status === 'ACTIVE' || o.status === 'APPROVED');
  const pendingKYC = verifications.filter(v => v.status === 'PENDING');
  const overdueAlerts = orders.filter(o => {
    if (o.status === 'OVERDUE' || o.status === 'LEGAL_PROCESS' || o.is_overdue) return true;
    if (o.endDate && new Date(o.endDate) < new Date() && (o.status === 'ACTIVE' || o.status === 'APPROVED')) return true;
    return false;
  });

  // Handle Drag & Drop Files for New Product
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFiles = (files, isEdit = false) => {
    if (!files || files.length === 0) return;
    const currentList = isEdit ? editImagesList : imagesList;
    const remainingSlots = 5 - currentList.length;
    if (remainingSlots <= 0) {
      alert('Maksimal 5 ta rasm qo\'shish mumkin!');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isEdit) {
          setEditImagesList(prev => prev.length >= 5 ? prev : [...prev, e.target.result]);
        } else {
          setImagesList(prev => prev.length >= 5 ? prev : [...prev, e.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e, isEdit = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEdit) setIsEditDragging(false);
    else setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, isEdit);
    }
  };

  const handleFileInput = (e, isEdit = false) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, isEdit);
      e.target.value = '';
    }
  };

  const handleAddUrlImage = (isEdit = false) => {
    const inputVal = isEdit ? editUrlInput : urlInput;
    const currentList = isEdit ? editImagesList : imagesList;
    if (!inputVal) return;
    if (currentList.length >= 5) {
      alert('Maksimal 5 ta rasm qo\'shish mumkin!');
      return;
    }

    if (isEdit) {
      setEditImagesList([...editImagesList, inputVal]);
      setEditUrlInput('');
    } else {
      setImagesList([...imagesList, inputVal]);
      setUrlInput('');
    }
  };

  const handleRemoveImage = (indexToRemove, isEdit = false) => {
    if (isEdit) {
      setEditImagesList(editImagesList.filter((_, idx) => idx !== indexToRemove));
    } else {
      setImagesList(imagesList.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const applianceIcons = [
    { id: 'zap', label: 'Elektr jihoz', Icon: Zap, color: '#2563eb' },
    { id: 'ac', label: 'Konditsioner', Icon: Flame, color: '#ea580c' },
    { id: 'fridge', label: 'Muzlatgich', Icon: Home, color: '#059669' },
    { id: 'tv', label: 'Televizor', Icon: Tv, color: '#7c3aed' },
    { id: 'laptop', label: 'Kompyuter', Icon: Laptop, color: '#0284c7' },
    { id: 'fan', label: 'Ventilyator', Icon: Fan, color: '#0d9488' },
    { id: 'coffee', label: 'Kofe apparat', Icon: Coffee, color: '#b45309' },
    { id: 'car', label: 'Elektromobil', Icon: Car, color: '#16a34a' },
    { id: 'phone', label: 'Telefon', Icon: Smartphone, color: '#2563eb' },
    { id: 'sun', label: 'Quyosh paneli', Icon: Sun, color: '#d97706' }
  ];

  const applianceIcon = (id, size = 18) => {
    const item = applianceIcons.find(icon => icon.id === id) || applianceIcons[0];
    const Icon = item.Icon;
    return <Icon size={size} style={{ color: item.color }} />;
  };

  const handleStartEdit = (prod) => {
    setEditingProduct({
      ...prod,
      stock: prod.stock !== undefined ? prod.stock : 1,
      buyPrice: prod.buyPrice || '',
      oldBuyPrice: prod.oldBuyPrice || '',
      rentPrice: prod.rentPrice || '',
      oldRentPrice: prod.oldRentPrice || '',
      usageSpecs: Array.isArray(prod.usageSpecs) ? prod.usageSpecs : [],
      isAvailable: prod.isAvailable !== false,
      description: prod.description || '',
      category: prod.category || (prod.title.toLowerCase().includes('panel') ? 'SOLAR_PANEL' : 'GENERATOR')
    });
    setEditImagesList(prod.images || []);
    setActiveTab('products');
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!title || !buyPrice || !rentPrice) return;
    
    const finalImages = imagesList.length > 0 
      ? imagesList 
      : ['/assets/default-product.png'];

    onAddProduct({
      title,
      category,
      capacity,
      stock: Number(stock) || 1,
      buyPrice: Number(buyPrice),
      oldBuyPrice: oldBuyPrice ? Number(oldBuyPrice) : null,
      rentPrice: Number(rentPrice),
      oldRentPrice: oldRentPrice ? Number(oldRentPrice) : null,
      description,
      images: finalImages,
      usageSpecs: usageSpecs.filter(spec => spec.name.trim() && spec.runTime.trim())
    });

    setTitle('');
    setCategory('GENERATOR');
    setStock(10);
    setBuyPrice('');
    setOldBuyPrice('');
    setRentPrice('');
    setOldRentPrice('');
    setDescription('');
    setUsageSpecs([]);
    setImagesList([]);
    setActiveTab('products');
  };

  const handleSaveEditProduct = (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    onEditProduct(editingProduct.id, {
      ...editingProduct,
      stock: editingProduct.stock !== undefined ? Number(editingProduct.stock) : 1,
      images: editImagesList,
      usageSpecs: editingProduct.usageSpecs || [],
      isAvailable: editingProduct.isAvailable !== false
    });
    setEditingProduct(null);
  };

  return (
    <div className="admin-crm-container" style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
            VOLTMAXHUB CRM
          </div>
          {onRefreshData && (
            <button onClick={onRefreshData} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Yangilash">
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          v2.0 · {lang === 'UZ' ? 'Administrator Paneli' : lang === 'RU' ? 'Панель Администратора' : 'Admin Panel'}
        </div>

        <div className="admin-sidebar-nav">
          <div className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Layers size={18} />
            {at.dashboard}
          </div>

          <div className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <BarChart2 size={18} />
            {at.products} ({products.length})
          </div>

          <div className={`admin-nav-item ${activeTab === 'solar-panels' ? 'active' : ''}`} onClick={() => setActiveTab('solar-panels')}>
            <Sun size={18} style={{ color: '#f59e0b' }} />
            Generatorlar ({products.filter(p => p.category === 'SOLAR_PANEL' || p.title.toLowerCase().includes('panel')).length})
          </div>

          <div className={`admin-nav-item ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>
            <Users size={18} />
            {at.kyc}
            {pendingKYC.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '2px 7px', borderRadius: '10px' }}>
                {pendingKYC.length}
              </span>
            )}
          </div>

          <div className={`admin-nav-item ${activeTab === 'rentals' ? 'active' : ''}`} onClick={() => setActiveTab('rentals')}>
            <ShoppingBag size={18} />
            {at.rentals} ({orders.length})
          </div>

          <div className={`admin-nav-item ${activeTab === 'legal' ? 'active' : ''}`} onClick={() => setActiveTab('legal')}>
            <FileText size={18} style={{ color: overdueAlerts.length > 0 ? '#ef4444' : '#94a3b8' }} />
            {at.legal}
            {overdueAlerts.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '2px 7px', borderRadius: '10px' }}>
                {overdueAlerts.length}
              </span>
            )}
          </div>

          <div className={`admin-nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            <MessageSquare size={18} style={{ color: '#06b6d4' }} />
            Murojaatlar ({contactMessages.length})
            {contactMessages.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#06b6d4', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '2px 7px', borderRadius: '10px' }}>
                {contactMessages.length}
              </span>
            )}
          </div>

          <div className={`admin-nav-item ${activeTab === 'add-product' ? 'active' : ''}`} onClick={() => setActiveTab('add-product')}>
            <Plus size={18} />
            {at.addProduct}
          </div>

          <div className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={18} />
            {at.settings} & Footer Boshqaruvi
          </div>
        </div>
      </aside>


        {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', background: 'var(--meco-bg)' }}>
        <section className="telegram-admin-status" aria-live="polite">
          <div>
            <strong>Telegram bot holati</strong>
            <div className="telegram-admin-checks">
              <span>{telegramStatus?.tokenConfigured ? '✅ Token sozlangan' : '❌ Bot tokeni .env da yo‘q'}</span>
              <span>{telegramStatus?.publicApiConfigured ? '✅ Server URL bor' : '❌ Ommaviy server URL yo‘q'}</span>
              <span>{telegramStatus?.webhookConfigured ? '✅ Webhook ulangan' : telegramStatus?.pollingMode && telegramStatus?.tokenConfigured ? '✅ Domenisiz polling rejimi yoqilgan' : '❌ Webhook ulanmagan'}</span>
            </div>
            {(telegramStatus?.error || telegramStatus?.lastWebhookError) && <small>{telegramStatus.error || telegramStatus.lastWebhookError}</small>}
            {telegramMessage && <small>{telegramMessage}</small>}
          </div>
          <div className="telegram-admin-actions">
            <button className="btn btn-secondary btn-sm" type="button" disabled={telegramBusy} onClick={refreshTelegramStatus}><RefreshCw size={14} /> Tekshirish</button>
            <button className="btn btn-primary btn-sm" type="button" disabled={telegramBusy || !telegramStatus?.tokenConfigured || !telegramStatus?.publicApiConfigured} onClick={setupTelegramWebhook}><Send size={14} /> Webhook ulash</button>
          </div>
        </section>
        {activeTab === 'legal' && (
          <label className="telegram-admin-chat-field">
            <span>Bot PDF yuboradigan admin chat ID (@username emas, raqamli ID)</span>
            <input value={botChatId} onChange={event => setBotChatId(event.target.value)} placeholder="TELEGRAM_CHAT_ID bilan bir xil bo‘lishi kerak" />
            <small>Xavfsizlik uchun yuborish serverdagi TELEGRAM_CHAT_ID bilan aynan mos bo‘lishi shart.</small>
          </label>
        )}
        
        {/* 1. METRICS OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>
                  {at.dashTitle}
                </h1>
                <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.88rem' }}>
                  Sayt tashriflari, ro'yxatdan o'tgan foydalanuvchilar va barcha xaridlar monitoringi
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onRefreshData} style={{ fontWeight: '700' }}>
                <RefreshCw size={14} /> Yangilash
              </button>
            </div>

            {/* STAT CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              
              {(() => {
                const clientUsers = (users || []).filter(u => u.role !== 'ADMIN' && !u.isAdmin && u.username !== 'admin' && u.phone !== '+998901234567');
                return [
                  { type: 'visits', label: 'Sayt Tashriflari', value: `${(siteSettings?.visitCount || 0).toLocaleString()} ta`, icon: <Eye size={20} />, iconBg: '#e0f2fe', iconColor: '#0284c7', valueColor: '#0284c7' },
                  { type: 'users', label: 'Ro\'yxatdan O\'tganlar', value: `${clientUsers.length} ta mijoz`, icon: <Users size={20} />, iconBg: '#f3e8ff', iconColor: '#9333ea', valueColor: '#9333ea' },
                  { type: 'revenue', label: at.totalRevenue, value: `${totalRevenue.toLocaleString()} UZS`, icon: <DollarSign size={20} />, iconBg: '#dcfce7', iconColor: '#16a34a', valueColor: 'var(--meco-text-main)' },
                  { type: 'rentals', label: at.activeRentals, value: `${activeRentals.length} ${at.devices}`, icon: <Clock size={20} />, iconBg: '#eff6ff', iconColor: '#2563eb', valueColor: '#2563eb' },
                  { type: 'kyc', label: at.pendingKYC, value: `${pendingKYC.length} ${at.docs}`, icon: <ShieldAlert size={20} />, iconBg: '#fef3c7', iconColor: '#d97706', valueColor: '#d97706' },
                  { type: 'overdue', label: at.overdueAlerts, value: `${overdueAlerts.length} ${at.petitions}`, icon: <AlertTriangle size={20} />, iconBg: '#fee2e2', iconColor: '#dc2626', valueColor: '#dc2626' },
                  { type: 'contacts', label: 'Foydalanuvchi Murojaatlari', value: `${(contactMessages || []).length} ta xabar`, icon: <MessageSquare size={20} />, iconBg: '#ecfeff', iconColor: '#0891b2', valueColor: '#0891b2' }
                ].map((card, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (card.type === 'users') {
                        const el = document.getElementById('registered-users-table');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      } else if (card.type === 'revenue') {
                        const el = document.getElementById('orders-breakdown-table');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      } else if (card.type === 'rentals') {
                        setActiveTab('rentals');
                      } else if (card.type === 'kyc') {
                        setActiveTab('kyc');
                      } else if (card.type === 'overdue') {
                        setActiveTab('legal');
                      } else if (card.type === 'contacts') {
                        setActiveTab('contacts');
                      } else if (card.type === 'visits') {
                        setActiveTab('settings');
                      }
                    }}
                    style={{ 
                      background: 'var(--meco-card-bg)', 
                      padding: '1.25rem', 
                      borderRadius: '14px', 
                      border: '1px solid var(--meco-border)', 
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--meco-text-muted)', fontWeight: '700' }}>{card.label}</span>
                      <div style={{ background: card.iconBg, color: card.iconColor, padding: '7px', borderRadius: '10px' }}>{card.icon}</div>
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: '800', color: card.valueColor }}>{card.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--meco-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span>Batafsil ko'rish</span> →
                    </div>
                  </div>
                ));
              })()}

            </div>

            {/* REGISTERED USERS TABLE */}
            {(() => {
              const clientUsers = (users || []).filter(u => u.role !== 'ADMIN' && !u.isAdmin && u.username !== 'admin' && u.phone !== '+998901234567');
              return (
                <div id="registered-users-table" style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#f3e8ff', color: '#9333ea', padding: '8px', borderRadius: '10px' }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>
                          Ro'yxatdan O'tgan Foydalanuvchilar ({clientUsers.length} ta)
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--meco-text-muted)' }}>
                          Tizimda ro'yxatdan o'tgan barcha mijozlar
                        </span>
                      </div>
                    </div>
                  </div>

                  {clientUsers.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--meco-text-muted)', fontSize: '0.9rem' }}>
                      Hali hech kim ro'yxatdan o'tmagan.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--meco-border)', textAlign: 'left', color: 'var(--meco-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '10px 12px' }}>#</th>
                            <th style={{ padding: '10px 12px' }}>F.I.SH & Telefon</th>
                            <th style={{ padding: '10px 12px' }}>Rol (Huquq)</th>
                            <th style={{ padding: '10px 12px' }}>KYC Pasport Holati</th>
                            <th style={{ padding: '10px 12px' }}>Ro'yxatga o'lingan sana</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientUsers.map((u, idx) => {
                            const hasSubmitted = u.verifications && u.verifications.length > 0;
                            const latestVerif = hasSubmitted ? u.verifications[u.verifications.length - 1] : null;
                            const pendingVerif = hasSubmitted && u.verifications.some(v => v.status === 'PENDING');
                            return (
                            <tr key={u.id || idx} style={{ borderBottom: '1px solid var(--meco-border)' }}>
                              <td style={{ padding: '12px', fontWeight: '700', color: 'var(--meco-text-muted)' }}>{idx + 1}</td>
                              <td style={{ padding: '12px' }}>
                                <strong style={{ display: 'block', color: 'var(--meco-text-main)' }}>{u.fullName || u.phone}</strong>
                                <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)' }}>{u.phone}</span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`} style={{ fontWeight: '700', padding: '4px 8px' }}>
                                  {u.role === 'ADMIN' ? '⚡ ADMINISTRATOR' : '👤 MIJOZ (CLIENT)'}
                                </span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                {(u.isVerified || u.is_verified) ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                                      ✓ KYC Tasdiqlangan
                                    </span>
                                    <button 
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => onToggleUserKYC && onToggleUserKYC(u.id, false)}
                                      title="Tasdiqni bekor qilish"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700', color: '#dc2626' }}
                                    >
                                      Bekor qilish
                                    </button>
                                  </div>
                                ) : hasSubmitted ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#d97706', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                                      📋 Kutilmoqda (Hujjat Yuborilgan)
                                    </span>
                                    <button 
                                      className="btn btn-sm btn-success"
                                      onClick={() => onToggleUserKYC && onToggleUserKYC(u.id, true)}
                                      title="KYC tasdiqlash"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: '700' }}
                                    >
                                      ✓ Tasdiqlash
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', background: 'var(--meco-bg)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.78rem', border: '1px solid var(--meco-border)' }}>
                                    ✗ KYC Yuborilmagan
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px', color: 'var(--meco-text-muted)', fontSize: '0.82rem' }}>
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('uz-UZ') : 'Yangi'}
                              </td>
                            </tr>
                            );
                          })}

                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PURCHASED & RENTED PRODUCTS BREAKDOWN TABLE */}
            <div id="orders-breakdown-table" style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: '#dcfce7', color: '#16a34a', padding: '8px', borderRadius: '10px' }}>
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>
                      Sotib Olingan va Ijaraga Olingan Generatorlar ({orders.length} ta)
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--meco-text-muted)' }}>
                      Mijozlar tomonidan amalga oshirilgan barcha xaridlar va ijara shartnomalari
                    </span>
                  </div>
                </div>
              </div>

              {orders.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--meco-text-muted)', fontSize: '0.9rem' }}>
                  Hali hech qanday sotuv yoki ijara buyurtmasi yo'q.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--meco-border)', textAlign: 'left', color: 'var(--meco-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '10px 12px' }}>Order ID</th>
                        <th style={{ padding: '10px 12px' }}>Mijoz</th>
                        <th style={{ padding: '10px 12px' }}>Mahsulot</th>
                        <th style={{ padding: '10px 12px' }}>Bitim Turi</th>
                        <th style={{ padding: '10px 12px' }}>Jami Summa</th>
                        <th style={{ padding: '10px 12px' }}>Sana</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord) => (
                        <tr key={ord.id} style={{ borderBottom: '1px solid var(--meco-border)' }}>
                          <td style={{ padding: '12px', fontWeight: '800', fontFamily: 'monospace', color: '#2563eb', fontSize: '0.8rem' }}>
                            #{ord.id.slice(0, 8)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: 'var(--meco-text-main)', display: 'block' }}>
                              {ord.user?.fullName || ord.user_fullName || ord.phone || 'Mijoz'}
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)' }}>
                              {ord.user?.phone || ord.user_phone || ord.phone}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: 'var(--meco-text-main)', display: 'block' }}>
                              {ord.product?.title || ord.product_title || 'VOLTMAXHUB Generator'}
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '700' }}>
                              {ord.product?.capacity || ord.capacity || '1kWh'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {ord.type === 'BUY' ? (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                                🛍 SOTIB OLINGAN
                              </span>
                            ) : (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem' }}>
                                🔄 KUNLIK IJARA
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '800', color: 'var(--meco-text-main)' }}>
                            {Number(ord.totalAmount || ord.total_price || 0).toLocaleString()} UZS
                          </td>
                          <td style={{ padding: '12px', color: 'var(--meco-text-muted)', fontSize: '0.82rem' }}>
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('uz-UZ') : 'Bugun'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${
                              ord.status === 'APPROVED' || ord.status === 'COMPLETED' ? 'badge-success' :
                              ord.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                            }`} style={{ fontWeight: '700' }}>
                              {ord.status === 'APPROVED' ? 'TASDIQLANGAN' : ord.status === 'COMPLETED' ? 'BAJARILGAN' : ord.status === 'PENDING' ? 'KUTILMOQDA' : ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}


        {/* 2. MAHSULOTLAR KARTALARI (GRID OF CARDS + FULL EDIT CARD FORMATTED LIKE IMAGE 2) */}
        {activeTab === 'products' && (
          <div>
            {editingProduct ? (
              /* EDIT PRODUCT FORM — FORMATTED EXACTLY LIKE IMAGE 2 */
              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => setEditingProduct(null)}
                    style={{ fontWeight: '700' }}
                  >
                    <ArrowLeft size={16} /> Ortga qaytish
                  </button>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
                    Mahsulotni Tahrirlash: {editingProduct.title}
                  </h1>
                </div>

                <form onSubmit={handleSaveEditProduct} style={{ background: '#fff', padding: '1.75rem', borderRadius: '20px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-md)' }}>
                  
                  {/* DRAG & DROP IMAGE UPLOAD ZONE */}
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Mahsulot Rasmlari (Drag & Drop yoki Fayl Yuklash)
                      </label>
                      <span style={{ fontSize: '0.8rem', color: editImagesList.length >= 5 ? '#dc2626' : '#2563eb', fontWeight: '800' }}>
                        {editImagesList.length} / 5 ta rasm joylandi
                      </span>
                    </div>

                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, true)}
                      style={{
                        position: 'relative',
                        border: isEditDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                        background: isEditDragging ? '#eff6ff' : '#f8fafc',
                        transform: isEditDragging ? 'scale(1.01)' : 'scale(1)',
                        borderRadius: '16px',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        cursor: editImagesList.length >= 5 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden'
                      }}
                      onClick={() => {
                        if (editImagesList.length < 5) {
                          document.getElementById('edit-product-file-input').click();
                        }
                      }}
                    >
                      <input 
                        id="edit-product-file-input"
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => handleFileInput(e, true)}
                        style={{ display: 'none' }}
                      />

                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: isEditDragging ? '#2563eb' : '#ffffff',
                        color: isEditDragging ? '#ffffff' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem auto',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                      }}>
                        <Plus size={32} strokeWidth={2.5} />
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: '800', color: isEditDragging ? '#2563eb' : '#0f172a', marginBottom: '4px' }}>
                        {isEditDragging ? 'Rasmlarni Shu Yerga Qo\'yib Yuboring!' : 'Rasmni Olib Kelib Qo\'ying yoki Bosing'}
                      </h4>

                      <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Kompyuter / Telefonda rasm fayllarini sudrab keling (Mak. 5 ta rasm)
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Yoki rasm havolasini (https://...) kiriting..." 
                        value={editUrlInput}
                        onChange={e => setEditUrlInput(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleAddUrlImage(true)}
                        disabled={editImagesList.length >= 5 || !editUrlInput}
                        style={{ whiteSpace: 'nowrap', fontWeight: '700' }}
                      >
                        + Qo'shish
                      </button>
                    </div>

                    {editImagesList.length > 0 && (
                      <div style={{ marginTop: '1.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>
                          Yuklangan Rasmlar Galereyasi:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                          {editImagesList.map((imgSrc, idx) => (
                            <div 
                              key={idx}
                              style={{
                                position: 'relative',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                height: '90px',
                                background: '#f1f5f9'
                              }}
                            >
                              <img src={imgSrc} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <span style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                background: idx === 0 ? '#2563eb' : 'rgba(15, 23, 42, 0.75)',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {idx === 0 ? 'Asosiy' : `#${idx + 1}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx, true)}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  background: '#dc2626',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '22px',
                                  height: '22px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mahsulot Nomi</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingProduct.title} 
                      onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kategoriya Bo'limi</label>
                    <select 
                      className="form-input" 
                      value={editingProduct.category || 'GENERATOR'} 
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    >
                      <option value="GENERATOR">⚡ Generator (ijara / sotuv)</option>
                      <option value="SOLAR_PANEL">☀️ Quyosh paneli (solar panel)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sig'im (Capacity & Output)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingProduct.capacity} 
                      onChange={e => setEditingProduct({ ...editingProduct, capacity: e.target.value })} 
                      required 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.65rem' }}>
                    <div className="form-group">
                      <label className="form-label">Ombor Soni (dona)</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input" 
                        value={editingProduct.stock !== undefined ? editingProduct.stock : 1} 
                        onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sotib Olish Narxi (UZS)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={editingProduct.buyPrice} 
                        onChange={e => setEditingProduct({ ...editingProduct, buyPrice: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Eski Sotib Olish (Ustiga chiziladigan)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="masalan: 3500000"
                        value={editingProduct.oldBuyPrice || ''} 
                        onChange={e => setEditingProduct({ ...editingProduct, oldBuyPrice: e.target.value })} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kunlik Ijara Narxi (UZS)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={editingProduct.rentPrice} 
                        onChange={e => setEditingProduct({ ...editingProduct, rentPrice: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Eski Ijara Narxi (Aksiya / Ustiga chiziladigan)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="masalan: 200000"
                        value={editingProduct.oldRentPrice || ''} 
                        onChange={e => setEditingProduct({ ...editingProduct, oldRentPrice: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tavsif (Description)</label>
                    <textarea 
                      className="form-input" 
                      rows={3} 
                      value={editingProduct.description} 
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    ></textarea>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={editingProduct.isAvailable !== false} onChange={e => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })} />
                      Saytda mavjud (sotuv/ijara)
                    </label>
                    <div>
                      <div className="form-label">Jihozlar va ishlash vaqti</div>
                      {(editingProduct.usageSpecs || []).map((spec, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(100px, 1fr) auto auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                          <input className="form-input" placeholder="Jihoz" value={spec.name || ''} onChange={e => setEditingProduct({ ...editingProduct, usageSpecs: editingProduct.usageSpecs.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} />
                          <input className="form-input" placeholder="Masalan, 4 soat" value={spec.runTime || ''} onChange={e => setEditingProduct({ ...editingProduct, usageSpecs: editingProduct.usageSpecs.map((item, i) => i === index ? { ...item, runTime: e.target.value } : item) })} />
                          <button type="button" className="btn btn-secondary btn-sm" title="Icon tanlash" onClick={() => setShowIconPicker({ target: 'edit', index })}>{applianceIcon(spec.icon)} Icon</button>
                          {applianceIcon(spec.icon, 20)}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setEditingProduct({ ...editingProduct, usageSpecs: editingProduct.usageSpecs.filter((_, i) => i !== index) })}><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingProduct({ ...editingProduct, usageSpecs: [...(editingProduct.usageSpecs || []), { name: '', icon: 'zap', runTime: '' }] })}><Plus size={14} /> Jihoz qo‘shish</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--meco-border)', paddingTop: '1.25rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>Bekor qilish</button>
                    <button type="submit" className="btn btn-primary" style={{ height: '46px', fontWeight: '800', minWidth: '160px', justifyContent: 'center' }}>
                      <Check size={18} /> Saqlash
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* PRODUCT CARDS GRID — FORMATTED EXACTLY LIKE USER CATALOG & IMAGE 2 STYLE */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
                      Admin Mahsulotlar Boshqaruvi ({products.length} ta mahsulot)
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      Generatorlar va quyosh panellari kartochkalarini tahrirlash, o'chirish yani yangi qo'shish.
                    </p>
                  </div>

                  <button className="btn btn-primary" onClick={() => setActiveTab('add-product')} style={{ height: '44px', fontWeight: '800' }}>
                    <Plus size={18} /> Yangi Qo'shish
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setProductCategoryFilter('ALL')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: productCategoryFilter === 'ALL' ? '1px solid #2563eb' : '1px solid var(--meco-border)',
                      background: productCategoryFilter === 'ALL' ? '#2563eb' : 'var(--meco-card-bg)',
                      color: productCategoryFilter === 'ALL' ? '#ffffff' : 'var(--meco-text-main)',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Barchasi ({products.length})
                  </button>
                  <button 
                    onClick={() => setProductCategoryFilter('GENERATOR')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: productCategoryFilter === 'GENERATOR' ? '1px solid #2563eb' : '1px solid var(--meco-border)',
                      background: productCategoryFilter === 'GENERATOR' ? '#2563eb' : 'var(--meco-card-bg)',
                      color: productCategoryFilter === 'GENERATOR' ? '#ffffff' : 'var(--meco-text-main)',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Generatorlar ({products.filter(p => p.category !== 'SOLAR_PANEL').length})
                  </button>
                  <button 
                    onClick={() => setProductCategoryFilter('SOLAR_PANEL')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: productCategoryFilter === 'SOLAR_PANEL' ? '1px solid #f59e0b' : '1px solid var(--meco-border)',
                      background: productCategoryFilter === 'SOLAR_PANEL' ? '#f59e0b' : 'var(--meco-card-bg)',
                      color: productCategoryFilter === 'SOLAR_PANEL' ? '#ffffff' : 'var(--meco-text-main)',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    ☀️ Quyosh panellari ({products.filter(p => p.category === 'SOLAR_PANEL').length})
                  </button>
                </div>

                <div className="grid-products admin-product-grid">
                  {products
                    .filter(p => {
                      if (productCategoryFilter === 'ALL') return true;
                      if (productCategoryFilter === 'SOLAR_PANEL') return p.category === 'SOLAR_PANEL';
                      if (productCategoryFilter === 'GENERATOR') return p.category !== 'SOLAR_PANEL';
                      return true;
                    })
                    .map((product, idx) => {
                    const buyP = product.buyPrice ? Number(product.buyPrice) : 0;
                    const rentP = product.rentPrice ? Number(product.rentPrice) : 0;
                    
                    let specs = [];
                    try {
                      if (typeof product.usageSpecs === 'string') specs = JSON.parse(product.usageSpecs);
                      else if (Array.isArray(product.usageSpecs)) specs = product.usageSpecs;
                    } catch(e) {
                      specs = [];
                    }

                    let imgList = [];
                    try {
                      if (typeof product.images === 'string') imgList = JSON.parse(product.images);
                      else if (Array.isArray(product.images)) imgList = product.images;
                    } catch(e) { imgList = []; }

                    const imgUrl = (imgList && imgList.length > 0 && imgList[0]) 
                      ? imgList[0] 
                      : (product.image_url || 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=600&auto=format&fit=crop&q=80');

                    return (
                      <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="card-img-container" style={{ position: 'relative' }}>
                          <img 
                            src={imgUrl} 
                            alt={product.title} 
                            className="card-img" 
                            style={{ objectFit: 'contain', padding: '0.5rem', transform: 'scale(0.9)' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1548611716-300181512403?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(0,0,0,0) 45%, rgba(15,23,42,0.6) 100%)',
                            pointerEvents: 'none'
                          }} />
                          <div className="card-badges">
                            <span className="badge badge-info card-badges-left" style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#38bdf8', backdropFilter: 'blur(6px)' }}>
                              <Zap size={12} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.capacity || 'Generator'}</span>
                            </span>
                            <div className="card-badges-right">
                              <span className="badge badge-success" style={{ backdropFilter: 'blur(6px)' }}>
                                {product.stock || 1} dona
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="card-body admin-product-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
                            {product.title}
                          </h3>
                          <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.85rem', marginBottom: '0.65rem', minHeight: '38px', maxHeight: '38px', overflow: 'hidden', lineHeight: '1.4' }}>
                            {product.description}
                          </p>

                          {/* Usage Preview */}
                          {specs.length > 0 && (
                            <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: '0.85rem', fontSize: '0.78rem', color: 'var(--meco-text-main)', fontWeight: '600' }}>
                              • {specs[0]?.name}: <strong style={{ color: 'var(--meco-primary)' }}>{specs[0]?.runTime}</strong>
                            </div>
                          )}

                          {/* Price Tag */}
                        <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '0.6rem 0.75rem', borderRadius: '10px', marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                              <span style={{ color: 'var(--meco-text-muted)' }}>Sotib olish:</span>
                              <strong style={{ color: 'var(--meco-text-main)' }}>{product.oldBuyPrice && Number(product.oldBuyPrice) > buyP && <del style={{ color: '#94a3b8', fontWeight: 500, marginRight: 6 }}>{Number(product.oldBuyPrice).toLocaleString()}</del>}{buyP ? `${buyP.toLocaleString()} UZS` : 'Mavjud emas'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px dashed var(--meco-border)', paddingTop: '2px' }}>
                              <span style={{ color: 'var(--meco-text-muted)', fontSize: '0.8rem' }}>Kunlik ijara:</span>
                              <strong style={{ color: product.oldRentPrice ? '#ef4444' : 'var(--meco-primary)' }}>{product.oldRentPrice && Number(product.oldRentPrice) > rentP && <del style={{ color: '#94a3b8', fontWeight: 500, marginRight: 6 }}>{Number(product.oldRentPrice).toLocaleString()}</del>}{rentP ? `${rentP.toLocaleString()} UZS/kun` : 'Mavjud emas'}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                            {product.isAvailable !== false ? <span className="badge badge-success">Sotuvda / ijarada</span> : <span className="badge badge-danger">Mavjud emas</span>}
                            {Number(product.oldBuyPrice) > buyP || Number(product.oldRentPrice) > rentP ? <span className="badge badge-warning">Aksiya chegirma</span> : null}
                          </div>

                          {/* Admin Action Buttons on Card */}
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => onViewProductAsClient(product)}
                              style={{ width: '100%', justifyContent: 'center', background: 'var(--meco-primary-light)', color: 'var(--meco-primary)', borderColor: 'var(--meco-border)', fontWeight: '700' }}
                            >
                              <ExternalLink size={15} /> Mijoz kabi ko'rish
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => handleStartEdit(product)}
                                style={{ justifyContent: 'center', fontWeight: '700' }}
                              >
                                <Edit3 size={15} /> Tahrirlash
                              </button>
                              <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => {
                                  if (window.confirm(`"${product.title}" generatorini bazadan o'chirmoqchimisiz?`)) {
                                    onDeleteProduct(product.id);
                                  }
                                }}
                                style={{ justifyContent: 'center', fontWeight: '700' }}
                              >
                                <Trash2 size={15} /> O'chirish
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2.5. DEDICATED SOLAR PANELS MANAGEMENT MODULE */}
        {activeTab === 'solar-panels' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--meco-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sun size={26} style={{ color: '#f59e0b' }} />
                  Quyosh Panellari Boshqaruvi ({products.filter(p => p.category === 'SOLAR_PANEL' || p.title.toLowerCase().includes('panel')).length} ta mahsulot)
                </h1>
                <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem' }}>
                  VOLTMAXHUB quyosh panellari kartochkalarini tahrirlash, yangi mahsulot qo'shish yoki o'chirish.
                </p>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setCategory('SOLAR_PANEL');
                  setActiveTab('add-product');
                }} 
                style={{ height: '44px', fontWeight: '800', background: '#f59e0b', borderColor: '#f59e0b' }}
              >
                <Plus size={18} /> Yangi Mahsulot Qo'shish
              </button>
            </div>

            <div className="grid-products">
              {products
                .filter(p => p.category === 'SOLAR_PANEL' || p.title.toLowerCase().includes('panel') || p.title.toLowerCase().includes('solar'))
                .map((product) => {
                  const buyP = product.buyPrice ? Number(product.buyPrice) : 0;
                  const rentP = product.rentPrice ? Number(product.rentPrice) : 0;
                  
                  let specs = [];
                  try {
                    if (typeof product.usageSpecs === 'string') specs = JSON.parse(product.usageSpecs);
                    else if (Array.isArray(product.usageSpecs)) specs = product.usageSpecs;
                  } catch(e) { specs = []; }

                  let imgList = [];
                  try {
                    if (typeof product.images === 'string') imgList = JSON.parse(product.images);
                    else if (Array.isArray(product.images)) imgList = product.images;
                  } catch(e) { imgList = []; }

                  const imgUrl = (imgList && imgList.length > 0 && imgList[0]) 
                    ? imgList[0] 
                    : 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';

                  return (
                    <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="card-img-container" style={{ position: 'relative' }}>
                        <img 
                          src={imgUrl} 
                          alt={product.title} 
                          className="card-img" 
                          style={{ objectFit: 'contain', padding: '0.5rem', transform: 'scale(0.9)' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="card-badges">
                          <span className="badge badge-info card-badges-left" style={{ background: 'rgba(245, 158, 11, 0.9)', color: '#fff', backdropFilter: 'blur(6px)' }}>
                            ☀️ {product.capacity || 'Quyosh paneli'}
                          </span>
                          <div className="card-badges-right">
                            <span className="badge badge-success" style={{ backdropFilter: 'blur(6px)' }}>
                              {product.stock || 1} dona
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                          {product.title}
                        </h3>
                        <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.85rem', marginBottom: '1rem', minHeight: '38px', maxHeight: '38px', overflow: 'hidden', lineHeight: '1.4' }}>
                          {product.description}
                        </p>

                        <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '0.6rem 0.75rem', borderRadius: '10px', marginBottom: '0.65rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                            <span style={{ color: 'var(--meco-text-muted)' }}>Sotib olish narxi:</span>
                            <strong style={{ color: '#2563eb' }}>{product.oldBuyPrice > buyP && <del style={{ color: '#94a3b8', marginRight: 5 }}>{Number(product.oldBuyPrice).toLocaleString()}</del>}{buyP ? `${buyP.toLocaleString()} UZS` : 'Mavjud emas'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px dashed var(--meco-border)', paddingTop: '2px' }}>
                            <span style={{ color: 'var(--meco-text-muted)', fontSize: '0.8rem' }}>Kunlik ijara:</span>
                            <strong style={{ color: '#10b981' }}>{product.oldRentPrice > rentP && <del style={{ color: '#94a3b8', marginRight: 5 }}>{Number(product.oldRentPrice).toLocaleString()}</del>}{rentP ? `${rentP.toLocaleString()} UZS/kun` : 'Mavjud emas'}</strong>
                          </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => onViewProductAsClient(product)}
                            style={{ width: '100%', justifyContent: 'center', fontWeight: '700' }}
                          >
                            <ExternalLink size={15} /> Mijoz kabi ko'rish
                          </button>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleStartEdit(product)}
                              style={{ justifyContent: 'center', fontWeight: '700' }}
                            >
                              <Edit3 size={15} /> Tahrirlash
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => {
                                if (window.confirm(`"${product.title}" mahsulotini bazadan o'chirmoqchimisiz?`)) {
                                  onDeleteProduct(product.id);
                                }
                              }}
                              style={{ justifyContent: 'center', fontWeight: '700' }}
                            >
                              <Trash2 size={15} /> O'chirish
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 3. KYC VERIFICATION MODULE */}
        {activeTab === 'kyc' && (
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              KYC Verification Module — Mijozlar Hujjatlarini Tasdiqlash
            </h1>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mijoz Telefon</th>
                    <th>F.I.SH (Ism-Familiya)</th>
                    <th>Pasport Seriyasi</th>
                    <th>PINFL (JSHSHIR 14 xona)</th>
                    <th>Status</th>
                    <th>Pasport / Selfie</th>
                    <th>Harakat (Actions)</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--meco-text-muted)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📄</div>
                        <strong>Hozircha kutilayotgan yoki yuborilgan KYC hujjatlari yo'q.</strong>
                        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Mijozlar KYC tasdiqlash uchun pasport va selfie yuborishganda ushbu jadvalda ko'rinadi.</p>
                      </td>
                    </tr>
                  ) : (
                    verifications.map(kyc => {
                      const uPhone = kyc.user?.phone || kyc.user_phone || '+998901234567';
                      const uName = kyc.user?.fullName || kyc.user_full_name || 'Alisher Qayumov';
                      const status = kyc.status || 'PENDING';

                      return (
                        <tr key={kyc.id}>
                          <td><strong>{uPhone}</strong></td>
                          <td>{uName}</td>
                          <td><code>{kyc.passportSeries || kyc.passport_series || '—'}</code></td>
                          <td><code>{kyc.pinfl || '—'}</code></td>
                          <td>
                            <span className={`badge ${status === 'APPROVED' ? 'badge-success' : status === 'REJECTED' ? 'badge-danger' : 'badge-pending'}`}>
                              {status === 'APPROVED' ? 'TASDIQLANGAN' : status === 'REJECTED' ? 'RAD ETILGAN' : 'KUTILMOQDA'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedKycDoc(kyc)}>
                              <Eye size={14} /> Rasmlarni ko'rish
                            </button>
                          </td>
                          <td>
                            {status === 'APPROVED' ? (
                              <button className="btn btn-sm btn-secondary" onClick={() => onRejectKYC(kyc.id, 'Admin bekor qildi')}>
                                <XCircle size={14} /> Tasdiqni bekor qilish
                              </button>
                            ) : status === 'REJECTED' ? (
                              <span className="kyc-rejected-label"><XCircle size={15} /> Rad etilgan</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-sm btn-success" onClick={() => onApproveKYC(kyc.id)}>
                                  <CheckCircle size={14} /> Tasdiqlash
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => {
                                  const reason = prompt('Rad etish sababini kiriting:');
                                  if (reason) onRejectKYC(kyc.id, reason);
                                }}>
                                  <XCircle size={14} /> Rad etish
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. RENTAL TRACKER */}
        {activeTab === 'rentals' && (
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              Rental Tracker — Ijaradagi Qurilmalar va Qaytarish Sanalari
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[['ALL', `Barchasi (${orders.length})`], ['RENT', `Ijara (${orders.filter(o => o.type === 'RENT').length})`], ['BUY', `Sotuv (${orders.filter(o => o.type === 'BUY').length})`], ['OVERDUE', `Muddati o'tgan (${overdueAlerts.length})`]].map(([value, label]) => (
                <button key={value} type="button" className={`btn btn-sm ${orderStatusFilter === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrderStatusFilter(value)}>{label}</button>
              ))}
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Buyurtma ID</th>
                    <th>Mijoz (Telefon)</th>
                    <th>Generator / Mahsulot</th>
                    <th>Turi</th>
                    <th>Ijara Sanalari</th>
                    <th>Jami Summa</th>
                    <th>Status</th>
                    <th>Statusni Yangilash</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(order => {
                    if (orderStatusFilter === 'OVERDUE') {
                      const days = order.endDate ? Math.floor((Date.now() - new Date(order.endDate).getTime()) / 86400000) : 0;
                      return order.type === 'RENT' && days > 3 && !['COMPLETED', 'CANCELLED'].includes(order.status);
                    }
                    if (orderStatusFilter === 'RENT') return order.type === 'RENT';
                    if (orderStatusFilter === 'BUY') return order.type === 'BUY';
                    if (orderStatusFilter === 'OVERDUE') return ['OVERDUE', 'LEGAL_PROCESS'].includes(order.status) || order.is_overdue;
                    return true;
                  }).map(order => {
                    const prodTitle = order.product?.title || order.product_detail?.title || 'VOLTMAXHUB Generator';
                    const uPhone = order.user?.phone || order.user_phone || '+998901234567';
                    const startStr = order.startDate ? new Date(order.startDate).toLocaleDateString('uz-UZ') : (order.start_date || '—');
                    const endStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : (order.end_date || '—');
                    const amount = Number(order.totalAmount || order.total_price || 0);

                    return (
                      <tr key={order.id}>
                        <td><strong>#{String(order.id).slice(0, 8)}</strong></td>
                        <td>{uPhone}</td>
                        <td><strong>{prodTitle}</strong></td>
                        <td>
                          <span className={`badge ${order.type === 'BUY' ? 'badge-info' : 'badge-pending'}`}>
                            {order.type || 'RENT'}
                          </span>
                        </td>
                        <td>{startStr} — {endStr}</td>
                        <td><strong>{amount.toLocaleString()} UZS</strong></td>
                        <td>
                          <span className={`badge ${order.status === 'ACTIVE' || order.status === 'APPROVED' ? 'badge-success' : order.status === 'OVERDUE' || order.status === 'LEGAL_PROCESS' ? 'badge-danger' : 'badge-info'}`}>
                            {orderStatusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td>
                          <select 
                            className="form-input" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={order.status}
                            onChange={(e) => onUpdateOrderStatus(order.id, e.target.value)}
                          >
                            {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. LEGAL AUTO-PDF ENGINE & TELEGRAM BOT DISPATCH */}
        {activeTab === 'legal' && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', fontWeight: '800', fontSize: '1.2rem' }}>
                <ShieldAlert size={26} />
                Legal Auto-PDF Engine — O'zbekiston Sud Arizalari (Da'vo Arizasi)
              </div>
              <p style={{ color: '#7f1d1d', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                Ijara muddati 3 kundan oshib ketgan va generator qaytarilmagan mijozlar uchun O'zbekiston Fuqarolik Kodeksining 535 va 553-moddalariga muvofiq tayyorlangan rasmiy sud arizalari (Da'vo Arizasi). PDF/HTML shaklida chop etish va Telegram Bot orqali jo'natish imkoniyati.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[['ALL', '3+ kun kechikkanlar'], ['OVERDUE', 'Faqat kechikkanlar']].map(([value, label]) => (
                <button key={value} type="button" className={`btn btn-sm ${orderStatusFilter === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrderStatusFilter(value)}>{label}</button>
              ))}
            </div>

            {/* Telegram Bot Configuration */}
            <div style={{ background: '#fff', border: '1px solid var(--meco-border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1rem', color: '#0f172a', marginBottom: '0.75rem' }}>
                <Send size={18} style={{ color: '#2563eb' }} />
                  Telegram Bot Integratsiyasi (token serverda himoyalangan)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>TELEGRAM CHAT ID / USERNAME</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Admin chat ID (raqam)" 
                    value={botChatId} 
                    onChange={e => setBotChatId(e.target.value)} 
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Serverdagi TELEGRAM_CHAT_ID bilan bir xil raqam kiriting.</span>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Buyurtma ID</th>
                    <th>Javobgar (Mijoz)</th>
                    <th>Pasport & PINFL</th>
                    <th>Uskuna Sig'imi</th>
                    <th>Da'vo Summasi + Penya</th>
                    <th>Muddati O'tgan Kunlar</th>
                    <th>Harakatlar (PDF & Telegram Bot)</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => {
                    const daysOverdue = o.endDate ? Math.floor((Date.now() - new Date(o.endDate).getTime()) / 86400000) : 0;
                    const overdue = o.type === 'RENT' && daysOverdue > 3 && !['COMPLETED', 'CANCELLED'].includes(o.status);
                    return overdue;
                  }).map(order => {
                    const uName = order.user?.fullName || order.user_detail?.first_name || 'Alisher Qayumov';
                    const uPhone = order.user?.phone || order.user_phone || '+998901234567';
                    const pSeries = order.user?.passportSeries || 'AA1234567';
                    const pinfl = order.user?.pinfl || '31204958390124';
                    const prodTitle = order.product?.title || order.product_detail?.title || 'VOLTMAXHUB 2kWh';
                    const baseAmount = Number(order.totalAmount || order.total_price || 2800000);
                    const totalClaim = Math.round(baseAmount * 1.15);
                    const lateDays = order.endDate ? Math.floor((Date.now() - new Date(order.endDate).getTime()) / 86400000) : 0;

                    return (
                      <tr key={order.id}>
                        <td><strong>#{String(order.id).slice(0, 8)}</strong></td>
                        <td>
                          <strong style={{ display: 'block', color: '#0f172a' }}>{uName}</strong>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{uPhone}</span>
                        </td>
                        <td><code>{pSeries} / {pinfl}</code></td>
                        <td><span className="badge badge-info">{prodTitle}</span></td>
                        <td><strong style={{ color: 'var(--danger)', fontSize: '1rem' }}>{totalClaim.toLocaleString()} UZS</strong></td>
                        <td><span className="badge badge-danger">{lateDays} kun o'tgan</span></td>
                        <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <a 
                            href={apiUrl(`/api/legal/davo-arizasi/${order.id}?format=pdf`)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-sm btn-primary"
                            style={{ textDecoration: 'none', background: '#dc2626', borderColor: '#dc2626', fontSize: '0.78rem' }}
                          >
                            <Download size={14} /> PDF Arizani Ko'rish
                          </a>

                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={async () => {
                              try {
                                const data = await apiFetch('/api/legal/send-telegram', {
                                  method: 'POST',
                                  body: { orderId: order.id, chatId: botChatId }
                                });
                                alert(`\u{1F916} ${data.message || 'Da\'vo arizasi Telegram Bot orqali yuborildi!'}`);
                              } catch (err) {
                                alert('Telegram yuborishda xatolik: ' + err.message);
                              }
                            }}
                            style={{ fontSize: '0.78rem', background: '#0284c7', color: '#fff', borderColor: '#0284c7', fontWeight: '700' }}
                          >
                            <Send size={14} /> Bot Orqali Yuborish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* 6. ADD PRODUCT WITH DRAG & DROP 5 IMAGES UPLOADER — FORMATTED EXACTLY LIKE IMAGE 2 */}
        {activeTab === 'add-product' && (
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem', color: '#0f172a' }}>
              Yangi VOLTMAXHUB Generator Qo'shish
            </h1>

            <form onSubmit={handleCreateProduct} style={{ background: '#fff', padding: '1.75rem', borderRadius: '20px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-md)' }}>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Mahsulot Rasmlari (Drag & Drop yoki Fayl Yuklash)
                  </label>
                  <span style={{ fontSize: '0.8rem', color: imagesList.length >= 5 ? '#dc2626' : '#2563eb', fontWeight: '800' }}>
                    {imagesList.length} / 5 ta rasm joylandi
                  </span>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, false)}
                  style={{
                    position: 'relative',
                    border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                    background: isDragging ? '#eff6ff' : '#f8fafc',
                    transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                    borderRadius: '16px',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    cursor: imagesList.length >= 5 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden'
                  }}
                  onClick={() => {
                    if (imagesList.length < 5) {
                      document.getElementById('product-file-input').click();
                    }
                  }}
                >
                  <input 
                    id="product-file-input"
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={(e) => handleFileInput(e, false)}
                    style={{ display: 'none' }}
                  />

                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isDragging ? '#2563eb' : '#ffffff',
                    color: isDragging ? '#ffffff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                  }}>
                    <Plus size={32} strokeWidth={2.5} />
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: '800', color: isDragging ? '#2563eb' : '#0f172a', marginBottom: '4px' }}>
                    {isDragging ? 'Rasmlarni Shu Yerga Qo\'yib Yuboring!' : 'Rasmni Olib Kelib Qo\'ying yoki Bosing'}
                  </h4>

                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Kompyuter / Telefonda rasm fayllarini sudrab keling (Mak. 5 ta rasm)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="Yoki rasm havolasini (https://...) kiriting..." 
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => handleAddUrlImage(false)}
                    disabled={imagesList.length >= 5 || !urlInput}
                    style={{ whiteSpace: 'nowrap', fontWeight: '700' }}
                  >
                    + Qo'shish
                  </button>
                </div>

                {imagesList.length > 0 && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>
                      Yuklangan Rasmlar Galereyasi:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                      {imagesList.map((imgSrc, idx) => (
                        <div 
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            height: '90px',
                            background: '#f1f5f9'
                          }}
                        >
                          <img src={imgSrc} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <span style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: idx === 0 ? '#2563eb' : 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {idx === 0 ? 'Asosiy' : `#${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, false)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Mahsulot Nomi</label>
                <input type="text" className="form-input" placeholder="Masalan: VOLTMAXHUB 3.6kWh Pro yoki VOLTMAXHUB 550W Panel" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Kategoriya (Qaysi bo'limga joylansin?)</label>
                <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="GENERATOR">⚡ Generator (ijara / sotuv)</option>
                  <option value="SOLAR_PANEL">☀️ Quyosh paneli (solar panel)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sig'im va Quvvat (Capacity & Output)</label>
                <input type="text" className="form-input" placeholder="3600Wh / 3600W Pure Sine" value={capacity} onChange={e => setCapacity(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Chegirma narxlari (ixtiyoriy)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input type="number" className="form-input" placeholder="Eski sotuv narxi" value={oldBuyPrice} onChange={e => setOldBuyPrice(e.target.value)} />
                  <input type="number" className="form-input" placeholder="Eski kunlik ijara narxi" value={oldRentPrice} onChange={e => setOldRentPrice(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ombor Soni (dona)</label>
                  <input type="number" min="0" className="form-input" placeholder="10" value={stock} onChange={e => setStock(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sotib Olish Narxi (UZS)</label>
                  <input type="number" className="form-input" placeholder="27000000" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Kunlik Ijara Narxi (UZS)</label>
                  <input type="number" className="form-input" placeholder="500000" value={rentPrice} onChange={e => setRentPrice(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tavsif (Description)</label>
                <textarea className="form-input" rows={3} placeholder="Sanoat va maishiy foydalanish uchun..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--meco-border)', borderRadius: '14px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '0.75rem' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Qancha muddatga yetadi?</strong>
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Jihoz nomi, ishlash vaqti va icon tanlang</span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUsageSpecs([...usageSpecs, { name: '', runTime: '', icon: 'zap' }])}><Plus size={14} /> Jihoz qo‘shish</button>
                </div>
                {usageSpecs.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 0' }}>Hali jihoz qo‘shilmadi.</div>}
                {usageSpecs.map((spec, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) minmax(110px, 1fr) auto 30px', gap: '7px', marginBottom: '7px', alignItems: 'center' }}>
                    <input className="form-input" placeholder="Masalan: Konditsioner" value={spec.name} onChange={e => setUsageSpecs(usageSpecs.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                    <input className="form-input" placeholder="Masalan: 4.2 soat" value={spec.runTime} onChange={e => setUsageSpecs(usageSpecs.map((item, i) => i === index ? { ...item, runTime: e.target.value } : item))} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowIconPicker({ target: 'new', index })}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{applianceIcon(spec.icon)} Icon tanlash</span></button>
                    <span title="Tanlangan icon">{applianceIcon(spec.icon, 22)}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setUsageSpecs(usageSpecs.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '46px', fontWeight: '800' }}>
                <Plus size={18} /> Bazaga Qo'shish ({imagesList.length} ta rasm bilan)
              </button>
            </form>
          </div>
        )}

        {showIconPicker && (
          <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowIconPicker(null); }} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16, animation: 'mecoFadeIn 0.18s ease-out' }}>
            <div role="dialog" aria-modal="true" aria-labelledby="icon-picker-title" style={{ width: 'min(460px, 100%)', background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: 20, padding: 22, boxShadow: '0 24px 70px rgba(15,23,42,0.3)', animation: 'mecoModalIn 0.22s cubic-bezier(.2,.8,.2,1)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div><h2 id="icon-picker-title" style={{ fontSize: '1.15rem', margin: 0, color: 'var(--meco-text-main)' }}>Jihoz iconini tanlang</h2><p style={{ color: 'var(--meco-text-muted)', fontSize: '0.82rem', margin: '5px 0 0' }}>Icon tanlaganingizdan so‘ng jihoz qatoriga qo‘shiladi.</p></div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowIconPicker(null)} aria-label="Yopish">✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
                {applianceIcons.map(({ id, label, Icon, color }) => (
                  <button key={id} type="button" onClick={() => {
                    if (showIconPicker.target === 'edit') {
                      setEditingProduct({ ...editingProduct, usageSpecs: editingProduct.usageSpecs.map((item, i) => i === showIconPicker.index ? { ...item, icon: id } : item) });
                    } else {
                      setUsageSpecs(usageSpecs.map((item, i) => i === showIconPicker.index ? { ...item, icon: id } : item));
                    }
                    setShowIconPicker(null);
                  }} style={{ minHeight: 84, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1px solid var(--meco-border)', borderRadius: 12, background: 'var(--meco-bg)', color: 'var(--meco-text-main)', cursor: 'pointer', font: 'inherit', fontSize: '0.78rem', fontWeight: 700, transition: 'transform .16s ease, border-color .16s ease, box-shadow .16s ease' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 5px 16px ${color}25`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--meco-border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: 'grid', placeItems: 'center' }}><Icon size={21} style={{ color }} /></span>{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6.5. MUROJAATLAR / USER CONTACT MESSAGES */}
        {activeTab === 'contacts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--meco-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={24} style={{ color: '#06b6d4' }} /> Murojaatlar va Foydalanuvchilar Xabarlari
                </h1>
                <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.88rem' }}>
                  "Bizga Bog'lanish" shakli orqali mijozlar yuborgan barcha savol va murojaatlar
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onRefreshData} style={{ fontWeight: '700' }}>
                <RefreshCw size={14} /> Yangilash
              </button>
            </div>

            {(!contactMessages || contactMessages.length === 0) ? (
              <div style={{ background: 'var(--meco-card-bg)', padding: '3rem 2rem', borderRadius: '16px', border: '1px solid var(--meco-border)', textAlign: 'center' }}>
                <MessageSquare size={48} style={{ color: 'var(--meco-text-muted)', margin: '0 auto 1rem auto', opacity: 0.5 }} />
                <h3 style={{ color: 'var(--meco-text-main)', fontWeight: '800' }}>Hozircha Hech Qanday Murojaat Yo'q</h3>
                <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Foydalanuvchilar "Bizga Bog'lanish" bo'limidan yuborgan xabarlari shu yerda ko'rinadi.
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--meco-card-bg)', borderRadius: '16px', border: '1px solid var(--meco-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--meco-bg)', borderBottom: '1px solid var(--meco-border)', color: 'var(--meco-text-muted)', fontWeight: '700' }}>
                        <th style={{ padding: '1rem' }}>#</th>
                        <th style={{ padding: '1rem' }}>Foydalanuvchi</th>
                        <th style={{ padding: '1rem' }}>Telefon</th>
                        <th style={{ padding: '1rem' }}>Mavzu</th>
                        <th style={{ padding: '1rem' }}>Xabar Matni</th>
                        <th style={{ padding: '1rem' }}>Vaqti</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactMessages.map((msg, index) => (
                        <tr key={msg.id || index} style={{ borderBottom: '1px solid var(--meco-border)' }}>
                          <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--meco-text-muted)' }}>{index + 1}</td>
                          <td style={{ padding: '1rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>
                            {msg.name}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <a href={`tel:${msg.phone}`} style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={14} /> {msg.phone}
                            </a>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              background: msg.subject?.includes('Ijara') ? '#eff6ff' : msg.subject?.includes('Sotib') ? '#f0fdf4' : '#faf5ff',
                              color: msg.subject?.includes('Ijara') ? '#2563eb' : msg.subject?.includes('Sotib') ? '#16a34a' : '#9333ea',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: '800'
                            }}>
                              {msg.subject || 'Umumiy savol'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', maxWidth: '320px', color: 'var(--meco-text-main)', lineHeight: '1.5' }}>
                            <div style={{ background: 'var(--meco-bg)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--meco-border)', fontSize: '0.84rem' }}>
                              {msg.message}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--meco-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <a 
                                href={`https://t.me/+${(msg.phone || '').replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: '700', color: '#0088cc' }}
                                title="Telegram orqali yozish"
                              >
                                <Send size={13} /> Telegram
                              </a>
                              {onDeleteContactMessage && (
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={() => onDeleteContactMessage(msg.id)}
                                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                  title="O'chirish"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. SETTINGS / SOZLAMALAR */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '840px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--meco-text-main)' }}>
              ⚙️ Tizim va Admin CRM Sozlamalari
            </h1>
            <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Sayt aloqa ma'lumotlari, Telegram bot integratsiyasi, penya va admin parolini boshqarish.
            </p>

            {settingsSaved && (
              <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(22,163,74,0.2)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} /> {at.saved}
              </div>
            )}

            {/* 1. Admin Login & Security Settings Card */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    Admin CRM Kirish Xavfsizligi
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Administrator login va yangi parolini o'zgartirish
                  </div>
                </div>
              </div>

              {adminCredMsg && (
                <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700' }}>
                  {adminCredMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Yangi Admin Login (Telefon/Username)</label>
                  <input type="text" className="form-input" placeholder="admin" value={newAdminLogin} onChange={e => setNewAdminLogin(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Yangi Admin Paroli</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} />
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!newAdminLogin && !newAdminPassword) {
                    setAdminCredMsg("Yangi login yoki parol kiriting.");
                    return;
                  }
                  setAdminBusy(true);
                  setAdminCredMsg('');
                  try {
                    const data = await apiFetch('/api/settings/admin-credentials', {
                      method: 'POST',
                      body: { newLogin: newAdminLogin, newPassword: newAdminPassword }
                    });
                    setAdminCredMsg('\u2705 ' + (data.message || "Admin ma'lumotlari yangilandi."));
                    setNewAdminLogin('');
                    setNewAdminPassword('');
                  } catch (err) {
                    setAdminCredMsg('\u274c ' + err.message);
                  } finally {
                    setAdminBusy(false);
                  }
                }}
                disabled={adminBusy}
                className="btn btn-secondary"
                style={{ fontWeight: '700', fontSize: '0.85rem' }}
              >
                <Save size={16} /> Admin Kirish Parolini Yangilash
              </button>
            </div>

            {/* 2. Company Info & Social Contacts Card */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'var(--meco-primary-light)', color: 'var(--meco-primary)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    Sayt va Footer Aloqa Sozlamalari
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Footer hamda kontaktlar bo'limida jonli ko'rinadigan ma'lumotlar
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">
                    <Building size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Kompaniya Rasmiy Nomi (PDF, Shartnomalar, Footer)
                  </label>
                  <input type="text" className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="VOLTMAXHUB" />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Phone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Telefon Raqami (Footer va Kontaktlar)
                  </label>
                  <input type="text" className="form-input" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Elektron Pochta (Email)
                  </label>
                  <input type="email" className="form-input" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Send size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Telegram Kanal / Bot Havolasi
                  </label>
                  <input type="text" className="form-input" placeholder="https://t.me/voltmaxhub_uz" value={companyTelegram} onChange={e => setCompanyTelegram(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Globe size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Instagram Sahifa Havolasi
                  </label>
                  <input type="text" className="form-input" placeholder="https://instagram.com/voltmaxhub" value={companyInstagram} onChange={e => setCompanyInstagram(e.target.value)} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">
                    <MapPin size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Markaziy Ofis Manzili
                  </label>
                  <input type="text" className="form-input" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
                </div>

              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--meco-border)' }}>
                <button type="button" className="btn btn-primary" onClick={saveFooter} disabled={busyMap.footer}
                  style={{ fontWeight: '800', minWidth: '210px', justifyContent: 'center' }}>
                  <Save size={16} /> {busyMap.footer ? 'Saqlanmoqda...' : 'Footer Sozlamalarini Saqlash'}
                </button>
              </div>
              <BlockStatus block="footer" />
            </div>

            {/* 2b. Visitor Counter — own block, own save */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'var(--meco-primary-light)', color: 'var(--meco-primary)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    Sayt Tashriflari Hisoblagichi
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Footer dagi tashriflar sonini qo‘lda boshqarish
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tashriflar Soni (Visitor Counter Override)</label>
                <input type="number" min="0" className="form-input" value={visitCountInput}
                  onChange={e => setVisitCountInput(Number(e.target.value))} />
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--meco-border)' }}>
                <button type="button" className="btn btn-primary" onClick={saveVisitor} disabled={busyMap.visitor}
                  style={{ fontWeight: '800', minWidth: '210px', justifyContent: 'center' }}>
                  <Save size={16} /> {busyMap.visitor ? 'Saqlanmoqda...' : 'Tashriflar Sonini Saqlash'}
                </button>
              </div>
              <BlockStatus block="visitor" />
            </div>

            {/* 3. Telegram Bot & Legal Automation Card */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'rgba(56,189,248,0.1)', color: '#0284c7', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    Telegram Bot & Sud Qoidalari Sozlamalari
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Muddati o'tgan ijaralar bo'yicha Telegram bot va penya hisoblash integratsiyasi
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                <div className="form-group">
                  <label className="form-label">Telegram Bot Token (Serverda himoyalangan)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Bot tokenini kiriting (masalan: 123456:ABC-DEF...)" 
                    value={botToken || ''} 
                    onChange={e => setBotToken(e.target.value)} 
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Token faqat serverda saqlanadi, frontendga qaytarilmaydi. Bo'sh qoldirish — o'zgartirmaslik.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Chat ID (Raqamli ID)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Admin chat ID (masalan: 123456789)" 
                    value={botChatId} 
                    onChange={e => setBotChatId(e.target.value)} 
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Botga /start yuborgan adminning chat ID raqami.</span>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="form-label">Bot Sozlamalarini Tasdiqlash</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={validateBotSettings}
                    disabled={telegramBusy || !botToken.trim() || !botChatId.trim()}
                    style={{ fontWeight: '700', justifyContent: 'center' }}
                  >
                    {telegramBusy ? '⏳ Tekshirilmoqda...' : '✅ Token va Chat ID ni Tasdiqlash'}
                  </button>
                  {botValidationMsg && (
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: botValidationMsg.includes('✅') ? '#16a34a' : '#dc2626' }}>
                      {botValidationMsg}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Penya Stavkasi (% kunlik)</label>
                  <input type="number" step="0.1" className="form-input" value={penaltyRate} onChange={e => setPenaltyRate(Number(e.target.value))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Sudga Berish Muddati (kun o'tgach)</label>
                  <input type="number" min="1" max="90" className="form-input" value={legalNoticeDays} onChange={e => setLegalNoticeDays(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--meco-border)' }}>
                <button type="button" className="btn btn-primary" onClick={saveTelegram} disabled={busyMap.telegram}
                  style={{ fontWeight: '800', minWidth: '260px', justifyContent: 'center' }}>
                  <Save size={16} /> {busyMap.telegram ? 'Saqlanmoqda...' : 'Telegram Sozlamalarini Saqlash'}
                </button>
              </div>
              <BlockStatus block="telegram" />
            </div>

            {/* 4. Delivery & Rental Rules Card */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'rgba(147,51,234,0.1)', color: '#9333ea', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    Yetkazib Berish Vaqti va Ijara Muddatlari Boshqaruvi
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Yetkazib berish vaqti (default: 06:00 - 09:00) va maksimal/minimal ijara kunlarini admin tomonidan sozlash
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Yetkazib berish boshlanishi (Soat - AM)</label>
                  <input type="number" min="0" max="23" className="form-input" value={deliveryStartHour} onChange={e => setDeliveryStartHour(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Yetkazib berish tugashi (Soat - AM)</label>
                  <input type="number" min="0" max="23" className="form-input" value={deliveryEndHour} onChange={e => setDeliveryEndHour(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Mijozga Ko'rinadigan Matn (Delivery Slot Label)</label>
                  <input type="text" className="form-input" placeholder="06:00 - 09:00 (Ertalabki)" value={deliverySlotLabel} onChange={e => setDeliverySlotLabel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimal Ijara Muddati (kun)</label>
                  <input type="number" min="1" className="form-input" value={minRentalDays} onChange={e => setMinRentalDays(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maksimal Ijara Chegarasi (kun)</label>
                  <input type="number" min="1" max="365" className="form-input" value={maxRentalDays} onChange={e => setMaxRentalDays(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--meco-border)' }}>
                <button type="button" className="btn btn-primary" onClick={saveDelivery} disabled={busyMap.delivery}
                  style={{ fontWeight: '800', minWidth: '250px', justifyContent: 'center' }}>
                  <Save size={16} /> {busyMap.delivery ? 'Saqlanmoqda...' : 'Yetkazib Berish Sozlamalarini Saqlash'}
                </button>
              </div>
              <BlockStatus block="delivery" />
            </div>

            {/* 5. MyID Integration Token Card */}
            <div style={{ background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--meco-border)' }}>
                <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--meco-text-main)' }}>
                    MyID O'zbekiston Davlat Verifikatsiya Sozlamalari
                  </div>
                  <div style={{ color: 'var(--meco-text-muted)', fontSize: '0.78rem' }}>
                    Rasmiy MyID tokenlari va API kalitlari kelganda shu yerga kiritish bilan integratsiya faollashadi.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={myIdEnabled} onChange={e => setMyIdEnabled(e.target.checked)} />
                    <span>MyID Verifikatsiya Tizimi Faol Holatda (Enabled / Mock Ready)</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">MyID Client ID / API Key (Token kelsa kiritiladi)</label>
                  <input type="text" className="form-input" placeholder="client_id_meco_123..." value={myIdClientId} onChange={e => setMyIdClientId(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MyID Client Secret (Token kelsa kiritiladi)</label>
                  <input type="password" className="form-input" placeholder="secret_key_abc..." value={myIdClientSecret} onChange={e => setMyIdClientSecret(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--meco-border)' }}>
                <button type="button" className="btn btn-primary" onClick={saveMyId} disabled={busyMap.myid}
                  style={{ fontWeight: '800', minWidth: '210px', justifyContent: 'center' }}>
                  <Save size={16} /> {busyMap.myid ? 'Saqlanmoqda...' : 'MyID Sozlamalarini Saqlash'}
                </button>
              </div>
              <BlockStatus block="myid" />
            </div>

          </div>
        )}


      </main>

      {/* KYC Photo Viewer Modal */}
      {selectedKycDoc && (
        <div className="modal-overlay" onClick={() => setSelectedKycDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>KYC Hujjat Rasmlari — {selectedKycDoc.user?.phone || selectedKycDoc.user_phone}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSelectedKycDoc(null)}><XCircle size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--meco-text-main)' }}>Pasport Hujjat Rasm:</strong>
                {(selectedKycDoc.passportFront || selectedKycDoc.passport_front) ? (
                  <img 
                    src={selectedKycDoc.passportFront || selectedKycDoc.passport_front} 
                    alt="Passport Front" 
                    style={{ width: '100%', height: '220px', objectFit: 'contain', background: '#0f172a', borderRadius: '10px', marginTop: '8px', border: '1px solid var(--meco-border)' }} 
                  />
                ) : (
                  <div style={{ background: 'var(--meco-bg)', border: '2px dashed var(--meco-border)', borderRadius: '12px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--meco-text-muted)', fontSize: '0.85rem', fontWeight: '700', padding: '1rem', textAlign: 'center', marginTop: '8px' }}>
                    ⚠️ Pasport rasmi yuklanmagan
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', marginTop: '4px' }}>Mijoz hali pasport rasmini taqdim etmadi</span>
                  </div>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--meco-text-main)' }}>Pasport Bilan Selfie:</strong>
                {(selectedKycDoc.selfieUrl || selectedKycDoc.selfie_with_passport) ? (
                  <img 
                    src={selectedKycDoc.selfieUrl || selectedKycDoc.selfie_with_passport} 
                    alt="Selfie" 
                    style={{ width: '100%', height: '220px', objectFit: 'contain', background: '#0f172a', borderRadius: '10px', marginTop: '8px', border: '1px solid var(--meco-border)' }} 
                  />
                ) : (
                  <div style={{ background: 'var(--meco-bg)', border: '2px dashed var(--meco-border)', borderRadius: '12px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--meco-text-muted)', fontSize: '0.85rem', fontWeight: '700', padding: '1rem', textAlign: 'center', marginTop: '8px' }}>
                    ⚠️ Selfie rasmi yuklanmagan
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', marginTop: '4px' }}>Mijoz hali selfie rasmini taqdim etmadi</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
