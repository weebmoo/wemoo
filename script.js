/**
 * script.js
 * Main application logic for Wemoo Premium SMM Panel
 * Handles UI interactions, theme management, and page-specific initialization.
 */

import * as api from './api.js';

// --- Global State ---
const state = {
    user: null,
    balance: 0,
    services: [],
    isLoading: false,
    theme: localStorage.getItem('wemoo_theme') || 'dark'
};

/**
 * Initialize Theme
 */
function initTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    
    // Apply initial theme
    if (state.theme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('wemoo_theme', state.theme);
            
            if (state.theme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        });
    }
}

/**
 * Show/Hide Loading Spinner with transition
 */
function setLoading(loading) {
    state.isLoading = loading;
    const loader = document.getElementById('loader');
    if (loader) {
        if (loading) {
            loader.style.display = 'flex';
            setTimeout(() => loader.style.opacity = '1', 10);
        } else {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }
}

/**
 * Show Notification Toast
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

/**
 * Authentication Guard
 */
function checkAuth() {
    const user = localStorage.getItem('wemoo_user');
    const currentPage = window.location.pathname;
    const isAuthPage = ['login.html', 'signup.html'].some(p => currentPage.endsWith(p));
    const isPublicPage = ['/', 'index.html', 'services.html'].some(p => currentPage.endsWith(p) || currentPage === '/');

    if (!user && !isAuthPage && !isPublicPage) {
        window.location.href = 'login.html';
        return false;
    }

    if (user && isAuthPage) {
        window.location.href = 'dashboard.html';
        return false;
    }

    if (user) {
        state.user = JSON.parse(user);
    }
    return true;
}

/**
 * Update Balance across the UI
 */
async function updateBalanceUI() {
    try {
        const data = await api.getBalance();
        if (data && data.balance) {
            state.balance = data.balance;
            const balanceElements = document.querySelectorAll('.balance-value');
            balanceElements.forEach(el => {
                el.textContent = `$${parseFloat(data.balance).toFixed(2)}`;
            });
        }
    } catch (error) {
        console.error("Balance update failed:", error);
    }
}

/**
 * Sidebar & Mobile Navigation
 */
function initNavigation() {
    const toggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebar-close');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.remove('translate-x-full');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('translate-x-full');
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

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                if (sidebar) sidebar.classList.add('translate-x-full');
            }
        });
    });
}

// --- Page Initializers ---

/**
 * Login Page
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
            // Simulate API call
            setTimeout(() => {
                localStorage.setItem('wemoo_user', JSON.stringify({ username }));
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showNotification("Please fill in all fields", "error");
        }
    });
}

/**
 * Signup Page
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
            setTimeout(() => {
                localStorage.setItem('wemoo_user', JSON.stringify({ username, email }));
                showNotification("Welcome to Wemoo Premium!");
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }, 1200);
        } else {
            showNotification("Please fill in all fields", "error");
        }
    });
}

/**
 * Services Page with Search & Filtering
 */
async function initServicesPage() {
    if (!window.location.pathname.endsWith('services.html')) return;

    const tableBody = document.getElementById('services-table-body');
    const searchInput = document.getElementById('service-search');
    const categoryFilter = document.getElementById('category-filter');
    if (!tableBody) return;

    setLoading(true);
    try {
        let services = await api.getServices();
        
        if (services && !Array.isArray(services) && typeof services === 'object') {
            services = Object.values(services);
        }

        state.services = services;
        renderServices(services);

        // Populate Categories
        if (categoryFilter) {
            const categories = ['All', ...new Set(services.map(s => s.category))];
            categoryFilter.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
            categoryFilter.addEventListener('change', filterServices);
        }

        if (searchInput) {
            searchInput.addEventListener('input', filterServices);
        }

    } catch (error) {
        console.error("Services Load Error:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-20 text-rose-500 font-medium">${error.message}</td></tr>`;
    } finally {
        setLoading(false);
    }

    function filterServices() {
        const query = searchInput?.value.toLowerCase() || '';
        const category = categoryFilter?.value || 'All';

        const filtered = state.services.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(query) || s.service.toString().includes(query);
            const matchesCategory = category === 'All' || s.category === category;
            return matchesSearch && matchesCategory;
        });

        renderServices(filtered);
    }

    function renderServices(servicesToRender) {
        tableBody.innerHTML = '';
        if (servicesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-20 text-slate-400">No services found matching your criteria.</td></tr>';
            return;
        }

        servicesToRender.forEach(service => {
            const row = document.createElement('tr');
            row.className = "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors";
            row.innerHTML = `
                <td class="py-4 px-4 font-mono text-xs text-slate-400">${service.service || service.id}</td>
                <td class="py-4 px-4 font-medium">${service.name}</td>
                <td class="py-4 px-4"><span class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase">${service.category}</span></td>
                <td class="py-4 px-4 font-bold">$${service.rate}</td>
                <td class="py-4 px-4 text-slate-400">${service.min}</td>
                <td class="py-4 px-4 text-slate-400">${service.max}</td>
                <td class="py-4 px-4 text-right">
                    <a href="order.html?service=${service.service || service.id}" class="btn btn-primary py-1.5 px-4 text-xs">Order</a>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
}

/**
 * Order Page
 */
async function initOrderPage() {
    if (!window.location.pathname.endsWith('order.html')) return;

    const serviceSelect = document.getElementById('service-select');
    const orderForm = document.getElementById('order-form');
    const rateDisplay = document.getElementById('rate-display');
    if (!serviceSelect || !orderForm) return;

    setLoading(true);
    try {
        const services = await api.getServices();
        state.services = services;

        const categories = [...new Set(services.map(s => s.category))];
        categories.forEach(cat => {
            const group = document.createElement('optgroup');
            group.label = cat;
            
            const catServices = services.filter(s => s.category === cat);
            catServices.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.service;
                opt.textContent = s.name;
                opt.dataset.rate = s.rate;
                group.appendChild(opt);
            });
            serviceSelect.appendChild(group);
        });

        serviceSelect.addEventListener('change', () => {
            const selected = serviceSelect.options[serviceSelect.selectedIndex];
            if (rateDisplay && selected.dataset.rate) {
                rateDisplay.textContent = `$${selected.dataset.rate} per 1,000`;
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('service');
        if (serviceId) {
            serviceSelect.value = serviceId;
            serviceSelect.dispatchEvent(new Event('change'));
        }

    } catch (error) {
        showNotification(error.message, "error");
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
                showNotification(`Order #${result.order} placed successfully!`);
                orderForm.reset();
                updateBalanceUI();
            } else {
                showNotification(result.error || "Failed to place order", "error");
            }
        } catch (error) {
            showNotification(error.message, "error");
        } finally {
            setLoading(false);
        }
    });
}

/**
 * Dashboard Page
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

// --- Global Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    
    if (!checkAuth()) return;

    initLoginPage();
    initSignupPage();
    initDashboardPage();
    initServicesPage();
    initOrderPage();

    // Hide loader after initial load
    setTimeout(() => setLoading(false), 800);
});
