// Admin Portal Handler

let categoriesList = [];
let allOrdersCache = [];

// 1. Tab Navigation Switcher
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const currentEvt = typeof window !== 'undefined' && window.event ? window.event : (typeof event !== 'undefined' ? event : null);
    if (currentEvt && currentEvt.target && currentEvt.target.classList && currentEvt.target.classList.contains('tab-btn')) {
        currentEvt.target.classList.add('active');
    } else {
        const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
        if (targetBtn) targetBtn.classList.add('active');
    }
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');
}

// 2. Load Complete Admin Data (Dashboard stats, categories, products, customer orders)
async function loadAdminData() {
    try {
        // Verify admin session
        const auth = await fetch('/api/auth/me').then(r => r.json());
        if (!auth.loggedIn || auth.user.role !== 'admin') {
            alert('Admin access required!');
            window.location.href = 'login.html';
            return;
        }

        // Load Dashboard KPI Summary Cards
        const statsRes = await fetch('/api/admin/dashboard').then(r => r.json());
        if (statsRes.success && statsRes.summary) {
            document.getElementById('stat-products').textContent = statsRes.summary.totalProducts;
            document.getElementById('stat-customers').textContent = statsRes.summary.totalCustomers;
            document.getElementById('stat-orders').textContent = statsRes.summary.totalOrders;
            document.getElementById('stat-sales').textContent = `₹${statsRes.summary.totalSales.toFixed(2)}`;
        }

        // Load Categories
        const catRes = await fetch('/api/categories').then(r => r.json());
        if (catRes.success) {
            categoriesList = catRes.categories;
            const catBody = document.getElementById('admin-categories-body');
            if (catBody) {
                catBody.innerHTML = categoriesList.map(c => `
                    <tr><td>#${c.category_id}</td><td><strong>${c.category_name}</strong></td></tr>
                `).join('');
            }

            const catSelect = document.getElementById('prod_category');
            if (catSelect) {
                catSelect.innerHTML = categoriesList.map(c => `
                    <option value="${c.category_id}">${c.category_name}</option>
                `).join('');
            }
        }

        // Load Products
        const prodRes = await fetch('/api/products').then(r => r.json());
        if (prodRes.success) {
            const prodBody = document.getElementById('admin-products-body');
            if (prodBody) {
                prodBody.innerHTML = prodRes.products.map(p => {
                    const imgUrl = getProductImagePath(p.image);
                    const isAvailable = p.stock > 0;
                    return `
                        <tr>
                            <td>#${p.product_id}</td>
                            <td>
                                <img src="${imgUrl}" alt="${p.product_name}" class="product-thumb" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                            </td>
                            <td><strong>${p.product_name}</strong></td>
                            <td><span class="category-tag">${p.category_name}</span></td>
                            <td>₹${Number(p.price).toFixed(2)}</td>
                            <td><span style="color:${isAvailable ? '#2e7d32' : '#d32f2f'}; font-weight:600;">${p.stock}</span></td>
                            <td>${p.unit}</td>
                            <td>
                                <div class="admin-action-btn-group">
                                    <button class="btn btn-admin-action" onclick='editProduct(${JSON.stringify(p)})'>Edit</button>
                                    <button class="btn btn-danger btn-admin-action" onclick="deleteProduct(${p.product_id})">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Load Customer Orders
        const ordersRes = await fetch('/api/orders/admin/all-orders').then(r => r.json());
        if (ordersRes.success) {
            allOrdersCache = ordersRes.orders || [];
            const tbody = document.getElementById('admin-orders-body');
            if (tbody) {
                if (allOrdersCache.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:35px; color:#666;">No customer orders placed yet.</td></tr>`;
                } else {
                    tbody.innerHTML = allOrdersCache.map(o => {
                        const dt = formatOrderDateTime(o.order_date);
                        const totalNum = Number(o.total_amount) || 0;
                        const isPaid = o.payment_status === 'Completed';
                        return `
                            <tr>
                                <td><strong>#${o.order_id}</strong></td>
                                <td>
                                    <strong>${o.customer_name || 'Customer'}</strong>
                                    <br><small style="color:#555;">✉️ ${o.customer_email || 'N/A'}</small>
                                    <br><small style="color:#555;">📞 ${o.customer_phone || 'N/A'}</small>
                                </td>
                                <td>
                                    <div><strong>${dt.date}</strong></div>
                                    <small style="color:#666;">⏰ ${dt.time}</small>
                                </td>
                                <td style="max-width: 180px;">${o.delivery_address}</td>
                                <td><strong>₹${totalNum.toFixed(2)}</strong></td>
                                <td>
                                    <strong>${o.payment_method || 'COD'}</strong>
                                    <br><small style="color:${isPaid ? '#2e7d32' : '#f57c00'}; font-weight:600;">${o.payment_status || 'Pending'}</small>
                                </td>
                                <td>
                                    <select onchange="updateOrderStatus(${o.order_id}, this.value)" style="padding: 5px; font-size: 0.85rem; border-radius: 4px; border: 1px solid #ccc; font-weight: 600;">
                                        <option value="Pending" ${o.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
                                        <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                        <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                        <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn btn-secondary btn-admin-view" onclick="viewOrderDetails(${o.order_id})">
                                        👁️ View Details
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }

    } catch (err) {
        console.error('loadAdminData error:', err);
    }
}

// 3. View Order Details Modal
function viewOrderDetails(orderId) {
    const order = allOrdersCache.find(o => o.order_id == orderId);
    if (!order) {
        alert('Order information not found.');
        return;
    }

    const dt = formatOrderDateTime(order.order_date);
    const statusClass = 'status-' + (order.order_status || 'pending').toLowerCase();
    const totalNum = Number(order.total_amount) || 0;
    const isPaid = order.payment_status === 'Completed';

    let itemsHtml = (order.items || []).map(item => {
        const imgUrl = getProductImagePath(item.image);
        const priceNum = Number(item.price) || 0;
        const qtyNum = Number(item.quantity) || 1;
        const subtotal = (priceNum * qtyNum).toFixed(2);
        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${imgUrl}" alt="${item.product_name}" class="product-thumb" style="width:40px; height:40px;" onerror="this.onerror=null;this.src='/images/products/default_product.png';">
                        <div>
                            <strong>${item.product_name}</strong>
                            ${item.unit ? `<br><small style="color:#666;">Unit: ${item.unit}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${qtyNum}</td>
                <td>₹${priceNum.toFixed(2)}</td>
                <td><strong>₹${subtotal}</strong></td>
            </tr>
        `;
    }).join('');

    const modalContent = `
        <div class="order-modal-header">
            <div>
                <h2>Order #${order.order_id} Details</h2>
                <small>DBMS Query: Combined from orders, users, payments, and order_items</small>
            </div>
            <div>
                <span class="status-badge ${statusClass}">${order.order_status}</span>
            </div>
        </div>

        <div class="order-detail-card">
            <div class="order-detail-grid">
                <div>
                    <strong>👤 Customer Name:</strong> ${order.customer_name || 'N/A'}<br>
                    <strong>✉️ Email Address:</strong> ${order.customer_email || 'N/A'}<br>
                    <strong>📞 Phone Number:</strong> ${order.customer_phone || 'N/A'}
                </div>
                <div>
                    <strong>📅 Order Date:</strong> ${dt.date}<br>
                    <strong>⏰ Exact Order Time:</strong> ${dt.time}<br>
                    <strong>📍 Delivery Address:</strong> ${order.delivery_address}
                </div>
            </div>
            <div class="modal-detail-footer">
                <div>
                    <strong>💳 Payment Method:</strong> ${order.payment_method || 'Cash on Delivery'} 
                    (<span style="font-weight: 600; color: ${isPaid ? '#2e7d32' : '#f57c00'};">${order.payment_status || 'Pending'}</span>)
                </div>
                <div class="modal-status-controls">
                    <strong>Update Status:</strong>
                    <select id="modal_order_status" style="padding: 4px 8px; font-size: 0.85rem; border-radius: 4px; border: 1px solid #ccc;">
                        <option value="Pending" ${order.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${order.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Delivered" ${order.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button class="btn" style="width: auto; padding: 4px 10px; font-size: 0.8rem;" onclick="updateOrderStatusFromModal(${order.order_id})">Save</button>
                </div>
            </div>
        </div>

        <h4 style="margin-bottom: 10px; color: #333;">Purchased Products (${(order.items || []).length} items)</h4>
        <div class="table-responsive" style="margin-bottom: 12px;">
            <table>
                <thead>
                    <tr>
                        <th>Product Item</th>
                        <th>Quantity</th>
                        <th>Price Per Item</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <div class="modal-order-total">
            Total Order Amount: <span>₹${totalNum.toFixed(2)}</span>
        </div>
    `;

    document.getElementById('order-details-body').innerHTML = modalContent;
    document.getElementById('order-details-modal').style.display = 'flex';
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    if (modal) modal.style.display = 'none';
}

async function updateOrderStatusFromModal(orderId) {
    const select = document.getElementById('modal_order_status');
    if (select) {
        await updateOrderStatus(orderId, select.value);
        closeOrderDetailsModal();
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await fetch(`/api/orders/admin/status/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_status: newStatus })
        }).then(r => r.json());

        if (res.success) {
            alert(res.message);
            await loadAdminData();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert('Error updating order status');
    }
}

// 4. Product Modal Handling
function openProductModal() {
    document.getElementById('edit_product_id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('prod_image').value = '/images/products/default_product.png';
    document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'none';
}

function editProduct(p) {
    document.getElementById('edit_product_id').value = p.product_id;
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('prod_category').value = p.category_id;
    document.getElementById('prod_name').value = p.product_name;
    document.getElementById('prod_desc').value = p.description || '';
    document.getElementById('prod_price').value = p.price;
    document.getElementById('prod_stock').value = p.stock;
    document.getElementById('prod_unit').value = p.unit;
    document.getElementById('prod_image').value = p.image || '/images/products/default_product.png';
    document.getElementById('product-modal').style.display = 'flex';
}

async function deleteProduct(id) {
    if (!confirm(`Are you sure you want to delete Product #${id}?`)) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json());
        if (res.success) {
            alert(res.message);
            loadAdminData();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert('Error deleting product');
    }
}

// Expose handlers to window for inline onclick attributes
window.switchTab = switchTab;
window.loadAdminData = loadAdminData;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.updateOrderStatusFromModal = updateOrderStatusFromModal;
window.updateOrderStatus = updateOrderStatus;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    loadAdminData();

    // Add Category Form Listener
    const addCatForm = document.getElementById('add-category-form');
    if (addCatForm) {
        addCatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const category_name = document.getElementById('cat_name_input').value.trim();
            if (!category_name) return;

            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_name })
                }).then(r => r.json());

                if (res.success) {
                    alert(res.message);
                    document.getElementById('cat_name_input').value = '';
                    loadAdminData();
                } else {
                    alert(res.message);
                }
            } catch (err) {
                alert('Error adding category');
            }
        });
    }

    // Add/Edit Product Form Listener
    const prodForm = document.getElementById('product-form');
    if (prodForm) {
        prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit_product_id').value;
            const body = {
                category_id: parseInt(document.getElementById('prod_category').value),
                product_name: document.getElementById('prod_name').value.trim(),
                description: document.getElementById('prod_desc').value.trim(),
                price: parseFloat(document.getElementById('prod_price').value),
                stock: parseInt(document.getElementById('prod_stock').value),
                unit: document.getElementById('prod_unit').value.trim(),
                image: document.getElementById('prod_image').value.trim() || '/images/products/default_product.png'
            };

            const url = id ? `/api/products/${id}` : '/api/products';
            const method = id ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }).then(r => r.json());

                if (res.success) {
                    alert(res.message);
                    closeProductModal();
                    loadAdminData();
                } else {
                    alert(res.message);
                }
            } catch (err) {
                alert('Error saving product');
            }
        });
    }

    // Modal Close Events
    window.onclick = function(event) {
        const orderModal = document.getElementById('order-details-modal');
        const prodModal = document.getElementById('product-modal');
        if (event.target === orderModal) closeOrderDetailsModal();
        if (event.target === prodModal) closeProductModal();
    };
});
