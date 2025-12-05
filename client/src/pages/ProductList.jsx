import React, { useState, useEffect } from 'react';
import { searchProducts, deleteProduct } from '../api/api';
import ProductSkeleton from '../components/ProductSkeleton';

const ProductList = ({ onEdit, onNotify }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ k: '', min: '', max: '' });

    const load = async () => {
        setLoading(true);
        try {
            const data = await searchProducts(filter.k, filter.min, filter.max);
            setProducts(Array.isArray(data) ? data : []);
        } catch(e) { console.error(e) }
        finally { setLoading(false); }
    };
    
    useEffect(() => {
        const t = setTimeout(load, 500);
        return () => clearTimeout(t);
    }, [filter]);

    const handleDelete = async (id) => {
        if(!window.confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return;
        try {
            const res = await deleteProduct(id);
            if(res.message) { 
                onNotify(res.message, 'success'); 
                load(); 
            } 
            else if (res.error) {
                onNotify(res.error, 'error'); 
            }
            else {
                onNotify("Có lỗi không xác định xảy ra", 'error');
            }
        } catch (err) {
            onNotify(err.message || 'Lỗi kết nối', 'error');
        }
    };

    const handleImageError = (e) => {
        e.target.style.display = 'none'; // Ẩn ảnh lỗi
        e.target.nextSibling.style.display = 'block'; // Hiện icon fallback
    };

    return (
        <div className="view-container">
            <div className="top-header">
                <h1>Thư viện sản phẩm</h1>
                <p className="subtitle">Quản lý kho dữ liệu hệ thống</p>
            </div>

            <div className="glass-panel control-bar" style={{ display: 'flex', gap: '16px' }}>
                
                {/* 1. Ô tìm kiếm từ khóa (Lớn nhất) */}
                <div className="search-box" style={{ flex: 3 }}>
                    <i className="fas fa-search"></i>
                    <input 
                        placeholder="Tìm kiếm tên, danh mục..." 
                        value={filter.k}
                        onChange={e => setFilter({ ...filter, k: e.target.value })} 
                    />
                </div>

                {/* Đường kẻ dọc ngăn cách cho đẹp */}
                <div style={{ width: 1, height: 30, background: 'var(--border)' }}></div>

                {/* 2. Ô nhập giá thấp nhất (Min) */}
                <div className="search-box" style={{ flex: 1 }}>
                    <i className="fas fa-filter" style={{ fontSize: 12 }}></i> {/* Icon phễu nhỏ */}
                    <input 
                        type="number" 
                        placeholder="Giá thấp nhất" 
                        value={filter.min}
                        onChange={e => setFilter({ ...filter, min: e.target.value })} 
                    />
                </div>

                {/* 3. Ô nhập giá cao nhất (Max) */}
                <div className="search-box" style={{ flex: 1 }}>
                    <i className="fas fa-arrow-up" style={{ fontSize: 12 }}></i> {/* Icon mũi tên */}
                    <input 
                        type="number" 
                        placeholder="Giá cao nhất" 
                        value={filter.max}
                        onChange={e => setFilter({ ...filter, max: e.target.value })} 
                    />
                </div>

            </div>
            {loading ? (
                <ProductSkeleton />
            ) : (
                <div className="grid-products">
                    {products.map(p => (
                        <div key={p.productID} className="product-card">
                             <div className="card-image-placeholder">
                                {p.ImageURL ? (
                                    <>
                                        <img 
                                            src={p.ImageURL} 
                                            alt={p.ProductName} 
                                            onError={handleImageError}
                                            className="product-img-display"
                                        />
                                        {/* Icon này mặc định ẩn, chỉ hiện khi ảnh lỗi */}
                                        <i className="fas fa-cube fallback-icon" style={{display: 'none'}}></i>
                                    </>
                                ) : (
                                    <i className="fas fa-cube"></i>
                                )}
                            </div>

                            <div className="card-content">
                                {/* FIX: Sử dụng đúng tên cột trả về từ sp_searchProducts (PascalCase) */}
                                <h3 className="card-title" title={p.ProductName}>
                                    {p.ProductName || "Tên sản phẩm trống"} 
                                </h3>
                                
                                <div style={{display:'flex', flexDirection:'column', gap: 4, marginBottom: 10}}>
                                    <div className="card-shop">
                                        <i className="fas fa-store-alt" style={{width:20}}></i> 
                                        {p.ShopName || "Chưa có Shop"}
                                    </div>
                                    
                                    <div className="card-shop" style={{color: 'var(--accent)'}}>
                                        <i className="fas fa-tag" style={{width:20}}></i> 
                                        {p.Category || "Chưa có danh mục"}
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <span className="price-tag">
                                        {/* FIX: Sử dụng p.Price */}
                                        {p.Price ? parseInt(p.Price).toLocaleString() : 0} ₫
                                    </span>
                                    <div className="action-buttons">
                                        <button className="btn-icon" onClick={()=>onEdit(p)}>
                                            <i className="fas fa-pen"></i>
                                        </button>
                                        <button className="btn-icon delete" onClick={()=>handleDelete(p.productID)}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!loading && products.length === 0 && (
                 <div style={{textAlign:'center', padding:60, color:'var(--text-muted)', animation: 'fadeIn 0.5s'}}>
                    <i className="fas fa-search" style={{fontSize:40, marginBottom:15, opacity: 0.5}}></i>
                    <p>Không tìm thấy dữ liệu phù hợp</p>
                </div>
            )}
        </div>
    );
};

export default ProductList;