import React from 'react';

const ProductSkeleton = () => {
    // Tạo mảng 8 phần tử giả
    return (
        <div className="grid-products">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="product-card" style={{pointerEvents: 'none'}}>
                    <div className="card-image-placeholder skeleton"></div>
                    <div className="card-content">
                        <div className="skeleton skeleton-text" style={{width: '70%'}}></div>
                        <div className="skeleton skeleton-text" style={{width: '40%'}}></div>
                        <div className="card-footer" style={{borderTop:'none', paddingTop: 10}}>
                             <div className="skeleton skeleton-text" style={{width: '30%', height: 20}}></div>
                             <div className="skeleton skeleton-text" style={{width: '20%', height: 30, borderRadius:6}}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProductSkeleton;