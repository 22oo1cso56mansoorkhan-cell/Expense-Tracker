/* -------------------------------------------------------------
   EXPENSE TRACKER - FULL FEATURE APPLICATION LOGIC
   ------------------------------------------------------------- */

// Constants
var STORAGE_KEY = 'budgetbuddy_data';
var THEME_KEY = 'budgetbuddy_theme';

// App State
var expenses = [];
var budget = 0;
var currentFilter = 'All';
var currentMonth = 'all';

// DOM Elements
var budgetForm = document.getElementById('budget-form');
var budgetInput = document.getElementById('budget-input');
var budgetStatus = document.getElementById('budget-status');

var expenseForm = document.getElementById('expense-form');
var expenseNameInput = document.getElementById('expense-name');
var expenseAmountInput = document.getElementById('expense-amount');
var expenseCategorySelect = document.getElementById('expense-category');
var expenseDateInput = document.getElementById('expense-date');

var totalIncomeEl = document.getElementById('total-income');
var totalExpensesEl = document.getElementById('total-expenses');
var netBalanceEl = document.getElementById('net-balance');
var budgetRemainingEl = document.getElementById('budget-remaining');
var balanceCard = document.getElementById('balance-card');

var categoryFilterSelect = document.getElementById('category-filter');
var monthFilterSelect = document.getElementById('month-filter');
var expenseListEl = document.getElementById('expense-list');
var noExpensesEl = document.getElementById('no-expenses');

var chartProgress = document.getElementById('chart-progress');
var expenseRatioEl = document.getElementById('expense-ratio');
var legendEl = document.getElementById('category-breakdown-legend');
var monthlySummaryEl = document.getElementById('monthly-summary');
var dateTextEl = document.getElementById('date-text');
var themeToggleBtn = document.getElementById('themeToggle');

// Edit Modal
var editModal = document.getElementById('edit-modal');
var modalClose = document.getElementById('modal-close');
var editForm = document.getElementById('edit-form');
var editId = document.getElementById('edit-id');
var editName = document.getElementById('edit-name');
var editAmount = document.getElementById('edit-amount');
var editCategory = document.getElementById('edit-category');
var editDate = document.getElementById('edit-date');

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
        budget: budget
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
    var savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
        try {
            var data = JSON.parse(savedData);
            expenses = data.expenses || [];
            budget = data.budget || 0;
        } catch (e) {
            console.error('Error loading data:', e);
            expenses = [];
            budget = 0;
        }
    } else {
        // Fallback: check for old storage keys
        var oldExpenses = localStorage.getItem('expenses');
        var oldBudget = localStorage.getItem('budget');
        
        if (oldExpenses) {
            try {
                expenses = JSON.parse(oldExpenses);
                localStorage.removeItem('expenses');
            } catch (e) {
                expenses = [];
            }
        }
        
        if (oldBudget) {
            budget = parseFloat(oldBudget) || 0;
            localStorage.removeItem('budget');
        }
        
        saveData();
    }
    
    if (budgetInput) budgetInput.value = budget || '';
    updateBudgetStatus();
    populateMonthFilter();
}

// ============================================================
// THEME MANAGEMENT
// ============================================================

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function initTheme() {
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (!savedTheme) {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
        setTheme(savedTheme);
    }
}

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
}

// ============================================================
// UI HELPERS
// ============================================================

function displayCurrentDate() {
    if (!dateTextEl) return;
    var options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    dateTextEl.textContent = new Date().toLocaleDateString('en-US', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
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
    var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
// BUDGET MANAGEMENT
// ============================================================

function updateBudgetStatus() {
    if (!budgetStatus) return;
    var totalExp = expenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
    var remaining = budget - totalExp;
    
    if (budget > 0) {
        var pct = Math.round((totalExp / budget) * 100);
        var statusText = '';
        if (pct >= 100) {
            statusText = '<span class="budget-warning">⚠️ Budget exceeded by ' + formatCurrency(Math.abs(remaining)) + '</span>';
        } else if (pct >= 80) {
            statusText = '<span class="budget-warning">⚠️ ' + pct + '% used - ' + formatCurrency(remaining) + ' remaining</span>';
        } else {
            statusText = '<span class="budget-ok">✅ ' + pct + '% used - ' + formatCurrency(remaining) + ' remaining</span>';
        }
        budgetStatus.innerHTML = statusText;
    } else {
        budgetStatus.textContent = 'No budget set. Add a monthly budget above.';
    }
    
    if (budgetRemainingEl) {
        budgetRemainingEl.textContent = budget > 0 ? formatCurrency(Math.max(0, remaining)) : formatCurrency(0);
    }
}

// ============================================================
// EXPENSE CRUD OPERATIONS
// ============================================================

function addExpense() {
    var name = expenseNameInput.value.trim();
    var amount = parseFloat(expenseAmountInput.value);
    var category = expenseCategorySelect.value;
    var date = expenseDateInput.value;
    
    if (!name || isNaN(amount) || amount <= 0 || !category || !date) {
        alert('Please fill all fields correctly.');
        return;
    }
    
    var newExpense = {
        id: Date.now().toString(),
        name: name,
        amount: amount,
        category: category,
        date: date
    };
    
    expenses.push(newExpense);
    saveData();
    updateUI();
    
    expenseForm.reset();
    expenseCategorySelect.selectedIndex = 0;
    populateMonthFilter();
}

function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    expenses = expenses.filter(function(exp) { return exp.id !== id; });
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
    
    var index = expenses.findIndex(function(exp) { return exp.id === id; });
    if (index === -1) return;
    
    expenses[index] = { id: id, name: name, amount: amount, category: category, date: date };
    saveData();
    updateUI();
    closeEditModal();
}

// ============================================================
// FILTERING & RENDERING
// ============================================================

function populateMonthFilter() {
    if (!monthFilterSelect) return;
    var currentValue = monthFilterSelect.value;
    var months = {};
    expenses.forEach(function(exp) {
        var key = getMonthKey(exp.date);
        months[key] = true;
    });
    
    monthFilterSelect.innerHTML = '<option value="all">All Months</option>';
    Object.keys(months).sort().reverse().forEach(function(key) {
        var option = document.createElement('option');
        option.value = key;
        option.textContent = getMonthLabel(key);
        monthFilterSelect.appendChild(option);
    });
    
    if (currentValue && months[currentValue]) {
        monthFilterSelect.value = currentValue;
    }
}

function getFilteredExpenses() {
    var filtered = expenses.slice();
    
    if (currentFilter !== 'All') {
        filtered = filtered.filter(function(exp) { return exp.category === currentFilter; });
    }
    
    if (currentMonth !== 'all') {
        filtered = filtered.filter(function(exp) {
            return getMonthKey(exp.date) === currentMonth;
        });
    }
    
    return filtered;
}

function renderExpenses() {
    var filtered = getFilteredExpenses();
    var sorted = filtered.slice().sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    
    expenseListEl.innerHTML = '';
    
    if (sorted.length === 0) {
        noExpensesEl.style.display = 'block';
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
    
    // Event listeners for edit/delete
    document.querySelectorAll('.btn-action.edit').forEach(function(btn) {
        btn.addEventListener('click', function() {
            openEditModal(this.dataset.id);
        });
    });
    
    document.querySelectorAll('.btn-action.delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
            deleteExpense(this.dataset.id);
        });
    });
}

// ============================================================
// SUMMARY, CHARTS & MONTHLY SUMMARY
// ============================================================

function updateLegend(totalExpenses) {
    if (!legendEl) return;
    
    var catTotals = { Food: 0, Travel: 0, Shopping: 0, Bills: 0, Other: 0 };
    var filtered = getFilteredExpenses();
    filtered.forEach(function(exp) {
        if (catTotals[exp.category] !== undefined) {
            catTotals[exp.category] += exp.amount;
        } else {
            catTotals.Other += exp.amount;
        }
    });
    
    var active = Object.keys(catTotals).filter(function(cat) { return catTotals[cat] > 0; });
    
    if (active.length === 0) {
        legendEl.innerHTML = '<div style="text-align:center;padding:16px 0;color:var(--text-muted);">No data</div>';
        return;
    }
    
    legendEl.innerHTML = '';
    active.forEach(function(cat) {
        var amt = catTotals[cat];
        var pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
        var color = categoryColors[cat] || '#64748b';
        
        var item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background:${color}"></span>
                <span>${cat}</span>
            </div>
            <div>
                <span class="legend-value">${formatCurrency(amt)}</span>
                <span class="legend-pct">${pct}%</span>
            </div>
        `;
        legendEl.appendChild(item);
    });
}

function updateMonthlySummary() {
    if (!monthlySummaryEl) return;
    
    var filtered = getFilteredExpenses();
    var total = filtered.reduce(function(sum, e) { return sum + e.amount; }, 0);
    var count = filtered.length;
    
    var monthLabel = currentMonth === 'all' ? 'All time' : getMonthLabel(currentMonth);
    var categoryCount = {};
    filtered.forEach(function(e) {
        categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
    });
    var topCategory = '';
    var topCount = 0;
    for (var cat in categoryCount) {
        if (categoryCount[cat] > topCount) {
            topCount = categoryCount[cat];
            topCategory = cat;
        }
    }
    
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    html += '<div><strong>${monthLabel}</strong></div>';
    html += '<div style="text-align:right;">${count} entries</div>';
    html += '<div>Total spent</div>';
    html += '<div style="text-align:right;font-weight:600;color:var(--danger);">${formatCurrency(total)}</div>';
    if (topCategory) {
        html += '<div>Most frequent</div>';
        html += '<div style="text-align:right;">${topCategory} (${topCount})</div>';
    }
    html += '</div>';
    
    // Use template literal with replacements
    monthlySummaryEl.innerHTML = html
        .replace(/\${monthLabel}/g, monthLabel)
        .replace(/\${count}/g, count)
        .replace(/\${formatCurrency\(total\)}/g, formatCurrency(total))
        .replace(/\${topCategory}/g, topCategory || '—')
        .replace(/\${topCount}/g, topCount);
}

function updateStats() {
    var totalExp = expenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
    var balance = 0 - totalExp; // No income tracking, just expenses vs budget
    
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(0);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExp);
    if (netBalanceEl) netBalanceEl.textContent = formatCurrency(balance);
    if (balanceCard) {
        balanceCard.classList.toggle('negative', balance < 0);
    }
    
    // Donut: expenses vs budget
    var pct = budget > 0 ? Math.min(100, (totalExp / budget) * 100) : 0;
    if (expenseRatioEl) expenseRatioEl.textContent = Math.round(pct) + '%';
    
    var offset = 251.2 - (pct / 100) * 251.2;
    if (chartProgress) {
        chartProgress.style.strokeDashoffset = offset;
        if (pct > 90) chartProgress.style.stroke = '#ef4444';
        else if (pct > 70) chartProgress.style.stroke = '#f59e0b';
        else chartProgress.style.stroke = '#7c3aed';
    }
    
    updateBudgetStatus();
    
    var filteredTotal = getFilteredExpenses().reduce(function(s, e) { return s + e.amount; }, 0);
    updateLegend(filteredTotal);
    updateMonthlySummary();
}

function updateUI() {
    renderExpenses();
    updateStats();
    saveData();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    if (budgetForm) {
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
    }
    
    if (expenseForm) {
        expenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addExpense();
        });
    }
    
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', function() {
            currentFilter = this.value;
            renderExpenses();
            updateStats();
        });
    }
    
    if (monthFilterSelect) {
        monthFilterSelect.addEventListener('change', function() {
            currentMonth = this.value;
            renderExpenses();
            updateStats();
        });
    }
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Modal events
    if (modalClose) modalClose.addEventListener('click', closeEditModal);
    window.addEventListener('click', function(e) {
        if (e.target === editModal) closeEditModal();
    });
    if (editForm) editForm.addEventListener('submit', saveEdit);
}

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL (for inline onclick)
// ============================================================

window.deleteExpense = deleteExpense;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;

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