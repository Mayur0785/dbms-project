// Customer Order History Handler

async function loadMyOrders() {
    try {
        const res = await fetch('/api/orders/my-orders');
        const data = await res.json();
        const container = document.getElementById('orders-container');
        if (!container) return;

        if (res.status === 401) {
            container.innerHTML = `
                <div class="orders-login-prompt">
                    <h3>Please login to view your orders</h3>
                    <br>
                    <a href="login.html" class="btn" style="width: auto; padding: 10px 24px;">Login Now</a>
                </div>
            `;
            return;
        }

        if (data.success && data.orders && data.orders.length > 0) {
            container.innerHTML = data.orders.map(order => {
                const statusClass = 'status-' + (order.order_status || 'pending').toLowerCase();
                const dt = formatOrderDateTime(order.order_date);
                const totalNum = Number(order.total_amount) || 0;
                const isPaid = order.payment_status === 'Completed';

                return `
                    <div class="order-card">
                        <div class="order-top-bar">
                            <div>
                                <strong class="order-id-title">Order #${order.order_id}</strong>
                                <div class="order-date-meta">
                                    <span>📅 Placed on: <strong>${dt.date}</strong></span>
                                    <span class="order-time-spacer">⏰ Time: <strong>${dt.time}</strong></span>
                                </div>
                            </div>
                            <div>
                                <span class="status-badge ${statusClass}">${order.order_status}</span>
                            </div>
                        </div>

                        <div class="order-details-banner">
                            <div>
                                <strong>📍 Delivery Address:</strong> ${order.delivery_address}
                            </div>
                            <div>
                                <strong>💳 Payment:</strong> ${order.payment_method || 'Cash on Delivery'} 
                                <span class="payment-status-tag ${isPaid ? 'payment-completed' : 'payment-pending'}">(${order.payment_status || 'Pending'})</span>
                            </div>
                        </div>

                        <div class="table-responsive order-items-table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(order.items || []).map(item => {
                                        const imgUrl = getProductImagePath(item.image);
                                        const priceNum = Number(item.price) || 0;
                                        const qtyNum = Number(item.quantity) || 1;
                                        const subtotal = (priceNum * qtyNum).toFixed(2);
                                        return `
                                            <tr>
                                                <td>
                                                    <div class="order-item-cell">
                                                        <img src="${imgUrl}" alt="${item.product_name}" class="product-thumb order-thumb" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                                                        <div>
                                                            <strong>${item.product_name}</strong>
                                                            ${item.unit ? `<br><small style="color:#666;">Unit: ${item.unit}</small>` : ''}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>₹${priceNum.toFixed(2)}</td>
                                                <td>${qtyNum}</td>
                                                <td><strong>₹${subtotal}</strong></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div class="order-total-summary">
                            Total Amount: <span class="order-total-val">₹${totalNum.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="orders-empty-box">
                    <div class="orders-empty-icon">📦</div>
                    <h3>No Orders Found</h3>
                    <p>You haven't placed any grocery orders yet.</p>
                    <a href="products.html" class="btn" style="width: auto; padding: 10px 24px;">Start Shopping</a>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error loading my orders:', err);
    }
}

// Expose to window
window.loadMyOrders = loadMyOrders;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('orders-container')) {
        loadMyOrders();
    }
});
