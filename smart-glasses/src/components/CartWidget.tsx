/**
 * CartWidget — Floating mini cart in the bottom-right corner
 * Shows added glasses with Pay and Deliver (Livrer) buttons
 */

import React, { useState, useCallback } from 'react';
import { ShoppingCart, X, Send } from 'lucide-react';
import type { Glasses } from '@/data/glassesData';
import OrderModal from './OrderModal';
import './CartWidget.css';

export interface CartItem {
    glasses: Glasses;
    quantity: number;
}

interface CartWidgetProps {
    items: CartItem[];
    onRemoveItem: (glassesId: string) => void;
    onClearCart: () => void;
}

export const CartWidget: React.FC<CartWidgetProps> = ({
    items,
    onRemoveItem,
    onClearCart,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    // Total price calculation is now handled in the OrderModal

    const toggleCart = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    // Don't show the widget if cart is empty
    if (items.length === 0) return null;

    return (
        <>
            {/* Floating toggle button */}
            <button className="cart-widget-toggle" onClick={toggleCart} aria-label="Open cart">
                <ShoppingCart size={24} />
                {totalItems > 0 && (
                    <span className="cart-badge">{totalItems}</span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="cart-dropdown">
                    {/* Header */}
                    <div className="cart-dropdown-header">
                        <h3 className="cart-dropdown-title">My Cart ({totalItems})</h3>
                        <button className="cart-dropdown-close" onClick={toggleCart} aria-label="Close cart">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Items */}
                    <div className="cart-items">
                        {items.map((item) => (
                            <div key={item.glasses.id} className="cart-item">
                                <img
                                    src={item.glasses.image}
                                    alt={item.glasses.name}
                                    className="cart-item-img"
                                />
                                <div className="cart-item-info">
                                    <p className="cart-item-name">{item.glasses.name}</p>
                                    <p className="cart-item-brand">{item.glasses.brand}</p>
                                </div>
                                <span className="cart-item-price">{item.glasses.price} DA</span>
                                <button
                                    className="cart-item-remove"
                                    onClick={() => onRemoveItem(item.glasses.id)}
                                    aria-label={`Remove ${item.glasses.name}`}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer: action button only (Total moved to modal) */}
                    <div className="cart-footer">
                        <div className="cart-action-btns">
                            <button
                                className="cart-btn-pay"
                                onClick={() => {
                                    setIsOpen(false); // Close cart dropdown
                                    setIsOrderModalOpen(true); // Open order modal
                                }}
                            >
                                <Send size={16} />
                                ارسال الطلب
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Modal */}
            <OrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                cartItems={items}
            />
        </>
    );
};

export default CartWidget;
