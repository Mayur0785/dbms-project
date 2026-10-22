// Global Helper Functions and Auth Status Manager

// 1. Resolve product image path with fallback
function getProductImagePath(img) {
    if (!img || img === 'default_food.png' || img === 'default_product.png') {
        return '/images/products/default_product.png';
    }
    if (img.startsWith('/') || img.startsWith('http')) {
        return img;
    }
    return '/images/products/' + img;
}

// 2. Format order timestamp into readable Date & Time
function formatOrderDateTime(dateStr) {
    if (!dateStr) return { date: 'N/A', time: 'N/A', full: 'N/A' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: '', full: dateStr };
    
    const date = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const time = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    return { date, time, full: `${date} at ${time}` };
}

// 3. Setup Mobile Navigation Hamburger Menu
function setupMobileNav() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('nav-toggle')) return;

    const nav = header.querySelector('nav');
    if (!nav) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'nav-toggle';
    toggleBtn.className = 'nav-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle navigation');
    toggleBtn.innerHTML = '☰';

    header.insertBefore(toggleBtn, nav);

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nav.classList.toggle('nav-open');
        toggleBtn.innerHTML = nav.classList.contains('nav-open') ? '✕' : '☰';
    });

    // Close mobile nav when clicking a link
    nav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            nav.classList.remove('nav-open');
            toggleBtn.innerHTML = '☰';
        }
    });

    // Close when clicking outside header
    document.addEventListener('click', (e) => {
        if (!header.contains(e.target)) {
            nav.classList.remove('nav-open');
            toggleBtn.innerHTML = '☰';
        }
    });
}

// 4. Check Authentication Status and Render Nav Links
async function checkAuthStatus() {
    try {
        setupMobileNav();

        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        const navRight = document.getElementById('nav-right');
        if (!navRight) return data;

        if (data.loggedIn) {
            const user = data.user;
            let navHtml = '';

            if (user.role === 'admin') {
                navHtml = `
                    <li><a href="admin.html" id="nav-admin">Admin Dashboard</a></li>
                    <li><span style="color: #ffe0b2; font-weight: 600; padding: 6px 12px; display: inline-block;">Admin: ${user.name}</span></li>
                    <li><a href="#" onclick="logoutUser()">Logout</a></li>
                `;
            } else {
                navHtml = `
                    <li><a href="products.html" id="nav-products">Products</a></li>
                    <li><a href="cart.html" id="nav-cart">Cart <span class="cart-badge" id="cart-count">0</span></a></li>
                    <li><a href="orders.html" id="nav-orders">My Orders</a></li>
                    <li><span style="color: #c8e6c9; font-weight: 600; padding: 6px 12px; display: inline-block;">Hi, ${user.name.split(' ')[0]}</span></li>
                    <li><a href="#" onclick="logoutUser()">Logout</a></li>
                `;
                updateCartBadge();
            }
            navRight.innerHTML = navHtml;
        } else {
            navRight.innerHTML = `
                <li><a href="products.html" id="nav-products">Products</a></li>
                <li><a href="login.html" id="nav-login">Login</a></li>
                <li><a href="register.html" id="nav-register">Register</a></li>
            `;
        }
        return data;
    } catch (err) {
        console.error('Error checking auth:', err);
    }
}

// 5. Update Cart Badge Count
async function updateCartBadge() {
    try {
        const res = await fetch('/api/cart');
        const data = await res.json();
        if (data.success && data.items) {
            const countElem = document.getElementById('cart-count');
            if (countElem) {
                const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
                countElem.textContent = totalItems;
            }
        }
    } catch (err) {
        // silent fail for guests
    }
}

// 6. User Logout
async function logoutUser() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert('Logged out successfully');
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// 7. Add Product to Cart Helper
async function addToCart(productId) {
    try {
        const res = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        const data = await res.json();
        if (data.success) {
            alert('Item added to cart!');
            updateCartBadge();
        } else {
            if (res.status === 401) {
                alert('Please login first to add items to cart!');
                window.location.href = 'login.html';
            } else {
                alert(data.message);
            }
        }
    } catch (err) {
        alert('Error adding item to cart');
    }
}

document.addEventListener('DOMContentLoaded', checkAuthStatus);
