const express = require('express');
const router = express.Router();
const { getUserLevelInfo } = require('../../utils/expSystem');

// ✅ GET /api/user-level - ดึงข้อมูลเลเวลของผู้ใช้
router.get('/', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.session.user._id;
    const levelInfo = await getUserLevelInfo(userId);

    if (!levelInfo.success) {
      return res.status(400).json({ error: levelInfo.error });
    }

    res.json({
      success: true,
      levelInfo
    });
  } catch (error) {
    console.error('❌ Error getting user level info:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเลเวล' });
  }
});

module.exports = router; 