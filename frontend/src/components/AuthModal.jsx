import React, { useState } from 'react';
import { X, Lock, Phone, User, ArrowRight, AlertCircle, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal({ onClose, onLoginSuccess, lang = 'UZ', t = {} }) {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const labels = {
    UZ: {
      loginTitle: 'Tizimga Kirish',
      loginSubtitle: 'Shaxsiy kabinet va ijaralaringizni boshqaring',
      registerTitle: "Ro'yxatdan O'tish",
      registerSubtitle: 'Meco CRM platformasida yangi akkaunt yarating',
      login: 'Kirish',
      register: "Ro'yxatdan O'tish",
      fullName: 'F.I.SH (Ism va Familiya)',
      phone: 'Telefon Raqam / Email',
      password: 'Parol',
      orWith: 'YOKI',
      submit: 'Tizimga Kirish',
      submitReg: "Ro'yxatdan O'tish",
      errorEmpty: 'Telefon raqam yoki email kiriting.',
      googleSuccess: "Google orqali muvaffaqiyatli kirildi!",
      googleError: "Google orqali kirishda xatolik yuz berdi."
    },
    RU: {
      loginTitle: 'Вход в Систему',
      loginSubtitle: 'Личный кабинет и управление арендами',
      registerTitle: 'Регистрация',
      registerSubtitle: 'Создайте новый аккаунт в платформе Meco CRM',
      login: 'Войти',
      register: 'Регистрация',
      fullName: 'Ф.И.О. (Имя и Фамилия)',
      phone: 'Номер Телефона / Email',
      password: 'Пароль',
      orWith: 'ИЛИ',
      submit: 'Войти',
      submitReg: 'Зарегистрироваться',
      errorEmpty: 'Введите номер телефона или email.',
      googleSuccess: "Успешный вход через Google!",
      googleError: "Ошибка входа через Google."
    },
    EN: {
      loginTitle: 'User Login',
      loginSubtitle: 'Manage your personal rentals and orders',
      registerTitle: 'Create Account',
      registerSubtitle: 'Register a new account on Meco CRM platform',
      login: 'Login',
      register: 'Register',
      fullName: 'Full Name',
      phone: 'Phone Number / Email',
      password: 'Password',
      orWith: 'OR',
      submit: 'Log In',
      submitReg: 'Create Account',
      errorEmpty: 'Please enter phone number or email.',
      googleSuccess: "Signed in with Google successfully!",
      googleError: "Google sign-in failed."
    }
  };

  const lbl = labels[lang] || labels.UZ;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone) { setErrorMsg(lbl.errorEmpty); return; }
    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? { phone, password, fullName, role: 'CLIENT' }
        : { phone, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(lang === 'UZ' ? 'Server javobida xatolik yuz berdi.' : 'Server error');
      }
      if (!res.ok) throw new Error(data.error || (lang === 'UZ' ? 'Autentifikatsiyada xatolik' : lang === 'RU' ? 'Ошибка авторизации' : 'Auth error'));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(lbl.googleError);
      }
      if (!res.ok) throw new Error(data.error || lbl.googleError);
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || lbl.googleError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMsg(lbl.googleError);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--meco-text-main)', lineHeight: 1.2 }}>
                {isRegister ? lbl.registerTitle : lbl.loginTitle}
              </h2>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.8rem' }}>
                {isRegister ? lbl.registerSubtitle : lbl.loginSubtitle}
              </p>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'var(--meco-bg)', padding: '4px', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--meco-border)' }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
            style={{ padding: '0.55rem', fontWeight: '700', fontSize: '0.88rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: !isRegister ? 'var(--meco-primary)' : 'transparent', color: !isRegister ? '#fff' : 'var(--meco-text-muted)' }}
          >
            {lbl.login}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
            style={{ padding: '0.55rem', fontWeight: '700', fontSize: '0.88rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: isRegister ? 'var(--meco-primary)' : 'transparent', color: isRegister ? '#fff' : 'var(--meco-text-muted)' }}
          >
            {lbl.register}
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Google Sign-In Button — Real OAuth */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            width={380}
            text="signin_with"
            locale={lang === 'UZ' ? 'uz' : lang === 'RU' ? 'ru' : 'en'}
            shape="rectangular"
            theme="outline"
            size="large"
          />
        </div>

        <div style={{ textAlign: 'center', margin: '0 0 1.25rem 0', position: 'relative' }}>
          <span style={{ background: 'var(--meco-card-bg)', padding: '0 10px', fontSize: '0.78rem', color: 'var(--meco-text-muted)', position: 'relative', zIndex: 1 }}>
            {lbl.orWith}
          </span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid var(--meco-border)', zIndex: 0 }} />
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">{lbl.fullName}</label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--meco-text-muted)' }} />
                <input type="text" className="form-input" placeholder="Alisher Qayumov" value={fullName} onChange={e => setFullName(e.target.value)} style={{ paddingLeft: '38px' }} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{lbl.phone}</label>
            <div style={{ position: 'relative' }}>
              <Phone size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--meco-text-muted)' }} />
              <input type="text" className="form-input" placeholder="+998901234567" value={phone} onChange={e => setPhone(e.target.value)} style={{ paddingLeft: '38px' }} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{lbl.password}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--meco-text-muted)' }} />
              <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: '38px' }} required />
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', height: '46px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontWeight: '800', fontSize: '0.92rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
          >
            {loading ? (
              <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                {isRegister ? lbl.submitReg : lbl.submit}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
