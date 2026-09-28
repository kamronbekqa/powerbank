import React, { useState } from 'react';
import { Heart, Calendar, ShoppingCart, Trash2, Zap, Star, Package, X } from 'lucide-react';

export default function WishlistPanel({ wishlist, onRemove, onRent, onBuy, onClear, t, lang }) {
  const [filter, setFilter] = useState('all');

  const filtered = wishlist.filter(item => {
    if (filter === 'favorites') return item.tag === 'favorite';
    if (filter === 'planned') return item.tag === 'planned';
    return true;
  });

  if (wishlist.length === 0) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(99,102,241,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <Heart size={36} style={{ color: '#cbd5e1' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--meco-text-main)', marginBottom: '0.5rem' }}>
          {lang === 'RU' ? 'Корзина пуста' : lang === 'EN' ? 'Wishlist is empty' : "Savat bo'sh"}
        </h3>
        <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto' }}>
          {lang === 'RU'
            ? 'Добавляйте генераторы в корзину, чтобы планировать аренду или сохранять понравившиеся.'
            : lang === 'EN'
            ? 'Add generators to plan rentals or save favorites.'
            : "Generatorlarni savatga qo'shib, ijaraga rejalashtiring yoki yoqqanlarini saqlang."}
        </p>
      </div>
    );
  }

  const favCount = wishlist.filter(i => i.tag === 'favorite').length;
  const planCount = wishlist.filter(i => i.tag === 'planned').length;

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--meco-text-main)', margin: 0 }}>
            {lang === 'RU' ? 'Моя Корзина' : lang === 'EN' ? 'My Wishlist' : 'Mening Savatim'}
          </h2>
          <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {wishlist.length} {lang === 'RU' ? 'товаров' : lang === 'EN' ? 'items' : 'ta mahsulot'}
          </p>
        </div>
        <button
          onClick={onClear}
          style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', borderRadius: '10px', padding: '6px 14px',
            fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <Trash2 size={13} />
          {lang === 'RU' ? 'Очистить' : lang === 'EN' ? 'Clear all' : "Barchasini o'chirish"}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', padding: '0 1.5rem', overflowX: 'auto' }}>
        {[
          { key: 'all', label: lang === 'RU' ? 'Все' : lang === 'EN' ? 'All' : 'Barchasi', count: wishlist.length, icon: null },
          { key: 'planned', label: lang === 'RU' ? 'Rejalash.' : lang === 'EN' ? 'Planned' : 'Rejalashtirilgan', count: planCount, icon: <Calendar size={12} /> },
          { key: 'favorites', label: lang === 'RU' ? 'Избранное' : lang === 'EN' ? 'Favorites' : "Yoqganlar", count: favCount, icon: <Heart size={12} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              background: filter === tab.key ? '#2563eb' : 'var(--meco-bg)',
              color: filter === tab.key ? '#fff' : 'var(--meco-text-muted)',
              border: filter === tab.key ? '1px solid #2563eb' : '1px solid var(--meco-border)',
              borderRadius: '10px', padding: '6px 14px',
              fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
            <span style={{
              background: filter === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--meco-border)',
              color: filter === tab.key ? '#fff' : 'var(--meco-text-muted)',
              borderRadius: '6px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: '800'
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--meco-text-muted)' }}>
          <Package size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p style={{ fontSize: '0.9rem' }}>Bu bo'limda mahsulot yo'q</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', padding: '0 1.5rem' }}>
          {filtered.map(item => (
            <WishlistCard
              key={item.id + '-' + item.addedAt}
              item={item}
              onRemove={onRemove}
              onRent={onRent}
              onBuy={onBuy}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistCard({ item, onRemove, onRent, onBuy, lang }) {
  const isPlanned = item.tag === 'planned';
  const tagColor = isPlanned
    ? { bg: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'rgba(37,99,235,0.2)' }
    : { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' };

  return (
    <div
      style={{
        background: 'var(--meco-card-bg)', border: '1px solid var(--meco-border)',
        borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s ease', position: 'relative'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        position: 'absolute', top: '10px', left: '10px', zIndex: 2,
        background: tagColor.bg, color: tagColor.color,
        border: `1px solid ${tagColor.border}`,
        borderRadius: '8px', padding: '3px 9px',
        fontSize: '0.7rem', fontWeight: '800',
        display: 'flex', alignItems: 'center', gap: '4px'
      }}>
        {isPlanned ? <Calendar size={11} /> : <Heart size={11} />}
        {isPlanned
          ? (lang === 'RU' ? 'Запланировано' : lang === 'EN' ? 'Planned' : 'Rejalashtirilgan')
          : (lang === 'RU' ? 'Избранное' : lang === 'EN' ? 'Favorite' : 'Yoqgan')}
      </div>

      <button
        onClick={() => onRemove(item.id)}
        style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 2,
          background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)'
        }}
      >
        <X size={14} />
      </button>

      <div style={{ height: '170px', overflow: 'hidden', background: 'var(--meco-bg)' }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={40} style={{ color: '#2563eb', opacity: 0.3 }} />
          </div>
        )}
      </div>

      <div style={{ padding: '1rem' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--meco-text-main)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </h4>
        <div style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)', marginBottom: '10px' }}>
          {item.power && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Zap size={11} style={{ color: '#f59e0b' }} />{item.power} kVA</span>}
          {item.rating && <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />{item.rating}</span>}
        </div>

        <div style={{ marginBottom: '12px' }}>
          {item.rentPricePerDay && (
            <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: '800' }}>
              {lang === 'RU' ? 'Аренда: ' : lang === 'EN' ? 'Rent: ' : 'Ijara: '}
              <span style={{ fontSize: '1rem' }}>{Number(item.rentPricePerDay).toLocaleString()} so'm/kun</span>
            </div>
          )}
          {item.buyPrice && (
            <div style={{ fontSize: '0.78rem', color: 'var(--meco-text-muted)', fontWeight: '600', marginTop: '2px' }}>
              {lang === 'RU' ? 'Покупка: ' : lang === 'EN' ? 'Buy: ' : 'Sotib olish: '}
              {Number(item.buyPrice).toLocaleString()} so'm
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onRent(item)}
            style={{
              flex: 1, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '8px', fontSize: '0.78rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '5px', transition: 'opacity 0.2s'
            }}
          >
            <Calendar size={13} />
            {lang === 'RU' ? 'Арендовать' : lang === 'EN' ? 'Rent' : 'Ijaraga olish'}
          </button>
          {item.buyPrice && (
            <button
              onClick={() => onBuy(item)}
              title={lang === 'RU' ? 'Купить' : lang === 'EN' ? 'Buy' : 'Sotib olish'}
              style={{
                background: 'var(--meco-bg)', color: 'var(--meco-text-main)',
                border: '1px solid var(--meco-border)', borderRadius: '10px',
                padding: '8px 12px', fontSize: '0.78rem', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <ShoppingCart size={13} />
            </button>
          )}
        </div>

        {item.addedAt && (
          <div style={{ fontSize: '0.7rem', color: 'var(--meco-text-muted)', marginTop: '8px', textAlign: 'right' }}>
            {new Date(item.addedAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}
