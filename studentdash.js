// Function to show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => {
        sec.classList.add('hidden');
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
    }
    if (window.feather) feather.replace();
}

// Function to handle logout
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}


// Function to fetch and display profile info
async function loadProfile() {
    const token = localStorage.getItem('userToken'); 
    if (!token) {
        throw new Error('No authentication token found.');
    }
    
    try {
        const res = await fetch('http://localhost:5000/api/auth/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        const profile = await res.json();
        
        localStorage.setItem('user', JSON.stringify(profile));
        
        document.getElementById('profileName').textContent = profile.name || 'Name not available';
        document.getElementById('profileCourse').textContent = profile.course || 'Course info missing';
        document.getElementById('profileEmail').textContent = profile.email || 'Email not available';
        
        const userCircle = document.querySelector('header div.w-9');
        userCircle.textContent = profile.name ? profile.name.split(' ').map(n => n[0]).join('') : '';
        const userNameSpan = document.querySelector('header span.font-medium');
        userNameSpan.textContent = profile.name || '';

        const achievementsDisplay = document.getElementById('achievementsDisplay');
        achievementsDisplay.innerHTML = '';
        (profile.achievements || []).forEach(a => {
            const li = document.createElement('li');
            li.textContent = a;
            achievementsDisplay.appendChild(li);
        });
        
    } catch (error) {
        console.error("Error in loadProfile:", error);
        throw error;
    }
}

async function loadDashboardStats() {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/student/dashboard-stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard stats');

        const stats = await res.json();

        // Update numbers in HTML
        document.getElementById('totalApplications').textContent = stats.totalApplications;
        document.getElementById('offersReceived').textContent = stats.offersReceived;
        document.getElementById('pendingInterviews').textContent = stats.pendingInterviews;
        document.getElementById('profileCompletion').textContent = stats.profileCompletion + '%';

    } catch (err) {
        console.error(err);
    }
}


//Announcements: Fetch & Display (readonly for Students)
async function loadAnnouncements() {
    try {
        const res = await fetch("http://localhost:5000/api/admin/announcements", {
            headers: { "Authorization": "Bearer " + localStorage.getItem("userToken") }
        });

        if (!res.ok) throw new Error("Failed to fetch announcements");

        const data = await res.json();
        const ul = document.querySelector("#announcements ul");
        ul.innerHTML = "";

        if (data.length === 0) {
            const li = document.createElement("li");
            li.className = "text-gray-500 italic";
            li.textContent = "No announcements yet.";
            ul.appendChild(li);
            return;
        }

        data.forEach(a => {
            const li = document.createElement("li");
            li.className = "bg-white p-3 rounded shadow";
            li.textContent = `${a.message} (${new Date(a.createdAt).toLocaleString()})`;
            ul.appendChild(li);
        });
    } catch (err) {
        console.error("Error loading announcements:", err);
    }
}

//Function to display applications
async function loadApplications() {
    try {
        const res = await fetch('http://localhost:5000/api/student/applications', {
            headers: { 
                Authorization: `Bearer ${localStorage.getItem('userToken')}` 
            }
        });

        // If session expired
        if (res.status === 401) {
            console.warn("Session expired");
            alert("Session expired. Please log in again.");
            localStorage.removeItem("token");
            window.location.href = "/login.html";
            return;
        }

        // Any other server error
        if (!res.ok) {
            let errorText;
            try {
                const errJson = await res.json();
                errorText = errJson.message || "Unexpected server error.";
            } catch {
                errorText = await res.text();
            }
            throw new Error(errorText);
        }

        // Parse JSON safely
        const applications = await res.json();
        console.log("Applications fetched:", applications);

        localStorage.setItem('applications', JSON.stringify(applications));
        updateApplicationsTable(applications);
    } catch (error) {
        console.error("Error in loadApplications:", error.message);
    }
}

// Load internships dynamically from backend
async function loadInternships() {
    const token = localStorage.getItem('userToken'); 
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5000/api/student/internships', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) {
            throw new Error('Failed to load internships');
        }
        const internships = await res.json();
        renderInternshipCards(internships);
    } catch (err) {
        console.error('Error loading internships:', err);
    }
}

// Function to handle internship application
async function applyForInternship(id) {
    const token = localStorage.getItem('userToken'); 
    if (!token) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`http://localhost:5000/api/student/internships/${id}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ internshipId: id })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            closeModal();
            try{
                await loadApplications();
            } catch(e) {
                console.warn('Could not reload applications after applying',e);
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error applying for internship:', error);
        alert('An error occurred. Please try again.');
    }
}

//deleteApplication function
async function deleteApplication(applicationId) {
    const token = localStorage.getItem('userToken'); 
    if (!token) return alert('Please login first.');

    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
        const res = await fetch(`http://localhost:5000/api/student/applications/${applicationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Application deleted successfully!');
            await loadApplications();
        } else {
            alert(data.message || 'Failed to delete application.');
        }
    } catch (err) {
        console.error('Error deleting application:', err);
        alert('Server error while deleting application.');
    }
}

// Resume upload
async function uploadStudentResume(event, applicationId, inputId) {
    event.preventDefault();
    const fileInput = document.getElementById(inputId);
    if (!fileInput || fileInput.files.length === 0) {
        alert('Please select a file before uploading.');
        return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('resume', file);
    const token = localStorage.getItem('userToken'); 
    if (!token) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:5000/api/student/applications/${applicationId}/resume`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData 
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to upload resume');
        }

        alert('Resume uploaded successfully!');

        // Optionally update button text to "View" immediately
        const viewBtn = document.getElementById(`viewResume-${applicationId}`);
        if (viewBtn) viewBtn.textContent = 'View';

    } catch (err) {
        console.error('Error during upload:', err.message);
        alert(err.message);
    }
}

// Internship card rendering
function renderInternshipCards(internships) {
    const container = document.getElementById('internshipsContainer');
    if (!container) return;
    container.innerHTML = '';

    internships.forEach(internship => {
        const title = internship.title || "Internship";
        const company = internship.company 
            ? (typeof internship.company === 'string' ? internship.company : internship.company.name || 'Company') 
            : 'Company';
        const deadlineDate = internship.deadline ? new Date(internship.deadline).toLocaleDateString() : "No deadline";
        const stipend = internship.stipend !== undefined && internship.stipend !== null ? internship.stipend.toString() : 'Not specified';
        const description = internship.description || '';

        const card = document.createElement('div');
        card.className = 'bg-white shadow-md rounded-xl p-6 w-full transform transition-transform duration-300 hover:scale-105 hover:shadow-lg flex flex-col justify-between';

        card.innerHTML = `
            <h4 class="text-lg font-medium text-blue-700 break-words max-w-xs truncate">
                ${title}${company ? ` - ${company}` : ""}
            </h4>
            <p class="text-sm text-gray-500 mt-2 mb-4">Apply by: ${deadlineDate}</p>
            <div class="mt-4 flex justify-end">
                <button class="px-5 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 transition duration-300">
                    View Details
                </button>
            </div>
        `;

        const button = card.querySelector('button');
        button.addEventListener('click', () => {
            openModal(
                internship._id,
                title,
                description,
                stipend,
                internship.location || '',
                internship.deadline,
                company
            );
        });

        container.appendChild(card);
    });
}

// Update applications table
const statusColors = {
  'Applied': 'bg-gray-300 text-gray-800',
  'Pending': 'bg-blue-300 text-blue-800',
  'Shortlisted': 'bg-yellow-300 text-yellow-800',
  'Accepted': 'bg-green-300 text-green-800',
  'Rejected': 'bg-red-300 text-red-800',
};

function updateApplicationsTable(applications) {
  const tableBody = document.getElementById('applicationsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  applications.forEach((app, i) => {
    try {
      const resumeExists = app.resumePath && app.resumePath !== '';
      const viewButtonHtml = resumeExists
        ? `<button 
            id="viewResume-${app._id}" 
            onclick="viewResume('${app._id}')" 
            class="px-2 py-1 bg-blue-600 text-white rounded">
            View
            </button>`
        : `<button 
            id="viewResume-${app._id}" 
            onclick="event.preventDefault(); alert('No resume uploaded yet')" 
            class="px-2 py-1 bg-gray-400 text-white rounded cursor-not-allowed">
            No resume
            </button>`;

      const statusClass = statusColors[app.status] || 'bg-gray-300 text-gray-800';

      // Safer date conversion
      let appliedDate = 'N/A';
      if (app.appliedOn) {
        const parsed = new Date(app.appliedOn);
        appliedDate = isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2">${app.internshipTitle || 'N/A'}</td>
        <td class="px-4 py-2">${app.companyName || 'N/A'}</td>
        <td class="px-4 py-2">
          <span class="px-2 py-1 rounded-full font-semibold ${statusClass}">
            ${app.status || 'N/A'}
          </span>
        </td>
        <td class="px-4 py-2">${appliedDate}</td>
        <td class="px-4 py-2 flex items-center gap-2">
          ${viewButtonHtml}
          <input type="file" id="resume${i}" accept=".pdf,.doc,.docx"/>
          <button type="button"
            onclick="uploadStudentResume(event, '${app._id}', 'resume${i}')"
            class="px-2 py-1 bg-blue-600 text-white rounded">
            Upload
          </button>
        </td>
        <td class="px-4 py-2">
          <button type="button"
            onclick="deleteApplication('${app._id}')"
            class="px-2 py-1 bg-red-600 text-white rounded">
            Delete
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    } catch (err) {
      console.error("Error rendering row for application:", app, err);
    }
  });
}

function renderCompanyNotes(applications) {
  const notesContainer = document.getElementById('companyNotesContainer');
  if (!notesContainer) return;
  notesContainer.innerHTML = '';

  applications.forEach(app => {
    try {
      const notes = typeof app.companyNotes === 'string' ? app.companyNotes.trim() : '';
      if (notes !== '') {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'my-2 p-3 bg-gray-100 rounded shadow-sm';
        noteDiv.innerHTML = `
          <strong>Internship:</strong> ${app.internshipTitle || 'N/A'} <br/>
          <strong>Company:</strong> ${app.companyName || 'N/A'} <br/>
          <strong>Status:</strong> ${app.status || 'N/A'} <br/>
          <div class="mt-1 font-semibold">Notes:</div> 
          <div>${notes}</div>
        `;
        notesContainer.appendChild(noteDiv);
      }
    } catch (err) {
      console.error("Error rendering notes for application:", app, err);
    }
  });
}

// Modal functions
function openModal(id, title, description, stipend, location, deadline, company) {
    document.getElementById('modalTitle').innerText = `${title} - ${company || ''}`;
    document.getElementById('modalDescription').innerText = description || 'No description provided';
    document.getElementById('modalStipend').innerText = stipend || 'Not specified';
    document.getElementById('modalLocation').innerText = location || 'No location specified';
    
    let deadlineText = 'No deadline specified';
    if (deadline) {
        const dateObj = new Date(deadline);
        if (!isNaN(dateObj)) deadlineText = dateObj.toLocaleDateString();
    }
    document.getElementById('modalDeadline').innerText = deadlineText;
    
    const modal = document.getElementById('internModal');
    modal.classList.remove('hidden');

    if (window.feather) feather.replace();

    const applyBtn = document.getElementById('applyBtn');
    applyBtn.onclick = function() {
        applyForInternship(id);
    };
}

function closeModal() {
    const modal = document.getElementById('internModal');
    modal.classList.add('hidden');
}

// Function to view student's uploaded resume
function viewResume(applicationId) {
    const token = localStorage.getItem('userToken');
    if (!token) {
        alert('Please login first!');
        window.location.href = 'login.html';
        return;
    }

    const url = `http://localhost:5000/api/student/applications/${applicationId}/resume`;

    fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch resume');
        return response.blob();
    })
    .then(blob => {
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
    })
    .catch(err => {
        console.error('Error fetching resume:', err);
        alert('Could not load resume. Make sure a file is uploaded.');
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('userToken'); 
    if (!token) {
        alert('Session expired. Please login again.');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        await loadProfile();
        await loadDashboardStats();
        await loadInternships();
        await loadApplications();
        await loadAnnouncements();

        updateDashboardDynamicContent(); // dynamically fills welcome, stats, recent apps, top internships, announcements

        showSection('dashboard');
        
    } catch (error) {
        console.error('Error during dashboard initialization:', error);
        alert('Could not load dashboard data. Please log in again.');
        localStorage.clear();
        window.location.href = 'login.html';
    }

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', function() {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        });

        // Clicking the overlay hides sidebar and overlay
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        });
    }

    // Get elements
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editCourse = document.getElementById('editCourse');
    const achievementsList = document.getElementById('achievements-list');
    const achievementsDisplay = document.getElementById('achievementsDisplay');
    const addAchievementBtn = document.getElementById('addAchievementBtn');

    // Open modal and prefill fields
    editProfileBtn.addEventListener('click', () => {
        // Prefill form with current profile values
        editName.value = document.getElementById('profileName').innerText.trim();
        editEmail.value = document.getElementById('profileEmail').innerText.replace('Email: ', '').trim();
        editCourse.value = document.getElementById('profileCourse').innerText.replace('—', '').trim();

        // Prefill achievements
        const existingAchievements = Array.from(achievementsDisplay.querySelectorAll('li')).map(li => li.textContent);
        achievementsList.innerHTML = ''; // clear current fields

        if (existingAchievements.length > 0) {
            existingAchievements.forEach(a => {
                const input = document.createElement('input');
                input.type = 'text';
                input.name = 'achievements[]';
                input.value = a;
                input.placeholder = 'Enter achievement';
                input.className = 'w-full border p-2 rounded mb-2';
                achievementsList.appendChild(input);
            });
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = 'achievements[]';
            input.placeholder = 'Enter achievement';
            input.className = 'w-full border p-2 rounded mb-2';
            achievementsList.appendChild(input);
        }

        // Show modal
        editProfileModal.classList.remove('hidden');
    });

    // Close modal function
    function closeEditModal() {
        editProfileModal.classList.add('hidden');
    }

    //  Add more achievement fields dynamically 
    addAchievementBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'achievements[]';
        input.placeholder = 'Enter another achievement';
        input.className = 'w-full border p-2 rounded mb-2';
        achievementsList.appendChild(input);
    }); 

    // Handle form submission
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const achievementInputs = document.querySelectorAll('input[name="achievements[]"]');
        const achievements = Array.from(achievementInputs)
                              .map(input => input.value.trim())
                              .filter(a => a); // remove empty entries

        const updatedData = {
            name: editName.value,
            email: editEmail.value,
            course: editCourse.value,
            achievements: achievements
        };

        const token = localStorage.getItem('userToken');

        try {
            const res = await fetch('http://localhost:5000/api/student/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            const data = await res.json();

            if (res.ok) {
                // Update profile card
                document.getElementById('profileName').innerText = updatedData.name;
                document.getElementById('profileEmail').innerText = 'Email: ' + updatedData.email;
                document.getElementById('profileCourse').innerText = updatedData.course || '—';

                achievementsDisplay.innerHTML = ''; // clear old list
                updatedData.achievements.forEach(a => {
                    const li = document.createElement('li');
                    li.textContent = a;
                    achievementsDisplay.appendChild(li);
                });

                closeEditModal();
                alert('Profile updated successfully!');
            } else {
                alert(data.message || 'Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            alert('Server error. Try again later.');
        }
    });


    function updateDashboardDynamicContent() {
    const profile = JSON.parse(localStorage.getItem('user')) || {};
    const applications = JSON.parse(localStorage.getItem('applications')) || [];
    const internships = JSON.parse(localStorage.getItem('internships')) || [];
    const announcements = JSON.parse(localStorage.getItem('announcements')) || [];

    // Dashboard Welcome Card
    const welcomeCardName = document.getElementById('welcomeCardName');
    if (welcomeCardName) welcomeCardName.textContent = profile.name || 'Student';

    // Sidebar / Header
    const userNameElem = document.querySelector('header span.font-medium');
    const userCircleElem = document.querySelector('header div.w-9');

    if (userNameElem) userNameElem.textContent = profile.name || 'John Doe';
    if (userCircleElem) userCircleElem.textContent = profile.name 
        ? profile.name.split(' ').map(n => n[0]).join('') 
        : 'S';

    // Profile Completion Bar
    const profileCompletion = profile.profileCompletion ?? 100;
    const progressBar = document.getElementById('profileProgressBar');
    if (progressBar) progressBar.style.width = profileCompletion + '%';
    const profileCompletionText = document.getElementById('profileCompletion');
    if (profileCompletionText) profileCompletionText.textContent = profileCompletion + '%';

    // Dashboard Stats
    const totalApplicationsElem = document.getElementById('totalApplications');
    const offersReceivedElem = document.getElementById('offersReceived');
    const pendingInterviewsElem = document.getElementById('pendingInterviews');

    if (totalApplicationsElem) totalApplicationsElem.textContent = applications.length;
    if (offersReceivedElem) offersReceivedElem.textContent = applications.filter(a => a.status === 'Accepted' || a.status === 'Offered').length;
    if (pendingInterviewsElem) pendingInterviewsElem.textContent = applications.filter(a => a.status === 'Pending' || a.status === 'Interview').length;

    // Latest Announcements
    const dashAnnouncements = document.getElementById('dashboardAnnouncements');
    if(dashAnnouncements){
        dashAnnouncements.innerHTML = '';
        announcements.slice(0,3).forEach(a => {
            const li = document.createElement('li');
            li.className = 'bg-white p-3 rounded shadow cursor-pointer hover:bg-blue-50';
            li.textContent = `${a.message} (${new Date(a.createdAt).toLocaleDateString()})`;
            dashAnnouncements.appendChild(li);
        });
    }
}

});