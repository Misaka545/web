export const fetchCategories = async () => (await fetch('/api/categories')).json();
export const fetchShops = async () => (await fetch('/api/shops')).json();

export const searchProducts = async (keyword, min, max) => {
    const q = new URLSearchParams({ keyword: keyword||'', min: min||0, max: max||'' });
    return (await fetch(`/api/products/search?${q}`)).json();
};

export const saveProduct = async (data) => {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/api/products/${data.id}` : '/api/products';
    const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
};

export const fetchShopNetRevenue = async (shopId) => (await fetch(`/api/shops/${shopId}/net-revenue`)).json();
export const deleteProduct = async (id) => (await fetch(`/api/products/${id}`, { method: 'DELETE' })).json();
export const fetchStats = async (shopId) => (await fetch(`/api/shops/${shopId}/stats`)).json();