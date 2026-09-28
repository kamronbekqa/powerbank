import React, { useState } from 'react';
import { 
  X, Zap, ShoppingCart, Calendar, CheckCircle2, ShieldCheck, 
  Smartphone, Laptop, Tv, Fan, Home, Coffee, Cpu, BatteryCharging, Sun, Car, Flame, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { translateProduct } from '../utils/translations';

export default function ProductViewModal({ product: rawProduct, onClose, onBuy, onRent, t = {}, lang = 'UZ' }) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  if (!rawProduct) return null;
  const product = translateProduct(rawProduct, lang);

  const buyP = product.buyPrice ? Number(product.buyPrice) : null;
  const oldBuyP = product.oldBuyPrice ? Number(product.oldBuyPrice) : null;
  const rentP = product.rentPrice ? Number(product.rentPrice) : null;
  const oldRentP = product.oldRentPrice ? Number(product.oldRentPrice) : null;
  const specs = Array.isArray(product.usageSpecs) ? product.usageSpecs : [];

  const allImages = (product.images && product.images.length > 0) 
    ? product.images 
    : [product.image_url || '/assets/meco_320wh.png'];

  const currentImage = allImages[selectedImageIdx] || allImages[0];

  const getApplianceIcon = (iconType) => {
    switch (iconType) {
      case 'phone': return <Smartphone size={22} style={{ color: '#2563eb' }} />;
      case 'laptop': return <Laptop size={22} style={{ color: '#0284c7' }} />;
      case 'fan': return <Fan size={22} style={{ color: '#0d9488' }} />;
      case 'tv': return <Tv size={22} style={{ color: '#7c3aed' }} />;
      case 'fridge': return <Home size={22} style={{ color: '#059669' }} />;
      case 'ac': return <Flame size={22} style={{ color: '#ea580c' }} />;
      case 'coffee': return <Coffee size={22} style={{ color: '#b45309' }} />;
      case 'car': return <Car size={22} style={{ color: '#16a34a' }} />;
      case 'sun': return <Sun size={22} style={{ color: '#d97706' }} />;
      default: return <BatteryCharging size={22} style={{ color: '#2563eb' }} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '800' }}>
                <Zap size={14} /> {t.capacityLabel || "SIG'IMI:"} {product.capacity || 'Solar Generator'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '800' }}>
                <ShieldCheck size={14} /> {t.megmeetInside || "MEGMEET INSIDE"}
              </span>
              {(oldRentP || oldBuyP) && (
                <span style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '800' }}>
                  {t.specialOfferBanner || "🔥 MAXSUS AKSIYA TAKLIFI"}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>{product.title}</h2>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Product Snapshot & Price Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.25rem', marginBottom: '1.5rem', background: 'var(--meco-bg)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--meco-border)' }}>
          
          {/* Left Column: Image Box with Uncropped Center Focus & Gallery Thumbnails */}
          <div>
            <div 
              style={{ 
                height: '250px', 
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
              }}
              onClick={() => setFullscreenPhoto(currentImage)}
              title="Katta ko'rinishda ochish uchun bosing"
            >
              <img 
                src={currentImage} 
                alt={product.title} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain', 
                  objectPosition: 'center',
                  transform: 'scale(0.9)',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                  transition: 'transform 0.3s ease'
                }}
              />
              <span style={{ 
                position: 'absolute', 
                bottom: '8px', 
                right: '8px', 
                background: 'rgba(15,23,42,0.85)', 
                color: '#38bdf8', 
                fontSize: '0.7rem', 
                fontWeight: '700', 
                padding: '3px 8px', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backdropFilter: 'blur(4px)'
              }}>
                <Eye size={12} /> Kattaroq ko'rish
              </span>
            </div>

            {/* Thumbnails Strip */}
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {allImages.map((imgUrl, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      border: idx === selectedImageIdx ? '2px solid #2563eb' : '1px solid var(--meco-border)',
                      padding: '4px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: idx === selectedImageIdx ? 1 : 0.65,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--meco-text-main)', marginBottom: '4px' }}>
                {t.productSpecsTitle || "Mahsulot Xususiyati:"}
              </h4>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                {product.description}
              </p>
            </div>

            <div style={{ background: 'var(--meco-card-bg, #fff)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--meco-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--meco-text-muted)', fontWeight: '600' }}>{t.buyPrice || "Sotib olish narxi:"}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {oldBuyP && oldBuyP > buyP && (
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.82rem' }}>
                      {oldBuyP.toLocaleString()} UZS
                    </span>
                  )}
                  <strong style={{ color: 'var(--meco-text-main)' }}>{buyP ? `${buyP.toLocaleString()} UZS` : (t.unavailable || 'Mavjud emas')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', borderTop: '1px dashed var(--meco-border)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--meco-text-muted)', fontWeight: '600', fontSize: '0.85rem' }}>{t.rentPrice || "Kunlik ijara narxi:"}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {oldRentP && oldRentP > rentP && (
                    <span style={{ textDecoration: 'line-through', color: '#ef4444', textDecorationThickness: '2px', fontSize: '0.92rem', fontWeight: '700' }}>
                      {oldRentP.toLocaleString()} UZS
                    </span>
                  )}
                  <strong style={{ color: oldRentP ? '#ef4444' : 'var(--meco-primary)', fontSize: '1.1rem', fontWeight: '800' }}>
                    {rentP ? `${rentP.toLocaleString()} ${t.perDay || 'UZS/kun'}` : (t.unavailable || 'Mavjud emas')}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specification Parameters Grid (Extracted from MECO Official Sheets) */}
        <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={18} style={{ color: 'var(--meco-primary)' }} /> {t.techParamsTitle || "Texnik Parametrlar & Xavfsizlik (Specification Parameters)"}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', fontSize: '0.82rem' }}>
            <div style={{ background: '#fff', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block' }}>{t.batteryChemistry || "Akkumulyator Kimyosi:"}</span>
              <strong style={{ color: '#0f172a' }}>Lithium-iron phosphate (LiFePO4)</strong>
            </div>
            <div style={{ background: '#fff', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block' }}>{t.lifespan || "Ishlash Resursi:"}</span>
              <strong style={{ color: '#10b981' }}>{t.lifespanVal || "8000+ sikl (Lifespan)"}</strong>
            </div>
            <div style={{ background: '#fff', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block' }}>{t.portsOutput || "Portlar & Chiqish:"}</span>
              <strong style={{ color: '#0f172a' }}>Type-C 100W PD / Pure Sine AC</strong>
            </div>
            <div style={{ background: '#fff', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', display: 'block' }}>{t.certificationsProtection || "Sertifikatlar & Himoya:"}</span>
              <strong style={{ color: '#0f172a' }}>UN38.3 / IEC62368 / IP20</strong>
            </div>
          </div>
        </div>

        {/* APPLIANCE RUNTIME ESTIMATE CHART ("NIMA NARSA QANCHAGA YETISHI") */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BatteryCharging size={20} style={{ color: 'var(--meco-primary)' }} />
            {t.applianceTitle || "Elektr Jihozlari Qancha Vaqtga Yetadi?"}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {specs.length > 0 ? (
              specs.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    padding: '0.85rem', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px' }}>
                    {getApplianceIcon(item.icon)}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', display: 'block' }}>{item.name}</span>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{item.runTime}</strong>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', color: '#64748b', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                Ushbu generator maishiy texnikalar va elektronika qurilmalarini uzluksiz elektr bilan ta'minlaydi.
              </div>
            )}
          </div>
        </div>

        {/* Warranty & Delivery Guarantee Banner */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.85rem' }}>
          <ShieldCheck size={20} />
          <span><strong>{t.mecoOfficialWarranty || "Meco Rasmiy Kafolati:"}</strong> {t.warrantyText || "Barcha generatorlar zaryadlash kabellari va kafolat talonlari bilan birga taqdim etiladi. Tezkor va xavfsiz rasmiylashtirish."}</span>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid var(--meco-border)', paddingTop: '1.25rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => onBuy(product)}
            style={{ height: '46px', fontWeight: '800', justifyContent: 'center' }}
          >
            <ShoppingCart size={18} />
            Sotib Olish ({buyP ? `${buyP.toLocaleString()} UZS` : ''})
          </button>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => onRent(product)}
            style={{ height: '46px', fontWeight: '800', justifyContent: 'center', background: oldRentP ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined, borderColor: oldRentP ? '#dc2626' : undefined }}
          >
            <Calendar size={18} />
            Ijaraga Olish ({rentP ? `${rentP.toLocaleString()} UZS/kun` : ''})
          </button>
        </div>

      </div>

      {/* FULL-SCREEN LIGHTBOX MODAL FOR UNCROPPED PHOTO ZOOM */}
      {fullscreenPhoto && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setFullscreenPhoto(null)}
        >
          <button 
            onClick={() => setFullscreenPhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10000
            }}
          >
            <X size={24} />
          </button>

          <img 
            src={fullscreenPhoto} 
            alt="Fullscreen view" 
            style={{
              maxWidth: '92vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              objectPosition: 'center',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
