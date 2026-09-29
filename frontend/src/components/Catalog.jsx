import React, { useState } from 'react';
import { Search, Zap, ShoppingCart, Calendar, CheckCircle2, Eye, BatteryCharging, Image as ImageIcon, Heart } from 'lucide-react';
import { translateProduct } from '../utils/translations';
import { ProductCardSkeleton } from './SkeletonLoader';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1548611716-300181512403?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508873696983-2df515122519?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1592833159057-65a2846f481c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
];

export default function Catalog({ products, onSelectProduct, onViewProduct, onAddToWishlist, wishlist = [], loading = false, t = {}, lang = 'UZ' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('ALL');
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const getProductImage = (product, idx) => {
    if (imageErrors[product.id]) {
      return FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
    }
    let imgList = [];
    try {
      if (typeof product.images === 'string') {
        imgList = JSON.parse(product.images);
      } else if (Array.isArray(product.images)) {
        imgList = product.images;
      }
    } catch (e) {
      imgList = [];
    }

    if (imgList && imgList.length > 0 && imgList[0]) return imgList[0];
    if (product.image_url) return product.image_url;
    return FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
  };

  const filteredProducts = products.filter(rawP => {
    const p = translateProduct(rawP, lang);
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.capacity && p.capacity.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesCapacity = true;
    if (selectedCapacity === '1kWh') matchesCapacity = p.title.toLowerCase().includes('1kwh');
    else if (selectedCapacity === '2kWh') matchesCapacity = p.title.toLowerCase().includes('2kwh') || p.title.toLowerCase().includes('1.8kwh');
    else if (selectedCapacity === '3kWh+') matchesCapacity = p.title.toLowerCase().includes('3.6kwh') || p.title.toLowerCase().includes('5.4kwh');
    else if (selectedCapacity === 'Solar') matchesCapacity = p.title.toLowerCase().includes('cola') || p.title.toLowerCase().includes('solar');

    return matchesSearch && matchesCapacity;
  });

  return (
    <div className="container">
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
        color: '#fff',
        padding: '2.5rem 2rem',
        borderRadius: '20px',
        marginBottom: '2rem',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '780px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(37, 99, 235, 0.3)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', color: '#60a5fa', marginBottom: '1rem' }}>
            <Zap size={14} /> MECO OFFICIAL PLATFORM
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: 1.25, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            {t.heroTitle || "Meco Quyosh Generatorlari va Powerbank Stansiyalari"}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t.heroDesc || "Har bir generator qaysi elektr jihoziga va qancha vaqtga yetishini bilib oling."}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}><CheckCircle2 size={16} /> {t.onlineKycContract || "Online KYC Shartnomasi"}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}><CheckCircle2 size={16} /> {t.clickPaymePayments || "Click / Payme To'lovlari"}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}><CheckCircle2 size={16} /> {t.oneYearWarranty || "6 Oylik Kafolat"}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--meco-text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder={t.searchPlaceholder || "Meco generator nomini yoki watt sig'imini qidirish..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '42px', height: '46px', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: t.allGenerators || 'Barcha Generatorlar' },
            { id: '1kWh', label: t.models1kWh || '1kWh Modellar' },
            { id: '2kWh', label: t.models2kWh || '1.8kWh & 2kWh' },
            { id: '3kWh+', label: t.modelsHeavy || '3.6kWh & 5.4kWh Heavy' },
            { id: 'Solar', label: t.solarPanels || 'Quyosh Panellari' }
          ].map(cat => (
            <button 
              key={cat.id} 
              className={`btn ${selectedCapacity === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCapacity(cat.id)}
              style={{ height: '46px' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid-products">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
        ) : filteredProducts.filter(rawP => rawP.isAvailable !== false).map((rawP, idx) => {
          const product = translateProduct(rawP, lang);
          const buyP = product.buyPrice ? Number(product.buyPrice) : null;
          const oldBuyP = product.oldBuyPrice ? Number(product.oldBuyPrice) : null;
          const rentP = product.rentPrice ? Number(product.rentPrice) : null;
          const oldRentP = product.oldRentPrice ? Number(product.oldRentPrice) : null;
          
          let specs = product.usageSpecs || [];
          const imgSrc = getProductImage(product, idx);
          const hasDiscount = (oldRentP && oldRentP > rentP) || (oldBuyP && oldBuyP > buyP);

          return (
            <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Product Image Container with Overlays */}
              <div 
                className="card-img-container"
                onClick={() => onViewProduct(product)}
                style={{ cursor: 'pointer', position: 'relative', height: '238px', padding: '1rem' }}
              >
                <img 
                  src={imgSrc} 
                  alt={product.title} 
                  className="card-img" 
                  style={{ objectFit: 'contain', transform: 'scale(0.9)' }}
                  onError={() => handleImageError(product.id)}
                />
                
                {/* Gradient vignette for badge readability */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(0,0,0,0) 45%, rgba(15,23,42,0.6) 100%)',
                  pointerEvents: 'none'
                }} />

                <div className="card-badges">
                  <span className="badge badge-info card-badges-left" style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#38bdf8',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}>
                    <Zap size={12} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.capacity || 'Solar Generator'}</span>
                  </span>

                  <div className="card-badges-right">
                    {hasDiscount && (
                      <span className="badge" style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)'
                      }}>
                        {t.specialOffer || '🔥 AKSIYA'}
                      </span>
                    )}
                    <span className={`badge ${product.isAvailable ? 'badge-success' : 'badge-danger'}`} style={{ backdropFilter: 'blur(6px)' }}>
                      {product.isAvailable ? (t.sotuvda || 'Sotuvda / Ijarada') : (t.band || 'Band')}
                    </span>
                  </div>
                </div>
                {/* Wishlist heart buttons overlay on image */}
                {onAddToWishlist && (
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 4 }}>
                    {(() => {
                      const inWishlist = wishlist.find(i => i.id === product.id);
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAddToWishlist(product, inWishlist?.tag === 'favorite' ? 'planned' : 'favorite'); }}
                          title={inWishlist ? 'Savatda bor' : 'Savatga qo\'shish'}
                          style={{
                            background: inWishlist ? '#ef4444' : 'rgba(15,23,42,0.75)',
                            border: inWishlist ? '1.5px solid #ef4444' : '1.5px solid rgba(255,255,255,0.2)',
                            borderRadius: '50%', width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(6px)',
                            transition: 'all 0.2s', color: '#fff'
                          }}
                        >
                          <Heart size={14} style={{ fill: inWishlist ? '#fff' : 'none' }} />
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 
                  className="card-title" 
                  style={{ fontSize: '1.2rem', marginBottom: '0.4rem', cursor: 'pointer' }}
                  onClick={() => onViewProduct(product)}
                >
                  {product.title}
                </h3>

                <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.85rem', marginBottom: '1rem', minHeight: '40px', maxHeight: '40px', overflow: 'hidden', lineHeight: '1.4' }}>
                  {product.description}
                </p>

                {/* Appliance Usage Preview Chips */}
                {specs.length > 0 && (
                  <div 
                    onClick={() => onViewProduct(product)}
                    style={{ 
                      background: 'var(--meco-bg)', 
                      padding: '0.7rem 0.8rem', 
                      borderRadius: '10px', 
                      marginBottom: '1rem',
                      cursor: 'pointer',
                      border: '1px solid var(--meco-border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--meco-primary)', fontWeight: '800', marginBottom: '4px' }}>
                      <BatteryCharging size={14} /> {t.nechaSoatgaYetadi || 'NECHA SOATGA YETADI:'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--meco-text-main)', fontWeight: '600' }}>
                      • {specs[0]?.name}: <strong style={{ color: 'var(--meco-primary)' }}>{specs[0]?.runTime}</strong><br/>
                      {specs[1] && <span>• {specs[1]?.name}: <strong style={{ color: 'var(--meco-primary)' }}>{specs[1]?.runTime}</strong></span>}
                    </div>
                  </div>
                )}
                
                {/* Price Display with Strikethrough Promotional Pricing */}
                <div style={{ background: 'var(--meco-bg)', border: '1px solid var(--meco-border)', padding: '0.65rem 0.75rem', borderRadius: '10px', marginBottom: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)', fontWeight: '600' }}>{t.buyPrice || 'Sotib olish:'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {oldBuyP && oldBuyP > buyP && (
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                          {oldBuyP.toLocaleString()} UZS
                        </span>
                      )}
                      <strong style={{ fontSize: '0.9rem', color: 'var(--meco-text-main)' }}>
                        {buyP ? `${buyP.toLocaleString()} UZS` : (t.unavailable || 'Mavjud emas')}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--meco-border)', paddingTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)', fontWeight: '600' }}>{t.rentPrice || 'Kunlik ijara:'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {oldRentP && oldRentP > rentP && (
                        <span style={{ textDecoration: 'line-through', color: '#ef4444', textDecorationThickness: '2px', fontSize: '0.88rem', fontWeight: '600' }}>
                          {oldRentP.toLocaleString()} UZS
                        </span>
                      )}
                      <strong style={{ fontSize: '1.05rem', color: oldRentP ? '#ef4444' : 'var(--meco-primary)', fontWeight: '800' }}>
                        {rentP ? `${rentP.toLocaleString()} ${t.perDay || 'UZS/kun'}` : (t.unavailable || 'Mavjud emas')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* View Details Button */}
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onViewProduct(product)}
                  style={{ width: '100%', marginBottom: '0.35rem', justifyContent: 'center', fontWeight: '700', background: 'var(--meco-primary-light)', borderColor: 'var(--meco-border)', color: 'var(--meco-primary)' }}
                >
                  <Eye size={15} />
                  {t.batafsil || 'Batafsil & Jihozlar Vaqti'}
                </button>

                {/* Direct Action Buttons */}
                <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => onSelectProduct({ ...product, selectedMode: 'BUY' })}
                    style={{ justifyContent: 'center', fontWeight: '700' }}
                  >
                    <ShoppingCart size={15} />
                    {t.sotibOlish || 'Sotib Olish'}
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => onSelectProduct({ ...product, selectedMode: 'RENT' })}
                    style={{ justifyContent: 'center', fontWeight: '700' }}
                  >
                    <Calendar size={15} />
                    {t.ijaragaOlish || 'Ijaraga Olish'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
