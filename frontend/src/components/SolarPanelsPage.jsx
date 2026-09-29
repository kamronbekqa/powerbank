import React, { useState } from 'react';
import { Sun, Zap, ShieldCheck, Award, Box, Check, ArrowRight, Eye, ShoppingCart, Calendar } from 'lucide-react';

const DEFAULT_SOLAR_PANELS = [
  {
    id: 'solar-1',
    title: 'Meco 450W Mono PERC Panel',
    category: 'SOLAR_PANEL',
    capacity: '450W / 24V Monocrystalline',
    description: '21.8% yuqori samaradorlikka ega Monokristall quyosh paneli. Shamol va qor yuklamalariga chidamli, IP68 suv o\'tmas korpus va MC4 konnektorlar.',
    buyPrice: 1800000,
    oldBuyPrice: 2200000,
    rentPrice: 45000,
    oldRentPrice: 60000,
    stock: 15,
    images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80'],
    usageSpecs: [
      { name: 'Samaradorlik', icon: 'zap', runTime: '21.8%' },
      { name: 'Kafolat', icon: 'shield', runTime: '25 Yil' },
      { name: 'Himoya', icon: 'cloud', runTime: 'IP68 Water' },
      { name: 'Salmoq', icon: 'box', runTime: '21 kg' }
    ],
    isAvailable: true
  },
  {
    id: 'solar-2',
    title: 'Meco 550W Bifacial Glass-Glass',
    category: 'SOLAR_PANEL',
    capacity: '550W (+100W Rear Gain)',
    description: 'Ikki tomonlama quyosh nuri yutuvchi Double-Glass Bifacial panel. Orqa tomonidan qo\'shimcha 20% gacha quvvat ishlab chiqaradi.',
    buyPrice: 2400000,
    oldBuyPrice: 2900000,
    rentPrice: 65000,
    oldRentPrice: 85000,
    stock: 10,
    images: ['https://images.unsplash.com/photo-1508873696983-2df515122519?w=600&auto=format&fit=crop&q=80'],
    usageSpecs: [
      { name: 'Samaradorlik', icon: 'zap', runTime: '22.5%' },
      { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
      { name: 'Shisha', icon: 'box', runTime: 'Double Glass' },
      { name: 'Salmoq', icon: 'box', runTime: '27 kg' }
    ],
    isAvailable: true
  },
  {
    id: 'solar-3',
    title: 'Meco 200W Portable Foldable',
    category: 'SOLAR_PANEL',
    capacity: '200W / 18V Travel Panel',
    description: 'Kemping va sayohatlar uchun buklanadigan yengil portativ quyosh paneli. ETFE qoplamali, og\'irligi atigi 4.2kg.',
    buyPrice: 2100000,
    oldBuyPrice: 2500000,
    rentPrice: 50000,
    oldRentPrice: 70000,
    stock: 12,
    images: ['https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=600&auto=format&fit=crop&q=80'],
    usageSpecs: [
      { name: 'Portativlik', icon: 'box', runTime: '4.2 kg (Buklanadigan)' },
      { name: 'Qoplama', icon: 'shield', runTime: 'ETFE Premium' },
      { name: 'Chiquv', icon: 'zap', runTime: 'MC4 + DC5521' },
      { name: 'Kafolat', icon: 'shield', runTime: '2 Yil' }
    ],
    isAvailable: true
  },
  {
    id: 'solar-4',
    title: 'Meco 670W Ultra Industrial Panel',
    category: 'SOLAR_PANEL',
    capacity: '670W / 40V N-Type TopCon',
    description: 'Tadbirkorlik ob\'yektlari, fermer xo\'jaliklari va sanoat bino tomlari uchun o\'ta baquvvat N-Type TopCon panel.',
    buyPrice: 3200000,
    oldBuyPrice: 3800000,
    rentPrice: 85000,
    oldRentPrice: 110000,
    stock: 8,
    images: ['https://images.unsplash.com/photo-1548337138-e87d889cc369?w=600&auto=format&fit=crop&q=80'],
    usageSpecs: [
      { name: 'Texnologiya', icon: 'zap', runTime: 'N-Type TopCon' },
      { name: 'Samaradorlik', icon: 'zap', runTime: '23.1%' },
      { name: 'Kafolat', icon: 'shield', runTime: '30 Yil' },
      { name: 'Salmoq', icon: 'box', runTime: '33 kg' }
    ],
    isAvailable: true
  }
];

export default function SolarPanelsPage({ 
  products = [], 
  onSelectProduct, 
  onViewProduct,
  t = {},
  lang = 'UZ'
}) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter solar panel products from DB or fallback to default 4 cards
  const solarPanelsFromDB = products.filter(p => p.category === 'SOLAR_PANEL' || p.title.toLowerCase().includes('panel') || p.title.toLowerCase().includes('solar'));
  const solarPanels = solarPanelsFromDB.length > 0 ? solarPanelsFromDB : DEFAULT_SOLAR_PANELS;

  const filteredPanels = solarPanels.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.capacity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'ALL') return matchesSearch;
    if (filter === 'MONO') return matchesSearch && (p.title.toLowerCase().includes('mono') || p.capacity.toLowerCase().includes('mono'));
    if (filter === 'BIFACIAL') return matchesSearch && (p.title.toLowerCase().includes('bifacial') || p.capacity.toLowerCase().includes('bifacial'));
    if (filter === 'PORTABLE') return matchesSearch && (p.title.toLowerCase().includes('portable') || p.title.toLowerCase().includes('foldable'));
    if (filter === 'INDUSTRIAL') return matchesSearch && (p.title.toLowerCase().includes('industrial') || p.title.toLowerCase().includes('670w'));
    return matchesSearch;
  });

  const headingText = {
    UZ: {
      heroBadge: "☀️ MECO HIGH-EFFICIENCY QUYOSH PANELLARI",
      heroTitle: "Quyosh Panellari — Bino va Xonadonlar Uchun Avtonom Energiya",
      heroDesc: "Monokristall, Bifacial (ikki tomonlama) hamda buklanuvchan portativ quyosh panellari. 25-30 yillik rasmiy kafolat va yuqori samaradorlik.",
      searchPlaceholder: "Quyosh paneli modeli yoki watt sig'imini qidirish (450W, 550W, 670W)...",
      buyNow: "Sotib / Ijaraga Olish",
      details: "Batafsil Ko'rish",
      inStock: "Sotuvda / Mavjud",
      outOfStock: "Tugagan",
      buyPrice: "Sotib olish:",
      rentPrice: "Kunlik ijara:",
      efficiency: "Samaradorlik",
      warranty: "Kafolat",
      allFilter: "Barcha Panellar",
      monoFilter: "Monokristall (450W)",
      bifacialFilter: "Bifacial Glass (550W)",
      portableFilter: "Buklanadigan Portativ (200W)",
      industrialFilter: "Sanoat Paneli (670W)"
    },
    RU: {
      heroBadge: "☀️ MECO ВЫСОКОЭФФЕКТИВНЫЕ СОЛНЕЧНЫЕ ПАНЕЛИ",
      heroTitle: "Солнечные Панели — Автономная Энергия Для Дома и Бизнеса",
      heroDesc: "Монокристаллические, двусторонние Bifacial и складные портативные панели. Официальная гарантия 25-30 лет и высокий КПД.",
      searchPlaceholder: "Поиск панели по модели или мощности (450W, 550W, 670W)...",
      buyNow: "Купить / В Аренду",
      details: "Подробнее",
      inStock: "В наличии",
      outOfStock: "Нет в наличии",
      buyPrice: "Цена покупки:",
      rentPrice: "Аренда в день:",
      efficiency: "Эффективность",
      warranty: "Гарантия",
      allFilter: "Все Панели",
      monoFilter: "Монокристалл (450W)",
      bifacialFilter: "Bifacial Glass (550W)",
      portableFilter: "Складные (200W)",
      industrialFilter: "Промышленные (670W)"
    },
    EN: {
      heroBadge: "☀️ MECO HIGH-EFFICIENCY SOLAR PANELS",
      heroTitle: "Solar Panels — Autonomous Power for Homes & Businesses",
      heroDesc: "Monocrystalline, Bifacial double-glass, and portable foldable solar panels. 25-30 year official warranty & max efficiency.",
      searchPlaceholder: "Search panel model or wattage (450W, 550W, 670W)...",
      buyNow: "Buy / Rent Now",
      details: "View Details",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      buyPrice: "Buy Price:",
      rentPrice: "Daily Rent:",
      efficiency: "Efficiency",
      warranty: "Warranty",
      allFilter: "All Panels",
      monoFilter: "Monocrystalline (450W)",
      bifacialFilter: "Bifacial Glass (550W)",
      portableFilter: "Foldable Portable (200W)",
      industrialFilter: "Industrial (670W)"
    }
  }[lang] || headingText.UZ;

  return (
    <div style={{ background: 'var(--meco-bg)', color: 'var(--meco-text-main)', minHeight: '100vh', paddingBottom: '4rem' }}>
      
      {/* 1. HERO BANNER FOR SOLAR PANELS */}
      <section style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%)',
        color: '#fff',
        padding: '3.5rem 1.5rem 3rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(245, 158, 11, 0.2)', 
            border: '1px solid rgba(245, 158, 11, 0.4)', 
            color: '#fbbf24', 
            padding: '6px 16px', 
            borderRadius: '20px', 
            fontSize: '0.82rem', 
            fontWeight: '800',
            marginBottom: '1rem'
          }}>
            {headingText.heroBadge}
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', lineHeight: '1.2', marginBottom: '1rem', color: '#ffffff' }}>
            {headingText.heroTitle}
          </h1>

          <p style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: '1.6', maxWidth: '750px', margin: '0 auto 2rem auto' }}>
            {headingText.heroDesc}
          </p>

          {/* Quick Specs Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Zap size={18} style={{ color: '#fbbf24' }} />
              <span><strong>23.1%</strong> Maksimal КПД</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
              <span><strong>25-30 Yil</strong> Rasmiy Kafolat</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Award size={18} style={{ color: '#4ade80' }} />
              <span><strong>IP68</strong> Suv va Qor Himoyasi</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <section className="container" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder={headingText.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                height: '48px', 
                fontSize: '0.95rem', 
                paddingLeft: '1rem', 
                paddingRight: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--meco-border)',
                background: 'var(--meco-card-bg)',
                color: 'var(--meco-text-main)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: headingText.allFilter },
              { id: 'MONO', label: headingText.monoFilter },
              { id: 'BIFACIAL', label: headingText.bifacialFilter },
              { id: 'PORTABLE', label: headingText.portableFilter },
              { id: 'INDUSTRIAL', label: headingText.industrialFilter }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: filter === tab.id ? '1px solid #2563eb' : '1px solid var(--meco-border)',
                  background: filter === tab.id ? '#2563eb' : 'var(--meco-card-bg)',
                  color: filter === tab.id ? '#ffffff' : 'var(--meco-text-main)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* 3. 4 CARDS GRID SECTION */}
      <section className="container">
        {filteredPanels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--meco-card-bg)', borderRadius: '16px', border: '1px solid var(--meco-border)' }}>
            <Sun size={48} style={{ color: 'var(--meco-text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Quyosh paneli topilmadi</h3>
            <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Qidiruv so'zini o'zgartirib ko'ring yoki boshqa bo'limni tanlang.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '1.75rem' 
          }}>
            {filteredPanels.map((product) => {
              const mainImage = (product.images && product.images.length > 0) ? product.images[0] : '/assets/solar_450w.png';
              
              return (
                <div 
                  key={product.id}
                  style={{
                    background: 'var(--meco-card-bg)',
                    border: '1px solid var(--meco-border)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-md)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative'
                  }}
                  className="product-card"
                >
                  {/* Category & Status Badge */}
                  <div className="card-badges">
                    <span className="badge card-badges-left" style={{
                      background: 'rgba(245, 158, 11, 0.9)',
                      color: '#fff',
                      backdropFilter: 'blur(4px)',
                      border: 'none'
                    }}>
                      ☀️ QUYOSH PANELI
                    </span>
                    <div className="card-badges-right">
                      {product.stock > 0 ? (
                        <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.9)', color: '#fff', border: 'none' }}>
                          {headingText.inStock}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none' }}>
                          {headingText.outOfStock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Image */}
                  <div style={{ 
                    height: '210px', 
                    background: '#0f172a', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '1rem',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => onViewProduct(product)}
                  >
                    <img 
                      src={mainImage} 
                      alt={product.title} 
                      style={{ 
                        maxHeight: '180px', 
                        maxWidth: '100%', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase', tracking: '0.5px', marginBottom: '4px' }}>
                      {product.capacity}
                    </div>

                    <h3 
                      style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--meco-text-main)', marginBottom: '0.5rem', cursor: 'pointer' }}
                      onClick={() => onViewProduct(product)}
                    >
                      {product.title}
                    </h3>

                    <p style={{ fontSize: '0.82rem', color: 'var(--meco-text-muted)', lineHeight: '1.5', marginBottom: '1rem', flex: 1 }}>
                      {product.description}
                    </p>

                    {/* Specs Badges */}
                    {product.usageSpecs && product.usageSpecs.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '1rem', background: 'var(--meco-bg)', padding: '10px', borderRadius: '12px' }}>
                        {product.usageSpecs.slice(0, 4).map((spec, idx) => (
                          <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--meco-text-main)' }}>
                            <Zap size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <span><strong>{spec.name}:</strong> {spec.runTime}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pricing */}
                    <div style={{ borderTop: '1px solid var(--meco-border)', paddingTop: '0.85rem', marginBottom: '1rem' }}>
                      {product.buyPrice && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)' }}>{headingText.buyPrice}</span>
                          <div>
                            {product.oldBuyPrice && (
                              <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.78rem', marginRight: '6px' }}>
                                {Number(product.oldBuyPrice).toLocaleString()}
                              </span>
                            )}
                            <strong style={{ color: '#2563eb', fontSize: '1.1rem', fontWeight: '800' }}>
                              {Number(product.buyPrice).toLocaleString()} UZS
                            </strong>
                          </div>
                        </div>
                      )}

                      {product.rentPrice && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)' }}>{headingText.rentPrice}</span>
                          <strong style={{ color: '#10b981', fontSize: '0.92rem', fontWeight: '800' }}>
                            {Number(product.rentPrice).toLocaleString()} UZS / kun
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
                      <button
                        onClick={() => onViewProduct(product)}
                        className="btn btn-sm btn-secondary"
                        style={{ height: '38px', fontSize: '0.78rem', fontWeight: '700', justifyContent: 'center' }}
                      >
                        <Eye size={14} />
                        {headingText.details}
                      </button>

                      <button
                        onClick={() => onSelectProduct(product)}
                        className="btn btn-sm btn-primary"
                        style={{ height: '38px', fontSize: '0.78rem', fontWeight: '800', justifyContent: 'center', background: '#2563eb', borderColor: '#2563eb' }}
                      >
                        <ShoppingCart size={14} />
                        {headingText.buyNow}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
