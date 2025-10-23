// ===== STATE MANAGEMENT =====
let searchStartTime = 0;
let selectedTags = [];
let currentPage = 1;
const itemsPerPage = 12;
let allResults = [];
let charts = {};

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadBookmarks();
    initializeTagFilters();
    initializeSearchHistory();
    initializeTagCloud();
});

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', handleSearch);
    
    // Keyboard shortcut: Focus search on '/' key
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            document.getElementById('query').focus();
        }
    });
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.body.classList.toggle('light-theme', savedTheme === 'light');
    updateThemeIcon(savedTheme);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ===== TAG FILTER MANAGEMENT =====
async function initializeTagFilters() {
    try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        
        if (data.tags && data.tags.length > 0) {
            renderTagFilters(data.tags.slice(0, 20));
        }
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}

function renderTagFilters(tags) {
    const container = document.getElementById('tagFilters');
    if (!container) return;
    
    container.innerHTML = tags.map(tag => `
        <button class="tag-filter-chip" data-tag="${escapeHtml(tag.name)}">
            ${escapeHtml(tag.name)}
            <span class="tag-count">(${tag.count})</span>
        </button>
    `).join('');
    
    container.querySelectorAll('.tag-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleTagFilter(chip));
    });
    
    const clearBtn = document.getElementById('clearTags');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllTags);
    }
}

function toggleTagFilter(chip) {
    const tag = chip.dataset.tag;
    chip.classList.toggle('active');
    
    if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
    } else {
        selectedTags.push(tag);
    }
    
    const clearBtn = document.getElementById('clearTags');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', selectedTags.length === 0);
    }
}

function clearAllTags() {
    selectedTags = [];
    document.querySelectorAll('.tag-filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    const clearBtn = document.getElementById('clearTags');
    if (clearBtn) {
        clearBtn.classList.add('hidden');
    }
}

// ===== SEARCH HISTORY MANAGEMENT =====
function initializeSearchHistory() {
    const searchInput = document.getElementById('query');
    if (!searchInput) return;
    
    searchInput.addEventListener('focus', () => {
        showSearchHistory();
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSearchHistory();
        }, 200);
    });
}

function showSearchHistory() {
    const history = getSearchHistory();
    const historyContainer = document.getElementById('searchHistory');
    if (!historyContainer) return;
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="empty-history">No recent searches</div>';
    } else {
        let html = `
            <div class="search-history-header">
                <span class="search-history-title"><i class="fas fa-history"></i> Recent Searches</span>
                <button class="clear-history-btn" onclick="clearSearchHistory()">Clear All</button>
            </div>
        `;
        
        history.slice(0, 5).forEach(item => {
            const timeAgo = getTimeAgo(new Date(item.timestamp));
            html += `
                <div class="history-item" onclick="applyHistorySearch('${escapeHtml(item.query)}', '${item.platform}', '${item.difficulty}')">
                    <i class="fas fa-search"></i>
                    <span class="history-query">${escapeHtml(item.query)}</span>
                    <span class="history-meta">${timeAgo}</span>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
    }
    
    historyContainer.classList.remove('hidden');
}

function hideSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    if (historyContainer) {
        historyContainer.classList.add('hidden');
    }
}

function getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
}

function saveSearchToHistory(query, platform, difficulty) {
    const history = getSearchHistory();
    
    if (history.length > 0 && history[0].query === query) {
        return;
    }
    
    const newEntry = {
        query,
        platform: platform || '',
        difficulty: difficulty || '',
        timestamp: new Date().toISOString()
    };
    
    history.unshift(newEntry);
    
    if (history.length > 20) {
        history.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
}

function clearSearchHistory() {
    localStorage.setItem('searchHistory', JSON.stringify([]));
    showSearchHistory();
}

function applyHistorySearch(query, platform, difficulty) {
    document.getElementById('query').value = query;
    if (platform) document.getElementById('platform').value = platform;
    if (difficulty) document.getElementById('difficulty').value = difficulty;
    
    document.getElementById('searchForm').dispatchEvent(new Event('submit'));
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ===== TAG CLOUD =====
async function initializeTagCloud() {
    try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        
        if (data.tags && data.tags.length > 0) {
            renderTagCloud(data.tags.slice(0, 30));
        }
    } catch (error) {
        console.error('Failed to load tag cloud:', error);
    }
}

function renderTagCloud(tags) {
    const container = document.getElementById('tagCloud');
    if (!container || tags.length === 0) return;
    
    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));
    
    const getSizeClass = (count) => {
        const normalized = (count - minCount) / (maxCount - minCount);
        if (normalized > 0.8) return 'size-xl';
        if (normalized > 0.6) return 'size-lg';
        if (normalized > 0.4) return 'size-md';
        if (normalized > 0.2) return 'size-sm';
        return 'size-xs';
    };
    
    container.innerHTML = tags.map(tag => `
        <button class="tag-cloud-item ${getSizeClass(tag.count)}" 
                onclick="searchByTag('${escapeHtml(tag.name)}')">
            ${escapeHtml(tag.name)}
        </button>
    `).join('');
}

function searchByTag(tag) {
    document.getElementById('query').value = tag;
    window.scrollTo({ top: document.querySelector('.search-section').offsetTop - 100, behavior: 'smooth' });
    
    setTimeout(() => {
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    }, 500);
}

// ===== SEARCH HANDLER =====
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('query').value.trim();
    const platform = document.getElementById('platform').value;
    const difficulty = document.getElementById('difficulty').value;
    const sortBy = document.getElementById('sortBy')?.value || 'relevance';
    
    if (!query) return;
    
    saveSearchToHistory(query, platform, difficulty);
    hideSearchHistory();
    
    showLoader();
    hideError();
    hideEmptyState();
    hideResults();
    
    searchStartTime = performance.now();
    
    let apiUrl = `/api/search?q=${encodeURIComponent(query)}`;
    if (platform) apiUrl += `&platform=${encodeURIComponent(platform)}`;
    if (difficulty) apiUrl += `&difficulty=${encodeURIComponent(difficulty)}`;
    
    selectedTags.forEach(tag => {
        apiUrl += `&tags=${encodeURIComponent(tag)}`;
    });
    
    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        const searchTime = ((performance.now() - searchStartTime) / 1000).toFixed(2);
        
        hideLoader();
        
        if (data.results && data.results.length > 0) {
            const sortedResults = sortResults(data.results, sortBy);
            displayResults(sortedResults, searchTime);
        } else {
            showEmptyState();
        }
        
    } catch (error) {
        hideLoader();
        showError('Something went wrong. Please try again.');
        console.error('Search error:', error);
    }
}

// ===== SORT RESULTS =====
function sortResults(results, sortBy) {
    const sorted = [...results];
    
    switch(sortBy) {
        case 'difficulty-asc':
            return sorted.sort((a, b) => {
                const diffA = parseDifficulty(a.difficulty);
                const diffB = parseDifficulty(b.difficulty);
                return diffA - diffB;
            });
        case 'difficulty-desc':
            return sorted.sort((a, b) => {
                const diffA = parseDifficulty(a.difficulty);
                const diffB = parseDifficulty(b.difficulty);
                return diffB - diffA;
            });
        default:
            return sorted;
    }
}

function parseDifficulty(diff) {
    if (diff === 'N/A' || !diff) return 0;
    if (typeof diff === 'number') return diff;
    
    const levels = { 'easy': 1, 'medium': 2, 'hard': 3 };
    return levels[diff.toLowerCase()] || 0;
}

// ===== DISPLAY RESULTS =====
function displayResults(results, searchTime) {
    allResults = results;
    currentPage = 1;
    
    const resultsContainer = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    if (resultsCount) resultsCount.textContent = `${results.length} problems found`;
    if (searchTimeEl) searchTimeEl.textContent = `Search completed in ${searchTime}s`;
    if (resultsMeta) resultsMeta.classList.remove('hidden');
    
    const exportSection = document.getElementById('exportSection');
    if (exportSection) exportSection.classList.remove('hidden');
    
    displayStatistics(results);
    renderPage();
}

function renderPage() {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageResults = allResults.slice(startIdx, endIdx);
    
    pageResults.forEach(problem => {
        const card = createProblemCard(problem);
        resultsContainer.appendChild(card);
    });
    
    renderPagination();
    resultsContainer.classList.remove('hidden');
    scrollToTop();
}

function renderPagination() {
    const totalPages = Math.ceil(allResults.length / itemsPerPage);
    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) oldPagination.remove();
    
    if (totalPages <= 1) return;
    
    let paginationHTML = '<div class="pagination">';
    
    paginationHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    paginationHTML += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    
    paginationHTML += `
        <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += '</div>';
    
    const resultsContainer = document.getElementById('results');
    resultsContainer.insertAdjacentHTML('afterend', paginationHTML);
}

function changePage(page) {
    const totalPages = Math.ceil(allResults.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    
    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) oldPagination.remove();
    
    renderPage();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== CREATE PROBLEM CARD =====
function createProblemCard(problem) {
    const card = document.createElement('div');
    card.className = 'problem-card';
    
    const difficultyClass = getDifficultyClass(problem.difficulty);
    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.includes(problem.url);
    
    card.innerHTML = `
        <div class="problem-header">
            <div>
                <a href="${problem.url}" class="problem-title" target="_blank" rel="noopener">
                    ${escapeHtml(problem.title)}
                </a>
            </div>
            <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" 
                    data-url="${problem.url}" 
                    onclick="toggleBookmark(event, '${escapeHtml(problem.url)}')">
                <i class="fas fa-bookmark"></i>
            </button>
        </div>
        
        <div class="problem-meta">
            <span class="platform-badge">
                <i class="fas fa-laptop-code"></i> ${escapeHtml(problem.platform)}
            </span>
            <span class="difficulty-badge ${difficultyClass}">
                <i class="fas fa-signal"></i> ${problem.difficulty}
            </span>
        </div>
        
        <div class="problem-tags">
            ${(problem.tags || []).slice(0, 5).map(tag => 
                `<span class="problem-tag">${escapeHtml(tag)}</span>`
            ).join('')}
            ${problem.tags && problem.tags.length > 5 ? 
                `<span class="problem-tag">+${problem.tags.length - 5}</span>` : ''}
        </div>
        
        <div class="problem-footer">
            <a href="${problem.url}" class="problem-link" target="_blank" rel="noopener">
                Solve Problem <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
    
    return card;
}

// ===== STATISTICS DASHBOARD =====
function displayStatistics(results) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;
    
    statsSection.classList.remove('hidden');
    
    // Destroy old charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded. Statistics will not be displayed.');
        return;
    }
    
    // Difficulty distribution
    const difficultyData = getDifficultyDistribution(results);
    const diffChart = document.getElementById('difficultyChart');
    if (diffChart) {
        charts.difficulty = createChart('difficultyChart', 'Difficulty Distribution', difficultyData, 'bar');
    }
    
    // Platform distribution
    const platformData = getPlatformDistribution(results);
    const platChart = document.getElementById('platformChart');
    if (platChart) {
        charts.platform = createChart('platformChart', 'Platform Distribution', platformData, 'doughnut');
    }
    
    // Top tags
    const tagData = getTopTags(results, 10);
    const tagChart = document.getElementById('tagChart');
    if (tagChart) {
        charts.tag = createChart('tagChart', 'Top 10 Tags', tagData, 'bar');
    }
}

function getDifficultyDistribution(results) {
    const distribution = {};
    
    results.forEach(prob => {
        const diff = prob.difficulty;
        if (diff === 'N/A') return;
        
        let category;
        if (typeof diff === 'number') {
            if (diff < 1200) category = 'Easy (< 1200)';
            else if (diff < 1600) category = 'Medium (1200-1599)';
            else if (diff < 2000) category = 'Hard (1600-1999)';
            else category = 'Expert (2000+)';
        } else {
            category = diff;
        }
        
        distribution[category] = (distribution[category] || 0) + 1;
    });
    
    return {
        labels: Object.keys(distribution),
        data: Object.values(distribution)
    };
}

function getPlatformDistribution(results) {
    const distribution = {};
    
    results.forEach(prob => {
        const platform = prob.platform;
        distribution[platform] = (distribution[platform] || 0) + 1;
    });
    
    return {
        labels: Object.keys(distribution),
        data: Object.values(distribution)
    };
}

function getTopTags(results, limit = 10) {
    const tagCounts = {};
    
    results.forEach(prob => {
        (prob.tags || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    const sorted = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    
    return {
        labels: sorted.map(([tag]) => tag),
        data: sorted.map(([, count]) => count)
    };
}

function createChart(canvasId, title, data, type) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    const colors = [
        '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', 
        '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'
    ];
    
    return new Chart(ctx, {
        type: type,
        data: {
            labels: data.labels,
            datasets: [{
                label: title,
                data: data.data,
                backgroundColor: type === 'doughnut' ? colors : colors[0],
                borderColor: type === 'doughnut' ? colors : colors[0],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: type === 'doughnut',
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text'),
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: getComputedStyle(document.body).getPropertyValue('--text'),
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            scales: type !== 'doughnut' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted')
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-muted')
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border')
                    }
                }
            } : {}
        }
    });
}

// ===== EXPORT FUNCTIONALITY =====
function exportResults(format) {
    if (allResults.length === 0) {
        alert('No results to export');
        return;
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `coding-problems-${timestamp}.${format}`;
    
    let content, mimeType;
    
    if (format === 'json') {
        content = JSON.stringify(allResults, null, 2);
        mimeType = 'application/json';
    } else if (format === 'csv') {
        content = convertToCSV(allResults);
        mimeType = 'text/csv';
    }
    
    downloadFile(content, filename, mimeType);
}

function convertToCSV(data) {
    const headers = ['Title', 'Platform', 'Difficulty', 'URL', 'Tags'];
    const rows = data.map(prob => [
        prob.title,
        prob.platform,
        prob.difficulty,
        prob.url,
        (prob.tags || []).join('; ')
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===== BOOKMARK FUNCTIONALITY =====
function toggleBookmark(event, url) {
    event.stopPropagation();
    const button = event.currentTarget;
    const bookmarks = getBookmarks();
    
    if (bookmarks.includes(url)) {
        const index = bookmarks.indexOf(url);
        bookmarks.splice(index, 1);
        button.classList.remove('active');
    } else {
        bookmarks.push(url);
        button.classList.add('active');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function getBookmarks() {
    const bookmarks = localStorage.getItem('bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
}

function loadBookmarks() {
    if (!localStorage.getItem('bookmarks')) {
        localStorage.setItem('bookmarks', JSON.stringify([]));
    }
}

// ===== UTILITY FUNCTIONS =====
function getDifficultyClass(difficulty) {
    if (difficulty === 'N/A' || !difficulty) return '';
    
    if (typeof difficulty === 'number') {
        if (difficulty < 1200) return 'difficulty-easy';
        if (difficulty < 1800) return 'difficulty-medium';
        return 'difficulty-hard';
    }
    
    const level = String(difficulty).toLowerCase();
    if (level === 'easy') return 'difficulty-easy';
    if (level === 'medium') return 'difficulty-medium';
    if (level === 'hard') return 'difficulty-hard';
    
    return '';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}

function showError(message) {
    const errorEl = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.textContent = message;
    if (errorEl) errorEl.classList.remove('hidden');
}

function hideError() {
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.classList.add('hidden');
}

function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.remove('hidden');
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.classList.add('hidden');
}

function hideResults() {
    const results = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const exportSection = document.getElementById('exportSection');
    const statsSection = document.getElementById('statsSection');
    
    if (results) results.classList.add('hidden');
    if (resultsMeta) resultsMeta.classList.add('hidden');
    if (exportSection) exportSection.classList.add('hidden');
    if (statsSection) statsSection.classList.add('hidden');
}
