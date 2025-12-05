import React from 'react';

const Sidebar = ({ tab, setTab }) => {
    return (
        <aside className="sidebar">
            <div className="logo-box">
                <i className="fas fa-layer-group logo-icon"></i>
                <span>Admin</span>
            </div>

            <nav className="nav-menu">
                <div className="nav-group-label">Quản lý</div>
                <button className={`nav-item ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}>
                    <i className="fas fa-search"></i> Tra cứu
                </button>
                <button className={`nav-item ${tab==='manager'?'active':''}`} onClick={()=>setTab('manager')}>
                    <i className="fas fa-box"></i> Sản phẩm
                </button>
                <button className={`nav-item ${tab==='stats'?'active':''}`} onClick={()=>setTab('stats')}>
                    <i className="fas fa-chart-pie"></i> Báo cáo
                </button>
            </nav>

            <div className="role-card">
                <div className="avatar-circle">A</div>
                <div>
                    <div style={{fontWeight:600, fontSize:13}}>Admin User</div>
                    <div style={{fontSize:12, color:'var(--text-muted)'}}>System Manager</div>
                </div>
            </div>
        </aside>
    );
};
export default Sidebar;