const mysql = require('mysql2');

// Tạo Pool kết nối (Khuyên dùng cho Production/BTL để hiệu năng tốt hơn)
const pool = mysql.createPool({
    host: 'localhost',      // Địa chỉ máy chủ (thường là localhost)
    user: 'root',           // Tên đăng nhập MySQL (XAMPP mặc định là root)
    password: '05042005',           // Mật khẩu MySQL (XAMPP mặc định là rỗng, nếu cài riêng thì điền pass của bạn)
    database: 'Shopee',   // Tên database bạn đã tạo
    waitForConnections: true,
    connectionLimit: 10,    // Giới hạn số kết nối cùng lúc
    queueLimit: 0,
    decimalNumbers: true    // Giữ nguyên định dạng số DECIMAL chính xác
});

// Kiểm tra kết nối khi khởi động
pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('LỖI: Mất kết nối tới Database.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('LỖI: Database có quá nhiều kết nối.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('LỖI: Không tìm thấy Database. Hãy chắc chắn bạn đã bật XAMPP/MySQL.');
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('LỖI: Sai tên đăng nhập hoặc mật khẩu Database.');
        }
    } else {
        console.log('✅ Đã kết nối thành công tới MySQL Database: Shopeedb');
        if (connection) connection.release(); // Trả kết nối về pool
    }
});

// Xuất ra dạng Promise để dùng async/await trong server.js
module.exports = pool.promise();
