import React, { useState } from 'react';
import { Star, MessageSquare, Plus, CheckCircle2, User, MapPin } from 'lucide-react';

export default function ReviewsPage({ reviews = [], onAddReview }) {
  const [showForm, setShowForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [location, setLocation] = useState('Toshkent');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName || !comment) return;
    setSubmitting(true);
    await onAddReview({ userName, location, rating, comment });
    setUserName('');
    setComment('');
    setSubmitting(false);
    setShowForm(false);
    alert('Sharhingiz muvaffaqiyatli qo\'shildi! Rahmat.');
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      
      {/* HEADER & OVERVIEW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fffbeb', color: '#d97706', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            <Star size={14} fill="#d97706" /> MIJOZLAR TAASSUROTLARI
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a' }}>
            Mijozlarimiz Sharhlari va Baholari
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.25rem' }}>
            Meco generatorlarini sotib olgan va ijaraga olgan mijozlarimizning real fikrlari.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ height: '46px', fontWeight: '800' }}>
          <Plus size={18} /> Sharh Qoldirish
        </button>
      </div>

      {/* NEW REVIEW FORM MODAL / COLLAPSIBLE */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-md)', marginBottom: '2.5rem', maxWidth: '650px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>Yangi Sharh Qoldiring</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Ismingiz va Familiyangiz</label>
              <input type="text" className="form-input" placeholder="Otabek Mirzayev" value={userName} onChange={e => setUserName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Viloyat / Shahar</label>
              <input type="text" className="form-input" placeholder="Toshkent sh." value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Baho (Rating)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star size={24} fill={star <= rating ? '#f59e0b' : 'none'} color={star <= rating ? '#f59e0b' : '#cbd5e1'} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sharhingiz</label>
            <textarea className="form-input" rows={4} placeholder="Meco generatorining ishlashi, ijara shartlari va xizmat ko'rsatish haqida fikringiz..." value={comment} onChange={e => setComment(e.target.value)} required></textarea>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>Yuborish</button>
          </div>
        </form>
      )}

      {/* REVIEWS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {reviews.map(rev => (
          <div key={rev.id || Math.random()} style={{ background: '#fff', border: '1px solid var(--meco-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[...Array(rev.rating || 5)].map((_, i) => (
                    <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  <CheckCircle2 size={12} /> Tasdiqlangan Xarid
                </span>
              </div>

              <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                "{rev.comment}"
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
              <div style={{ background: '#eff6ff', color: '#2563eb', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                {rev.userName ? rev.userName[0].toUpperCase() : 'M'}
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a' }}>{rev.userName}</strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {rev.location || 'Toshkent'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
