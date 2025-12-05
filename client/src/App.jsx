import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProductList from './pages/ProductList';
import ProductManager from './pages/ProductManager';
import Stats from './pages/Stats';
import Toast from './components/Toast';
import { fetchShops, fetchCategories } from './api/api';
import './styles/index.css';

function App() {
    const [tab, setTab] = useState('search');
    const [notification, setNotify] = useState(null);
    
    // Global Data
    const [shops, setShops] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editData, setEditData] = useState(null); // Dữ liệu sản phẩm đang sửa

    useEffect(() => {
        const load = async () => {
            setShops(await fetchShops());
            setCategories(await fetchCategories());
        };
        load();
    }, []);

    const showNotify = (msg, type='success') => setNotify({ message: msg, type });

    const handleEdit = (product) => {
        setEditData(product);
        setTab('manager');
    };

    const handleSaveSuccess = () => {
        setEditData(null);
        setTab('search');
    };

    return (
        <div className="app-wrapper">
             <div className="app-bg">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <Sidebar tab={tab} setTab={setTab} />

            <main className="main-content">
                {tab === 'search' && (
                    <ProductList onEdit={handleEdit} onNotify={showNotify} />
                )}
                {tab === 'manager' && (
                    <ProductManager 
                        shops={shops} 
                        categories={categories} 
                        editData={editData} 
                        onCancel={() => { setEditData(null); setTab('search'); }}
                        onNotify={showNotify}
                        onSuccess={handleSaveSuccess}
                    />
                )}
                {tab === 'stats' && (
                    <Stats shops={shops} />
                )}
            </main>

            {notification && <Toast message={notification.message} type={notification.type} onClose={()=>setNotify(null)} />}
        </div>
    );
}

export default App;