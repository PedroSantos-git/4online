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

let projects = JSON.parse(localStorage.getItem('projects')) || [];

function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

function renderProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';

    projects.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'project-card';

        card.innerHTML = `
            <iframe class="project-preview" src="${project.url}" sandbox="allow-scripts allow-same-origin"></iframe>
            <div class="project-info">
                <h3>${project.name}</h3>
                <a href="${project.url}" target="_blank">${project.url}</a>
                <button class="delete-btn" data-index="${index}">Excluir</button>
            </div>
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            projects.splice(index, 1);
            saveProjects();
            renderProjects();
        });
    });
}

document.getElementById('projectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('projectName').value;
    const url = document.getElementById('projectUrl').value;

    projects.push({ name, url });
    saveProjects();
    renderProjects();

    document.getElementById('projectName').value = '';
    document.getElementById('projectUrl').value = '';
});

document.addEventListener('DOMContentLoaded', () => {
    displayUUID();
    renderProjects();
});