import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { CartItem } from './CartWidget';
import './OrderModal.css';

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
}

interface CityData {
    id: string;
    commune_name: string;
    daira_name: string;
    wilaya_code: string;
    wilaya_name: string;
}

interface Wilaya {
    code: string;
    name: string;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, cartItems }) => {
    const [citiesData, setCitiesData] = useState<CityData[]>([]);
    const [loading, setLoading] = useState(true);

    // Form interactions
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedWilayaCode, setSelectedWilayaCode] = useState('');
    const [selectedCommune, setSelectedCommune] = useState('');
    const [deliveryType, setDeliveryType] = useState<'desk' | 'home'>('home'); // 'desk' (bureau) or 'home' (domicile)

    // Load CSV data
    useEffect(() => {
        fetch('/algeria_cities.csv')
            .then(response => response.text())
            .then(text => {
                const rows = text.split('\n').slice(1); // Skip header
                const data: CityData[] = rows.map(row => {
                    // Handle potential comma inside quotes if necessary, but simple split for now as per view_file
                    // id,commune_name,daira_name,wilaya_code,wilaya_name
                    const cols = row.split(',');
                    if (cols.length < 5) return null;
                    return {
                        id: cols[0],
                        commune_name: cols[1],
                        daira_name: cols[2],
                        wilaya_code: cols[3],
                        wilaya_name: cols[4].replace(/"/g, '').trim() // Clean quotes
                    };
                }).filter(Boolean) as CityData[];
                setCitiesData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load cities:', err);
                setLoading(false);
            });
    }, []);

    // Derived lists
    const wilayas = useMemo(() => {
        const unique = new Map<string, string>();
        citiesData.forEach(city => {
            if (!unique.has(city.wilaya_code)) {
                unique.set(city.wilaya_code, city.wilaya_name);
            }
        });
        return Array.from(unique.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => parseInt(a.code) - parseInt(b.code));
    }, [citiesData]);

    const communes = useMemo(() => {
        if (!selectedWilayaCode) return [];
        return citiesData
            .filter(city => city.wilaya_code === selectedWilayaCode)
            .map(city => city.commune_name)
            .sort();
    }, [citiesData, selectedWilayaCode]);

    // Totals
    const cartTotal = cartItems.reduce((sum, item) => sum + item.glasses.price * item.quantity, 0);
    // Rough estimate rates: Desk=400 DA, Home=800 DA (adjust as needed)
    const deliveryPrice = deliveryType === 'desk' ? 400 : 800; // or get from user
    const grandTotal = cartTotal + deliveryPrice;

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError('');

        try {
            const response = await fetch('http://localhost:8001/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    phone: phone,
                    wilaya: wilayas.find(w => w.code === selectedWilayaCode)?.name || selectedWilayaCode,
                    baladia: selectedCommune,
                    delivery_type: deliveryType,
                    items: cartItems.map(item => ({
                        glasses_id: parseInt(item.glasses.id.replace(/\D/g, '')) || 1,
                        quantity: item.quantity,
                    })),
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'فشل في إرسال الطلب');
            }

            setSubmitSuccess(true);
            setTimeout(() => {
                setSubmitSuccess(false);
                onClose();
            }, 2000);
        } catch (err: any) {
            setSubmitError(err.message || 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="order-modal-overlay">
            <div className="order-modal-container">
                <div className="order-modal-header">
                    <h2>معلومات الطلب</h2>
                    <button onClick={onClose} className="order-modal-close"><X /></button>
                </div>

                <div className="order-modal-body">
                    <form onSubmit={handleSubmit}>
                        {/* 1. Full Name */}
                        <div className="form-group">
                            <label>الاسم الكامل</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="ادخل اسمك الكامل"
                            />
                        </div>

                        {/* 2. Phone */}
                        <div className="form-group">
                            <label>رقم الهاتف</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="05/06/07..."
                            />
                        </div>

                        {/* 3. Wilaya */}
                        <div className="form-group">
                            <label>الولاية</label>
                            <select
                                required
                                value={selectedWilayaCode}
                                onChange={e => {
                                    setSelectedWilayaCode(e.target.value);
                                    setSelectedCommune('');
                                }}
                                disabled={loading}
                            >
                                <option value="">اختر الولاية</option>
                                {wilayas.map(w => (
                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 4. Commune */}
                        <div className="form-group">
                            <label>البلدية</label>
                            <select
                                required
                                value={selectedCommune}
                                onChange={e => setSelectedCommune(e.target.value)}
                                disabled={!selectedWilayaCode}
                            >
                                <option value="">اختر البلدية</option>
                                {communes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* 5. Delivery Type */}
                        <div className="form-group">
                            <label>التوصيل</label>
                            <div className="delivery-options">
                                <label className={`delivery-option ${deliveryType === 'home' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="delivery"
                                        value="home"
                                        checked={deliveryType === 'home'}
                                        onChange={() => setDeliveryType('home')}
                                    />
                                    للمنزل (التوصيل لباب الدار)
                                </label>
                                <label className={`delivery-option ${deliveryType === 'desk' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="delivery"
                                        value="desk"
                                        checked={deliveryType === 'desk'}
                                        onChange={() => setDeliveryType('desk')}
                                    />
                                    للمكتب (استلام من المكتب)
                                </label>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="order-summary">
                            <div className="summary-row">
                                <span>مجموع سلتك</span>
                                <span>{cartTotal} DA</span>
                            </div>
                            <div className="summary-row">
                                <span>سعر التوصيل</span>
                                <span>{deliveryPrice} DA</span>
                            </div>
                            <div className="summary-row total">
                                <span>السعر الاجمالي</span>
                                <span>{grandTotal} DA</span>
                            </div>
                        </div>

                        {submitError && (
                            <div style={{ color: '#e53e3e', textAlign: 'center', marginBottom: 12, fontSize: '0.9rem' }}>
                                ❌ {submitError}
                            </div>
                        )}

                        {submitSuccess && (
                            <div style={{ color: '#38a169', textAlign: 'center', marginBottom: 12, fontSize: '1rem', fontWeight: 600 }}>
                                ✅ تم إرسال الطلب بنجاح!
                            </div>
                        )}

                        <button
                            type="submit"
                            className="submit-order-btn"
                            disabled={submitting || submitSuccess}
                            style={{ opacity: (submitting || submitSuccess) ? 0.6 : 1 }}
                        >
                            {submitting ? 'جاري الإرسال...' : 'ارسال الطلب'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
