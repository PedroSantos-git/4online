const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_CLIENT_ID';

function generateUUID() {
    let uuid = localStorage.getItem('machineUUID');
    if (!uuid) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('machineUUID', uuid);
    }
    return uuid;
}

function displayUUID() {
    const uuid = generateUUID();
    document.getElementById('uuid').textContent = uuid;
}

let projects = [];
let isAdmin = false;

function isSafeUrl(url) {
    return /^https?:\/\//i.test(url);
}

function buildProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    const iframe = document.createElement('iframe');
    iframe.className = 'project-preview';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    if (isSafeUrl(project.url)) iframe.src = project.url;
    card.appendChild(iframe);

    const info = document.createElement('div');
    info.className = 'project-info';

    const h3 = document.createElement('h3');
    h3.textContent = project.name;
    info.appendChild(h3);

    const link = document.createElement('a');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = project.url;
    if (isSafeUrl(project.url)) link.href = project.url;
    info.appendChild(link);

    if (isAdmin) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteProject(project.id));
        info.appendChild(deleteBtn);
    }

    card.appendChild(info);
    return card;
}

function renderProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';
    projects.forEach((project) => container.appendChild(buildProjectCard(project)));
}

async function loadProjects() {
    const res = await fetch('/api/projects');
    projects = await res.json();
    renderProjects();
}

async function deleteProject(id) {
    await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadProjects();
}

function updateAdminUI() {
    const addCard = document.getElementById('addCard');
    const signedInAs = document.getElementById('signedInAs');
    const signOutBtn = document.getElementById('signOutBtn');
    const signInBtn = document.getElementById('g_id_signin');

    addCard.style.display = isAdmin ? '' : 'none';
    signOutBtn.style.display = isAdmin ? '' : 'none';
    signInBtn.style.display = isAdmin ? 'none' : '';
    signedInAs.textContent = isAdmin ? `Signed in as ${adminEmail}` : '';
}

let adminEmail = '';

async function refreshSession() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    isAdmin = !!data.isAdmin;
    adminEmail = data.email || '';
    updateAdminUI();
    renderProjects();
}

async function handleGoogleCredential(response) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error === 'not authorized'
            ? 'This Google account is not authorized to manage this site.'
            : 'Sign-in failed.');
        return;
    }

    await refreshSession();
}

async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refreshSession();
}

function initGoogleSignIn() {
    if (!window.google || GOOGLE_CLIENT_ID === 'REPLACE_WITH_GOOGLE_CLIENT_ID') return;

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'medium' }
    );
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('projectName').value;
    const url = document.getElementById('projectUrl').value;

    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
    });

    if (res.ok) {
        document.getElementById('projectName').value = '';
        document.getElementById('projectUrl').value = '';
        await loadProjects();
    } else {
        alert('Could not add project.');
    }
});

document.getElementById('signOutBtn').addEventListener('click', signOut);

document.addEventListener('DOMContentLoaded', async () => {
    displayUUID();
    initGoogleSignIn();
    await refreshSession();
    await loadProjects();
});
