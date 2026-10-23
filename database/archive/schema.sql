-- ==========================================
-- Online Grocery Shopping & Management System
-- DBMS College Project Schema & Sample Data
-- Database Engine: MySQL
-- ==========================================

CREATE DATABASE IF NOT EXISTS grocery_db;
USE grocery_db;

-- Drop tables if exists in correct dependency order
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Products Table
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit VARCHAR(50) DEFAULT 'kg',
    image VARCHAR(255) DEFAULT '/images/products/default_product.png',
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Cart Table
CREATE TABLE cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 5. Cart Items Table
CREATE TABLE cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    UNIQUE(cart_id, product_id),
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 6. Orders Table
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    delivery_address TEXT NOT NULL,
    order_status ENUM('Pending', 'Confirmed', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 7. Order Items Table
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- 8. Payments Table
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method ENUM('Cash on Delivery', 'UPI') NOT NULL,
    payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- ==========================================
-- INSERT SAMPLE DATA
-- ==========================================

-- Admin Users (Password: admin123)
INSERT INTO users (name, email, password, phone, address, role) VALUES
('System Admin', 'admin@grocery.com', 'admin123', '9876543210', 'Head Office, New Delhi', 'admin'),
('Store Manager', 'manager@grocery.com', 'admin123', '9876543211', 'Sector 62, Noida', 'admin');

-- Customer Users (Password: user123)
INSERT INTO users (name, email, password, phone, address, role) VALUES
('Rahul Sharma', 'rahul@gmail.com', 'user123', '9811122233', 'H-12, Green Park, New Delhi', 'customer'),
('Priya Patel', 'priya@gmail.com', 'user123', '9822233344', '402, Sunshine Apartments, Ahmedabad', 'customer'),
('Amit Kumar', 'amit@gmail.com', 'user123', '9833344455', 'B-45, Salt Lake, Kolkata', 'customer'),
('Sneha Singh', 'sneha@gmail.com', 'user123', '9844455566', '78, Indiranagar, Bengaluru', 'customer'),
('Vikram Verma', 'vikram@gmail.com', 'user123', '9855566677', '15, Model Town, Jaipur', 'customer');

-- Categories
INSERT INTO categories (category_name) VALUES
('Fruits & Vegetables'),
('Dairy'),
('Bakery'),
('Snacks'),
('Beverages'),
('Rice & Grains'),
('Household');

-- Products (21 sample items)
INSERT INTO products (category_id, product_name, description, price, stock, unit, image) VALUES
-- Fruits & Vegetables (Category ID 1)
(1, 'Fresh Red Apples', 'Crisp and sweet Kashmiri red apples', 140.00, 50, '1 kg', '/images/products/apple.jpg'),
(1, 'Organic Bananas', 'Fresh yellow robusta bananas', 60.00, 80, '1 dozen', '/images/products/banana.jpg'),
(1, 'Fresh Tomatoes', 'Farm fresh ripe red tomatoes', 40.00, 100, '1 kg', '/images/products/tomato.jpg'),
(1, 'Potatoes', 'Fresh farm potatoes ideal for cooking', 30.00, 120, '1 kg', '/images/products/potato.jpg'),
(1, 'Red Onions', 'Fresh quality onions', 45.00, 90, '1 kg', '/images/products/onion.jpg'),

-- Dairy (Category ID 2)
(2, 'Amul Taaza Toned Milk', 'Pasteurised toned milk pouch', 54.00, 40, '1 Litre', '/images/products/milk.jpg'),
(2, 'Amul Fresh Curd', 'Rich and creamy dahi', 45.00, 30, '400g', '/images/products/curd.jpg'),
(2, 'Amul Butter', 'Delicious salted butter', 56.00, 50, '100g', '/images/products/butter.jpg'),

-- Bakery (Category ID 3)
(3, 'Britannia Whole Wheat Bread', 'Healthy soft whole wheat brown bread', 45.00, 25, '400g', '/images/products/bread.jpg'),
(3, 'Parle-G Gold Biscuits', 'Glucose biscuits for tea time', 25.00, 150, '200g', '/images/products/biscuits.jpg'),

-- Snacks (Category ID 4)
(4, 'Lays Classic Salted Chips', 'Crispy potato chips', 20.00, 100, '50g', '/images/products/chips.jpg'),
(4, 'Haldiram Bhujia Sev', 'Authentic spicy Rajasthani bhujia', 95.00, 60, '250g', '/images/products/bhujia.jpg'),

-- Beverages (Category ID 5)
(5, 'Red Label Tea', 'Rich taste black CTC tea powder', 160.00, 45, '250g', '/images/products/tea.jpg'),
(5, 'Nescafe Classic Instant Coffee', '100% pure instant coffee powder', 185.00, 35, '50g', '/images/products/coffee.jpg'),
(5, 'Real Orange Juice', 'Refreshing orange fruit juice', 110.00, 30, '1 Litre', '/images/products/juice.jpg'),

-- Rice & Grains (Category ID 6)
(6, 'Fortune Premium Basmati Rice', 'Long grain aromatic basmati rice', 140.00, 70, '1 kg', '/images/products/rice.jpg'),
(6, 'Aashirvaad Shuddh Chakki Atta', '100% pure whole wheat flour', 240.00, 50, '5 kg', '/images/products/atta.jpg'),
(6, 'Fortune Sunlite Sunflower Oil', 'Refined edible sunflower oil', 150.00, 40, '1 Litre', '/images/products/oil.jpg'),

-- Household (Category ID 7)
(7, 'Dettol Original Bath Soap', 'Antibacterial hygiene bathing soap', 42.00, 80, '125g', '/images/products/soap.jpg'),
(7, 'Surf Excel Easy Wash Detergent Powder', 'Tough stain removal laundry powder', 145.00, 50, '1 kg', '/images/products/detergent.jpg'),
(7, 'Vim Dishwash Gel', 'Lemon power liquid dish cleaner', 105.00, 40, '500ml', '/images/products/vim.jpg');

-- Sample Orders & Items
INSERT INTO orders (user_id, total_amount, delivery_address, order_status) VALUES
(3, 340.00, 'H-12, Green Park, New Delhi', 'Delivered'),
(4, 253.00, '402, Sunshine Apartments, Ahmedabad', 'Pending'),
(5, 425.00, 'B-45, Salt Lake, Kolkata', 'Confirmed');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 2, 140.00),
(1, 2, 1, 60.00),
(2, 6, 2, 54.00),
(2, 13, 1, 145.00),
(3, 16, 1, 140.00),
(3, 17, 1, 240.00),
(3, 9, 1, 45.00);

-- Payments for sample orders
INSERT INTO payments (order_id, payment_method, payment_status) VALUES
(1, 'UPI', 'Completed'),
(2, 'Cash on Delivery', 'Pending'),
(3, 'UPI', 'Completed');
