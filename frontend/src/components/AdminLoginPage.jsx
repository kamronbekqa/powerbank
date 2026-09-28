import React, { useState } from 'react';
import { Lock, Zap, ShieldAlert, AlertCircle, ArrowRight, Eye, EyeOff, User } from 'lucide-react';

export default function AdminLoginPage({ onLoginSuccess, onGoBack, lang = 'UZ', t = {} }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!login || !password) {
      setErrorMsg(lang === 'UZ' ? 'Admin login va parolni kiriting.' : lang === 'RU' ? 'Введите логин и пароль администратора.' : 'Please enter admin login and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, phone: login, password })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(lang === 'UZ' ? 'Server javobida xatolik yuz berdi.' : 'Server response error');
      }
      if (!res.ok) throw new Error(data.error || (lang === 'UZ' ? 'Kirish xatoligi' : lang === 'RU' ? 'Ошибка входа' : 'Login error'));
      if (data.user?.role !== 'ADMIN') {
        throw new Error(lang === 'UZ' ? 'Faqat administratorlar kira oladi!' : 'Only administrators are allowed!');
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const label = {
    UZ: { title: 'Admin Paneliga Kirish', subtitle: 'Meco Solar CRM boshqaruv tizimi', loginLbl: 'Admin Login', passLbl: 'Admin Paroli', loginBtn: 'Tizimga Kirish', goBack: '← Asosiy sahifaga qaytish' },
    RU: { title: 'Вход в Панель Администратора', subtitle: 'Система управления Meco Solar CRM', loginLbl: 'Логин Админа', passLbl: 'Пароль Админа', loginBtn: 'Войти', goBack: '← Вернуться на главную' },
    EN: { title: 'Admin Panel Login', subtitle: 'Meco Solar CRM Management System', loginLbl: 'Admin Login', passLbl: 'Admin Password', loginBtn: 'Log In', goBack: '← Back to Homepage' }
  }[lang] || label?.UZ;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', top: '-200px', left: '-200px' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '460px' }}>
        
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(37,99,235,0.4)' }}>
              <ShieldAlert size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem' }}>{label.title}</div>
              <div style={{ color: '#60a5fa', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '1px' }}>MECO SOLAR CRM</div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label.loginLbl}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="admin"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  required
                  style={{ paddingLeft: '42px', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label.passLbl}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="admin123"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '42px', paddingRight: '44px', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                background: loading ? '#1d4ed8' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'inherit',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(37,99,235,0.4)'
              }}
            >
              {loading ? 'Tekshirilmoqda...' : (
                <>
                  {label.loginBtn}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <button
            onClick={onGoBack}
            style={{ marginTop: '1.25rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%', textAlign: 'center', padding: '8px' }}
          >
            {label.goBack}
          </button>
        </div>
      </div>
    </div>
  );
}
