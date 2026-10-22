// Checkout Page Handler

async function loadCheckoutData() {
    try {
        const res = await fetch('/api/cart');
        const data = await res.json();
        
        if (res.status === 401 || !data.success || !data.items || data.items.length === 0) {
            alert('Cart is empty. Redirecting to products...');
            window.location.href = 'products.html';
            return;
        }

        const itemsDiv = document.getElementById('checkout-items');
        if (itemsDiv) {
            itemsDiv.innerHTML = data.items.map(item => {
                const imgUrl = getProductImagePath(item.image);
                const subtotalNum = Number(item.subtotal) || (item.price * item.quantity);
                return `
                    <div class="checkout-item-entry">
                        <div class="checkout-item-left">
                            <img src="${imgUrl}" alt="${item.product_name}" class="product-thumb checkout-thumb" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                            <div>
                                <strong class="checkout-item-name">${item.product_name}</strong>
                                <br><small class="checkout-item-sub">Qty: ${item.quantity} × ₹${Number(item.price).toFixed(2)}</small>
                            </div>
                        </div>
                        <strong class="checkout-item-price">₹${subtotalNum.toFixed(2)}</strong>
                    </div>
                `;
            }).join('');
        }

        const totalElem = document.getElementById('checkout-total');
        if (totalElem) {
            totalElem.textContent = `₹${Number(data.grandTotal).toFixed(2)}`;
        }
    } catch (err) {
        console.error('Error loading checkout data:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        loadCheckoutData();

        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const delivery_address = document.getElementById('delivery_address').value.trim();
            const payment_method = document.getElementById('payment_method').value;
            const alertDiv = document.getElementById('checkout-alert');

            if (!delivery_address) {
                alertDiv.innerHTML = `<div class="alert alert-danger">Please enter your delivery address.</div>`;
                return;
            }

            try {
                const res = await fetch('/api/orders/place', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ delivery_address, payment_method })
                });

                const data = await res.json();
                if (data.success) {
                    alertDiv.innerHTML = `<div class="alert alert-success">Order #${data.order_id} placed successfully! Redirecting to orders...</div>`;
                    setTimeout(() => {
                        window.location.href = 'orders.html';
                    }, 1200);
                } else {
                    alertDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            } catch (err) {
                alertDiv.innerHTML = `<div class="alert alert-danger">Error placing order. Please try again.</div>`;
            }
        });
    }
});
