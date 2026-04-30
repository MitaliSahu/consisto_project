let goals = JSON.parse(localStorage.getItem('consisto_data')) || [];
let currentGoalId = null;

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    if(pageId === 'page-dashboard') renderDashboard();
}

// Auth Simulation
function handleAuth() {
    const user = document.getElementById('username').value;
    if(user.trim() !== "") {
        showPage('page-dashboard');
    } else {
        alert("Please enter a username.");
    }
}

// Theme Toggle
function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const next = current === 'blue' ? 'pink' : 'blue';
    body.setAttribute('data-theme', next);
    document.getElementById('themeBtn').innerText = next === 'blue' ? '🌌 Deep Space' : '🌙 Dark Rose';
}

// Fixed Add Goal Function
function addGoal() {
    const title = document.getElementById('goalTitle').value;
    const freq = document.getElementById('goalFreq').value;
    
    if(!title.trim()) {
        alert("Please name your milestone!");
        return;
    }

    goals.push({ 
        id: Date.now(), 
        title: title.trim(), 
        freq: freq, 
        checks: {}, 
        created: new Date().toLocaleDateString() 
    });

    localStorage.setItem('consisto_data', JSON.stringify(goals));
    
    // Reset inputs and close modal
    document.getElementById('goalTitle').value = '';
    closeModal();
    renderDashboard();
}

function calculateProgress(goal) {
    const total = generateLabels(goal.freq).length;
    const checked = Object.values(goal.checks).filter(v => v === true).length;
    return Math.round((checked / total) * 100) || 0;
}

// Corrected function name (removed the extra 'f')
function renderDashboard() {
    const container = document.getElementById('goals-container');
    if (!container) return; 
    
    container.innerHTML = '';
    const activeCount = document.getElementById('active-count');
    if (activeCount) activeCount.innerText = goals.length;

    goals.forEach(goal => {
        const progress = calculateProgress(goal);
        const div = document.createElement('div');
        div.className = 'goal-card';
        
        div.innerHTML = `
            <div onclick="viewGoal(${goal.id})">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${goal.title}</strong>
                    <span style="font-size:12px; color:var(--primary)">${progress}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
                <small style="opacity:0.6; margin-top:10px; display:block">Target: ${goal.freq}</small>
            </div>
            <button class="delete-task-btn" onclick="deleteGoal(${goal.id}, event)">Delete</button>
        `;
        container.appendChild(div);
    });
}

function deleteGoal(id, event) {
    event.stopPropagation();
    if(confirm("Remove this milestone?")) {
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        renderDashboard();
    }
}

function viewGoal(id) {
    currentGoalId = id;
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    document.getElementById('detail-title').innerText = goal.title;
    const container = document.getElementById('checkbox-container');
    container.innerHTML = '';
    
    const labels = generateLabels(goal.freq);
    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'check-item';
        const isChecked = goal.checks[index] ? 'checked' : '';
        item.innerHTML = `<input type="checkbox" ${isChecked} onchange="toggleCheck(${index})"><span>${label}</span>`;
        container.appendChild(item);
    });
    showPage('page-detail');
}

function generateLabels(freq) {
    if (freq === 'daily') return Array.from({ length: 30 }, (_, i) => i + 1);
    if (freq === 'monthly') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => startYear + i);
}

function toggleCheck(index) {
    const goal = goals.find(g => g.id === currentGoalId);
    if (goal) {
        goal.checks[index] = !goal.checks[index];
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        // Optional: Refresh dashboard in background to update progress percentage
    }
}

function openModal() { document.getElementById('task-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('task-modal').style.display = 'none'; }

// Initial load
window.onload = () => {
    if(goals.length > 0) renderDashboard();
};