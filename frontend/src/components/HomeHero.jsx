import React, { useState } from 'react';
import { Zap, ShieldCheck, Clock, CheckCircle2, ArrowRight, BatteryCharging, Sun, Award, HelpCircle } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

export default function HomeHero({ onGoCatalog, onGoContact, t = {} }) {
  usePageMeta({
    title: 'Shovqinsiz va inverterli generatorlar ijarasi',
    description: 'VOLTMAXHUB — O\'zbekistonda benzinli, past shovqili inverter generatorlar ijarasi. Kunlik va uzoq muddatli ijara.'
  });
  // Simple Appliance Capacity Calculator State
  const [selectedAppliance, setSelectedAppliance] = useState('fridge');

  const calcMap = {
    fridge: { name: t.optFridge || 'Uy muzlatgichi + TV + Wi-Fi', watts: '300W', recommended: 'VoltMax 1kWh / 1.8kWh' },
    ac: { name: t.optAc || 'Konditsioner + Xonadon majmuasi', watts: '1500W', recommended: 'VoltMax 3.6kWh Pro' },
    event: { name: t.optEvent || 'To\'y va Tadbirlar (Ovoz va chiroq)', watts: '3000W', recommended: 'VoltMax 5.4kWh Ultra Monster' },
    camping: { name: t.optCamping || 'Kemping / Tog\'da dam olish', watts: '150W', recommended: 'VoltMax 320Wh / VoltMax 1kWh' }
  };

  return (
    <div>
      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)',
        color: '#ffffff',
        padding: '5rem 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.3)', border: '1px solid rgba(59, 130, 246, 0.5)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '800', color: '#60a5fa', marginBottom: '1.25rem' }}>
              <Zap size={16} /> {t.n1Banner || "O'ZBEKISTONDA IJARAGA BERILADIGAN GENERATORLAR"}
            </div>
            
            <h1 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-1px' }}>
              {t.homeHeroTitle || "Shovqinsiz va Inverterli Generatorlar Ijarasi"}
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {t.homeHeroDesc || "Chiroq o'chganida xonadoningiz, tadbiringiz yoki qurilish ob'yektingizni uzluksiz elektr energiyasi bilan ta'minlang. Naqd sotib oling yoki kunlik ijaraga oling!"}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onGoCatalog} style={{ height: '52px', padding: '0 1.75rem', fontSize: '1rem', fontWeight: '800' }}>
                {t.catalogBtn || "Generatorlar Katalogi"}
                <ArrowRight size={20} />
              </button>
              <button className="btn btn-secondary" onClick={onGoContact} style={{ height: '52px', padding: '0 1.75rem', fontSize: '1rem', fontWeight: '800', background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                {t.contactBtn || "Bizga Bog'lanish"}
              </button>
            </div>
          </div>

          {/* CAPACITY CALCULATOR CARD */}
          <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', padding: '2rem', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '1.1rem', marginBottom: '1rem' }}>
              <BatteryCharging size={22} />
              {t.whichGeneratorTitle || "Qaysi Generator Sizga Mos?"}
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {t.whichGeneratorDesc || "Elektr jihozingiz turini tanlang, tizim sizga kerakli quvvat va VoltMax modelini tavsiya etadi:"}
            </p>

            <div className="form-group">
              <label className="form-label" style={{ color: '#e2e8f0' }}>{t.usagePurpose || "Foydalanish Maqsadi:"}</label>
              <select 
                className="form-input" 
                value={selectedAppliance} 
                onChange={e => setSelectedAppliance(e.target.value)}
                style={{ background: '#1e293b', color: '#fff', borderColor: '#334155' }}
              >
                <option value="fridge">{t.optFridge || "Uy muzlatgichi + TV + Wi-Fi"}</option>
                <option value="ac">{t.optAc || "Konditsioner + Xonadon majmuasi"}</option>
                <option value="event">{t.optEvent || "To'y va Katta Tadbirlar"}</option>
                <option value="camping">{t.optCamping || "Kemping / Sayr / Dronlar"}</option>
              </select>
            </div>

            <div style={{ background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span>{t.estPower || "Taxminiy sarf quvvati:"}</span>
                <strong style={{ color: '#38bdf8' }}>{calcMap[selectedAppliance].watts}</strong>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>
                {t.recommendedModel || "Tavsiya etilgan model:"} <br/>
                <span style={{ color: '#60a5fa' }}>{calcMap[selectedAppliance].recommended}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY VOLTMAXHUB SECTION */}
      <section style={{ padding: '4rem 2rem', background: 'var(--meco-card-bg)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--meco-text-main)', marginBottom: '0.5rem' }}>
              {t.whyVoltmaxTitle || "Nima Uchun Aynan VOLTMAXHUB Generatorlari?"}
            </h2>
            <p style={{ color: 'var(--meco-text-muted)', fontSize: '1rem' }}>
              {t.whyVoltmaxDesc || "Ishlab chiqaruvchi MECO generatorlari — barqaror, ixcham va kichik yoqilindiq sarfi bilan. Biz ularni tozalab, texnik xizmatdan o'tkazib beramiz."}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'var(--meco-bg)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--meco-border)' }}>
              <div style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <BatteryCharging size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--meco-text-main)' }}>{t.lifep04Title || "Benzinli Generatorlar"}</h3>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {t.lifep04Desc || "3500+ marta zaryadlash sikliga va 10 yildan ortiq xizmat qilish muddatiga ega eng xavfsiz batareyalar."}
              </p>
            </div>

            <div style={{ background: 'var(--meco-bg)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--meco-border)' }}>
              <div style={{ background: 'rgba(217,119,6,0.12)', color: '#d97706', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Sun size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--meco-text-main)' }}>{t.fastSolarTitle || "Inverter Texnologiyasi"}</h3>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {t.fastSolarDesc || "Sof sinus tokiqli chiqish — sekin ishlatiladigan qurilma uchun xavfsiz, ruhan bezak qilmaydigan quvvat."}
              </p>
            </div>

            <div style={{ background: 'var(--meco-bg)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--meco-border)' }}>
              <div style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Award size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--meco-text-main)' }}>{t.officialWarrantyTitle || "Rasmiy 6 Oylik Kafolat"}</h3>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {t.officialWarrantyDesc || "O'zbekiston bo'yicha rasmiy servis markazi va 100% kafolatlangan texnik yordam."}
              </p>
            </div>

            <div style={{ background: 'var(--meco-bg)', padding: '1.75rem', borderRadius: '16px', border: '1px solid var(--meco-border)' }}>
              <div style={{ background: 'rgba(147,51,234,0.12)', color: '#9333ea', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Clock size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--meco-text-main)' }}>{t.fastKycTitle || "Tezkor Online KYC Ijara"}</h3>
              <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {t.fastKycDesc || "Garovsiz va ortiqcha hujjatlarsiz Pasport va PINFL orqali 5 minutda kunlik ijarani rasmiylashtiring."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
