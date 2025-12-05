const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database.js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// 1. Lấy danh sách Shop & Category
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT categoryID, categoryName FROM CATEGORY");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/shops', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT shopID, shopName FROM SHOP");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Tìm kiếm sản phẩm
app.get('/api/products/search', async (req, res) => {
    const { keyword, min, max } = req.query;
    try {
        const [rows] = await db.execute('CALL sp_searchProducts(?, ?, ?)', [
            keyword || '', min || 0, max || 999999999
        ]);
        // MySQL driver trả về mảng các result sets, result set đầu tiên là dữ liệu ta cần
        res.json(rows[0]); 
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Thêm sản phẩm
app.post('/api/products', async (req, res) => {
    const { shopID, name, description, basePrice, categoryID } = req.body;
    try {
        await db.execute('CALL INSERT_PRODUCT(?, ?, ?, ?, ?)', 
            [shopID, name, description, basePrice, categoryID]);
        res.json({ message: 'Thêm sản phẩm thành công!' });
    } catch (err) { 
        console.error(err);
        res.status(400).json({ error: err.sqlMessage || err.message }); 
    }
});

// 4. Cập nhật sản phẩm
app.put('/api/products/:id', async (req, res) => {
    const { name, description, basePrice, categoryID } = req.body;
    const productID = req.params.id;
    try {
        // GỌI 5 THAM SỐ: ID, Tên, Mô tả, Giá, ID Danh mục
        await db.execute('CALL UPDATE_PRODUCT(?, ?, ?, ?, ?)', 
            [productID, name, description, basePrice, categoryID]);
        res.json({ message: 'Cập nhật thành công!' });
    } catch (err) { 
        console.error(err);
        res.status(400).json({ error: err.sqlMessage || err.message }); 
    }
});

// 5. Xóa sản phẩm
app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.execute('CALL DELETE_PRODUCT(?)', [req.params.id]);
        res.json({ message: 'Xóa thành công!' });
    } catch (err) { res.status(400).json({ error: err.sqlMessage || err.message }); }
});

// 6. Thống kê Shop
app.get('/api/shops/:id/stats', async (req, res) => {
    try {
        // Gọi Procedure
        const [rows] = await db.execute('CALL sp_getShopProductStatistics(?, 0)', [req.params.id]);
        const resultData = Array.isArray(rows[0]) ? rows[0] : rows[1];
        
        // Log ra để kiểm tra nếu cần
        console.log("Stats Data:", resultData);

        res.json(resultData || []);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/shops/:id/net-revenue', async (req, res) => {
    const shopId = req.params.id;
    // Lấy tháng và năm hiện tại
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    try {
        // Gọi Function SQL: SELECT fn_calculateShopNetRevenue(...)
        const [rows] = await db.execute(
            'SELECT fn_calculateShopNetRevenue(?, ?, ?) AS netRevenue', 
            [shopId, month, year]
        );
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});