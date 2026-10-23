# Online Grocery Shopping and Management System

> **DBMS College Mini-Project Documentation**  
> **Degree / Course:** B.Tech Information Technology (IT) / Computer Science (CSE)  
> **Subject:** Database Management Systems (DBMS)  
> **Database Engine:** MongoDB Atlas (Cloud NoSQL Document Database)

---

## 1. Project Title
**Online Grocery Shopping and Management System**

---

## 2. Introduction
The **Online Grocery Shopping and Management System** is a web-based database project designed to enable customers to browse and purchase groceries online, while providing administrators with a powerful control portal to manage products, categories, inventory stock, and customer orders. The system connects an intuitive frontend (HTML5, Vanilla CSS, ES6 JavaScript) with a Node.js/Express RESTful backend and a cloud-hosted **MongoDB Atlas** database managed via **Mongoose**.

---

## 3. Problem Statement
In conventional grocery retail, manual record-keeping on paper or spreadsheets frequently causes inventory discrepancies, lost billing records, delayed customer checkout, and stockout errors. This mini-project resolves these issues by centralizing store records in a cloud-hosted document database, delivering real-time stock deduction, automated order processing, and clear administrative oversight.

---

## 4. Objectives
* Build an intuitive grocery shopping interface for customers.
* Design an efficient MongoDB document database using both embedding and referencing patterns.
* Implement multi-role authentication distinguishing **Customer** and **Admin** accounts.
* Demonstrate core modern DBMS concepts: Document Schemas, Referential Integrity (`populate`), Embedded Arrays, and Atomicity.
* Execute atomic stock deductions during order checkout to prevent overselling.
* Implement MongoDB aggregation pipelines on the admin dashboard for analytical reporting.

---

## 5. Scope
This project focuses on core database management principles and cloud document modeling for academic evaluation. To keep the code clear, transparent, and easy to explain during a B.Tech DBMS viva examination, external third-party payment gateways (Razorpay/Stripe), SMS OTP services, live map GPS tracking, and external delivery fleet APIs are simulated cleanly through application logic.

---

## 6. Features

### Customer Features
1. **User Signup & Login:** Session-based authentication for customers.
2. **Product Catalog:** View grocery items organized by categories.
3. **Search & Filter:** Search products by name/description and filter by category.
4. **Shopping Cart:** Add items, update quantities with live stock checks, and remove items.
5. **Checkout & Payment Option:** Specify delivery address and choose Cash on Delivery (COD) or UPI.
6. **Order History:** View placed orders with embedded line-item details and real-time order status.

### Admin Features
1. **Admin Dashboard:** Real-time counters showing total products, customers, orders, and total revenue via MongoDB aggregation.
2. **Product Management:** Add new items, update price/stock levels, and delete products.
3. **Category Management:** Create and organize product categories.
4. **Order Management:** View all customer orders with customer details, update order status (Pending, Confirmed, Delivered, Cancelled), and reflect payment updates.
5. **DBMS Viva Queries:** Live demonstration of MongoDB document querying and aggregation pipelines.

---

## 7. Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript | Clean student web UI using ES6 `async/await` Fetch API |
| **Backend** | Node.js, Express.js | Server routing, session handling, and RESTful API endpoints |
| **Database** | MongoDB Atlas | Cloud-hosted NoSQL Document Database |
| **ODM / Driver** | `mongoose` (v9+) | Schema validation, modeling, and aggregation queries |
| **Authentication** | `express-session` | Server-side session management with secure cookies |
| **Environment** | `dotenv` | Safe environment configuration loading |

---

## 8. Functional Requirements
1. A customer must be authenticated to manage a cart and place orders.
2. Order quantity cannot exceed available product stock.
3. Product price and stock values must be non-negative ($\ge 0$).
4. Placing an order atomically decrements product stock in MongoDB.
5. Cart items are cleared automatically upon successful order checkout.
6. If stock reservation fails during checkout, the order is aborted with an informative error.

---

## 9. Modules & Architecture

```
[ Frontend: HTML / CSS / JS ]
          │  HTTP / JSON
          ▼
[ Express.js REST API Server ]
    ├── /api/auth     (Customer & Admin Authentication)
    ├── /api          (Categories & Products CRUD)
    ├── /api/cart     (Cart Management)
    ├── /api/orders   (Checkout & Order History)
    └── /api/admin    (Dashboard Aggregations & Status Management)
          │
          ▼
   [ Mongoose ODM ]
          │  TLS / SRV
          ▼
[ MongoDB Atlas (grocery_db) ]
    ├── users
    ├── categories
    ├── products
    ├── carts
    ├── orders
    └── payments
```

---

## 10. Database Collections & Schema Design

The database consists of 6 primary collections in **MongoDB Atlas** (`grocery_db`):

### 1. `users` Collection
Stores registered user accounts and administrative roles.
* `user_id` (Number, Unique)
* `name` (String)
* `email` (String, Unique, Indexed)
* `password` (String)
* `phone` (String)
* `address` (String)
* `role` (String: `'customer'` | `'admin'`)
* `created_at` (Date)

### 2. `categories` Collection
Stores product categories.
* `category_id` (Number, Unique)
* `category_name` (String, Unique)

### 3. `products` Collection
Stores grocery item details and inventory stock.
* `product_id` (Number, Unique)
* `category` (`ObjectId`, Ref: `'Category'`)
* `category_id` (Number)
* `product_name` (String)
* `description` (String)
* `price` (Number)
* `stock` (Number)
* `unit` (String)
* `image` (String)

### 4. `carts` Collection
Stores customer shopping carts with embedded cart items.
* `cart_id` (Number, Unique)
* `user` (`ObjectId`, Ref: `'User'`)
* `user_id` (Number)
* `items`: Array of embedded objects:
  * `cart_item_id` (Number)
  * `product` (`ObjectId`, Ref: `'Product'`)
  * `product_id` (Number)
  * `quantity` (Number)
* `created_at` (Date)

### 5. `orders` Collection
Stores placed customer orders with embedded order line-item snapshots.
* `order_id` (Number, Unique)
* `user` (`ObjectId`, Ref: `'User'`)
* `user_id` (Number)
* `order_date` (Date)
* `total_amount` (Number)
* `delivery_address` (String)
* `order_status` (String: `'Pending'` | `'Confirmed'` | `'Delivered'` | `'Cancelled'`)
* `items`: Array of embedded snapshot objects:
  * `order_item_id` (Number)
  * `product` (`ObjectId`, Ref: `'Product'`)
  * `product_id` (Number)
  * `product_name` (String)
  * `unit` (String)
  * `image` (String)
  * `quantity` (Number)
  * `price` (Number)

### 6. `payments` Collection
Stores transaction details linked to customer orders.
* `payment_id` (Number, Unique)
* `order` (`ObjectId`, Ref: `'Order'`)
* `order_id` (Number)
* `payment_method` (String: `'Cash on Delivery'` | `'UPI'`)
* `payment_status` (String: `'Pending'` | `'Completed'`)
* `payment_date` (Date)

---

## 11. Document Modeling Concepts (Viva Highlights)

1. **Embedding vs. Referencing:**
   - **Embedded Arrays (`items` in `orders` and `carts`):** Line items are embedded directly inside order documents to preserve an immutable historical snapshot of product name, price, and quantity at the exact moment of purchase.
   - **Referencing (`user`, `category`, `order`):** Used where entities exist independently and need to be populated dynamically (`Product.populate('category')`, `Order.populate('user')`).
2. **Atomic Stock Deduction:**
   - Products are updated using atomic conditional operations:
     ```javascript
     Product.findOneAndUpdate(
         { _id: item.product._id, stock: { $gte: item.quantity } },
         { $inc: { stock: -item.quantity } },
         { returnDocument: 'after' }
     );
     ```
     This prevents race conditions and overselling without locking the entire table.

---

## 12. Important MongoDB Queries & Aggregations

### Query 1: Retrieve Products with Category Information (`populate`)
```javascript
const products = await Product.find()
    .populate('category', 'category_id category_name')
    .sort({ product_id: 1 });
```

### Query 2: Calculate Total Store Sales (`aggregate` pipeline)
```javascript
const salesAgg = await Order.aggregate([
    { $match: { order_status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, totalSales: { $sum: '$total_amount' } } }
]);
```

### Query 3: Search Products by Keyword (Regex search)
```javascript
const regex = new RegExp(searchKeyword, 'i');
const results = await Product.find({
    $or: [
        { product_name: regex },
        { description: regex }
    ]
});
```

### Query 4: Retrieve Customer Orders with User & Payment Details
```javascript
const orders = await Order.find({ user_id: customerId })
    .populate('user', 'name email phone')
    .sort({ order_date: -1 });
```

---

## 13. How to Run the Project

### Prerequisites
* **Node.js** (v18 or higher recommended).
* Active **MongoDB Atlas** cluster connection string.

### Setup Steps
1. **Clone & Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create or verify `backend/.env` with your MongoDB Atlas URI:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.qlbamoe.mongodb.net/grocery_db?retryWrites=true&w=majority
   ```
   *(Note: `backend/.env` is ignored by Git to protect sensitive credentials).*

3. **Verify Database Connection:**
   Run the safe authentication test:
   ```bash
   node backend/test-mongo-connection.js
   ```

4. **Start the Application Server:**
   ```bash
   npm start
   ```
   Open your browser at `http://localhost:3000`.

5. **Demo Accounts:**
   * **Customer Account:** `rahul@gmail.com` | Password: `user123`
   * **Admin Account:** `admin@grocery.com` | Password: `admin123`

6. **Run Full System Verification Suite:**
   ```bash
   node backend/scripts/verify-mongo-migration.js
   ```

---

## 14. Conclusion
The **Online Grocery Shopping and Management System** demonstrates a full-stack, cloud-native database architecture utilizing **MongoDB Atlas** and **Node.js/Express**. By leveraging Mongoose schema validations, atomic document updates, populated document references, and aggregation pipelines, the project fulfills all academic DBMS mini-project requirements.
