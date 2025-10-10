const express = require('express');
const router = express.Router();
const Tournament = require('../../models/Tournament');
const TournamentRequest = require('../../models/TournamentRequest');
const User = require('../../models/User');

// ✅ POST /api/tournament-join - สมัครเข้าร่วม tournament
router.post('/join', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    const userId = req.session.user._id;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    // ตรวจสอบว่า tournament มีอยู่จริง
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // ตรวจสอบสถานะของ tournament
    const now = new Date();
    const start = new Date(tournament.start);
    const end = new Date(tournament.end);
    
    let tournamentStatus;
    if (now < start) {
      tournamentStatus = 'REGISTRATION';
    } else if (now >= start && now <= end) {
      tournamentStatus = 'RUNNING';
    } else {
      tournamentStatus = 'END';
    }

    // ตรวจสอบว่า tournament ยังเปิดรับสมัครอยู่หรือไม่
    if (tournamentStatus !== 'REGISTRATION' && tournamentStatus !== 'RUNNING') {
      return res.status(403).json({ 
        error: `Tournament is currently ${tournamentStatus.toLowerCase()}. Registration is only allowed during REGISTRATION and RUNNING status.` 
      });
    }

    // ตรวจสอบว่าผู้ใช้สมัครแล้วหรือไม่ (ยกเว้นกรณีที่ถูก rejected)
    const existingRequest = await TournamentRequest.findOne({
      tournamentId,
      userId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You have already applied for this tournament',
        status: existingRequest.status 
      });
    }

    // ลบคำขอเก่าที่ถูก rejected (ถ้ามี) เพื่อให้สามารถสมัครใหม่ได้
    await TournamentRequest.deleteMany({
      tournamentId,
      userId,
      status: 'rejected'
    });

    // สร้างคำขอเข้าร่วม tournament
    const tournamentRequest = await TournamentRequest.create({
      tournamentId,
      userId,
      status: 'pending',
      appliedAt: now
    });

    console.log('✅ Tournament join request created:', tournamentRequest._id);

    res.json({
      success: true,
      message: 'Tournament join request submitted successfully',
      requestId: tournamentRequest._id,
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Error joining tournament:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครเข้าร่วม tournament' });
  }
});

// ✅ POST /api/tournament-join/accept - admin รับผู้เข้าร่วม
router.post('/accept', async (req, res) => {
  try {
    const { requestId } = req.body;
    const adminId = req.session.user._id;

    // ตรวจสอบว่าเป็น admin หรือไม่
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can accept tournament requests' });
    }

    // ตรวจสอบคำขอ
    const request = await TournamentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Tournament request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // อัปเดตสถานะเป็น accepted
    request.status = 'accepted';
    request.processedAt = new Date();
    await request.save();

    console.log('✅ Tournament request accepted:', requestId);

    res.json({
      success: true,
      message: 'Tournament request accepted successfully',
      requestId: request._id
    });

  } catch (error) {
    console.error('❌ Error accepting tournament request:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรับผู้เข้าร่วม' });
  }
});

// ✅ POST /api/tournament-join/reject - admin ปฏิเสธผู้เข้าร่วม
router.post('/reject', async (req, res) => {
  try {
    const { requestId } = req.body;
    const adminId = req.session.user._id;

    // ตรวจสอบว่าเป็น admin หรือไม่
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject tournament requests' });
    }

    // ตรวจสอบคำขอ
    const request = await TournamentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Tournament request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // อัปเดตสถานะเป็น rejected
    request.status = 'rejected';
    request.processedAt = new Date();
    await request.save();

    console.log('❌ Tournament request rejected:', requestId);

    res.json({
      success: true,
      message: 'Tournament request rejected successfully',
      requestId: request._id
    });

  } catch (error) {
    console.error('❌ Error rejecting tournament request:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการปฏิเสธผู้เข้าร่วม' });
  }
});

// ✅ POST /api/tournament-join/remove - admin คัดผู้เข้าร่วมออก
router.post('/remove', async (req, res) => {
  try {
    const { requestId } = req.body;
    const adminId = req.session.user._id;

    // ตรวจสอบว่าเป็น admin หรือไม่
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove tournament participants' });
    }

    // ตรวจสอบคำขอ
    const request = await TournamentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Tournament request not found' });
    }

    if (request.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only remove accepted participants' });
    }

    // อัปเดตสถานะเป็น removed
    request.status = 'removed';
    request.processedAt = new Date();
    await request.save();

    console.log('🚫 Tournament participant removed:', requestId);

    res.json({
      success: true,
      message: 'Tournament participant removed successfully',
      requestId: request._id
    });

  } catch (error) {
    console.error('❌ Error removing tournament participant:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคัดผู้เข้าร่วมออก' });
  }
});

// ✅ GET /api/tournament-join/requests - ดึงคำขอเข้าร่วม tournament (สำหรับ admin)
router.get('/requests', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const adminId = req.session.user._id;

    // ตรวจสอบว่าเป็น admin หรือไม่
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view tournament requests' });
    }

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    // ดึงคำขอเข้าร่วม tournament
    const requests = await TournamentRequest.find({ tournamentId })
      .populate('userId', 'name username level exp')
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('❌ Error fetching tournament requests:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงคำขอเข้าร่วม' });
  }
});

// ✅ GET /api/tournament-join/status - ตรวจสอบสถานะการสมัครของผู้ใช้
router.get('/status', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const userId = req.session.user._id;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    // ตรวจสอบว่า tournament มีอยู่จริง
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // ตรวจสอบสถานะของ tournament
    const now = new Date();
    const start = new Date(tournament.start);
    const end = new Date(tournament.end);
    
    let tournamentStatus;
    if (now < start) {
      tournamentStatus = 'REGISTRATION';
    } else if (now >= start && now <= end) {
      tournamentStatus = 'RUNNING';
    } else {
      tournamentStatus = 'END';
    }

    // ตรวจสอบสถานะการสมัคร
    const request = await TournamentRequest.findOne({
      tournamentId,
      userId
    });

    if (!request) {
      return res.json({
        success: true,
        hasApplied: false,
        status: null,
        tournamentStatus: tournamentStatus
      });
    }

    res.json({
      success: true,
      hasApplied: true,
      status: request.status,
      appliedAt: request.appliedAt,
      processedAt: request.processedAt,
      tournamentStatus: tournamentStatus
    });

  } catch (error) {
    console.error('❌ Error checking tournament status:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' });
  }
});

module.exports = router;