// script.js
import { db, auth } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, addDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// --- STATE MANAGEMENT & UTILS ---
const state = {
    cart: JSON.parse(localStorage.getItem('apnaMemeCart')) || [],
    coupon: JSON.parse(localStorage.getItem('apnaMemeCoupon')) || null,
};

function saveCart() {
    localStorage.setItem('apnaMemeCart', JSON.stringify(state.cart));
    updateCartCount();
}

function saveCoupon() {
    localStorage.setItem('apnaMemeCoupon', JSON.stringify(state.coupon));
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
    }
}

function showMessage(elementId, message, type = 'success') {
    const feedback = document.getElementById(elementId);
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `message ${type}`;
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 4000);
    }
}

// --- CART LOGIC ---
function addToCart(productId, product) {
    const existingItem = state.cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        state.cart.push({ ...product, id: productId, quantity: 1 });
    }
    saveCart();
}

function updateQuantity(productId, quantity) {
    const item = state.cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
        }
    }
    if (document.body.id === 'cart-page') renderCartPage();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    if (document.body.id === 'cart-page') renderCartPage();
}

// --- PAGE-SPECIFIC RENDER LOGIC ---

// HOME PAGE
async function renderHomePage() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    productGrid.innerHTML = '<p>Loading T-Shirts...</p>';
    
    try {
        const productsCol = collection(db, "products");
        const productSnapshot = await getDocs(productsCol);
        
        if (productSnapshot.empty) {
            productGrid.innerHTML = '<p>No products found. Admin should add some!</p>';
            return;
        }

        productGrid.innerHTML = '';
        productSnapshot.forEach(doc => {
            const product = doc.data();
            const discountedPrice = product.price * (1 - product.discount / 100);
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <a href="product.html?id=${doc.id}">
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">
                        ${product.discount > 0 ? `<span class="price-original">₹${product.price.toFixed(2)}</span>` : ''}
                        ₹${discountedPrice.toFixed(2)}
                    </p>
                </a>
                <button class="btn add-to-cart-btn" data-id="${doc.id}">Add to Cart</button>
            `;
            productGrid.appendChild(card);
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                const productRef = doc(db, "products", productId);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    addToCart(productId, productSnap.data());
                    alert(`${productSnap.data().name} added to cart!`);
                }
            });
        });

    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p class="message error">Could not load products. Please try again later.</p>';
    }
}

// PRODUCT DETAIL PAGE
async function renderProductPage() {
    const productDetailContent = document.getElementById('product-detail-content');
    if (!productDetailContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailContent.innerHTML = '<p class="message error">No product ID provided.</p>';
        return;
    }

    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            productDetailContent.innerHTML = '<p class="message error">Product not found.</p>';
            return;
        }

        const product = productSnap.data();
        const discountedPrice = product.price * (1 - product.discount / 100);

        document.title = `${product.name} - Apna Meme Store`;
        productDetailContent.innerHTML = `
            <div class="product-detail-container">
                <div class="product-detail-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h1>${product.name}</h1>
                    <p class="product-price">
                        ${product.discount > 0 ? `<span class="price-original">₹${product.price.toFixed(2)}</span>` : ''}
                        ₹${discountedPrice.toFixed(2)}
                    </p>
                    <p>${product.description}</p>
                    <button id="add-to-cart-detail" class="btn">Add to Cart</button>
                </div>
            </div>
        `;

        document.getElementById('add-to-cart-detail').addEventListener('click', () => {
            addToCart(productId, product);
            showMessage('feedback-message', `${product.name} added to cart!`);
        });

    } catch (error) {
        console.error("Error fetching product details: ", error);
        productDetailContent.innerHTML = '<p class="message error">Could not load product details.</p>';
    }
}

// CART PAGE
function renderCartPage() {
    const cartContainer = document.getElementById('cart-items-container');
    const cartSummary = document.getElementById('cart-summary');
    if (!cartContainer || !cartSummary) return;

    if (state.cart.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty. Go get some memes!</p>';
        cartSummary.classList.add('hidden');
        return;
    }

    cartSummary.classList.remove('hidden');
    cartContainer.innerHTML = '';
    let subtotal = 0;

    state.cart.forEach(item => {
        const discountedPrice = item.price * (1 - item.discount / 100);
        subtotal += discountedPrice * item.quantity;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p>₹${discountedPrice.toFixed(2)}</p>
            </div>
            <div class="quantity-controls">
                <label for="quantity-${item.id}">Qty:</label>
                <input type="number" class="quantity-input" id="quantity-${item.id}" value="${item.quantity}" min="1" data-id="${item.id}">
            </div>
            <button class="btn btn-danger remove-item" data-id="${item.id}">Remove</button>
        `;
        cartContainer.appendChild(itemElement);
    });

    // Update prices
    const discountAmount = state.coupon ? subtotal * (state.coupon.discount / 100) : 0;
    const total = subtotal - discountAmount;

    document.getElementById('subtotal-price').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('discount-amount').textContent = `- ₹${discountAmount.toFixed(2)}`;
    document.getElementById('total-price').textContent = `₹${total.toFixed(2)}`;
    
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', e => removeFromCart(e.target.dataset.id));
    });
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', e => {
            updateQuantity(e.target.dataset.id, parseInt(e.target.value));
        });
    });
}

// CHECKOUT PAGE
function renderCheckoutPage() {
    if (state.cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    const summaryContainer = document.getElementById('summary-items-container');
    let subtotal = 0;

    summaryContainer.innerHTML = '';
    state.cart.forEach(item => {
        const discountedPrice = item.price * (1 - item.discount / 100);
        subtotal += discountedPrice * item.quantity;
        summaryContainer.innerHTML += `
            <div class="summary-item">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${(discountedPrice * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });
    
    const discountAmount = state.coupon ? subtotal * (state.coupon.discount / 100) : 0;
    const total = subtotal - discountAmount;
    document.getElementById('total-price').textContent = `₹${total.toFixed(2)}`;
}

// SUCCESS PAGE
function renderSuccessPage() {
    const orderIdEl = document.getElementById('order-id');
    const orderId = new URLSearchParams(window.location.search).get('orderId');
    if (orderIdEl && orderId) {
        orderIdEl.textContent = orderId;
    }
}


// --- ADMIN PANEL LOGIC ---
async function renderAdminPage() {
    if (!document.getElementById('admin-page')) return;
    
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            loadAdminProducts();
            loadAdminCoupons();
            loadAdminOrders();
        }
    });
}

async function loadAdminProducts() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Loading products...</td></tr>';
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    tbody.innerHTML = '';
    
    if (productsSnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="4">No products found.</td></tr>';
        return;
    }

    productsSnapshot.forEach(doc => {
        const product = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${product.image}" alt="${product.name}" width="50" style="vertical-align: middle;"></td>
            <td>${product.name}</td>
            <td>₹${product.price.toFixed(2)}</td>
            <td><button class="btn btn-danger delete-product" data-id="${doc.id}">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this product?')) {
                await deleteDoc(doc(db, 'products', id));
                showMessage('feedback-message', 'Product deleted successfully.');
                loadAdminProducts();
            }
        });
    });
}

async function loadAdminCoupons() {
    const tbody = document.querySelector('#coupons-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3">Loading coupons...</td></tr>';

    const couponsSnapshot = await getDocs(collection(db, 'coupons'));
    tbody.innerHTML = '';

    if (couponsSnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="3">No coupons found.</td></tr>';
        return;
    }

    couponsSnapshot.forEach(doc => {
        const coupon = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${coupon.code}</td>
            <td>${coupon.discount}%</td>
            <td><button class="btn btn-danger delete-coupon" data-id="${doc.id}">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.delete-coupon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this coupon?')) {
                await deleteDoc(doc(db, 'coupons', id));
                showMessage('feedback-message', 'Coupon deleted successfully.');
                loadAdminCoupons();
            }
        });
    });
}

async function loadAdminOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    ordersList.innerHTML = '<p>Loading orders...</p>';
    
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const ordersSnapshot = await getDocs(q);
    
    if (ordersSnapshot.empty) {
        ordersList.innerHTML = '<p>No orders yet.</p>';
        return;
    }

    ordersList.innerHTML = '';

    ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const itemsHtml = order.cart.map(item => 
            `<li>${item.name} (x${item.quantity})</li>`
        ).join('');

        const orderDiv = document.createElement('div');
        orderDiv.className = 'cart-item';
        orderDiv.style.flexDirection = 'column';
        orderDiv.style.alignItems = 'flex-start';
        orderDiv.innerHTML = `
            <div style="width: 100%;">
                <p><strong>Order ID:</strong> ${doc.id}</p>
                <p><strong>Date:</strong> ${order.createdAt.toDate().toLocaleString()}</p>
                <hr style="border-color: var(--accent-color);">
                <p><strong>Customer:</strong> ${order.name}</p>
                <p><strong>Phone:</strong> ${order.phone}</p>
                <p><strong>Address:</strong> ${order.address}, ${order.pincode}</p>
                <p><strong>Total Price:</strong> <span style="color: var(--success-color); font-weight: bold;">₹${order.totalPrice.toFixed(2)}</span></p>
                <p><strong>Items Ordered:</strong></p>
                <ul style="margin-left: 20px;">${itemsHtml}</ul>
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}


// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    const pageId = document.body.id;

    switch (pageId) {
        case 'home-page':
            renderHomePage();
            break;
        case 'product-page':
            renderProductPage();
            break;
        case 'cart-page':
            renderCartPage();
            document.getElementById('apply-coupon-btn')?.addEventListener('click', async () => {
                const codeInput = document.getElementById('coupon-code');
                const code = codeInput.value.trim().toUpperCase();
                if (!code) return;

                const couponRef = doc(db, 'coupons', code);
                const couponSnap = await getDoc(couponRef);

                if(couponSnap.exists()) {
                    state.coupon = { code, ...couponSnap.data() };
                    saveCoupon();
                    renderCartPage();
                    showMessage('feedback-message', `Coupon '${code}' applied!`, 'success');
                } else {
                    state.coupon = null;
                    saveCoupon();
                    renderCartPage();
                    showMessage('feedback-message', 'Invalid coupon code.', 'error');
                }
            });
            break;
        case 'checkout-page':
            renderCheckoutPage();
            document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const orderData = {
                    name: form.name.value,
                    phone: form.phone.value,
                    address: form.address.value,
                    pincode: form.pincode.value,
                    cart: state.cart,
                    couponApplied: state.coupon ? state.coupon.code : null,
                    createdAt: serverTimestamp()
                };

                let subtotal = state.cart.reduce((sum, item) => sum + (item.price * (1 - item.discount / 100)) * item.quantity, 0);
                const discountAmount = state.coupon ? subtotal * (state.coupon.discount / 100) : 0;
                orderData.totalPrice = subtotal - discountAmount;

                try {
                    const orderRef = await addDoc(collection(db, 'orders'), orderData);
                    state.cart = [];
                    state.coupon = null;
                    saveCart();
                    saveCoupon();
                    window.location.href = `success.html?orderId=${orderRef.id}`;
                } catch(error) {
                    console.error("Error placing order:", error);
                    showMessage('feedback-message', 'Failed to place order. Please try again.', 'error');
                }
            });
            break;
        case 'success-page':
            renderSuccessPage();
            break;
        case 'login-page':
            onAuthStateChanged(auth, user => {
                if (user) window.location.href = 'admin.html';
            });
            document.getElementById('login-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.password.value;
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    window.location.href = 'admin.html';
                } catch(error) {
                    showMessage('feedback-message', error.message, 'error');
                }
            });
            break;
        case 'admin-page':
            renderAdminPage();
            document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
            
            document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const newProduct = {
                    name: form['product-name'].value,
                    price: parseFloat(form['product-price'].value),
                    discount: parseFloat(form['product-discount'].value),
                    category: form['product-category'].value,
                    image: form['product-image'].value,
                    description: form['product-description'].value,
                    createdAt: serverTimestamp()
                };
                await addDoc(collection(db, 'products'), newProduct);
                showMessage('feedback-message', 'Product added successfully.');
                form.reset();
                loadAdminProducts();
            });

            document.getElementById('add-coupon-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const code = form['coupon-code-input'].value.trim().toUpperCase();
                const discount = parseFloat(form['coupon-discount-input'].value);
                if (!code || isNaN(discount)) {
                    showMessage('feedback-message', 'Please fill both coupon fields correctly.', 'err