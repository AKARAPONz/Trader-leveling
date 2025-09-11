// เปิด modal สร้าง Tournament
function openCreateModal() {
  document.getElementById('createModal').style.display = 'block';
}

// ปิด modal สร้าง Tournament
function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

// เปิด modal แก้ไข Tournament
function openEditModal(id, name, balance, start, end) {
  document.getElementById('editTournamentId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editBalance').value = balance;
  document.getElementById('editStart').value = start.slice(0, 16);
  document.getElementById('editEnd').value = end.slice(0, 16);
  document.getElementById('editModal').style.display = 'block';
}

// ปิด modal แก้ไข Tournament
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

// ปิด modal เมื่อคลิกข้างนอก
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

// แสดงกราฟ TradingView
function previewChart(symbol) {
  document.getElementById('chart-container').innerHTML = '';
  new TradingView.widget({
    container_id: 'chart-container',
    autosize: true,
    symbol: symbol.replace('/', ''),
    interval: '1',
    timezone: 'Asia/Bangkok',
    style: 1,
    locale: 'en',
    toolbar_bg: '#f8fafc',
    enable_publishing: false,
    hide_legend: false,
    allow_symbol_change: true
  });
}

// โหลดข้อมูล Level ของผู้ใช้
async function loadUserLevelInfo() {
  try {
    const response = await fetch('/api/user-level');
    const data = await response.json();
    
    if (data.success) {
      const levelInfo = data.levelInfo;
      
      // อัปเดตแสดงผล Level และ EXP
      const userLevelElement = document.getElementById('userLevel');
      const userExpElement = document.getElementById('userExp');
      
      if (userLevelElement) userLevelElement.textContent = levelInfo.level;
      if (userExpElement) userExpElement.textContent = levelInfo.exp;
    }
  } catch (error) {
    console.error('Error loading user level info:', error);
  }
}

// โหลดข้อมูล Level เมื่อหน้าเว็บโหลด
document.addEventListener('DOMContentLoaded', function() {
  loadUserLevelInfo();
  
  // ซ่อนปุ่ม Join สำหรับ Tournament ที่ไม่ใช่สถานะ REGISTRATION หรือ RUNNING
  hideJoinButtonsForNonRegistrationTournaments();
  
  // ตรวจสอบสถานะการเข้าร่วม Tournament สำหรับทุก Tournament
  checkAllTournamentStatus();
});

// ซ่อนปุ่ม Join สำหรับ Tournament ที่ไม่ใช่สถานะ REGISTRATION หรือ RUNNING
function hideJoinButtonsForNonRegistrationTournaments() {
  const tournamentRows = document.querySelectorAll('tr[data-tournament-id]');
  
  tournamentRows.forEach(row => {
    const tournamentId = row.getAttribute('data-tournament-id');
    const statusCell = row.querySelector('td:nth-child(6)'); // คอลัมน์สถานะ
    
    if (statusCell) {
      const statusText = statusCell.textContent.trim();
      
      // แสดงปุ่ม Join เฉพาะ REGISTRATION และ RUNNING
      if (statusText !== 'REGISTRATION' && statusText !== 'RUNNING') {
        const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
        if (joinBtn) {
          joinBtn.style.display = 'none';
        }
      }
    }
  });
}

// ฟังก์ชัน Join Tournament
async function joinTournament(tournamentId) {
  try {
    const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    
    // ตรวจสอบสถานะ Tournament ก่อน
    const statusResponse = await fetch(`/api/tournament-join/status?tournamentId=${tournamentId}`);
    const statusData = await statusResponse.json();
    
    if (statusData.tournamentStatus && statusData.tournamentStatus !== 'REGISTRATION' && statusData.tournamentStatus !== 'RUNNING') {
      alert(`ไม่สามารถเข้าร่วมได้ ขณะนี้สถานะคือ ${statusData.tournamentStatus.toLowerCase()}`);
      return;
    }
    
    // แสดงสถานะกำลังโหลด
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
      alert('ส่งคำขอเข้าร่วม Tournament สำเร็จ!');
    } else {
      statusSpan.textContent = 'Error';
      statusSpan.className = 'badge badge-danger';
      alert('เกิดข้อผิดพลาด: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error joining tournament:', error);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    statusSpan.textContent = 'Error';
    statusSpan.className = 'badge badge-danger';
    alert('เกิดข้อผิดพลาดในการเข้าร่วม กรุณาลองใหม่');
  }
}

// ตรวจสอบสถานะการ Join Tournament
async function checkTournamentStatus(tournamentId) {
  try {
    const response = await fetch(`/api/tournament-join/status?tournamentId=${tournamentId}`);
    const data = await response.json();
    
    const joinBtn = document.getElementById(`joinBtn-${tournamentId}`);
    const statusSpan = document.getElementById(`joinStatus-${tournamentId}`);
    
    // แสดงปุ่ม Join เฉพาะ REGISTRATION และ RUNNING
    if (data.tournamentStatus && data.tournamentStatus !== 'REGISTRATION' && data.tournamentStatus !== 'RUNNING') {
      if (joinBtn) {
        joinBtn.style.display = 'none';
      }
      return;
    }
    
    if (data.success && data.hasApplied) {
      // แสดงสถานะการสมัครทั้งหมด แต่ให้สมัครใหม่ได้ถ้าโดน reject
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
            // แสดงปุ่ม Join สำหรับ rejected เพื่อให้สมัครใหม่
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

// ตรวจสอบสถานะทุก Tournament
async function checkAllTournamentStatus() {
  const tournamentRows = document.querySelectorAll('tr');
  tournamentRows.forEach(row => {
    const tournamentId = row.getAttribute('data-tournament-id');
    if (tournamentId) {
      checkTournamentStatus(tournamentId);
    }
  });
}

// ดูคำขอเข้าร่วม Tournament (admin เท่านั้น)
async function viewRequests(tournamentId) {
  try {
    const modal = document.getElementById('requestsModal');
    const requestsList = document.getElementById('requestsList');
    
    // เก็บ tournamentId ใน modal dataset
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

// อนุมัติคำขอ
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
      alert('อนุมัติคำขอเรียบร้อย!');
      // รีเฟรชรายการคำขอ
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // ดึง tournamentId จาก modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error accepting request:', error);
    alert('เกิดข้อผิดพลาดในการอนุมัติ กรุณาลองใหม่');
  }
}

// ปฏิเสธคำขอ
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
      alert('ปฏิเสธคำขอเรียบร้อย!');
      // รีเฟรชรายการคำขอ
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // ดึง tournamentId จาก modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error rejecting request:', error);
    alert('เกิดข้อผิดพลาดในการปฏิเสธ กรุณาลองใหม่');
  }
}

// ลบผู้เข้าร่วม
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
      alert('ลบผู้เข้าร่วมเรียบร้อย!');
      // รีเฟรชรายการคำขอ
      const modal = document.getElementById('requestsModal');
      if (modal.style.display === 'block') {
        // ดึง tournamentId จาก modal
        const tournamentId = getCurrentTournamentId();
        if (tournamentId) {
          viewRequests(tournamentId);
        }
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error);
    }
    
  } catch (error) {
    console.error('Error removing participant:', error);
    alert('เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่');
  }
}

// ปิด modal คำขอ
function closeRequestsModal() {
  document.getElementById('requestsModal').style.display = 'none';
}

// ฟังก์ชันสำหรับแสดง badge สถานะ
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