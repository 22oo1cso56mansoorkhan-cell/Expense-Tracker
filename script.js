/* -------------------------------------------------------------
   EXPENSE TRACKER - MAIN APPLICATION LOGIC
   ------------------------------------------------------------- */

// Constants
var STORAGE_KEY = 'budgetbuddy_data';
var THEME_KEY = 'budgetbuddy_theme';

// App State
var expenses = [];
var income = 0;
var currentFilter = 'All';

// DOM Elements
var incomeForm = document.getElementById('income-form');
var incomeInput = document.getElementById('income-input');
var expenseForm = document.getElementById('expense-form');
var expenseNameInput = document.getElementById('expense-name');
var expenseAmountInput = document.getElementById('expense-amount');
var expenseCategorySelect = document.getElementById('expense-category');

var totalIncomeEl = document.getElementById('total-income');
var totalExpensesEl = document.getElementById('total-expenses');
var netBalanceEl = document.getElementById('net-balance');
var balanceCard = document.getElementById('balance-card');

var categoryFilterSelect = document.getElementById('category-filter');
var expenseListEl = document.getElementById('expense-list');
var noExpensesEl = document.getElementById('no-expenses');

var chartProgress = document.getElementById('chart-progress');
var expenseRatioEl = document.getElementById('expense-ratio');
var legendEl = document.getElementById('category-breakdown-legend');
var dateTextEl = document.getElementById('date-text');
var themeToggleBtn = document.getElementById('themeToggle');

// Category Configurations
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
    var data = {
        expenses: expenses,
        income: income
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    var savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
        try {
            var data = JSON.parse(savedData);
            expenses = data.expenses || [];
            income = data.income || 0;
        } catch (e) {
            console.error('Error loading data:', e);
            expenses = [];
            income = 0;
        }
    } else {
        // Fallback: check for old storage keys
        var oldExpenses = localStorage.getItem('expenses');
        var oldIncome = localStorage.getItem('income');
        
        var needsMigration = false;
        
        if (oldExpenses) {
            try {
                expenses = JSON.parse(oldExpenses);
                needsMigration = true;
                localStorage.removeItem('expenses');
            } catch (e) {
                expenses = [];
            }
        }
        
        if (oldIncome) {
            income = parseFloat(oldIncome) || 0;
            needsMigration = true;
            localStorage.removeItem('income');
        }
        
        if (needsMigration) {
            saveData();
        }
    }
    
    // Pre-fill income input if set
    if (income > 0 && incomeInput) {
        incomeInput.value = income;
    }
}

// ============================================================
// THEME MANAGEMENT
// ============================================================

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggleBtn.setAttribute('aria-label', 
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }
}

function initTheme() {
    var savedTheme = localStorage.getItem(THEME_KEY);
    
    if (!savedTheme) {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    } else {
        setTheme(savedTheme);
    }
}

function toggleTheme() {
    var currentTheme = document.documentElement.getAttribute('data-theme');
    var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// ============================================================
// UI HELPERS
// ============================================================

function displayCurrentDate() {
    if (!dateTextEl) return;
    var options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    var today = new Date();
    dateTextEl.textContent = today.toLocaleDateString('en-US', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(timestamp) {
    var date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// ============================================================
// EXPENSE MANAGEMENT
// ============================================================

function addExpense() {
    if (!expenseNameInput || !expenseAmountInput || !expenseCategorySelect) return;
    
    var name = expenseNameInput.value.trim();
    var amount = parseFloat(expenseAmountInput.value);
    var category = expenseCategorySelect.value;

    if (!name || isNaN(amount) || amount <= 0 || !category) {
        alert('Please fill out all fields with valid data.');
        return;
    }

    var newExpense = {
        id: Date.now().toString(),
        name: name,
        amount: amount,
        category: category,
        date: Date.now()
    };

    expenses.push(newExpense);
    saveData();
    updateUI();

    expenseForm.reset();
    expenseCategorySelect.selectedIndex = 0;
}

function deleteExpense(id) {
    expenses = expenses.filter(function(exp) { return exp.id !== id; });
    saveData();
    updateUI();
}

function filterExpenses() {
    renderExpenses();
}

function renderExpenses() {
    if (!expenseListEl || !noExpensesEl) return;
    
    var filteredExpenses = currentFilter === 'All' 
        ? expenses 
        : expenses.filter(function(exp) { return exp.category === currentFilter; });

    var sortedExpenses = filteredExpenses.slice().sort(function(a, b) { 
        return b.date - a.date; 
    });

    if (sortedExpenses.length === 0) {
        noExpensesEl.style.display = 'block';
        expenseListEl.innerHTML = '';
        return;
    }

    noExpensesEl.style.display = 'none';
    expenseListEl.innerHTML = '';

    sortedExpenses.forEach(function(exp) {
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
            <div class="item-amount">-${formatCurrency(exp.amount)}</div>
            <button class="btn-delete" data-id="${exp.id}" aria-label="Delete expense">✕</button>
        `;
        expenseListEl.appendChild(li);
    });

    // Delete handlers
    document.querySelectorAll('.btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            var id = this.dataset.id;
            if (confirm('Delete this expense?')) {
                deleteExpense(id);
            }
        });
    });
}

// ============================================================
// SUMMARY & CHARTS
// ============================================================

function updateLegend(totalExpenses) {
    if (!legendEl) return;
    
    var catTotals = { Food: 0, Travel: 0, Shopping: 0, Bills: 0, Other: 0 };
    expenses.forEach(function(exp) {
        if (catTotals[exp.category] !== undefined) {
            catTotals[exp.category] += exp.amount;
        } else {
            catTotals.Other += exp.amount;
        }
    });

    var activeCategories = Object.keys(catTotals).filter(function(cat) { 
        return catTotals[cat] > 0; 
    });

    if (activeCategories.length === 0) {
        legendEl.innerHTML = '<div class="text-muted" style="text-align:center;padding:16px 0;">No data to display</div>';
        return;
    }

    legendEl.innerHTML = '';

    activeCategories.forEach(function(cat) {
        var amt = catTotals[cat];
        var pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
        var color = categoryColors[cat] || '#64748b';

        var legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background-color: ${color}"></span>
                <span>${cat}</span>
            </div>
            <div>
                <span class="legend-value">${formatCurrency(amt)}</span>
                <span class="legend-pct">${pct}%</span>
            </div>
        `;
        legendEl.appendChild(legendItem);
    });
}

function updateSummary() {
    var totalExpenses = expenses.reduce(function(sum, exp) { 
        return sum + exp.amount; 
    }, 0);
    var balance = income - totalExpenses;

    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
    if (netBalanceEl) netBalanceEl.textContent = formatCurrency(balance);

    if (balanceCard) {
        if (balance < 0) {
            balanceCard.classList.add('negative');
        } else {
            balanceCard.classList.remove('negative');
        }
    }

    // Donut chart
    var percentage = 0;
    if (income > 0) {
        percentage = Math.min(100, (totalExpenses / income) * 100);
    } else if (totalExpenses > 0) {
        percentage = 100;
    }

    if (expenseRatioEl) expenseRatioEl.textContent = Math.round(percentage) + '%';

    var strokeDashOffset = 251.2 - (percentage / 100) * 251.2;
    if (chartProgress) {
        chartProgress.style.strokeDashoffset = strokeDashOffset;
        
        if (percentage > 90) {
            chartProgress.style.stroke = '#ef4444';
        } else if (percentage > 70) {
            chartProgress.style.stroke = '#f59e0b';
        } else {
            chartProgress.style.stroke = '#7c3aed';
        }
    }

    updateLegend(totalExpenses);
}

function updateUI() {
    updateSummary();
    renderExpenses();
    saveData();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    if (incomeForm) {
        incomeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var value = parseFloat(incomeInput.value);
            if (!isNaN(value) && value >= 0) {
                income = value;
                updateUI();
                
                var btn = incomeForm.querySelector('button');
                var originalText = btn.textContent;
                btn.textContent = '✅ Updated!';
                setTimeout(function() {
                    btn.textContent = originalText;
                }, 1200);
            }
        });
    }

    if (expenseForm) {
        expenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addExpense();
        });
    }

    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', function(e) {
            currentFilter = e.target.value;
            renderExpenses();
        });
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadData();
    displayCurrentDate();
    setupEventListeners();
    updateUI();
});