let goals = JSON.parse(localStorage.getItem('consisto_data')) || [];
let currentGoalId = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if(pageId === 'page-dashboard') renderDashboard();
}

function handleAuth() {
    if(document.getElementById('username').value.trim()) showPage('page-dashboard');
}

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    body.setAttribute('data-theme', current === 'blue' ? 'pink' : 'blue');
    document.getElementById('themeBtn').innerText = current === 'blue' ? '🌙 Dark Rose' : '🌌 Deep Space';
}

function addGoal() {
    const title = document.getElementById('goalTitle').value;
    const freq = document.getElementById('goalFreq').value;
    if(!title) return;
    goals.push({ id: Date.now(), title, freq, checks: {} });
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    closeModal();
    renderDashboard();
}

function renderDashboard() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';
    document.getElementById('active-count').innerText = goals.length;
    
    goals.forEach(goal => {
        const labels = generateLabels(goal.freq);
        const total = labels.length;
        const checked = Object.values(goal.checks).filter(v => v === true).length;
        const progress = Math.round((checked / total) * 100) || 0;
        
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div onclick="viewGoal(${goal.id})" style="cursor:pointer; flex-grow:1;">
                    <strong style="font-size:1.2rem;">${goal.title}</strong>
                    <small style="display:block; opacity:0.6; text-transform:uppercase;">${goal.freq}</small>
                </div>
                <button class="delete-task-btn" onclick="deleteGoal(${goal.id}, event)">Delete</button>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div style="text-align:right; font-size:14px; margin-top:5px; font-weight:bold;">${progress}%</div>
        `;
        container.appendChild(div);
    });
}

function viewGoal(id) {
    currentGoalId = id;
    const goal = goals.find(g => g.id === id);
    document.getElementById('detail-title').innerText = goal.title;
    const container = document.getElementById('checkbox-container');
    container.innerHTML = '';
    
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0 (Sun) to 6 (Sat)
    // Convert Sun-Sat to Mon-Sun (0=Mon, 6=Sun)
    const adjustedStart = startDay === 0 ? 6 : startDay - 1;

    if (goal.freq === 'daily') {
        // 1. Add Month Title
        const monthTitle = document.createElement('div');
        monthTitle.className = 'month-title';
        monthTitle.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        container.appendChild(monthTitle);

        // 2. Add Day Headers (Mon - Sun)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            const dayHead = document.createElement('div');
            dayHead.className = 'calendar-header-row';
            dayHead.innerText = day;
            container.appendChild(dayHead);
        });

        // 3. Add Empty Slots for alignment
        for (let i = 0; i < adjustedStart; i++) {
            const empty = document.createElement('div');
            empty.className = 'empty-slot';
            container.appendChild(empty);
        }
    }

    const labels = generateLabels(goal.freq);
    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'check-item';
        item.innerHTML = `
            <input type="checkbox" ${goal.checks[index] ? 'checked' : ''} onchange="toggleCheck(${index})">
            <span style="font-weight:bold;">${label}</span>
        `;
        container.appendChild(item);
    });
    showPage('page-detail');
}

function generateLabels(freq) {
    if (freq === 'daily') {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }
    if (freq === 'weekly') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (freq === 'monthly') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
}

function toggleCheck(index) {
    const goal = goals.find(g => g.id === currentGoalId);
    goal.checks[index] = !goal.checks[index];
    localStorage.setItem('consisto_data', JSON.stringify(goals));
}

function deleteGoal(id, event) {
    event.stopPropagation();
    if(confirm("Permanently delete this milestone?")) {
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        renderDashboard();
    }
}

function openModal() { document.getElementById('task-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('task-modal').style.display = 'none'; }
window.onload = () => { if(goals.length) renderDashboard(); };