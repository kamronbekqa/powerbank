import React from 'react';
import { ShoppingBag, CreditCard } from 'lucide-react';
import { apiUrl } from '../utils/api';

export default function ClientOrders({ orders = [] }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-pending">Kutilmoqda</span>;
      case 'APPROVED':
        return <span className="badge badge-info">Tasdiqlandi</span>;
      case 'ACTIVE':
        return <span className="badge badge-success">Faol Ijara / Sotib Olingan</span>;
      case 'COMPLETED':
        return <span className="badge badge-success">Yakunlangan</span>;
      case 'OVERDUE':
        return <span className="badge badge-danger">Muddati O'tgan</span>;
      case 'LEGAL_PROCESS':
        return <span className="badge badge-danger">Sud Jarayonida (Da'vo Arizasi)</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Bekor Qilingan</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ShoppingBag size={28} style={{ color: 'var(--meco-primary)' }} />
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Mening Xaridorlik Va Ijaralarim Tarixi</h1>
          <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem' }}>
            Meco generatorlarini sotib olish va ijaraga olish buyurtmalari ro'yxati
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--meco-border)', padding: '3rem', borderRadius: '14px', textAlign: 'center' }}>
          <ShoppingBag size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Sizda hali hech qanday buyurtma mavjud emas</h3>
          <p style={{ color: 'var(--meco-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Katalog bo'limidan Meco generatorlarini sotib olishingiz yoki ijaraga olishingiz mumkin.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Generator / Mahsulot</th>
                <th>Turi</th>
                <th>Sanalar</th>
                <th>Jami Summa</th>
                <th>Status</th>
                <th>To'lov Oqimi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const prodTitle = order.product?.title || order.product_detail?.title || 'Meco Generator';
                const startStr = order.startDate ? new Date(order.startDate).toLocaleDateString('uz-UZ') : (order.start_date || '—');
                const endStr = order.endDate ? new Date(order.endDate).toLocaleDateString('uz-UZ') : (order.end_date || '—');
                const amount = Number(order.totalAmount || order.total_price || 0);

                return (
                  <tr key={order.id}>
                    <td><strong>#{String(order.id).slice(0, 8)}</strong></td>
                    <td><strong>{prodTitle}</strong></td>
                    <td>
                      <span className={`badge ${order.type === 'BUY' ? 'badge-info' : 'badge-pending'}`}>
                        {order.type || 'RENT'}
                      </span>
                    </td>
                    <td>{order.type === 'BUY' ? 'Sotib Olish' : `${startStr} — ${endStr}`}</td>
                    <td><strong>{amount.toLocaleString()} UZS</strong></td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      {order.status === 'APPROVED' || order.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={async () => {
                              const res = await fetch(apiUrl('/api/checkout/click'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: order.id, amount })
                              });
                              const data = await res.json();
                              if (data.redirectUrl) window.open(data.redirectUrl, '_blank');
                            }}
                          >
                            <CreditCard size={14} /> Click
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={async () => {
                              const res = await fetch(apiUrl('/api/checkout/payme'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: order.id, amount })
                              });
                              const data = await res.json();
                              if (data.redirectUrl) window.open(data.redirectUrl, '_blank');
                            }}
                          >
                            Payme
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--meco-text-muted)' }}>To'lov tasdiqlangan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
