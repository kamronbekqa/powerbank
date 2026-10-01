import React, { useState } from 'react';
import { X, Calendar, ShoppingCart, ShieldCheck, AlertCircle, CheckCircle2, CreditCard, Plus, Trash2, Image as ImageIcon, Clock, Smartphone, Lock } from 'lucide-react';
import { translateProduct } from '../utils/translations';
import { Spinner } from './SkeletonLoader';

export default function ProductDetailModal({ product: rawProduct, onClose, onBookOrder, user, siteSettings = {}, t = {}, lang = 'UZ' }) {
  if (!rawProduct) return null;
  const product = translateProduct(rawProduct, lang);

  const isUserVerified = Boolean(user?.isVerified);

  const [orderType, setOrderType] = useState(rawProduct?.selectedMode || 'RENT'); // 'BUY' or 'RENT'
  
  // Rent fields
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(tomorrowStr);
  
  // Delivery Time Slot state
  const deliverySlot = siteSettings?.deliverySlotLabel || `${String(siteSettings?.deliveryStartHour || 6).padStart(2, '0')}:00 - ${String(siteSettings?.deliveryEndHour || 9).padStart(2, '0')}:00 (Ertalabki)`;
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(deliverySlot);

  // MyID state (Mock / Token Ready)
  const [myIdLoading, setMyIdLoading] = useState(false);
  const [myIdSuccess, setMyIdSuccess] = useState(false);
  const [myIdMsg, setMyIdMsg] = useState('');

  // User & KYC fields
  const [phone, setPhone] = useState(user?.phone || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [passportSeries, setPassportSeries] = useState(user?.passportSeries || '');
  const [pinfl, setPinfl] = useState(user?.pinfl || '');
  
  // Image dropzone states with central '+' icon
  const [passportFront, setPassportFront] = useState(user?.passportFront || '');
  const [selfieUrl, setSelfieUrl] = useState(user?.selfieUrl || '');
  const [isDragPassport, setIsDragPassport] = useState(false);
  const [isDragSelfie, setIsDragSelfie] = useState(false);

  const [acceptedOferta, setAcceptedOferta] = useState(false);
  
  // Payment choice for Buy mode
  const [paymentProvider, setPaymentProvider] = useState('CLICK'); // 'CLICK' or 'PAYME'

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const buyPrice = product.buyPrice ? Number(product.buyPrice) : 0;
  const rentPrice = product.rentPrice ? Number(product.rentPrice) : 0;

  const maxDays = siteSettings?.maxRentalDays || 30;

  // Exact Days Calculation
  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const days = calculateDays();
  const totalRentPrice = days * rentPrice;

  // Handle Drag & Drop File Uploads for Passport & Selfie
  const handleProcessImageFile = (file, targetType) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (targetType === 'passport') setPassportFront(e.target.result);
      if (targetType === 'selfie') setSelfieUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleMyIdSimulate = () => {
    setMyIdLoading(true);
    setMyIdMsg('');
    setTimeout(() => {
      setMyIdLoading(false);
      setMyIdSuccess(true);
      setMyIdMsg("MyID orqali shaxsingiz (O'zbekiston Pasport/ID-karta) tasdiqlandi!");
      if (!fullName) setFullName(user?.fullName || "Tasdiqlangan Fuqaro");
      if (!passportSeries) setPassportSeries(user?.passportSeries || "AA1234567");
      if (!pinfl) setPinfl(user?.pinfl || "31204958390124");
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone) {
      setErrorMsg('Telefon raqamingizni kiriting.');
      return;
    }

    if (orderType === 'RENT') {
      if (!startDate || !endDate) {
        setErrorMsg('Boshlanish va tugash sanalarini tanlang.');
        return;
      }
      if (days <= 0) {
        setErrorMsg('Tugash sanasi boshlanish sanasidan keyin bo\'lishi shart.');
        return;
      }
      if (days > maxDays) {
        setErrorMsg(`Maksimal ijara muddati ${maxDays} kundan oshmasligi kerak.`);
        return;
      }
      if (!isUserVerified && (!passportSeries.trim() || !/^\d{14}$/.test(pinfl) || !passportFront || !selfieUrl)) {
        setErrorMsg('Ijara uchun pasport seriyasi, 14 xonali PINFL, pasport rasmi va pasport bilan selfi majburiy.');
        return;
      }
      if (!acceptedOferta) {
        setErrorMsg('VOLTMAXHUB RENTAL ommaviy oferta shartlariga rozilik bildirishingiz kerak.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.id,
        phone,
        fullName,
        productId: product.id,
        type: orderType,
        startDate: orderType === 'RENT' ? startDate : null,
        endDate: orderType === 'RENT' ? endDate : null,
        deliveryTimeSlot: orderType === 'RENT' ? deliveryTimeSlot : null,
        totalAmount: orderType === 'BUY' ? buyPrice : totalRentPrice,
        passportSeries: (orderType === 'RENT' && !isUserVerified) ? passportSeries : (user?.passportSeries || null),
        pinfl: (orderType === 'RENT' && !isUserVerified) ? pinfl : (user?.pinfl || null),
        passportFront: (orderType === 'RENT' && !isUserVerified) ? (passportFront || null) : (user?.passportFront || null),
        selfieUrl: (orderType === 'RENT' && !isUserVerified) ? (selfieUrl || null) : (user?.selfieUrl || null),
        paymentProvider: orderType === 'BUY' ? paymentProvider : null
      };

      await onBookOrder(payload);
    } catch (err) {
      setErrorMsg(err.message || 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', padding: '1.75rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>{product.title}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--meco-text-muted)' }}>Sig'imi: {product.capacity || 'Generator'}</span>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>

        {errorMsg && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Product Snapshot */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', background: 'var(--meco-bg)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--meco-border)' }}>
          <img 
            src={product.images && product.images.length > 0 ? product.images[0] : (product.image_url || 'https://images.unsplash.com/photo-1508873696983-2df515122519?w=600&auto=format&fit=crop&q=60')} 
            alt={product.title} 
            style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '8px' }}
          />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>{product.title}</h4>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '4px', fontSize: '0.88rem' }}>
              <span>Sotib olish: <strong>{buyPrice.toLocaleString()} UZS</strong></span>
              <span>Kunlik ijara: <strong style={{ color: 'var(--meco-primary)' }}>{rentPrice.toLocaleString()} UZS/kun</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Option A vs Option B */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button 
            type="button"
            className={`btn ${orderType === 'BUY' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOrderType('BUY')}
            style={{ justifyContent: 'center', height: '42px', fontWeight: '700' }}
          >
            <ShoppingCart size={16} />
            Option A: Sotib Olish
          </button>
          <button 
            type="button"
            className={`btn ${orderType === 'RENT' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setOrderType('RENT')}
            style={{ justifyContent: 'center', height: '42px', fontWeight: '700' }}
          >
            <Calendar size={16} />
            Option B: Ijaraga Olish
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* OPTION A: DIRECT BUY */}
          {orderType === 'BUY' && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--meco-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={18} /> To'lov Tizimi Oqimi (Click / Payme Checkout)
              </h4>
              
              <div className="form-group">
                <label className="form-label">Telefon Raqamingiz</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+998901234567" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">To'lov Usulini Tanlang</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '6px' }}>
                  <div 
                    onClick={() => setPaymentProvider('CLICK')}
                    style={{
                      border: paymentProvider === 'CLICK' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: paymentProvider === 'CLICK' ? '#eff6ff' : '#fff',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: '#1e40af'
                    }}
                  >
                    CLICK PASS
                  </div>
                  <div 
                    onClick={() => setPaymentProvider('PAYME')}
                    style={{
                      border: paymentProvider === 'PAYME' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: paymentProvider === 'PAYME' ? '#f0fdfa' : '#fff',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: '#0f766e'
                    }}
                  >
                    PAYME
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Jami To'lov Summasi:</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--meco-primary)' }}>{buyPrice.toLocaleString()} UZS</strong>
              </div>
            </div>
          )}

          {/* OPTION B: DAILY RENTAL + KYC FORM */}
          {orderType === 'RENT' && (
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: '#eff6ff', color: '#1e3a8a', border: '1px solid #bfdbfe', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
                <span aria-hidden="true">📍</span>
                <span><strong>Ijara xizmati hozircha Yangi Yo‘l omboridan amalga oshiriladi.</strong> Kelgusida xizmatimizni 12 ta viloyatga kengaytirib, yangi filiallar ochishni rejalashtiryapmiz.</span>
              </div>
              {/* Date Selection & Calculator */}
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#6b21a8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={18} /> Ijara Sanalari va Avto-Hisoblash
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Boshlanish Sanasi</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tugash Sanasi</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* DELIVERY TIME SLOT & MYID INTEGRATION */}
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed #d8b4fe', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  {/* Delivery time slot picker */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b21a8', fontWeight: '700' }}>
                      <Clock size={15} /> Yetkazib berish vaqti (Ertalabki oyna)
                    </label>
                    <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #c084fc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#f3e8ff', color: '#7e22ce', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
                          AM
                        </span>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#4c1d95' }}>
                            {deliverySlot}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b21a8' }}>
                            Admin sozlagan yetkazish oralig'i (Ertalabki delivery)
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        Belgilangan
                      </span>
                    </div>
                  </div>

                  {/* MyID Verification Button (Ready Mode) */}
                  <div style={{ background: '#fff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.75rem' }}>
                        MyID
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
                          MyID Verifikatsiyasi (Token Integratsiya Tayyor)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Pasport / ID-karta orqali 1-soniyada shaxsni tasdiqlash
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleMyIdSimulate}
                      disabled={myIdLoading || myIdSuccess}
                      className="btn btn-sm btn-primary"
                      style={{ height: '34px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px' }}
                    >
                      {myIdLoading ? (
                        <>
                          <Spinner size={14} color="#fff" />
                          <span>Tekshirilmoqda...</span>
                        </>
                      ) : myIdSuccess ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>MyID Tasdiqlandi</span>
                        </>
                      ) : (
                        <>
                          <Smartphone size={14} />
                          <span>MyID Bilan Kiring</span>
                        </>
                      )}
                    </button>
                  </div>

                  {myIdMsg && (
                    <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '700', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} /> {myIdMsg}
                    </div>
                  )}

                </div>

                {/* DYNAMIC PRICE SUMMARY (1 day = rentPrice UZS, e.g. 150,000 UZS) */}
                {(() => {
                  const oldRentPrice = product.oldRentPrice ? Number(product.oldRentPrice) : null;
                  const totalOldRent = oldRentPrice ? days * oldRentPrice : null;
                  const savings = totalOldRent ? totalOldRent - totalRentPrice : 0;

                  return (
                    <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '0.9rem 1.1rem', borderRadius: '10px', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>Ijara davomiyligi:</span>
                        <strong style={{ color: '#6b21a8' }}>{days} kun</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: '800' }}>
                        <span>Jami Ijara Summasi:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {totalOldRent && totalOldRent > totalRentPrice && (
                            <span style={{ textDecoration: 'line-through', color: '#ef4444', fontSize: '1rem', fontWeight: '600' }}>
                              {totalOldRent.toLocaleString()} UZS
                            </span>
                          )}
                          <span style={{ color: totalOldRent ? '#ef4444' : '#7e22ce' }}>{totalRentPrice.toLocaleString()} UZS</span>
                        </div>
                      </div>
                      {savings > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#16a34a', fontWeight: '700', textAlign: 'right' }}>
                          🔥 Chegirma bilan {savings.toLocaleString()} UZS tejab qoldingiz!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* IF USER IS ALREADY KYC VERIFIED -> HIDE FORM & SHOW PREAPPROVED BANNER */}
              {isUserVerified ? (
                <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1.5px solid #86efac', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#14532d', margin: 0 }}>
                        KYC Shaxsingiz Oldin Tasdiqlangan!
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: '#166534', margin: '2px 0 0 0' }}>
                        Hujjatlarni qayta yuborish shart emas. Rasmdagi KYC formasi siz uchun avtomatik yopildi.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#fff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bbf7d0', marginTop: '0.75rem', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>Mijoz Telefon:</span>
                      <strong style={{ color: '#0f172a' }}>{user?.phone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>Pasport / JSHSHIR:</span>
                      <strong style={{ color: '#0f172a' }}>{user?.passportSeries || 'Tasdiqlangan'} / {user?.pinfl || '••••••••••••••'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                /* KYC FORM MODULE FOR UNVERIFIED USERS */
                <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--meco-text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} style={{ color: 'var(--meco-primary)' }} />
                    KYC Shaxsni Tasdiqlash Hujjatlari Formasi
                  </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Telefon Raqamingiz</label>
                    <input type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998901234567" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">F.I.SH (Ism va Familiya)</label>
                    <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alisher Qayumov" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Pasport Seriyasi va Raqami <span className="required-mark">*</span></label>
                    <input type="text" className="form-input" value={passportSeries} onChange={e => setPassportSeries(e.target.value.toUpperCase())} placeholder="AA1234567" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PINFL / JSHSHIR (14 xonali kod) <span className="required-mark">*</span></label>
                    <input type="text" className="form-input" value={pinfl} onChange={e => setPinfl(e.target.value.replace(/\D/g, ''))} placeholder="31204958390124" required maxLength={14} inputMode="numeric" />
                  </div>
                </div>

                {/* PASSPORT & SELFIE DRAG & DROP UPLOAD BOXES WITH CENTER '+' ICON */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  {/* PASSPORT FRONT DROPZONE */}
                  <div>
                    <label className="form-label">Pasport Nusxasi (Rasm) <span className="required-mark">*</span></label>
                    {passportFront ? (
                      <div style={{ position: 'relative', height: '130px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #2563eb' }}>
                        <img src={passportFront} alt="Passport Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => setPassportFront('')}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragPassport(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragPassport(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragPassport(false);
                          if (e.dataTransfer.files[0]) handleProcessImageFile(e.dataTransfer.files[0], 'passport');
                        }}
                        onClick={() => document.getElementById('kyc-passport-input').click()}
                        style={{
                          border: isDragPassport ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                          background: isDragPassport ? '#eff6ff' : '#ffffff',
                          borderRadius: '14px',
                          padding: '1.25rem 0.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          id="kyc-passport-input"
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => e.target.files[0] && handleProcessImageFile(e.target.files[0], 'passport')} 
                          style={{ display: 'none' }}
                        />
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px auto',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
                        }}>
                          <Plus size={24} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', display: 'block' }}>Pasport Rasmini Joylang</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Faylni sudrab keling yoki bosing</span>
                      </div>
                    )}
                  </div>

                  {/* SELFIE DROPZONE */}
                  <div>
                    <label className="form-label">Pasport bilan Selfie (Rasm) <span className="required-mark">*</span></label>
                    {selfieUrl ? (
                      <div style={{ position: 'relative', height: '130px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #2563eb' }}>
                        <img src={selfieUrl} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          type="button" 
                          onClick={() => setSelfieUrl('')}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragSelfie(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragSelfie(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragSelfie(false);
                          if (e.dataTransfer.files[0]) handleProcessImageFile(e.dataTransfer.files[0], 'selfie');
                        }}
                        onClick={() => document.getElementById('kyc-selfie-input').click()}
                        style={{
                          border: isDragSelfie ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                          background: isDragSelfie ? '#eff6ff' : '#ffffff',
                          borderRadius: '14px',
                          padding: '1.25rem 0.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          id="kyc-selfie-input"
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => e.target.files[0] && handleProcessImageFile(e.target.files[0], 'selfie')} 
                          style={{ display: 'none' }}
                        />
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px auto',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
                        }}>
                          <Plus size={24} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', display: 'block' }}>Selfie Rasmini Joylang</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Faylni sudrab keling yoki bosing</span>
                      </div>
                    )}
                  </div>

                  </div>
                </div>
              )}

              {/* Oferta Shartnomasi */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#0369a1', lineHeight: '1.4' }}>
                  <input 
                    type="checkbox" 
                    checked={acceptedOferta} 
                    onChange={e => setAcceptedOferta(e.target.checked)} 
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    Men <strong>VOLTMAXHUB RENTAL Ommaviy Oferta Shartnomasi</strong> bilan tanishdim. Uskunani o'z vaqtida qaytarish majburiyatini olaman. Qaytarish muddati 3 kundan oshganda, Uzbekiston Fuqarolik Kodeksi 535, 550-moddalariga muvofiq sud arizasi (Da'vo arizasi) shakllantirilishiga roziman.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--meco-border)', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '44px', fontWeight: '700' }} disabled={loading}>
              {orderType === 'BUY' ? (
                <>
                  <CreditCard size={18} />
                  {paymentProvider} Bilan To'lov Qilish ({buyPrice.toLocaleString()} UZS)
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Ijara Buyurtmasini Va KYC Hujjatini Yuborish ({totalRentPrice.toLocaleString()} UZS)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
