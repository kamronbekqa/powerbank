import React, { useState } from 'react';
import { ShoppingCart, Trash2, Minus, Plus, X, ArrowRight, Package } from 'lucide-react';

/**
 * Slide-in cart panel.
 * Items are `{ id, product, quantity, type }`. Works for guests (localStorage)
 * and signed-in users (server-backed); the parent owns the persistence.
 */
export default function CartPanel({
  open,
  onClose,
  items = [],
  onUpdateQuantity,
  onRemove,
  onCheckout,
  t = {},
  lang = 'UZ'
}) {
  const [busyId, setBusyId] = useState(null);

  const L = {
    UZ: {
      title: 'Savatim', empty: 'Savatingiz bo‘sh',
      emptyHint: 'Mahsulotni “Savatga qo‘shish” tugmasi orqali qo‘shing.',
      buy: 'Sotib olish', rent: 'Kunlik ijara', qty: 'Miqdor',
      remove: 'O‘chirish', total: 'Umumiy summa', checkout: 'Buyurtma berish',
      clear: 'Savatni tozalash', stock: 'Omborda', unavailable: 'Mavjud emas',
      perDay: '/ kun', free: 'Bepul', each: 'birlik'
    },
    RU: {
      title: 'Корзина', empty: 'Корзина пуста',
      emptyHint: 'Добавьте товар кнопкой «В корзину».',
      buy: 'Покупка', rent: 'Аренда в день', qty: 'Кол-во',
      remove: 'Удалить', total: 'Итого', checkout: 'Оформить заказ',
      clear: 'Очистить корзину', stock: 'В наличии', unavailable: 'Нет в наличии',
      perDay: '/ день', free: 'Бесплатно', each: 'шт'
    },
    EN: {
      title: 'Cart', empty: 'Your cart is empty',
      emptyHint: 'Use the “Add to cart” button on a product.',
      buy: 'Buy', rent: 'Daily rental', qty: 'Qty',
      remove: 'Remove', total: 'Total', checkout: 'Place order',
      clear: 'Clear cart', stock: 'In stock', unavailable: 'Out of stock',
      perDay: '/ day', free: 'Free', each: 'pcs'
    }
  }[lang] || {};
  const tx = t || {};

  if (!open) return null;

  const priceOf = item => (item.type === 'BUY'
    ? Number(item.product?.buyPrice || 0)
    : Number(item.product?.rentPrice || 0));

  const lineTotal = item => priceOf(item) * (Number(item.quantity) || 1);
  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const fmt = n => (Number.isFinite(n) ? n.toLocaleString(lang === 'RU' ? 'ru-RU' : 'uz-UZ') : '0');

  const handleQty = async (item, next) => {
    setBusyId(item.id);
    try {
      await onUpdateQuantity?.(item, Math.max(1, next));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998, backdropFilter: 'blur(4px)' }}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={L.title}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(460px, 100vw)',
          background: 'var(--meco-card-bg)',
          borderLeft: '1px solid var(--meco-border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
          zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--meco-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingCart size={20} style={{ color: '#f59e0b' }} />
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>{L.title}</h2>
            {items.length > 0 && (
              <span style={{ background: '#f59e0b', color: '#0f172a', borderRadius: '9999px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: '800' }}>
                {items.length}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--meco-text-sub)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--meco-text-sub)' }}>
              <Package size={44} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontWeight: '700', marginBottom: '0.4rem' }}>{L.empty}</p>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>{L.emptyHint}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {items.map(item => {
                const p = item.product || {};
                const img = Array.isArray(p.images) ? p.images[0] : null;
                const price = priceOf(item);
                const busy = busyId === item.id;
                return (
                  <div key={item.id} style={{
                    border: '1px solid var(--meco-border)', borderRadius: '14px',
                    padding: '0.75rem', display: 'flex', gap: '0.75rem', background: 'var(--meco-bg)'
                  }}>
                    <div style={{
                      width: '62px', height: '62px', borderRadius: '10px', overflow: 'hidden',
                      background: 'var(--meco-card-bg)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {img
                        ? <img src={img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Package size={22} style={{ opacity: 0.4 }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.2rem', lineHeight: 1.3 }}>
                        {p.title || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--meco-text-sub)', marginBottom: '0.45rem' }}>
                        {item.type === 'BUY' ? L.buy : L.rent}
                        {item.type !== 'BUY' && ' ' + L.perDay}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--meco-border)', borderRadius: '8px' }}>
                          <button type="button" disabled={busy} onClick={() => handleQty(item, (Number(item.quantity) || 1) - 1)}
                            aria-label="decrease"
                            style={{ background: 'transparent', border: 'none', color: 'var(--meco-text-main)', cursor: 'pointer', padding: '4px 7px' }}>
                            <Minus size={13} />
                          </button>
                          <span style={{ minWidth: '26px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '800' }}>
                            {item.quantity || 1}
                          </span>
                          <button type="button" disabled={busy} onClick={() => handleQty(item, (Number(item.quantity) || 1) + 1)}
                            aria-label="increase"
                            style={{ background: 'transparent', border: 'none', color: 'var(--meco-text-main)', cursor: 'pointer', padding: '4px 7px' }}>
                            <Plus size={13} />
                          </button>
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                          {fmt(lineTotal(item))} so&apos;{price > 0 ? '' : ` ${L.free}`}
                        </div>
                      </div>

                      <button type="button" disabled={busy} onClick={() => onRemove?.(item)}
                        style={{
                          marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          background: 'transparent', border: 'none', color: '#ef4444',
                          fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: 0
                        }}>
                        <Trash2 size={12} /> {L.remove}
                      </button>
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={() => onRemove?.(null)}
                style={{
                  alignSelf: 'flex-start', background: 'transparent', border: 'none',
                  color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', padding: 0
                }}>
                {L.clear}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid var(--meco-border)', padding: '1rem 1.25rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ color: 'var(--meco-text-sub)', fontSize: '0.9rem' }}>{L.total}</span>
              <span style={{ fontWeight: '900', fontSize: '1.15rem', color: '#f59e0b' }}>
                {fmt(total)} so&apos;m
              </span>
            </div>
            <button type="button" onClick={onCheckout}
              style={{
                width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.85rem', borderRadius: '12px', border: 'none',
                background: '#f59e0b', color: '#0f172a', fontWeight: '800', cursor: 'pointer'
              }}>
              {L.checkout} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}