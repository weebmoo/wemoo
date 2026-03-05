/**
 * script.js
 * Main application logic for Wemoo SMM Panel
 */

import * as api from './api.js';
import { animate, spring, stagger } from 'motion';

// --- Global State & Helpers ---
const state = {
    user: null,
    balance: 0,
    services: [],
    isLoading: false
};

/**
 * Show/Hide Loading Spinner
 */
function setLoading(loading) {
    state.isLoading = loading;
    const loader = document.getElementById('loader');
    const spinner = loader?.querySelector('.loader');
    
    if (loader) {
        if (loading) {
            loader.style.display = 'flex';
            animate(loader, { opacity: [0, 1] }, { duration: 0.3 });
            if (spinner) {
                animate(spinner, { scale: [0.5, 1], rotate: [0, 360] }, { 
                    duration: 0.5, 
                    easing: spring({ stiffness: 200, damping: 15 }) 
                });
            }
        } else {
            animate(loader, { opacity: 0 }, { duration: 0.3 }).then(() => {
                loader.style.display = 'none';
            });
        }
    }
}

/**
 * Show Notification
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    animate(notification, 
        { y: [50, 0], opacity: [0, 1], scale: [0.9, 1] }, 
        { duration: 0.4, easing: spring({ stiffness: 300, damping: 20 }) }
    );
    
    setTimeout(() => {
        animate(notification, 
            { y: 20, opacity: 0, scale: 0.95 }, 
            { duration: 0.3 }
        ).then(() => {
            notification.classList.remove('show');
        });
    }, 3000);
}

/**
 * Check if user is logged in
 */
function checkAuth() {
    const user = localStorage.getItem('wemoo_user');
    const currentPage = window.location.pathname;

    // If not logged in and not on index or login page, redirect to login
    if (!user && !['/', '/index.html', '/login.html', '/signup.html'].some(p => currentPage.endsWith(p))) {
        window.location.href = 'login.html';
        return false;
    }

    // If logged in and on login/signup page, redirect to dashboard
    if (user && (currentPage.endsWith('login.html') || currentPage.endsWith('signup.html'))) {
        window.location.href = 'dashboard.html';
        return false;
    }

    if (user) {
        state.user = JSON.parse(user);
    }
    return true;
}

/**
 * Update Balance UI
 */
async function updateBalanceUI() {
    try {
        const data = await api.getBalance();
        if (data && data.balance) {
            state.balance = data.balance;
            const balanceElements = document.querySelectorAll('.balance-value');
            balanceElements.forEach(el => {
                el.textContent = `${parseFloat(data.balance).toFixed(2)} MDH`;
            });
        }
    } catch (error) {
        console.error("Failed to fetch balance", error);
    }
}

/**
 * Sidebar Toggle for Mobile
 */
function initSidebar() {
    const toggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebar-close');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Logout logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('wemoo_user');
            window.location.href = 'index.html';
        });
    }
}

// --- Page Specific Logic ---

/**
 * Login Page Logic
 */
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username && password) {
            setLoading(true);
            // Simulate login
            setTimeout(() => {
                localStorage.setItem('wemoo_user', JSON.stringify({ username }));
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            showNotification("Please fill in all fields", "error");
        }
    });
}

/**
 * Signup Page Logic
 */
function initSignupPage() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        if (username && email && password) {
            setLoading(true);
            // Simulate registration
            setTimeout(() => {
                localStorage.setItem('wemoo_user', JSON.stringify({ username, email }));
                showNotification("Account created successfully!");
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }, 1000);
        } else {
            showNotification("Please fill in all fields", "error");
        }
    });
}

/**
 * Dashboard Page Logic
 */
async function initDashboardPage() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    
    const userDisplay = document.getElementById('display-username');
    if (userDisplay && state.user) {
        userDisplay.textContent = state.user.username;
    }

    setLoading(true);
    await updateBalanceUI();
    setLoading(false);
}

/**
 * Services Page Logic
 */
async function initServicesPage() {
    if (!window.location.pathname.endsWith('services.html')) return;

    const tableBody = document.getElementById('services-table-body');
    if (!tableBody) return;

    setLoading(true);
    try {
        let services = await api.getServices();
        
        // Some APIs return an object instead of an array
        if (services && !Array.isArray(services) && typeof services === 'object') {
            services = Object.values(services);
        }

        if (!services || !Array.isArray(services)) {
            throw new Error("Invalid services data format");
        }

        state.services = services;
        
        tableBody.innerHTML = '';
        if (services.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No services available at the moment.</td></tr>';
            return;
        }

        services.forEach(service => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.service || service.id || '-'}</td>
                <td>${service.name || '-'}</td>
                <td>${service.category || '-'}</td>
                <td>${service.rate || '0.00'} MDH</td>
                <td>${service.min || '-'}</td>
                <td>${service.max || '-'}</td>
                <td>
                    <a href="order.html?service=${service.service || service.id}" class="btn btn-primary btn-sm" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Order</a>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Services Load Error:", error);
        
        let errorMsg = error.message;
        
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--danger);">
            <div style="background: rgba(255, 68, 68, 0.1); border: 1px solid var(--danger); padding: 1.5rem; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <h3 style="margin-bottom: 0.5rem;">Connection Error</h3>
                <p style="font-size: 0.95rem; line-height: 1.5;">${errorMsg}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1.5rem;">Retry Connection</button>
            </div>
        </td></tr>`;
        showNotification("Failed to load services", "error");
    } finally {
        setLoading(false);
    }
}

/**
 * New Order Page Logic
 */
async function initOrderPage() {
    if (!window.location.pathname.endsWith('order.html')) return;

    const serviceSelect = document.getElementById('service-select');
    const orderForm = document.getElementById('order-form');
    if (!serviceSelect || !orderForm) return;

    setLoading(true);
    try {
        const services = await api.getServices();
        state.services = services;

        // Group by category
        const categories = [...new Set(services.map(s => s.category))];
        categories.forEach(cat => {
            const group = document.createElement('optgroup');
            group.label = cat;
            
            const catServices = services.filter(s => s.category === cat);
            catServices.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.service;
                opt.textContent = `${s.name} - ${s.rate} MDH/1k`;
                group.appendChild(opt);
            });
            serviceSelect.appendChild(group);
        });

        // Pre-select if ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('service');
        if (serviceId) {
            serviceSelect.value = serviceId;
        }

    } catch (error) {
        console.error("Order Page Load Error:", error);
        showNotification(error.message || "Failed to load services", "error");
        
        const container = document.querySelector('.form-card');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding: 2rem; color: var(--danger);">
                    <h3 style="margin-bottom: 1rem;">Connection Error</h3>
                    <p style="margin-bottom: 1.5rem;">${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    } finally {
        setLoading(false);
    }

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceId = serviceSelect.value;
        const link = document.getElementById('link').value;
        const quantity = document.getElementById('quantity').value;

        if (!serviceId || !link || !quantity) {
            showNotification("Please fill in all fields", "error");
            return;
        }

        setLoading(true);
        try {
            const result = await api.createOrder(serviceId, link, quantity);
            if (result.order) {
                showNotification(`Order placed successfully! ID: ${result.order}`);
                orderForm.reset();
                updateBalanceUI();
            } else {
                showNotification(result.error || "Failed to place order", "error");
            }
        } catch (error) {
            showNotification(error.message || "An error occurred", "error");
        } finally {
            setLoading(false);
        }
    });
}

/**
 * Orders Page Logic
 */
async function initOrdersPage() {
    if (!window.location.pathname.endsWith('orders.html')) return;

    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;

    // In a real app, we'd fetch the user's order history from our DB.
    // For this demo, we'll show a "No orders found" or mock data since the API
    // doesn't have a "list all my orders" endpoint without a backend tracking them.
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding: 2rem;">No recent orders found.</td></tr>';
}

/**
 * Balance Page Logic
 */
async function initBalancePage() {
    if (!window.location.pathname.endsWith('balance.html')) return;
    
    setLoading(true);
    await updateBalanceUI();
    setLoading(false);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Apply page entrance animation
    const mainContent = document.querySelector('.main-content') || document.querySelector('.hero');
    if (mainContent) {
        mainContent.classList.add('page-fade-in');
        
        // Animate children sequentially
        const children = mainContent.querySelectorAll('.stat-card, .form-card, .table-container, h1, p');
        animate(children, 
            { opacity: [0, 1], y: [20, 0] }, 
            { delay: stagger(0.05), duration: 0.5 }
        );
    }

    // Add subtle hover animations to buttons that don't have them via CSS
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            animate(btn, { scale: 1.02 }, { duration: 0.2 });
        });
        btn.addEventListener('mouseleave', () => {
            animate(btn, { scale: 1 }, { duration: 0.2 });
        });
    });

    initSidebar();
    initLoginPage();
    initSignupPage();
    initDashboardPage();
    initServicesPage();
    initOrderPage();
    initOrdersPage();
    initBalancePage();
});
