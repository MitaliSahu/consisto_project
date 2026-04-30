let goals = JSON.parse(localStorage.getItem('consisto_data')) || [];
let currentGoalId = null;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if(pageId === 'page-dashboard') renderDashboard();
}

function handleAuth() {
    const user = document.getElementById('username').value;
    if(user) showPage('page-dashboard');
}

function toggleTheme() {
    const body = document.body;
    const current = body.getAttribute('data-theme');
    const next = current === 'blue' ? 'pink' : 'blue';
    body.setAttribute('data-theme', next);
    document.getElementById('themeBtn').innerText = next === 'blue' ? '🌙 Dark Rose' : '🌌 Deep Space';
}

function addGoal() {
    const title = document.getElementById('goalTitle').value;
    const freq = document.getElementById('goalFreq').value;
    if(!title) {
        alert("Please name your milestone!");
        return;
    }

    goals.push({ 
        id: Date.now(), 
        title: title, 
        freq: freq, 
        checks: {}, 
        created: new Date().toLocaleDateString() 
    });
    
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    renderDashboard();
    closeModal();
    // Clear the input for next time
    document.getElementById('goalTitle').value = ''; 
}

function calculateProgress(goal) {
    const total = generateLabels(goal.freq).length;
    const checked = Object.values(goal.checks).filter(v => v === true).length;
    return Math.round((checked / total) * 100) || 0;
}

function renderDashboard() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';
    document.getElementById('active-count').innerText = goals.length;

    goals.forEach(goal => {
        const progress = calculateProgress(goal);
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.onclick = () => viewGoal(goal.id); 
        div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items: center;">
         <strong>${goal.title}</strong>
         <button onclick="deleteGoal(${goal.id}, event)" style="background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:10px;">Delete</button>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div style="display:flex; justify-content:space-between; margin-top:10px;">
         <small style="opacity:0.6">Target: ${goal.freq}</small>
         <small style="color:var(--primary)">${progress}%</small>
        </div>
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
    goal.checks[index] = !goal.checks[index];
    localStorage.setItem('consisto_data', JSON.stringify(goals));
}

function openModal() { document.getElementById('task-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('task-modal').style.display = 'none'; }
function deleteGoal(id, event) {
    event.stopPropagation(); // Prevents opening the goal detail when clicking delete
    if(confirm("Are you sure you want to remove this milestone?")) {
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        renderDashboard();
    }
}