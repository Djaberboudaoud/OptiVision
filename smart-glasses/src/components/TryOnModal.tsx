/**
 * TryOnModal — Warby Parker–style split-panel try-on experience
 * Left:  WebAR webcam with glasses overlay
 * Right: Product details + Add to Cart
 */

import React, { useState, useCallback } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import WebARTryOn from '@/components/WebARTryOn';
import type { Glasses } from '@/data/glassesData';
import './TryOnModal.css';

interface TryOnModalProps {
    glasses: Glasses;
    allGlasses: Glasses[];
    onClose: () => void;
    onSelectGlasses: (glasses: Glasses) => void;
    onAddToCart: (glasses: Glasses) => void;
}

/** Map a color name to a CSS background value */
function colorToCss(color: string): string {
    const c = color.toLowerCase();
    if (c.includes('gold')) return 'linear-gradient(135deg, #FFD700, #DAA520)';
    if (c.includes('rose')) return 'linear-gradient(135deg, #E8A0BF, #C88EA7)';
    if (c.includes('silver')) return 'linear-gradient(135deg, #C0C0C0, #A8A8A8)';
    if (c.includes('gunmetal')) return '#4a4a4a';
    if (c.includes('black')) return '#1a1a1a';
    if (c.includes('matte')) return '#2a2a2a';
    if (c.includes('tortoise')) return 'linear-gradient(135deg, #8B4513, #654321)';
    if (c.includes('brown')) return '#654321';
    if (c.includes('burgundy')) return '#800020';
    if (c.includes('navy')) return '#000080';
    if (c.includes('crystal') || c.includes('clear')) return 'linear-gradient(135deg, #e8e8e8, #f5f5f5)';
    if (c.includes('pink')) return '#FFB6C1';
    if (c.includes('blue') || c.includes('sky')) return '#87CEEB';
    return '#888';
}

const TryOnModal: React.FC<TryOnModalProps> = ({
    glasses,
    allGlasses,
    onClose,
    onSelectGlasses,
    onAddToCart,
}) => {
    const [selectedColor, setSelectedColor] = useState(0);
    const [addedToCart, setAddedToCart] = useState(false);

    const handleAddToCart = useCallback(() => {
        setAddedToCart(true);
        onAddToCart(glasses);
        setTimeout(() => setAddedToCart(false), 2500);
    }, [onAddToCart, glasses]);

    const handleSwitchGlasses = useCallback((g: Glasses) => {
        onSelectGlasses(g);
        setSelectedColor(0);
        setAddedToCart(false);
    }, [onSelectGlasses]);

    return (
        <div className="tryon-modal-overlay" onClick={onClose}>
            <div
                className="tryon-modal-container"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ═══ Left: Webcam AR ═══ */}
                <div className="tryon-webcam-panel">
                    <WebARTryOn
                        glbModelUrl={glasses.webarModelFile}
                        onClose={onClose}
                        className="h-full"
                    />
                </div>

                {/* ═══ Right: Product Details ═══ */}
                <div className="tryon-details-panel">
                    {/* Close button */}
                    <button className="tryon-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>

                    {/* Product info */}
                    <div className="tryon-product-info">
                        <h2 className="tryon-product-name">{glasses.name}</h2>
                        <p className="tryon-product-brand">{glasses.brand}</p>

                        {/* Color swatches */}
                        <div className="tryon-color-section">
                            <p className="tryon-section-label">Color</p>
                            <div className="tryon-color-swatches">
                                {glasses.colors.map((color, i) => (
                                    <div
                                        key={i}
                                        className={`tryon-color-swatch ${selectedColor === i ? 'active' : ''}`}
                                        style={{ background: colorToCss(color) }}
                                        title={color}
                                        onClick={() => setSelectedColor(i)}
                                    />
                                ))}
                            </div>
                            <p className="tryon-color-name">{glasses.colors[selectedColor]}</p>
                        </div>

                        {/* Detail badges */}
                        <div className="tryon-details-row">
                            <span className="tryon-detail-badge">{glasses.frameType}</span>
                            <span className="tryon-detail-badge">{glasses.material}</span>
                            <span className="tryon-detail-badge">
                                MBS: {glasses.mbsRange[0]}–{glasses.mbsRange[1]}mm
                            </span>
                        </div>

                        {/* Price */}
                        <div className="tryon-price-section">
                            <p className="tryon-price">{glasses.price} DA</p>
                            <p className="tryon-price-note">Starting price</p>
                        </div>

                        {/* Add to cart */}
                        <button
                            className="tryon-add-to-cart"
                            onClick={handleAddToCart}
                            style={addedToCart ? {
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                            } : undefined}
                        >
                            {addedToCart ? (
                                <>✓ Added to Cart</>
                            ) : (
                                <>
                                    <ShoppingCart size={18} />
                                    Add to Cart — {glasses.price} DA
                                </>
                            )}
                        </button>

                        {/* View details link */}
                        <button className="tryon-view-details">
                            View full details ›
                        </button>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default TryOnModal;
