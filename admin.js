// ===== REPORT CHART INSTANCES =====
let companyChartInstance = null;  
let applicationChartInstance = null; 

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
}

// This function handles showing/hiding different dashboard sections.
function showSection(sectionId) {
    document.querySelectorAll('main section').forEach(sec => {
        sec.classList.add('hidden');
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden'); 
    }
}

// Function to handle logout, clearing local storage and redirecting.
function logout() {
    localStorage.removeItem('userToken'); 
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}


// Function to fetch and display dashboard counts from the backend.
async function loadDashboardCounts() {
    const token = localStorage.getItem('userToken'); 
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/admin/dashboard-counts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('studentCount').textContent = data.studentCount || 0;
            document.getElementById('companyCount').textContent = data.companyCount || 0;
            document.getElementById('internshipCount').textContent = data.internshipCount || 0;
            document.getElementById('applicationCount').textContent = data.applicationCount || 0; 
        } else {
            console.error('Failed to load dashboard counts:', data.message);
        }
    } catch (err) {
        console.error('Error fetching dashboard counts:', err);
    }
}

let currentUsersData = [];
let currentInternshipsData = [];
let currentApplicationsData = [];

// Function to fetch and display users from the backend.
async function loadUsers() {
    const token = localStorage.getItem('userToken'); 
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const users = await res.json();

        if (res.ok) {
            currentUsersData = users; 
            renderUsersTable(users);
        } else {
            console.error('Failed to load users: ', users.message);
        }
    } catch (err) {
        console.error('Error fetching users:', err);
    }
}

// Function to render the users table with dynamic data.
function renderUsersTable(users) {
  const tableBody = document.getElementById('usersTableBody');
  tableBody.innerHTML = '';
  users.forEach(user => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 leading-tight';
    row.innerHTML = `
      <td class="py-1 px-3">${user.name}</td>
      <td class="py-1 px-3">${user.email}</td>
      <td class="py-1 px-3">${user.role}</td>
      <td class="py-1 px-3">
        <span class="${user.isBlocked ? 'text-red-600' : 'text-green-600'} font-medium">
          ${user.isBlocked ? 'Blocked' : 'Active'}
        </span>
      </td>
      <td class="py-1 px-3 flex justify-center items-center">
        <button data-user-id="${user._id}" data-is-blocked="${user.isBlocked}"
          class="px-3 py-1 rounded text-white font-semibold ${user.isBlocked ? 'bg-green-500' : 'bg-red-500'} toggle-block-btn">
          ${user.isBlocked ? 'Unblock' : 'Block'}
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });

    // Add the event listener to the buttons after they are created.
    document.querySelectorAll('.toggle-block-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            const isBlocked = e.target.textContent === 'Unblock';
            if (!confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) return;

            try {
                const token = localStorage.getItem('userToken');
                const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/toggle-block`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    loadUsers();
                } else alert(`Error: ${data.message}`);
            } catch (err) {
                console.error(err);
                alert('An error occurred. Try again.');
            }
        });
    });
}

// Load Internships
async function loadInternships() {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/admin/internships', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const internships = await res.json();
        if (res.ok) {
           currentInternshipsData = internships; // *** MODIFIED *** store live data
           renderInternshipsTable(internships);
        }
        else console.error('Failed to load internships:', internships.message);
    } catch (err) {
        console.error('Error fetching internships:', err);
    }
}

// Render Internships Table
function renderInternshipsTable(internships) {
  const tableBody = document.getElementById('internshipsTableBody');
  tableBody.innerHTML = '';
  internships.forEach(internship => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 leading-tight';
    row.innerHTML = `
      <td class="py-1 px-3">${internship.title || 'N/A'}</td>
      <td class="py-1 px-3">${internship.companyName || 'N/A'}</td>
      <td class="py-1 px-3">${internship.postedOn ? new Date(internship.postedOn).toLocaleDateString() : 'N/A'}</td>
      <td class="py-1 px-3">
        <span class="${internship.status === 'Approved' ? 'text-green-600' :
                     internship.status === 'Rejected' ? 'text-red-600' : 'text-yellow-600'} font-medium">
          ${internship.status}
        </span>
      </td>
      <td class="py-1 px-3 flex space-x-2 justify-center">
        ${internship.status === 'Pending'
          ? `<button class="px-3 py-1 bg-green-500 text-white rounded font-semibold" onclick="updateInternshipStatus('${internship._id}', 'Approved')">Approve</button>
             <button class="px-3 py-1 bg-red-500 text-white rounded font-semibold" onclick="updateInternshipStatus('${internship._id}', 'Rejected')">Reject</button>`
          : `<button class="px-3 py-1 bg-gray-400 text-white rounded font-semibold view-internship-btn" data-id="${internship._id}">View</button>`
        }
      </td>
    `;
    tableBody.appendChild(row);
  });
  attachViewButtonsHandler();
}

function attachViewButtonsHandler() {
  document.querySelectorAll('.view-internship-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const internshipId = btn.getAttribute('data-id');
      const modal = document.getElementById('internshipModal');
      const modalTitle = document.getElementById('modalTitle');
      const modalContent = document.getElementById('modalContent');

      try {
        const token = localStorage.getItem('userToken');
        const res = await fetch(`http://localhost:5000/api/admin/internships/${internshipId}`,{
                headers: {
                        'Authorization': `Bearer ${token}`
                }
        });
        if (!res.ok) throw new Error('Failed to fetch internship details');

        const internship = await res.json();

        modalTitle.textContent = internship.title;
        modalContent.innerHTML = `
          <p><strong>Company:</strong> ${internship.companyName || 'N/A'}</p>
          <p><strong>Posted By:</strong> ${internship.postedBy || 'N/A'}</p>
          <p><strong>Status:</strong> ${internship.status || 'N/A'}</p>
          <p><strong>Description:</strong> ${internship.description || 'No description'}</p>
          <p><strong>Location:</strong> ${internship.location || 'N/A'}</p>
          <p><strong>Stipend:</strong> ${internship.stipend || 'N/A'}</p>
          <p><strong>Deadline:</strong> ${new Date(internship.deadline).toLocaleDateString() || 'N/A'}</p>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('internshipModalClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('internshipModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }
});

// Update Internship Status
async function updateInternshipStatus(id, status) {
    const token = localStorage.getItem('userToken');
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this internship?`)) return;

    try {
        const res = await fetch(`http://localhost:5000/api/admin/internships/${id}/status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            loadInternships();
        } else alert(`Error: ${data.message}`);
    } catch (err) {
        console.error(err);
        alert('An error occurred. Try again.');
    }
}

// Load Applications
async function loadApplications() {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/admin/applications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const applications = await res.json();
        if (res.ok) {
           currentApplicationsData = applications; 
           renderApplicationsTable(applications);
        }
        else console.error('Failed to load applications:', applications.message);
    } catch (err) {
        console.error('Error fetching applications:', err);
    }
}

// Modify getDataForType to use the live data variable
function getDataForType(type) {
    switch (type) {
        case 'applications':
            return currentApplicationsData.map(app => ({
                Student: app.studentName,
                Internship: app.internshipTitle,
                Company: app.companyName,
                Status: app.status,
            }));
        case 'internships':
            return currentInternshipsData.map(intnshp => ({
                Title: intnshp.title,
                Company: intnshp.companyName,
                Status: intnshp.status,
            }));
        case 'users':
            return currentUsersData.map(user => ({
                Name: user.name,
                Email: user.email,
                Role: user.role,
                Status: user.isBlocked ? "Blocked" : "Active",
            }));
        default:
            return [];
    }
}

// Render Applications Table
function renderApplicationsTable(applications) {
    const tableBody = document.getElementById('applicationsTableBody');
    tableBody.innerHTML = '';
    applications.forEach(app => {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-200 leading-tight';
    row.innerHTML = `
            <td class="py-1 px-3">${app.studentName}</td>
            <td class="py-1 px-3">${app.internshipTitle}</td>
            <td class="py-1 px-3">${app.companyName}</td>
            <td class="py-1 px-3 ${getApplicationStatusColor(app.status)} font-medium text-center">${app.status}</td>
            <td>
                    <button class="text-blue-600 hover:underline" onclick="viewSingleApplication('${app._id}')">View/Edit</button>
            </td>
    `;
    tableBody.appendChild(row);
    });
}

// Helper to assign colors based on status
function getApplicationStatusColor(status){
    switch (status) {
            case 'Under Review': return 'text-yellow-600';
            case 'Selected': return 'text-green-600';
            case 'Rejected': return 'text-red-600';
            default: return 'text-gray-600';
    }
}

function exportCSV(type) {
    const data = getDataForType(type);
    if (!data.length) {
        alert('No data available for export.');
        return;
    }
    const csvContent = convertToCSV(data);
    downloadFile(csvContent, `${type}.csv`, 'text/csv;charset=utf-8;');
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
         headers.map(fieldName => `"${(row[fieldName] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );
        return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportPDF(type) {
    if (typeof window.jspdf === 'undefined') {
        alert('PDF export library not loaded.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const data = getDataForType(type);
    doc.text(`${type} Report`, 10, 10);
    let y = 20;
    if (!data.length) {
        doc.text('No data available', 10, y);
    } else {
        const headers = Object.keys(data[0]);
        doc.text(headers.join(' | '), 10, y);
        y += 10;
        data.forEach(row => {
            doc.text(headers.map(h => (row[h]??'')).join(' | '), 10, y);
            y += 10;
        });
     }
     doc.save(`${type}.pdf`);
}

let currentlyViewedApplicationId = null;

// Fetch and show single application in modal
async function viewSingleApplication(appId) {
        console.log('viewSingleApplication called with:',appId);
        const token = localStorage.getItem('userToken');
        try {
                const res = await fetch(`http://localhost:5000/api/admin/applications/${appId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('fetch response status:', res.status);

        if (!res.ok) throw new Error('Failed to fetch application details');

        const app = await res.json();
        console.log('application data:',app);

        // Populate modal or detail UI fields - adjust IDs as per your admin modal HTML
        document.getElementById('modalStudentName').innerText = app.student?.name || 'N/A';
        document.getElementById('modalInternship').innerText = app.internship?.title || 'N/A';
        document.getElementById('modalAppliedDate').innerText = new Date(app.createdAt).toLocaleDateString();
        document.getElementById('modalStatusSelect').value = app.status || 'Pending';

        if (document.getElementById('companyNotes')) {
                document.getElementById('companyNotes').value = app.companyNotes || '';
        }

        currentlyViewedApplicationId = appId;

        // Show the modal
        const modal = document.getElementById('appModal');
        console.log('Modal element: ', modal);
        modal.classList.remove('hidden');
        modal.classList.add('flex');  
        console.log('modal classes after toggle:', modal.className);

        } catch (err) {
                console.error(err);
                alert('Failed to load application details.');
        }
}

//load all announcements
async function loadAnnouncements() {
  try{
    const res = await fetch("http://localhost:5000/api/admin/announcements", {
      headers: {"Authorization": "Bearer " + localStorage.getItem("userToken") }
    });

    if(!res.ok) throw new Error("Failed to fetch announcements");

    const data = await res.json();
    const ul= document.querySelector('#announcementsList');
    ul.innerHTML= "";

    if(data.length === 0) {
      const li = document.createElement("li");
      li.className = "text-gray-500 italic";
      li.textContent = "No announcements yet.";
      ul.appendChild(li);
      return;
    }

    data.forEach(a=>{
      const li = document.createElement("li");
      li.className = "bg-white p-3 rounded shadow";
      li.textContent = `${a.message} (${new Date(a.createdAt).toLocaleDateString()})`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading announcements:",err);
  }
}

//Send new announcement
async function sendAnnouncement() {
    const textarea = document.querySelector("#announcements textarea");
    const message = textarea.value.trim();

    if (!message) {
        alert("Please write something before sending!");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/admin/announcements", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("userToken")
            },
            body: JSON.stringify({ message })
        });

        if (res.ok) {
            textarea.value = "";
            loadAnnouncements(); // refresh list
        } else {
            const errorData = await res.json();
            alert(errorData.error || "Failed to send announcement");
        }
    } catch (err) {
        console.error("Error sending announcement:", err);
    }
}

// Initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('userToken'); 
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user || user.role !== 'admin') {
        alert('Access denied. Please log in as an administrator.');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    // Sidebar navigation
    document.querySelectorAll('#sidebar button').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            if (sectionId) {
                showSection(sectionId);
                if (sectionId === 'dashboard') loadDashboardCounts();
                if (sectionId === 'users') loadUsers();
                if (sectionId === 'applications') loadApplications();
                if (sectionId === 'internships') loadInternships();
                if (sectionId === 'reports') renderReportsCharts();
            }
        });
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Modal open/close handlers 
    const appModal = document.getElementById('appModal');
    const appModalClose = document.getElementById('appModalClose');
    const appModalCancelBtn = document.getElementById('appModalCancelBtn');

    if (appModalClose) {
      appModalClose.addEventListener('click', () => {
        appModal.classList.add('hidden');
        appModal.classList.remove('flex');

      });
    }

    if (appModalCancelBtn) {
      appModalCancelBtn.addEventListener('click', () => {
        appModal.classList.add('hidden');
        appModal.classList.remove('flex');

      });
    }

    if (appModal) {
      appModal.addEventListener('click', (e) => {
        if (e.target === appModal) {
                appModal.classList.add('hidden');
                appModal.classList.remove('flex');

        }
      });
    }

    // Save button handler
    const appModalSaveBtn = document.getElementById('appModalSaveBtn');
    if (appModalSaveBtn) {
      appModalSaveBtn.addEventListener('click', async () => {
        const statusSelect = document.getElementById('modalStatusSelect');
        const companyNotesTextarea = document.getElementById('companyNotes');
        if (!currentlyViewedApplicationId) {
          alert('No application selected.');
          return;
        }

        const updatedStatus = statusSelect ? statusSelect.value : null;
        const updatedNotes = companyNotesTextarea ? companyNotesTextarea.value : '';

        try {
          const token = localStorage.getItem('userToken');
          const res = await fetch(`http://localhost:5000/api/admin/applications/${currentlyViewedApplicationId}/update`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: updatedStatus,
              companyNotes: updatedNotes
            })
          });

          const data = await res.json();
          if (res.ok) {
            alert('Application updated successfully.');
            appModal.classList.add('hidden');
            loadApplications(); // Refresh the table to show updated data
          } else {
            alert(`Update failed: ${data.message}`);
          }
        } catch (err) {
          console.error(err);
          alert('Error updating application.');
        }
      });
    }

    //announcement 
    const sendBtn = document.querySelector("#announcements button");
    if(sendBtn) {
      sendBtn.addEventListener("click", sendAnnouncement);
    }
    

    // Initial load
    showSection('dashboard');
    loadDashboardCounts();

    // ===== Add Admin JS =====
    const addAdminForm = document.getElementById('addAdminForm');

if (addAdminForm) {
    addAdminForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('newAdminName').value.trim();
        const email = document.getElementById('newAdminEmail').value.trim();
        const password = document.getElementById('newAdminPassword').value.trim();
        const messageEl = document.getElementById('addAdminMessage');
        const submitBtn = this.querySelector('button[type="submit"]');

        // Validate fields
        if (!name) {
            messageEl.textContent = 'Please enter a name.';
            messageEl.classList.remove('text-green-600');
            messageEl.classList.add('text-red-500');
            return;
        }
        if (!email) {
            messageEl.textContent = 'Please enter an email.';
            messageEl.classList.remove('text-green-600');
            messageEl.classList.add('text-red-500');
            return;
        }
        if (!password) {
            messageEl.textContent = 'Please enter a password.';
            messageEl.classList.remove('text-green-600');
            messageEl.classList.add('text-red-500');
            return;
        }

        // Get token
        const token = localStorage.getItem('userToken');
        if (!token) {
            alert('You are not logged in or your session expired.');
            window.location.href = 'login.html';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        messageEl.textContent = '';

        try {
            const response = await fetch('http://localhost:5000/api/admin/add-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                messageEl.textContent = `✅ Admin added successfully!`;
                messageEl.classList.remove('text-red-500');
                messageEl.classList.add('text-green-600');
                // Clear inputs
                document.getElementById('newAdminName').value = '';
                document.getElementById('newAdminEmail').value = '';
                document.getElementById('newAdminPassword').value = '';
            } else {
                messageEl.textContent = `❌ ${data.message || 'Error adding admin'}`;
                messageEl.classList.remove('text-green-600');
                messageEl.classList.add('text-red-500');
            }
        } catch (err) {
            console.error('Error:', err);
            messageEl.textContent = '❌ Server error. Check console.';
            messageEl.classList.remove('text-green-600');
            messageEl.classList.add('text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add admin';
        }
    });
}

// Chart 1: Company-wise Offers
  const companyCtx = document.getElementById('companyChart').getContext('2d');
  const companyChart = new Chart(companyCtx, {
    type: 'bar',
    data: {
      labels: ['Google', 'TCS', 'Wipro', 'Infosys', 'Microsoft'],
      datasets: [{
        label: 'Offers',
        data: [25, 40, 30, 20, 15],
        backgroundColor: ['#3B82F6', '#10B981', '#FBBF24', '#8B5CF6', '#EF4444'],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Chart 2: Applications Trend
  const trendCtx = document.getElementById('applicationTrendChart').getContext('2d');
  const applicationTrendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Applications',
        data: [100, 150, 200, 250, 300, 400],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // ===== RENDER REPORTS CHARTS =====
async function renderReportsCharts() {
    const token = localStorage.getItem('userToken');

    try {
        // -------- Chart 1: Company-wise offers --------
        const companyRes = await fetch('http://localhost:5000/api/admin/reports/company-offers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const companyData = await companyRes.json();

        if (!Array.isArray(companyData)) throw new Error('Invalid company data');

        const companyLabels = companyData.map(c => c._id || 'Unknown');
        const companyCounts = companyData.map(c => c.count || 0);

        // Destroy previous instance if exists
        if (companyChartInstance) companyChartInstance.destroy();

        companyChartInstance = new Chart(document.getElementById('reportsCompanyChart'), {
            type: 'bar',
            data: {
                labels: companyLabels,
                datasets: [{
                    label: 'Selected Offers',
                    data: companyCounts,
                    backgroundColor: 'rgba(99,102,241,0.7)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Company-wise Selected Offers' }
                }
            }
        });

        // -------- Chart 2: Applications Trend --------
        const trendRes = await fetch('http://localhost:5000/api/admin/reports/applications-trend', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const trendData = await trendRes.json();

        if (!Array.isArray(trendData)) throw new Error('Invalid trend data');

        const trendLabels = trendData.map(t => t.month);
        const trendCounts = trendData.map(t => t.count);


        // Destroy previous instance if exists
        if (applicationChartInstance) applicationChartInstance.destroy();

        applicationChartInstance = new Chart(document.getElementById('reportsApplicationChart'), {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Applications',
                    data: trendCounts,
                    borderColor: 'rgba(16,185,129,1)',
                    fill: false,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'Applications Trend per Month' }
                }
            }
        });

    } catch (err) {
        console.error('Error rendering reports charts:', err);
    }
}

});
