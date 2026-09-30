import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageSquare, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

export default function ContactPage({ onSendMessage }) {
  usePageMeta({
    title: 'Bizga bog\'lanish',
    description: 'VOLTMAXHUB bilan bog\'lanish: telefon, Telegram, Instagram, email. Toshkent, O\'zbekiston.'
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Umumiy savol');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !message) return;
    setLoading(true);
    await onSendMessage({ name, phone, subject, message });
    setName('');
    setPhone('');
    setMessage('');
    setLoading(false);
    setSubmitted(true);
  };

  const faqs = [
    {
      q: 'VoltMax generatorini ijaraga olish uchun qanday hujjatlar kerak?',
      a: 'Ijaraga olish uchun faqat Pasport seriyasi va 14 xonali PINFL (JSHSHIR) kodingiz yetarli. Shaxsiyat rasmiy online KYC formasi orqali 5 minut ichida avtomatik tasdiqlanadi.'
    },
    {
      q: 'Generatordan benzin yoki tutun va shovqin chiqadimi?',
      a: 'Yo\'q! VoltMax generatorlari 100% LiFePO4 batareyali quyosh stansiyasidir. Ular mutlaqo shovqinsiz, hid va tutunsiz uyingiz va xonadoningiz ichida xavfsiz ishlaydi.'
    },
    {
      q: 'Yetkazib berish xizmati mavjudmi?',
      a: 'Ha, Toshkent shahri bo\'ylab 2 soat ichida yetkazib beriladi va viloyatlarga kuryerlik pochtasi orqali tezkor jo\'natiladi.'
    },
    {
      q: 'To\'lovlarni Click yoki Payme orqali amalga oshirish mumkinmi?',
      a: 'Ha, ham Click Pass, ham Payme Business hamda naqd to\'lov usullari to\'liq integratsiya qilingan.'
    }
  ];

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          <Phone size={14} /> BIZGA BOG'LANISH VA ALOQA
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--meco-text-main)' }}>
          VOLTMAXHUB Qo'llab-Quvvatlash va Markaziy Ofis
        </h1>
        <p style={{ color: 'var(--meco-text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
          Generatorlar ijarasi, xaridi va tijorat hamkorligi bo'yicha savollaringiz bo'lsa biz bilan bog'laning.
        </p>
      </div>

      {/* CONTACT INFO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        <div style={{ background: 'var(--meco-card-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Phone size={22} />
          </div>
          <strong style={{ fontSize: '1.05rem', display: 'block', color: 'var(--meco-text-main)' }}>Telefon Raqam:</strong>
          <span style={{ color: '#2563eb', fontSize: '1.1rem', fontWeight: '800' }}>+998 71 200 50 50</span>
          <span style={{ color: 'var(--meco-text-muted)', fontSize: '0.82rem', display: 'block', marginTop: '4px' }}>Dushanba - Yakshanba (24/7)</span>
        </div>

        <div style={{ background: 'var(--meco-card-bg)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: '#f0fdfa', color: '#0d9488', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <MessageSquare size={22} />
          </div>
          <strong style={{ fontSize: '1.05rem', display: 'block', color: 'var(--meco-text-main)' }}>Telegram Bot / Chat:</strong>
          <span style={{ color: '#0d9488', fontSize: '1.1rem', fontWeight: '800' }}>@voltmaxhub_uz</span>
          <span style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', marginTop: '4px' }}>Operator bilan jonli muloqot</span>
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: '#faf5ff', color: '#9333ea', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <MapPin size={22} />
          </div>
          <strong style={{ fontSize: '1.05rem', display: 'block', color: '#0f172a' }}>Markaziy Ofis:</strong>
          <span style={{ color: '#334155', fontSize: '0.95rem', fontWeight: '700' }}>Toshkent sh., Chilonzor t., 10-mavze 4-uy</span>
          <span style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', marginTop: '4px' }}>Mo'ljal: Metro Chilonzor</span>
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Clock size={22} />
          </div>
          <strong style={{ fontSize: '1.05rem', display: 'block', color: '#0f172a' }}>Ish Vaqti:</strong>
          <span style={{ color: '#334155', fontSize: '0.95rem', fontWeight: '700' }}>09:00 — 20:00 (Dam olish kunlarisiz)</span>
          <span style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', marginTop: '4px' }}>Online buyurtmalar 24/7</span>
        </div>
      </div>

      {/* FORM & FAQ SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'flex-start' }}>
        
        {/* Contact Form */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid var(--meco-border)', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a' }}>
            Bizga Xabar Yuborish
          </h2>

          {submitted ? (
            <div style={{ background: '#f0fdf4', color: '#166534', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <CheckCircle size={36} style={{ margin: '0 auto 0.5rem auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Xabaringiz Qabul Qilindi!</h3>
              <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>Mutaxassislarimiz 15 minut ichida ko'rsatilgan telefon raqamingizga bog'lanishadi.</p>
              <button className="btn btn-sm btn-primary" onClick={() => setSubmitted(false)} style={{ marginTop: '1rem' }}>Yangi xabar yuborish</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ismingiz</label>
                <input type="text" className="form-input" placeholder="Alisher Qayumov" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Telefon Raqamingiz</label>
                <input type="text" className="form-input" placeholder="+998901234567" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Mavzu</label>
                <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="Umumiy savol">Umumiy savol</option>
                  <option value="Ijara bo'yicha">Ijara bo'yicha</option>
                  <option value="Sotib olish bo'yicha">Sotib olish bo'yicha</option>
                  <option value="Tijorat va Ulgurji">Tijorat hamkorligi</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Xabaringiz Matni</label>
                <textarea className="form-input" rows={4} placeholder="Generator narxlari va yetkazib berish bo'yicha savolim bor edi..." value={message} onChange={e => setMessage(e.target.value)} required></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '46px', fontWeight: '800', justifyContent: 'center' }} disabled={loading}>
                <Send size={18} />
                Xabarni Yuborish
              </button>
            </form>
          )}
        </div>

        {/* FAQ Accordion */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1rem', color: '#0f172a' }}>
            Ko'p Beriladigan Savollar (FAQ)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: '#fff', 
                  border: '1px solid var(--meco-border)', 
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}
              >
                <div 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{ 
                    padding: '1rem 1.25rem', 
                    display: 'flex', 
                    justify: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontWeight: '700',
                    color: '#0f172a',
                    fontSize: '0.95rem'
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={18} style={{ color: '#2563eb' }} /> : <ChevronDown size={18} style={{ color: '#94a3b8' }} />}
                </div>

                {openFaq === idx && (
                  <div style={{ padding: '0 1.25rem 1rem 1.25rem', color: '#64748b', fontSize: '0.88rem', lineHeight: '1.6', borderTop: '1px dashed #f1f5f9' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
