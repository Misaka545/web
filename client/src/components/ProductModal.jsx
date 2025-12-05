import React from 'react';
import { formatMoney } from '../utils/format';

const ProductModal = ({ product, onClose, onEdit }) => {
    if (!product) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                
                <div className="modal-header">
                    <div className="modal-icon-box"><i className="fas fa-box-open"></i></div>
                    <div className="modal-title-group">
                        <span className="badge badge-shop">{product.ShopName}</span>
                        <h2>{product.ProductName}</h2>
                        <span className="badge badge-category">{product.Category || 'General'}</span>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="price-tag-large">
                        <span className="currency">₫</span> {formatMoney(product.Price)}
                    </div>
                    <div className="desc-box">
                        <label>Mô tả chi tiết</label>
                        <p>{product.description || 'Chưa có mô tả chi tiết.'}</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary btn-full" onClick={() => onEdit(product)}>
                        <i className="fas fa-pen-to-square"></i> Chỉnh sửa sản phẩm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;