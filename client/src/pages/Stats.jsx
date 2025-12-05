// src/pages/Stats.jsx
import React, { useState, useEffect } from 'react';
import { fetchStats } from '../api/api';

const Stats = ({ shops }) => {
    const [sid, setSid] = useState('');
    const [data, setData] = useState([]);
    
    // 1. Tự động chọn Shop đầu tiên khi danh sách shops được tải về
    useEffect(() => { 
        if(shops && shops.length > 0 && !sid) {
            setSid(shops[0].shopID); 
        }
    }, [shops, sid]);

    // 2. Gọi API khi sid thay đổi
    useEffect(() => {
        if(sid) {
            fetchStats(sid).then(d => {
                console.log("Dữ liệu thống kê nhận được:", d); // Kiểm tra log này trên trình duyệt (F12)
                setData(Array.isArray(d) ? d : []);
            }).catch(err => console.error("Lỗi tải thống kê:", err));
        }
    }, [sid]);

    // Tính tổng an toàn (tránh lỗi NaN)
    const totalRev = data.reduce((sum, item) => sum + (Number(item.TotalRevenue) || 0), 0);
    const totalSold = data.reduce((sum, item) => sum + (Number(item.TotalUnitsSold) || 0), 0);

    return (
        <div className="view-container">
            <div className="top-header">
                <h1>Thống kê Shop</h1>
                <select 
                    className="user-select" 
                    style={{width:200}} 
                    value={sid} 
                    onChange={e => setSid(e.target.value)}
                >
                    {shops.map(s => (
                        <option key={s.shopID} value={s.shopID}>{s.shopName}</option>
                    ))}
                </select>
            </div>

            {/* Các thẻ tổng quan */}
            <div className="stats-container" style={{marginBottom:20}}>
                <div className="stat-box glass-panel green">
                    <div>
                        <div className="nav-group-label">DOANH THU</div>
                        <div className="stat-num">{totalRev.toLocaleString()} ₫</div>
                    </div>
                    <i className="fas fa-coins"></i>
                </div>
                <div className="stat-box glass-panel blue">
                    <div>
                        <div className="nav-group-label">ĐÃ BÁN</div>
                        <div className="stat-num">{totalSold}</div>
                    </div>
                    <i className="fas fa-shopping-bag"></i>
                </div>
            </div>

            {/* Bảng chi tiết */}
            <div className="glass-panel">
                {data.length === 0 ? (
                    <div style={{padding: 20, textAlign: 'center', color: 'var(--text-muted)'}}>
                        Chưa có số liệu bán hàng cho Shop này (Chỉ tính đơn hàng DELIVERED)
                    </div>
                ) : (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Đánh giá</th>
                                <th>Đã bán</th>
                                <th>Doanh thu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d, i) => (
                                <tr key={i}>
                                    <td>{d.ProductName}</td>
                                    <td style={{color: 'gold'}}>
                                        {d.Rating} <i className="fas fa-star" style={{fontSize:10}}></i>
                                    </td>
                                    <td>{d.TotalUnitsSold}</td>
                                    <td style={{color:'var(--accent)', fontWeight:'bold'}}>
                                        {Number(d.TotalRevenue).toLocaleString()} ₫
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
export default Stats;