import React from 'react';

export function ProductCardSkeleton() {
  return (
    <div className="card skeleton-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div 
        className="skeleton" 
        style={{ width: '100%', height: '220px', borderRadius: '12px 12px 0 0' }} 
      />
      <div className="card-body" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: '22px', width: '70%', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '14px', width: '95%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '54px', width: '100%', borderRadius: '10px', marginTop: '4px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
          <div className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <tr style={{ borderBottom: '1px solid var(--meco-border)' }}>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '20px', height: '16px', borderRadius: '4px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '120px', height: '18px', borderRadius: '4px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '12px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '90px', height: '18px', borderRadius: '4px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '70px', height: '24px', borderRadius: '12px' }} /></td>
      <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '60px', height: '30px', borderRadius: '6px' }} /></td>
    </tr>
  );
}

export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <span 
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'meco-spin 0.75s linear infinite',
        verticalAlign: 'middle'
      }}
    />
  );
}
