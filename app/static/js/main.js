// ===== STATE MANAGEMENT =====
let searchStartTime = 0;

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadBookmarks();
});

// ===== TAG FILTER MANAGEMENT =====
let selectedTags = [];

async function initializeTagFilters() {
    try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        renderTagFilters(data.tags.slice(0, 20)); // Show top 20 tags
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}
// ===== STATISTICS DASHBOARD =====
let charts = {};

function displayStatistics(results) {
    document.getElementById('statsSection').classList.remove('hidden');
    
    // Destroy old charts
    Object.values(charts).forEach(chart => chart && chart.destroy());
    
    // Difficulty distribution
    const difficultyData = getDifficultyDistribution(results);
    charts.difficulty = createChart('difficultyChart', 'Difficulty Distribution', difficultyData, 'bar');
    
    // Platform distribution
    const platformData = getPlatformDistribution(results);
    charts.platform = createChart('platformChart', 'Platform Distribution', platformData, 'doughnut');
    
    // Top tags
    const tagData = getTopTags(results, 10);
    charts.tag = createChart('tagChart', 'Top 10 Tags', tagData, 'bar');
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

// UPDATE displayResults to show statistics:
function displayResults(results, searchTime) {
    allResults = results;
    currentPage = 1;
    
    const resultsContainer = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    resultsCount.textContent = `${results.length} problems found`;
    searchTimeEl.textContent = `Search completed in ${searchTime}s`;
    resultsMeta.classList.remove('hidden');
    
    document.getElementById('exportSection').classList.remove('hidden');
    
    // DISPLAY STATISTICS
    displayStatistics(results);
    
    renderPage();
}

// UPDATE hideResults to hide stats:
function hideResults() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('resultsMeta').classList.add('hidden');
    document.getElementById('exportSection').classList.add('hidden');
    document.getElementById('statsSection').classList.add('hidden'); // ADD THIS
}

function renderTagFilters(tags) {
    const container = document.getElementById('tagFilters');
    container.innerHTML = tags.map(tag => `
        <button class="tag-filter-chip" data-tag="${escapeHtml(tag.name)}">
            ${escapeHtml(tag.name)}
            <span class="tag-count">(${tag.count})</span>
        </button>
    `).join('');
    
    // Add click listeners
    container.querySelectorAll('.tag-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleTagFilter(chip));
    });
    
    document.getElementById('clearTags').addEventListener('click', clearAllTags);
}

function toggleTagFilter(chip) {
    const tag = chip.dataset.tag;
    chip.classList.toggle('active');
    
    if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
    } else {
        selectedTags.push(tag);
    }
    
    document.getElementById('clearTags').classList.toggle('hidden', selectedTags.length === 0);
}

function clearAllTags() {
    selectedTags = [];
    document.querySelectorAll('.tag-filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    document.getElementById('clearTags').classList.add('hidden');
}
// ===== PAGINATION STATE =====
let currentPage = 1;
const itemsPerPage = 12;
let allResults = [];

// UPDATE displayResults function:
function displayResults(results, searchTime) {
    allResults = results;
    currentPage = 1;
    
    const resultsContainer = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    resultsCount.textContent = `${results.length} problems found`;
    searchTimeEl.textContent = `Search completed in ${searchTime}s`;
    resultsMeta.classList.remove('hidden');
    
    renderPage();
}

function renderPage() {
    const resultsContainer = document.getElementById('results');
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
    
    // Remove old pagination
    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) oldPagination.remove();
    
    renderPage();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ===== SEARCH HISTORY MANAGEMENT =====
function initializeSearchHistory() {
    const searchInput = document.getElementById('query');
    
    searchInput.addEventListener('focus', () => {
        showSearchHistory();
    });
    
    searchInput.addEventListener('blur', (e) => {
        // Delay to allow clicking on history items
        setTimeout(() => {
            hideSearchHistory();
        }, 200);
    });
}

function showSearchHistory() {
    const history = getSearchHistory();
    const historyContainer = document.getElementById('searchHistory');
    
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
    document.getElementById('searchHistory').classList.add('hidden');
}

function getSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    return history ? JSON.parse(history) : [];
}

function saveSearchToHistory(query, platform, difficulty) {
    const history = getSearchHistory();
    
    // Don't save duplicate consecutive searches
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
    
    // Keep only last 20 searches
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
    
    // Trigger search
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
        renderTagCloud(data.tags.slice(0, 30)); // Top 30 tags
    } catch (error) {
        console.error('Failed to load tag cloud:', error);
    }
}

function renderTagCloud(tags) {
    const container = document.getElementById('tagCloud');
    
    if (tags.length === 0) return;
    
    // Calculate size classes based on count
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
    
    // Auto-trigger search after scroll
    setTimeout(() => {
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    }, 500);
}

// UPDATE DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadBookmarks();
    initializeTagFilters();
    initializeSearchHistory();
    initializeTagCloud(); // ADD THIS
});

// UPDATE handleSearch to save history:
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('query').value.trim();
    const platform = document.getElementById('platform').value;
    const difficulty = document.getElementById('difficulty').value;
    const sortBy = document.getElementById('sortBy').value;
    
    if (!query) return;
    
    // SAVE TO HISTORY
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

// UPDATE DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadBookmarks();
    initializeTagFilters();
    initializeSearchHistory(); // ADD THIS
});

// UPDATE the handleSearch function to include selected tags:
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('query').value.trim();
    const platform = document.getElementById('platform').value;
    const difficulty = document.getElementById('difficulty').value;
    const sortBy = document.getElementById('sortBy').value;
    
    if (!query) return;
    
    showLoader();
    hideError();
    hideEmptyState();
    hideResults();
    
    searchStartTime = performance.now();
    
    let apiUrl = `/api/search?q=${encodeURIComponent(query)}`;
    if (platform) apiUrl += `&platform=${encodeURIComponent(platform)}`;
    if (difficulty) apiUrl += `&difficulty=${encodeURIComponent(difficulty)}`;
    
    // ADD TAG FILTERS
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
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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

// UPDATE displayResults to show export section:
function displayResults(results, searchTime) {
    allResults = results;
    currentPage = 1;
    
    const resultsContainer = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    resultsCount.textContent = `${results.length} problems found`;
    searchTimeEl.textContent = `Search completed in ${searchTime}s`;
    resultsMeta.classList.remove('hidden');
    
    // SHOW EXPORT SECTION
    document.getElementById('exportSection').classList.remove('hidden');
    
    renderPage();
}

// UPDATE hideResults to hide export section:
function hideResults() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('resultsMeta').classList.add('hidden');
    document.getElementById('exportSection').classList.add('hidden'); // ADD THIS
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    document.body.classList.toggle('light-theme', savedTheme === 'light');
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Update the DOMContentLoaded section:
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme(); // ADD THIS LINE
    initializeEventListeners();
    loadBookmarks();
    initializeTagFilters(); // We'll add this next
});


// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', handleSearch);
}

// ===== SEARCH HANDLER =====
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('query').value.trim();
    const platform = document.getElementById('platform').value;
    const difficulty = document.getElementById('difficulty').value;
    const sortBy = document.getElementById('sortBy').value;
    
    if (!query) return;
    
    // Show loading state
    showLoader();
    hideError();
    hideEmptyState();
    hideResults();
    
    // Start timer
    searchStartTime = performance.now();
    
    // Build API URL
    let apiUrl = `/api/search?q=${encodeURIComponent(query)}`;
    if (platform) apiUrl += `&platform=${encodeURIComponent(platform)}`;
    if (difficulty) apiUrl += `&difficulty=${encodeURIComponent(difficulty)}`;
    
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
            return sorted; // relevance (default order from API)
    }
}

function parseDifficulty(diff) {
    if (diff === 'N/A' || !diff) return 0;
    if (typeof diff === 'number') return diff;
    
    // Handle LeetCode difficulty levels
    const levels = { 'easy': 1, 'medium': 2, 'hard': 3 };
    return levels[diff.toLowerCase()] || 0;
}

// ===== DISPLAY RESULTS =====
function displayResults(results, searchTime) {
    const resultsContainer = document.getElementById('results');
    const resultsMeta = document.getElementById('resultsMeta');
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    resultsContainer.innerHTML = '';
    
    // Update meta info
    resultsCount.textContent = `${results.length} problems found`;
    searchTimeEl.textContent = `Search completed in ${searchTime}s`;
    resultsMeta.classList.remove('hidden');
    
    // Create cards
    results.forEach(problem => {
        const card = createProblemCard(problem);
        resultsContainer.appendChild(card);
    });
    
    resultsContainer.classList.remove('hidden');
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
                    onclick="toggleBookmark(event, '${problem.url}')">
                <i class="fas fa-bookmark"></i>
            </button>
        </div>
        
        <div class="problem-meta">
            <span class="platform-badge">
                <i class="fas fa-laptop-code"></i> ${problem.platform}
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

// ===== BOOKMARK FUNCTIONALITY =====
function toggleBookmark(event, url) {
    event.stopPropagation();
    const button = event.currentTarget;
    const bookmarks = getBookmarks();
    
    if (bookmarks.includes(url)) {
        // Remove bookmark
        const index = bookmarks.indexOf(url);
        bookmarks.splice(index, 1);
        button.classList.remove('active');
    } else {
        // Add bookmark
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
    // Initialize bookmarks if needed
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
    
    const level = difficulty.toLowerCase();
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
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function showError(message) {
    const errorEl = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
}

function hideEmptyState() {
    document.getElementById('emptyState').classList.add('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('resultsMeta').classList.add('hidden');
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Focus search on '/' key
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('query').focus();
    }
});

// ===== AUTO-SAVE SEARCH HISTORY (OPTIONAL) =====
function saveToHistory(query, platform, difficulty) {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newEntry = {
        query,
        platform,
        difficulty,
        timestamp: new Date().toISOString()
    };
    
    history.unshift(newEntry);
    
    // Keep only last 10 searches
    if (history.length > 10) {
        history.pop();
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
}

// ===== SMOOTH SCROLL TO RESULTS =====
function scrollToResults() {
    const results = document.getElementById('results');
    if (results && !results.classList.contains('hidden')) {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

