// Shopping Cart Handler

async function loadCart() {
    try {
        const res = await fetch('/api/cart');
        const data = await res.json();
        const container = document.getElementById('cart-content');
        if (!container) return;

        if (res.status === 401) {
            container.innerHTML = `
                <div class="cart-login-prompt">
                    <h3>Please login to view your cart</h3>
                    <br>
                    <a href="login.html" class="btn btn-checkout">Login Now</a>
                </div>
            `;
            return;
        }

        if (data.success && data.items && data.items.length > 0) {
            let tableHtml = `
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Subtotal</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.items.forEach(item => {
                const priceNum = Number(item.price) || 0;
                const subtotalNum = Number(item.subtotal) || 0;
                const qtyNum = Number(item.quantity) || 1;
                const imgUrl = getProductImagePath(item.image);

                tableHtml += `
                    <tr>
                        <td>
                            <div class="cart-item-info">
                                <img src="${imgUrl}" alt="${item.product_name}" class="product-thumb" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                                <div>
                                    <strong class="cart-item-title">${item.product_name}</strong>
                                    <br><small class="cart-item-unit">Unit: ${item.unit}</small>
                                </div>
                            </div>
                        </td>
                        <td>₹${priceNum.toFixed(2)}</td>
                        <td>
                            <div class="cart-qty-wrapper">
                                <button class="qty-btn" 
                                        onclick="changeQty(${item.cart_item_id}, ${qtyNum - 1})" 
                                        ${qtyNum <= 1 ? 'disabled' : ''}>-</button>
                                <input type="number" min="1" max="${item.stock}" value="${qtyNum}" 
                                        class="qty-input"
                                        onchange="updateQuantity(${item.cart_item_id}, this.value)">
                                <button class="qty-btn" 
                                        onclick="changeQty(${item.cart_item_id}, ${qtyNum + 1})" 
                                        ${qtyNum >= item.stock ? 'disabled' : ''}>+</button>
                            </div>
                        </td>
                        <td><strong>₹${subtotalNum.toFixed(2)}</strong></td>
                        <td>
                            <button class="btn btn-danger btn-remove" onclick="removeItem(${item.cart_item_id})">
                                Remove
                            </button>
                        </td>
                    </tr>
                `;
            });

            tableHtml += `
                        </tbody>
                    </table>
                </div>

                <div class="cart-footer-bar">
                    <div>
                        <button class="btn btn-danger btn-clear" onclick="clearCart()">Clear Cart</button>
                    </div>
                    <div style="text-align: right;">
                        <div class="cart-grand-total">
                            Grand Total: <span class="cart-grand-total-val">₹${Number(data.grandTotal).toFixed(2)}</span>
                        </div>
                        <a href="checkout.html" class="btn btn-secondary btn-checkout">Proceed to Checkout ➔</a>
                    </div>
                </div>
            `;

            container.innerHTML = tableHtml;
        } else {
            container.innerHTML = `
                <div class="cart-empty-panel">
                    <div class="cart-empty-icon">🛒</div>
                    <h3>Your shopping cart is empty!</h3>
                    <p>Explore our fresh groceries and add items to your cart.</p>
                    <a href="products.html" class="btn btn-checkout">Browse Products</a>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error loading cart:', err);
    }
}

async function changeQty(cartItemId, newQty) {
    if (newQty <= 0) return;
    await updateQuantity(cartItemId, newQty);
}

async function updateQuantity(cartItemId, newQty) {
    try {
        const res = await fetch(`/api/cart/update/${cartItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQty })
        });
        const data = await res.json();
        if (data.success) {
            loadCart();
            updateCartBadge();
        } else {
            alert(data.message);
            loadCart();
        }
    } catch (err) {
        alert('Error updating cart');
    }
}

async function removeItem(cartItemId) {
    if (!confirm('Remove this product from cart?')) return;
    try {
        const res = await fetch(`/api/cart/remove/${cartItemId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            loadCart();
            updateCartBadge();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('Error removing item');
    }
}

async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    try {
        const res = await fetch('/api/cart/clear', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadCart();
            updateCartBadge();
        }
    } catch (err) {
        alert('Error clearing cart');
    }
}

// Expose functions to window for inline onclick handlers
window.loadCart = loadCart;
window.changeQty = changeQty;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.clearCart = clearCart;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cart-content')) {
        loadCart();
    }
});
