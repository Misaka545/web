export const formatMoney = (amount) => {
    if (!amount && amount !== 0) return '0';
    return parseInt(amount).toLocaleString('vi-VN');
};