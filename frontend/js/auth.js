// Authentication Handler (Login & Registration)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const alertMsg = document.getElementById('alert-msg');

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();
                if (data.success) {
                    alertMsg.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                    setTimeout(() => {
                        if (data.user.role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'products.html';
                        }
                    }, 800);
                } else {
                    alertMsg.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            } catch (err) {
                alertMsg.innerHTML = `<div class="alert alert-danger">Login failed. Please try again.</div>`;
            }
        });
    }

    // 2. Handle Registration Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            const alertMsg = document.getElementById('alert-msg');

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, phone, address })
                });

                const data = await res.json();
                if (data.success) {
                    alertMsg.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1200);
                } else {
                    alertMsg.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            } catch (err) {
                alertMsg.innerHTML = `<div class="alert alert-danger">Registration failed. Please try again.</div>`;
            }
        });
    }
});
