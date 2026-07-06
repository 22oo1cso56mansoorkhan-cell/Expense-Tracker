/* -------------------------------------------------------------
   EXPENSE TRACKER - FULL FEATURE APPLICATION LOGIC
   ------------------------------------------------------------- */

// Constants
var STORAGE_KEY = 'budgetbuddy_data';
var THEME_KEY = 'budgetbuddy_theme';

// App State
var expenses = [];
var income = 0;
var budget = 0;
var currentFilter = 'All';
var currentMonth = 'all';
var searchQuery = '';

// Chart instances
var trendChart = null;
var categoryChart = null;

// DOM Elements
var incomeForm = document.getElementById('income-form');
var incomeInput = document.getElementById('income-input');
var budgetForm = document.getElementById('budget-form');
var budgetInput = document.getElementById('budget-input');
var budgetStatus = document.getElementById('budget-status');

var expenseForm = document.getElementById('expense-form');
var expenseName = document.getElementById('expense-name');
var expenseAmount = document.getElementById('expense-amount');
var expenseCategory = document.getElementById('expense-category');
var expenseDate = document.getElementById('expense-date');

var totalIncomeEl = document.getElementById('total-income');
var totalExpensesEl = document.getElementById('total-expenses');
var netBalanceEl = document.getElementById('net-balance');
var budgetRemainingEl = document.getElementById('budget-remaining');
var balanceCard = document.getElementById('balance-card');

var searchInput = document.getElementById('search-input');
var categoryFilter = document.getElementById('category-filter');
var monthFilter = document.getElementById('month-filter');
var clearFiltersBtn = document.getElementById('clear-filters');
var filterStatsEl = document.getElementById('filter-stats');
var expenseListEl = document.getElementById('expense-list');
var noExpensesEl = document.getElementById('no-expenses');

var dateTextEl = document.getElementById('date-text');
var themeToggle = document.getElementById('themeToggle');

// Edit Modal
var editModal = document.getElementById('edit-modal');
var modalClose = document.getElementById('modal-close');
var editForm = document.getElementById('edit-form');
var editId = document.getElementById('edit-id');
var editName = document.getElementById('edit-name');
var editAmount = document.getElementById('edit-amount');
var editCategory = document.getElementById('edit-category');
var editDate = document.getElementById('edit-date');

// Category Config
var categoryIcons = {
    Food: { emoji: '🍕', cls: 'cat-food' },
    Travel: { emoji: '✈️', cls: 'cat-travel' },
    Shopping: { emoji: '🛍️', cls: 'cat-shopping' },
    Bills: { emoji: '📄', cls: 'cat-bills' },
    Other: { emoji: '📦', cls: 'cat-other' }
};

var categoryColors = {
    Food: '#10b981',
    Travel: '#0ea5e9',
    Shopping: '#8b5cf6',
    Bills: '#f59e0b',
    Other: '#64748b'
};

// ============================================================
// DATA MANAGEMENT
// ============================================================

function saveData() {
    var data = { expenses: expenses, income: income, budget: budget };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            var data = JSON.parse(saved);
            expenses = data.expenses || [];
            income = data.income || 0;
            budget = data.budget || 0;
        } catch (e) {
            console.error('Error loading data:', e);
            expenses = [];
            income = 0;
            budget = 0;
        }
    }
    
    if (incomeInput) incomeInput.value = income || '';
    if (budgetInput) budgetInput.value = budget || '';
    populateMonthFilter();
}

// ============================================================
// THEME
// ============================================================

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (!saved) {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
        setTheme(saved);
    }
}

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getMonthKey(dateStr) {
    var d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function getMonthLabel(monthKey) {
    if (monthKey === 'all') return 'All Months';
    var parts = monthKey.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m] || m;
    });
}

// ============================================================
// BUDGET
// ============================================================

function updateBudgetStatus() {
    if (!budgetStatus) return;
    var totalExp = expenses.reduce(function(s, e) { return s + e.amount; }, 0);
    var remaining = budget - totalExp;
    
    if (budget > 0) {
        var pct = Math.round((totalExp / budget) * 100);
        if (pct >= 100) {
            budgetStatus.innerHTML = '<span class="budget-warning">⚠️ Exceeded by ' + formatCurrency(Math.abs(remaining)) + '</span>';
        } else if (pct >= 80) {
            budgetStatus.innerHTML = '<span class="budget-warning">⚠️ ' + pct + '% used - ' + formatCurrency(remaining) + ' left</span>';
        } else {
            budgetStatus.innerHTML = '<span class="budget-ok">✅ ' + pct + '% used - ' + formatCurrency(remaining) + ' left</span>';
        }
    } else {
        budgetStatus.textContent = 'No budget set';
    }
    
    if (budgetRemainingEl) {
        budgetRemainingEl.textContent = budget > 0 ? formatCurrency(Math.max(0, remaining)) : formatCurrency(0);
    }
}

// ============================================================
// EXPENSE CRUD
// ============================================================

function addExpense() {
    var name = expenseName.value.trim();
    var amount = parseFloat(expenseAmount.value);
    var category = expenseCategory.value;
    var date = expenseDate.value;
    
    if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
        alert('Please fill all fields correctly.');
        return;
    }
    
    expenses.push({
        id: Date.now().toString(),
        name: name,
        amount: amount,
        category: category,
        date: date
    });
    
    saveData();
    updateUI();
    expenseForm.reset();
    expenseCategory.selectedIndex = 0;
    populateMonthFilter();
}

function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    expenses = expenses.filter(function(e) { return e.id !== id; });
    saveData();
    updateUI();
}

function openEditModal(id) {
    var exp = expenses.find(function(e) { return e.id === id; });
    if (!exp) return;
    editId.value = exp.id;
    editName.value = exp.name;
    editAmount.value = exp.amount;
    editCategory.value = exp.category;
    editDate.value = exp.date;
    editModal.style.display = 'flex';
}

function closeEditModal() {
    editModal.style.display = 'none';
}

function saveEdit(e) {
    e.preventDefault();
    var id = editId.value;
    var name = editName.value.trim();
    var amount = parseFloat(editAmount.value);
    var category = editCategory.value;
    var date = editDate.value;
    
    if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
        alert('Please fill all fields correctly.');
        return;
    }
    
    var index = expenses.findIndex(function(e) { return e.id === id; });
    if (index === -1) return;
    
    expenses[index] = { id: id, name: name, amount: amount, category: category, date: date };
    saveData();
    updateUI();
    closeEditModal();
}

// ============================================================
// FILTERS
// ============================================================

function populateMonthFilter() {
    var currentVal = monthFilter.value;
    var months = {};
    expenses.forEach(function(e) {
        months[getMonthKey(e.date)] = true;
    });
    
    monthFilter.innerHTML = '<option value="all">All Months</option>';
    Object.keys(months).sort().reverse().forEach(function(key) {
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = getMonthLabel(key);
        monthFilter.appendChild(opt);
    });
    
    if (currentVal && months[currentVal]) monthFilter.value = currentVal;
    else monthFilter.value = 'all';
}

function getFilteredExpenses() {
    var filtered = expenses.slice();
    
    if (currentFilter !== 'All') {
        filtered = filtered.filter(function(e) { return e.category === currentFilter; });
    }
    
    if (currentMonth !== 'all') {
        filtered = filtered.filter(function(e) {
            return getMonthKey(e.date) === currentMonth;
        });
    }
    
    if (searchQuery.trim()) {
        var q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(function(e) {
            return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
        });
    }
    
    return filtered;
}

function clearFilters() {
    searchQuery = '';
    currentFilter = 'All';
    currentMonth = 'all';
    searchInput.value = '';
    categoryFilter.value = 'All';
    monthFilter.value = 'all';
    updateUI();
}

// ============================================================
// RENDER
// ============================================================

function renderExpenses() {
    var filtered = getFilteredExpenses();
    var sorted = filtered.slice().sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    
    expenseListEl.innerHTML = '';
    
    if (sorted.length === 0) {
        noExpensesEl.style.display = 'block';
        filterStatsEl.innerHTML = 'Showing <strong>0</strong> of <strong>' + expenses.length + '</strong> expenses';
        return;
    }
    
    noExpensesEl.style.display = 'none';
    
    sorted.forEach(function(exp) {
        var cat = exp.category || 'Other';
        var icon = categoryIcons[cat] || categoryIcons.Other;
        var li = document.createElement('li');
        li.className = 'expense-item';
        
        li.innerHTML = `
            <div class="item-cat ${icon.cls}">${icon.emoji}</div>
            <div>
                <div class="item-name">${escapeHTML(exp.name)}</div>
                <div class="item-meta">
                    <span>${cat}</span> • <span>${formatDate(exp.date)}</span>
                </div>
            </div>
            <div class="item-amount">${formatCurrency(exp.amount)}</div>
            <div class="item-actions">
                <button class="btn-action edit" data-id="${exp.id}" title="Edit">✏️</button>
                <button class="btn-action delete" data-id="${exp.id}" title="Delete">🗑️</button>
            </div>
        `;
        expenseListEl.appendChild(li);
    });
    
    document.querySelectorAll('.btn-action.edit').forEach(function(btn) {
        btn.addEventListener('click', function() { openEditModal(this.dataset.id); });
    });
    document.querySelectorAll('.btn-action.delete').forEach(function(btn) {
        btn.addEventListener('click', function() { deleteExpense(this.dataset.id); });
    });
    
    var total = expenses.length;
    var shown = sorted.length;
    var filters = [];
    if (currentFilter !== 'All') filters.push('Category: ' + currentFilter);
    if (currentMonth !== 'all') filters.push('Month: ' + getMonthLabel(currentMonth));
    if (searchQuery.trim()) filters.push('Search: "' + searchQuery.trim() + '"');
    var filterText = filters.length > 0 ? ' (filtered by ' + filters.join(', ') + ')' : '';
    filterStatsEl.innerHTML = 'Showing <strong>' + shown + '</strong> of <strong>' + total + '</strong> expenses' + filterText;
}

// ============================================================
// CHARTS
// ============================================================

function getChartColors() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#f3f4f6' : '#1a1a2e',
        grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
    };
}

function updateCharts() {
    var colors = getChartColors();
    var filtered = getFilteredExpenses();
    var sorted = filtered.slice().sort(function(a, b) {
        return new Date(a.date) - new Date(b.date);
    });
    
    // Trend Chart
    var ctxTrend = document.getElementById('trendChart').getContext('2d');
    var trendLabels = sorted.map(function(e) {
        return new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    var trendData = sorted.map(function(e) { return e.amount; });
    
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels.length > 0 ? trendLabels : ['No Data'],
            datasets: [{
                label: 'Daily Spending',
                data: trendData.length > 0 ? trendData : [0],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#7c3aed'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: colors.text, font: { size: 12 } } }
            },
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text } }
            }
        }
    });
    
    // Category Chart
    var ctxCat = document.getElementById('categoryChart').getContext('2d');
    var catTotals = {};
    filtered.forEach(function(e) {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    var catLabels = Object.keys(catTotals);
    var catData = catLabels.map(function(c) { return catTotals[c]; });
    var catColors = catLabels.map(function(c) { return categoryColors[c] || '#64748b'; });
    
    if (categoryChart) categoryChart.destroy();
    
    if (catLabels.length === 0) {
        catLabels = ['No Data'];
        catData = [1];
        catColors = ['#e5e7eb'];
    }
    
    categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: catColors,
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        padding: 12,
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    var totalExp = expenses.reduce(function(s, e) { return s + e.amount; }, 0);
    var balance = income - totalExp;
    
    totalIncomeEl.textContent = formatCurrency(income);
    totalExpensesEl.textContent = formatCurrency(totalExp);
    netBalanceEl.textContent = formatCurrency(balance);
    balanceCard.classList.toggle('negative', balance < 0);
    
    updateBudgetStatus();
}

// ============================================================
// UPDATE UI
// ============================================================

function updateUI() {
    renderExpenses();
    updateStats();
    updateCharts();
    saveData();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Income
incomeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var val = parseFloat(incomeInput.value);
    if (!isNaN(val) && val >= 0) {
        income = val;
        updateUI();
        var btn = this.querySelector('button');
        var orig = btn.textContent;
        btn.textContent = '✅ Updated';
        setTimeout(function() { btn.textContent = orig; }, 1200);
    }
});

// Budget
budgetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
        budget = val;
        updateUI();
        var btn = this.querySelector('button');
        var orig = btn.textContent;
        btn.textContent = '✅ Updated';
        setTimeout(function() { btn.textContent = orig; }, 1200);
    }
});

// Add Expense
expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    addExpense();
});

// Search
searchInput.addEventListener('input', function() {
    searchQuery = this.value;
    renderExpenses();
    updateCharts();
});

// Category Filter
categoryFilter.addEventListener('change', function() {
    currentFilter = this.value;
    renderExpenses();
    updateCharts();
});

// Month Filter
monthFilter.addEventListener('change', function() {
    currentMonth = this.value;
    renderExpenses();
    updateCharts();
});

// Clear Filters
clearFiltersBtn.addEventListener('click', clearFilters);

// Theme
themeToggle.addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
    updateCharts();
});

// Modal
modalClose.addEventListener('click', closeEditModal);
window.addEventListener('click', function(e) {
    if (e.target === editModal) closeEditModal();
});
editForm.addEventListener('submit', saveEdit);

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadData();
    dateTextEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    updateUI();
});