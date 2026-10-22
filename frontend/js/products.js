// Products Catalog & Featured Products Handler

let allCategories = [];

// 1. Load Categories into Filter Dropdown
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
            allCategories = data.categories;
            const select = document.getElementById('category-select');
            if (select) {
                select.innerHTML = '<option value="">All Categories</option>' + 
                    allCategories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
            }
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// 2. Filter & Render Products on products.html
async function filterProducts() {
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-select');
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const search = searchInput ? searchInput.value : '';
    const categoryId = categorySelect ? categorySelect.value : '';

    try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&category_id=${categoryId}`);
        const data = await res.json();
        
        if (data.success && data.products && data.products.length > 0) {
            grid.innerHTML = data.products.map(p => {
                const priceNum = Number(p.price) || 0;
                const imgUrl = getProductImagePath(p.image);
                const isAvailable = p.stock > 0;
                return `
                    <div class="product-card">
                        <div>
                            <div class="img-wrapper">
                                <img src="${imgUrl}" alt="${p.product_name}" loading="lazy" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                            </div>
                            <span class="category-tag">${p.category_name}</span>
                            <h3>${p.product_name}</h3>
                            <p class="product-desc">${p.description || ''}</p>
                            <div class="price">₹${priceNum.toFixed(2)} <span class="unit">/ ${p.unit}</span></div>
                            <p class="stock-indicator ${isAvailable ? 'stock-in' : 'stock-out'}">
                                ${isAvailable ? `In Stock (${p.stock} available)` : 'Out of Stock'}
                            </p>
                        </div>
                        <button class="btn ${!isAvailable ? 'btn-out-of-stock' : ''}" onclick="addToCart(${p.product_id})" ${!isAvailable ? 'disabled' : ''}>
                            ${isAvailable ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = `<p class="empty-catalog-msg">No grocery products found matching your search.</p>`;
        }
    } catch (err) {
        console.error('Error filtering products:', err);
    }
}

// 3. Load Featured Products on Home Page (index.html)
async function loadFeaturedProducts() {
    const grid = document.getElementById('featured-products');
    if (!grid) return;

    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && data.products && data.products.length > 0) {
            const featured = data.products.slice(0, 8);
            
            grid.innerHTML = featured.map(p => {
                const priceNum = Number(p.price) || 0;
                const imgUrl = getProductImagePath(p.image);
                const isAvailable = p.stock > 0;
                return `
                    <div class="product-card">
                        <div>
                            <div class="img-wrapper">
                                <img src="${imgUrl}" alt="${p.product_name}" loading="lazy" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                            </div>
                            <span class="category-tag">${p.category_name}</span>
                            <h3>${p.product_name}</h3>
                            <p class="product-desc">${p.description || ''}</p>
                            <div class="price">₹${priceNum.toFixed(2)} <span class="unit">/ ${p.unit}</span></div>
                            <p class="stock-indicator ${isAvailable ? 'stock-in' : 'stock-out'}">
                                ${isAvailable ? `In Stock (${p.stock} available)` : 'Out of Stock'}
                            </p>
                        </div>
                        <button class="btn ${!isAvailable ? 'btn-out-of-stock' : ''}" onclick="addToCart(${p.product_id})" ${!isAvailable ? 'disabled' : ''}>
                            ${isAvailable ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = `<p class="empty-catalog-msg">No featured products available.</p>`;
        }
    } catch (err) {
        console.error('loadFeaturedProducts Error:', err);
    }
}

// Expose filterProducts to window for inline onkeyup/onchange
window.filterProducts = filterProducts;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('featured-products')) {
        await loadFeaturedProducts();
    }
    if (document.getElementById('products-grid')) {
        await loadCategories();
        await filterProducts();
    }
});
