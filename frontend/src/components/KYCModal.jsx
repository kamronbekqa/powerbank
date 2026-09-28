import React, { useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle, FileText, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function KYCModal({ user, onClose, onSubmitKYC }) {
  const [passportSeries, setPassportSeries] = useState(user?.passport_series || user?.passportSeries || '');
  const [pinfl, setPinfl] = useState(user?.pinfl || '');
  const [address, setAddress] = useState(user?.address || '');
  
  const [passportFront, setPassportFront] = useState(user?.passportFront || '');
  const [selfie, setSelfie] = useState(user?.selfieUrl || '');
  const [msg, setMsg] = useState('');

  const [isDragPassport, setIsDragPassport] = useState(false);
  const [isDragSelfie, setIsDragSelfie] = useState(false);

  const handleProcessImageFile = (file, targetType) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (targetType === 'passport') setPassportFront(e.target.result);
      if (targetType === 'selfie') setSelfie(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passportSeries.trim() || !pinfl || !address.trim() || !passportFront || !selfie) {
      setMsg("Yuborish uchun pasport seriyasi, 14 xonali PINFL, manzil, pasport rasmi va pasport bilan selfi majburiy.");
      return;
    }
    if (pinfl.length !== 14) {
      setMsg('PINFL (JSHSHIR) 14 xonali raqam bo\'lishi kerak.');
      return;
    }

    const formData = new FormData();
    formData.append('passport_series', passportSeries);
    formData.append('pinfl', pinfl);
    formData.append('address', address);
    if (passportFront) formData.append('passport_front', passportFront);
    if (selfie) formData.append('selfie_with_passport', selfie);

    onSubmitKYC(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--meco-border)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--meco-primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Shaxsni Tasdiqlash (KYC Verification)</h2>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={18} /></button>
        </div>

        {msg && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Pasport seriya & raqam <span className="required-mark">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Masalan: AA1234567" 
                value={passportSeries} 
                onChange={(e) => setPassportSeries(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">PINFL (JSHSHIR - 14 raqam) <span className="required-mark">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="14 xonali JSHSHIR raqami" 
                maxLength={14}
                value={pinfl} 
                onChange={(e) => setPinfl(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Doimiy yashash manzili <span className="required-mark">*</span></label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Shahar, tuman, ko'cha, uy raqami" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* PASSPORT & SELFIE DRAG & DROP UPLOAD BOXES WITH CENTER '+' ICON */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            
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
                  onClick={() => document.getElementById('kyc-modal-passport-input').click()}
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
                    id="kyc-modal-passport-input"
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
              {selfie ? (
                <div style={{ position: 'relative', height: '130px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #2563eb' }}>
                  <img src={selfie} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    onClick={() => setSelfie('')}
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
                  onClick={() => document.getElementById('kyc-modal-selfie-input').click()}
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
                    id="kyc-modal-selfie-input"
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

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--meco-border)', paddingTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" style={{ height: '44px', fontWeight: '700' }}>
              <CheckCircle2 size={16} />
              Tasdiqlashga Yuborish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
