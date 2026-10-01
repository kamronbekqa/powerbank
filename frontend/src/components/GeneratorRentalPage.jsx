import React, { useState } from 'react';
import { Zap, ShieldCheck, Award, Box, Check, ArrowRight, Eye, ShoppingCart, Calendar } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

const HEADINGS = {
  UZ: {
    heroBadge: '⚡ VOLTMAXHUB — GENERATOR IJARASI',
    heroTitle: 'Shovqinsiz va Inverterli Generatorlar',
    heroDesc: 'Uy, ofis, tadbir yoki qurilish ob\'yekti uchun generator ijarasi. Kerakli quvvatni tanlang — biz toza, tekshirilgan va xizmatga tayyor qilib beramiz.',
    searchPlaceholder: 'Model yoki quvvatini qidirish (masalan, 3.6kWh, 5.4kWh)...',
    buyNow: 'Sotib olish / Ijaraga olish',
    details: 'Batafsil',
    inStock: 'Mavjud',
    outOfStock: 'Mavjud emas',
    buyPrice: 'Sotib olish narxi:',
    rentPrice: 'Kunlik ijara:',
    output: 'Quvvat',
    warranty: 'Kafolat',
    allFilter: 'Barchasi',
    smallFilter: 'Kichik (320Wh - 1kWh)',
    midFilter: 'O\'rta (1.8kWh - 2kWh)',
    largeFilter: 'Katta (3.6kWh+)',
    proFilter: 'Pro / Premium',
    empty: 'Generator topilmadi',
    clear: 'Filtrni tozalash',
    addToCart: 'Savatga qo\'shish'
  },
  RU: {
    heroBadge: '⚡ VOLTMAXHUB — АРЕНДА ГЕНЕРАТОРОВ',
    heroTitle: 'Тихие и Инверторные Генераторы',
    heroDesc: 'Аренда генераторов для дома, офиса, мероприятия или стройки. Выберите нужную мощность — мы отдаём технику чистой, проверенной и готовой к работе.',
    searchPlaceholder: 'Поиск модели или мощности (например, 3.6kWh, 5.4kWh)...',
    buyNow: 'Купить / Арендовать',
    details: 'Подробнее',
    inStock: 'В наличии',
    outOfStock: 'Нет в наличии',
    buyPrice: 'Цена покупки:',
    rentPrice: 'Аренда в день:',
    output: 'Мощность',
    warranty: 'Гарантия',
    allFilter: 'Все',
    smallFilter: 'Малые (320Wh - 1kWh)',
    midFilter: 'Средние (1.8kWh - 2kWh)',
    largeFilter: 'Большие (3.6kWh+)',
    proFilter: 'Pro / Premium',
    empty: 'Генераторы не найдены',
    clear: 'Сбросить фильтр',
    addToCart: 'В корзину'
  },
  EN: {
    heroBadge: '⚡ VOLTMAXHUB — GENERATOR RENTAL',
    heroTitle: 'Quiet & Inverter Generators',
    heroDesc: 'Generator rental for homes, offices, events and construction sites. Pick the power you need — we hand over clean, serviced, ready-to-run units.',
    searchPlaceholder: 'Search model or output (e.g. 3.6kWh, 5.4kWh)...',
    buyNow: 'Buy / Rent Now',
    details: 'View Details',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    buyPrice: 'Buy Price:',
    rentPrice: 'Daily Rent:',
    output: 'Output',
    warranty: 'Warranty',
    allFilter: 'All',
    smallFilter: 'Compact (320Wh - 1kWh)',
    midFilter: 'Mid (1.8kWh - 2kWh)',
    largeFilter: 'Large (3.6kWh+)',
    proFilter: 'Pro / Premium',
    empty: 'No generators found',
    clear: 'Clear filter',
    addToCart: 'Add to cart'
  }
};

const FILTERS = [
  { key: 'ALL', label: 'allFilter' },
  { key: 'SMALL', label: 'smallFilter' },
  { key: 'MID', label: 'midFilter' },
  { key: 'LARGE', label: 'largeFilter' },
  { key: 'PRO', label: 'proFilter' }
];

function bucketOf(product) {
  const text = `${product.title || ''} ${product.capacity || ''}`.toLowerCase();
  if (text.includes('pro')) return 'PRO';
  const wh = parseInt(String(product.capacity || '').replace(/[^\d]/g, ''), 10);
  if (!Number.isNaN(wh)) {
    if (wh >= 3600) return 'LARGE';
    if (wh >= 1800) return 'MID';
    return 'SMALL';
  }
  return 'ALL';
}

export default function GeneratorRentalPage({
  products = [],
  onSelectProduct,
  onViewProduct,
  onAddToCart,
  t = {},
  lang = 'UZ'
}) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  usePageMeta({
    title: lang === 'RU' ? 'Аренда генераторов' : lang === 'EN' ? 'Generator rental' : 'Generatorlar ijarasi',
    description: (HEADINGS[lang] || HEADINGS.UZ).heroDesc
  });

  const h = HEADINGS[lang] || HEADINGS.UZ;

  const generators = products.filter(
    p => p.category === 'GENERATOR' || !/panel|solar/i.test(p.title || '')
  );

  const visible = generators.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    const haystack = `${p.title || ''} ${p.capacity || ''} ${p.description || ''}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    if (!matchesSearch) return false;
    if (filter === 'ALL') return true;
    return bucketOf(p) === filter;
  });

  const fmt = n => {
    const v = Number(n);
    if (!Number.isFinite(v) || v === 0) return '—';
    return v.toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  return (
    <div style={{ background: 'var(--meco-bg)', color: 'var(--meco-text-main)', minHeight: '100vh', paddingBottom: '4rem' }}>

      {/* 1. HERO */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
        padding: '4.5rem 1.5rem 3.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <span style={{
            display: 'inline-block', padding: '0.5rem 1.25rem', borderRadius: '9999px',
            background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.08em', marginBottom: '1.25rem'
          }}>{h.heroBadge}</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: '900', color: '#fff',
            lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.02em'
          }}>{h.heroTitle}</h1>
          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.65, maxWidth: '680px', margin: '0 auto 2rem' }}>
            {h.heroDesc}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#generator-list" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.75rem', borderRadius: '12px', background: '#f59e0b',
              color: '#0f172a', fontWeight: '800', textDecoration: 'none', fontSize: '0.95rem'
            }}>
              <Zap size={18} /> {h.buyNow}
            </a>
          </div>
        </div>
      </section>

      {/* 2. TRUST STRIP */}
      <section style={{ maxWidth: '1200px', margin: '-2rem auto 0', padding: '0 1.5rem', position: 'relative', zIndex: 3 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem',
          background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)',
          borderRadius: '18px', padding: '1.5rem', boxShadow: 'var(--shadow-md)'
        }}>
          {[
            { icon: <Zap size={22} />, title: lang === 'RU' ? 'Любая мощность' : lang === 'EN' ? 'Any power output' : 'Har qanday quvvat', text: lang === 'RU' ? 'От 320Wh до 5.4kWh' : lang === 'EN' ? 'From 320Wh to 5.4kWh' : '320Wh dan 5.4kWh gacha' },
            { icon: <ShieldCheck size={22} />, title: lang === 'RU' ? 'Чистый инвертор' : lang === 'EN' ? 'Clean inverter' : 'Toza inverter', text: lang === 'RU' ? 'Чистый синус, безопасная техника' : lang === 'EN' ? 'Pure sine wave, safe for electronics' : 'Sof sinus — texnikangiz xavfsiz' },
            { icon: <Award size={22} />, title: lang === 'RU' ? 'Гарантия' : lang === 'EN' ? 'Warranty' : 'Kafolat', text: lang === 'RU' ? 'Официальная гарантия и сервис' : lang === 'EN' ? 'Official warranty & service' : 'Rasmiy kafolat va servis' },
            { icon: <Box size={22} />, title: lang === 'RU' ? 'Доставка' : lang === 'EN' ? 'Delivery' : 'Yetkazib berish', text: lang === 'RU' ? 'Удобное время слотa' : lang === 'EN' ? 'Convenient time slots' : 'Qulay vaqt oralig\'i' }
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.15rem' }}>{f.icon}</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0 0 0.25rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--meco-text-sub)', margin: 0, lineHeight: 1.5 }}>{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SEARCH + FILTERS */}
      <section id="generator-list" style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 0' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={h.searchPlaceholder}
            aria-label={h.searchPlaceholder}
            style={{
              width: '100%', padding: '0.9rem 1.15rem', borderRadius: '12px',
              border: '1px solid var(--meco-border)', background: 'var(--meco-card-bg)',
              color: 'var(--meco-text-main)', fontSize: '0.95rem', boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '9999px', cursor: 'pointer',
                border: filter === f.key ? '1px solid #f59e0b' : '1px solid var(--meco-border)',
                background: filter === f.key ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: filter === f.key ? '#f59e0b' : 'var(--meco-text-sub)',
                fontWeight: '700', fontSize: '0.85rem'
              }}
            >{h[f.label]}</button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--meco-text-sub)' }}>
            <Zap size={40} style={{ opacity: 0.35, marginBottom: '1rem' }} />
            <p style={{ fontWeight: '700', marginBottom: '0.75rem' }}>{h.empty}</p>
            <button type="button" onClick={() => { setFilter('ALL'); setSearchQuery(''); }}
              style={{ padding: '0.55rem 1.1rem', borderRadius: '9999px', cursor: 'pointer', border: '1px solid var(--meco-border)', background: 'transparent', color: 'var(--meco-text-sub)', fontWeight: '700', fontSize: '0.85rem' }}>
              {h.clear}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.75rem' }}>
            {visible.map(product => {
              const mainImage = (product.images && product.images.length > 0) ? product.images[0] : '/assets/solar_450w.png';
              return (
                <div key={product.id} className="product-card" style={{
                  background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)',
                  borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  boxShadow: 'var(--shadow-md)', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative'
                }}>
                  <div className="card-badges">
                    <span className="badge card-badges-left" style={{ background: 'rgba(245,158,11,0.9)', color: '#fff', backdropFilter: 'blur(4px)', border: 'none' }}>
                      ⚡ {product.capacity || 'GENERATOR'}
                    </span>
                    <div className="card-badges-right">
                      <span style={{
                        background: product.isAvailable === false ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
                        color: '#fff', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800'
                      }}>{product.isAvailable === false ? h.outOfStock : h.inStock}</span>
                    </div>
                  </div>

                  <div style={{ height: '190px', background: 'var(--meco-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={mainImage} alt={product.title} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 0.5rem', lineHeight: 1.35 }}>{product.title}</h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--meco-text-sub)', lineHeight: 1.55, margin: '0 0 1rem', flex: 1,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--meco-text-sub)' }}>{h.buyPrice}</span>
                        <strong>{fmt(product.buyPrice)} so\'m</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--meco-text-sub)' }}>{h.rentPrice}</span>
                        <strong style={{ color: '#f59e0b' }}>{fmt(product.rentPrice)} so\'m</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {onAddToCart && (
                        <button type="button" onClick={() => onAddToCart(product, 'RENT')}
                          style={{ flex: '1 1 100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.6rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                            background: 'transparent', border: '1px solid var(--meco-border)',
                            color: 'var(--meco-text-main)', fontWeight: '700', fontSize: '0.83rem' }}>
                          <ShoppingCart size={15} /> {h.addToCart}
                        </button>
                      )}
                      {onViewProduct && (
                        <button type="button" onClick={() => onViewProduct(product)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                            border: '1px solid var(--meco-border)', background: 'transparent',
                            color: 'var(--meco-text-main)', fontWeight: '700', fontSize: '0.83rem' }}>
                          <Eye size={15} /> {h.details}
                        </button>
                      )}
                      {onSelectProduct && (
                        <button type="button" onClick={() => onSelectProduct(product)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.65rem 0.9rem', borderRadius: '10px', cursor: 'pointer', border: 'none',
                            background: '#f59e0b', color: '#0f172a', fontWeight: '800', fontSize: '0.83rem' }}>
                          <Calendar size={15} /> {h.buyNow}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. WHY US */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '3.5rem 1.5rem 0' }}>
        <div style={{
          background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)',
          borderRadius: '20px', padding: '2.25rem', boxShadow: 'var(--shadow-md)'
        }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: '0 0 1.5rem', textAlign: 'center' }}>
            {lang === 'RU' ? 'Почему аренда у нас' : lang === 'EN' ? 'Why rent from us' : 'Nima uchun bizda ijaraga olish'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
            {[
              lang === 'RU' ? ['Технически проверено', 'Каждую единицу чистим, проверяем запуск и обслуживаем перед выдачей.']
                : lang === 'EN' ? ['Technically verified', 'Every unit is cleaned, test-started and serviced before handover.']
                : ['Texnik jihatdan tekshirilgan', 'Har bir birlik topshirishdan oldin tozalanadi, ishga tushiriladi va xizmatdan o\'tkaziladi.'],
              lang === 'RU' ? ['Низкий шум', 'Подходит для жилых районов, свадеб и ночных работ.']
                : lang === 'EN' ? ['Low noise', 'Suitable for residential areas, weddings and night work.']
                : ['Past shovqin', 'Tumanlar, to\'ylar va kechki ishlar uchun mos.'],
              lang === 'RU' ? ['Правильная мощность', 'Подбираем генератор под ваши приборы, а не наоборот.']
                : lang === 'EN' ? ['Right output', 'We match the generator to your appliances, not the other way round.']
                : ['To\'g\'ri quvvat', 'Generatorni sizning jihozlaringizga moslaymiz, aksincha emas.']
            ].map(([title, text], i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={15} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0 0 0.3rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--meco-text-sub)', margin: 0, lineHeight: 1.55 }}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
