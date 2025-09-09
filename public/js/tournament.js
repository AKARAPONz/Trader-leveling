function openCreateModal() {
  document.getElementById('createModal').style.display = 'block';
}

function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

function openEditModal(id, name, balance, start, end) {
  document.getElementById('editTournamentId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editBalance').value = balance;
  document.getElementById('editStart').value = start.slice(0, 16);
  document.getElementById('editEnd').value = end.slice(0, 16);
  document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
  const createModal = document.getElementById('createModal');
  const editModal = document.getElementById('editModal');
  if (event.target === createModal) {
    closeCreateModal();
  }
  if (event.target === editModal) {
    closeEditModal();
  }
}

function previewChart(symbol) {
  document.getElementById('chart-container').innerHTML = '';
  new TradingView.widget({
    container_id: 'chart-container',
    autosize: true,
    symbol: symbol.replace('/', ''),
    interval: '1',
    timezone: 'Asia/Bangkok',
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
    style: 1,
    locale: 'en',
    toolbar_bg: '#f8fafc',
    enable_publishing: false,
    hide_legend: false,
    allow_symbol_change: true
  });
}

async function loadUserLevelInfo() {
  try {
    const response = await fetch('/api/user-level');
    const data = await response.json();
    
    if (data.success) {
      const levelInfo = data.levelInfo;
      
      // Update level display
      const userLevelElement = document.getElementById('userLevel');
      const userExpElement = document.getElementById('userExp');
      
      if (userLevelElement) userLevelElement.textContent = levelInfo.level;
      if (userExpElement) userExpElement.textContent = levelInfo.exp;
    }
  } catch (error) {
    console.error('Error loading user level info:', error);
  }
}

// Load user level info when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadUserLevelInfo();
  
  // Hide Join buttons for non-REGISTRATION tournaments
  hideJoinButtonsForNonRegistrationTournaments();
  
  // Check tournament join status for all tournaments
  checkAllTournamentStatus();
});

// Hide Join buttons for tournaments that are not in REGISTRATION status
function hideJoinButtonsForNonRegistrationTournaments() {
  const tournamentRows = document.querySelectorAll('tr[data-tournament-id]');
  
  tournamentRows.forEach(row => {
    const tournamentId = row.getAttribute('data-tournament-id');
    const statusCell = row.querySelector('td:nth-child(6)'); // Status column
    
    if (statusCell) {
      const statusText = statusCell.textContent.trim();
      
      // Show Join button only for REGISTRATION and RUNNING status
      if (statusText !== 'REGISTRATION' && statusText !== 'RUNNING') {
        const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
        if (joinBtn) {
          joinBtn.style.display = 'none';
        }
      }
    }
  });
}

// Join Tournament function
async function joinTournament(tournamentId) {
  try {
    const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    
    // Check tournament status first
    const statusResponse = await fetch(`/api/tournament-join/status?tournamentId=${tournamentId}`);
    const statusData = await statusResponse.json();
    
    if (statusData.tournamentStatus && statusData.tournamentStatus !== 'REGISTRATION' && statusData.tournamentStatus !== 'RUNNING') {
      alert(`Cannot join tournament. Tournament is currently ${statusData.tournamentStatus.toLowerCase()}.`);
      return;
    }
    
    // Show loading state
    joinBtn.style.display = 'none';
    statusSpan.style.display = 'inline';
    statusSpan.textContent = 'Joining...';
    statusSpan.className = 'badge badge-warning';
    
    const response = await fetch('/api/tournament-join/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tournamentId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      statusSpan.textContent = 'Applied';
      statusSpan.className = 'badge badge-success';
      alert('Tournament join request submitted successfully!');
    } else {
      statusSpan.textContent = 'Error';
      statusSpan.className = 'badge badge-danger';
      alert('Error: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error joining tournament:', error);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    statusSpan.textContent = 'Error';
    statusSpan.className = 'badge badge-danger';
    alert('Error joining tournament. Please try again.');
  }
}

// Check tournament join status
async function checkTournamentStatus(tournamentId) {
  try {
    const response = await fetch(`/api/tournament-join/status?tournamentId=${tournamentId}`);
    const data = await response.json();
    
    const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    
    // Show Join button only for REGISTRATION and RUNNING status
    if (data.tournamentStatus && data.tournamentStatus !== 'REGISTRATION' && data.tournamentStatus !== 'RUNNING') {
      if (joinBtn) {
        joinBtn.style.display = 'none';
      }
      return;
    }
    
    if (data.success && data.hasApplied) {
      // Show status for all applications, but allow re-join for rejected ones
      if (statusSpan) {
        statusSpan.style.display = 'inline';
        
        switch (data.status) {
          case 'pending':
            statusSpan.textContent = 'Pending';
            statusSpan.className = 'badge badge-warning';
            if (joinBtn) joinBtn.style.display = 'none';
            break;
          case 'accepted':
            statusSpan.textContent = 'Accepted';
            statusSpan.className = 'badge badge-success';
            if (joinBtn) joinBtn.style.display = 'none';
            break;
          case 'rejected':
            statusSpan.textContent = 'Rejected';
            statusSpan.className = 'badge badge-danger';
            // Show Join button for rejected applications so user can re-apply
            if (joinBtn) joinBtn.style.display = 'inline';
            break;
          case 'removed':
            statusSpan.textContent = 'Removed';
            statusSpan.className = 'badge badge-danger';
            // ไม่ให้ join ใหม่ถ้าโดน removed
            if (joinBtn) joinBtn.style.display = 'none';
            break;
        }
      }
    }
  } catch (error) {
    console.error('Error checking tournament status:', error);
  }
}

// Check all tournament statuses
async function checkAllTournamentStatus() {
  const tournamentRows = document.querySelectorAll('tr');
  tournamentRows.forEach(row => {
    const tournamentId = row.getAttribute('data-tournament-id');
    if (tournamentId) {
      checkTournamentStatus(tournamentId);
    }
  });
}

// View tournament requests (admin only)
async function viewRequests(tournamentId) {
  try {
    const modal = document.getElementById('requestsModal');
    const requestsList = document.getElementById('requestsList');
    
    // Store tournament ID in modal dataset
    modal.dataset.tournamentId = tournamentId;
    modal.style.display = 'block';
    requestsList.innerHTML = '<p class="text-muted text-center">Loading requests...</p>';
    
    const response = await fetch(`/api/tournament-join/requests?tournamentId=${tournamentId}`);
    const data = await response.json();
    
    if (data.success) {
      if (data.requests.length === 0) {
        requestsList.innerHTML = '<p class="text-muted text-center">No requests found</p>';
      } else {
        const requestsHtml = data.requests.map(request => `
          <div class="request-item" style="border: 1px solid #e2e8f0; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>${request.userId.name || request.userId.username}</strong>
                <br>
                <small class="text-muted">
                  Level: ${request.userId.level} | EXP: ${request.userId.exp}
                </small>
              </div>
              <span class="badge badge-${getStatusBadgeClass(request.status)}">${request.status.toUpperCase()}</span>
            </div>
            <div class="mb-2">
              <small class="text-muted">
                Applied: ${new Date(request.appliedAt).toLocaleString()}
              </small>
            </div>
            ${request.status === 'pending' ? `
              <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm" onclick="acceptRequest('${request._id}')">
                  <i class="bi bi-check"></i> Accept
                </button>
                <button class="btn btn-danger btn-sm" onclick="rejectRequest('${request._id}')">
                  <i class="bi bi-x"></i> Reject
                </button>
              </div>
            ` : ''}
            ${request.status === 'accepted' ? `
              <div class="d-flex gap-2">
                <button class="btn btn-warning btn-sm" onclick="removeParticipant('${request._id}')">
                  <i class="bi bi-person-x"></i> Remove
                </button>
              </div>
            ` : ''}
          </div>
        `).join('');
        
        requestsList.innerHTML = requestsHtml;
      }
    } else {
      requestsList.innerHTML = '<p class="text-danger text-center">Error loading requests</p>';
    }
    
  } catch (error) {
    console.error('Error viewing requests:', error);
    document.getElementById('requestsList').innerHTML = '<p class="text-danger text-center">Error loading requests</p>';
  }
}

// Accept request
async function acceptRequest(requestId) {
  try {
    const response = await fetch('/api/tournament-join/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Request accepted successfully!');
      // Refresh the requests list
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // Get tournament ID from the current modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('Error: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error accepting request:', error);
    alert('Error accepting request. Please try again.');
  }
}

// Reject request
async function rejectRequest(requestId) {
  try {
    const response = await fetch('/api/tournament-join/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Request rejected successfully!');
      // Refresh the requests list
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // Get tournament ID from the current modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('Error: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error rejecting request:', error);
    alert('Error rejecting request. Please try again.');
  }
}

// Remove participant
async function removeParticipant(requestId) {
  try {
    const response = await fetch('/api/tournament-join/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Participant removed successfully!');
      // Refresh the requests list
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // Get tournament ID from the current modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('Error: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error removing participant:', error);
    alert('Error removing participant. Please try again.');
  }
}

// Close requests modal
function closeRequestsModal() {
  document.getElementById('requestsModal').style.display = 'none';
}

// Get status badge class
function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'danger';
    case 'removed': return 'danger';
    default: return 'secondary';
  }
}

// Get current tournament ID (helper function)
function getCurrentTournamentId() {
  // Try to get tournament ID from the modal or current context
  const modal = document.getElementById('requestsModal');
  if (modal && modal.dataset.tournamentId) {
    return modal.dataset.tournamentId;
  }
  
  // Fallback: try to get from URL or other sources
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tournamentId');
}