const User = require('../models/User');

// ระดับและ EXP ที่ต้องการ
const LEVEL_REQUIREMENTS = {
  1: { name: 'Beginner', exp: 0, benefits: 'เข้าร่วมการแข่งขันได้' },
  2: { name: 'Apprentice', exp: 100, benefits: 'ปลดล็อกกลยุทธ์พื้นฐาน' },
  3: { name: 'Trader', exp: 300, benefits: 'เห็นสถิติย้อนหลังของตนเอง' },
  4: { name: 'Pro Trader', exp: 800, benefits: 'ปลดล็อกฟีเจอร์เรียนรู้เพิ่มเติม' },
  5: { name: 'Elite', exp: 1500, benefits: 'เข้าร่วมทัวร์นาเมนต์พิเศษ' }
};

// คำนวณเลเวลจาก EXP
function getLevelFromExp(exp) {
  let level = 1;
  for (let i = 5; i >= 1; i--) {
    if (exp >= LEVEL_REQUIREMENTS[i].exp) {
      level = i;
      break;
    }
  }
  return level;
}

// คำนวณ EXP ที่ต้องการสำหรับเลเวลถัดไป
function getExpForNextLevel(currentLevel) {
  const nextLevel = currentLevel + 1;
  if (nextLevel > 5) return null; // ถึงเลเวลสูงสุดแล้ว
  
  const currentExp = LEVEL_REQUIREMENTS[currentLevel].exp;
  const nextExp = LEVEL_REQUIREMENTS[nextLevel].exp;
  return nextExp - currentExp;
}

// เพิ่ม EXP ให้ผู้ใช้
async function addExp(userId, expToAdd, reason = '') {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found for EXP:', userId);
      return { success: false, error: 'User not found' };
    }

    const oldLevel = user.level;
    const oldExp = user.exp;
    
    user.exp += expToAdd;
    const newLevel = getLevelFromExp(user.exp);
    
    let levelUp = false;
    if (newLevel > oldLevel) {
      user.level = newLevel;
      levelUp = true;
    }
    
    await user.save();
    
    return {
      success: true,
      oldLevel,
      newLevel,
      oldExp,
      newExp: user.exp,
      levelUp,
      levelInfo: LEVEL_REQUIREMENTS[newLevel]
    };
  } catch (error) {
    console.error('❌ Error adding EXP:', error);
    return { success: false, error: error.message };
  }
}

// ตรวจสอบโบนัสการเทรด 3 ครั้งต่อวัน
async function checkDailyTradeBonus(userId) {
  try {
    const TradeLog = require('../models/tradeLog');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tradeCount = await TradeLog.countDocuments({
      userId,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // ถ้าเทรดครบ 3 ครั้งในวันนี้ ให้โบนัส
    if (tradeCount === 3) {
      const result = await addExp(userId, 30, 'Daily Trade Bonus (3 trades)');
      if (result.success && result.levelUp) {
        console.log(`🎉 Daily Trade Bonus! User reached level ${result.newLevel}`);
      }
      return result;
    }
    
    return { success: true, tradeCount, bonusGiven: false };
  } catch (error) {
    console.error('❌ Error checking daily trade bonus:', error);
    return { success: false, error: error.message };
  }
}

// ตรวจสอบโบนัสการเทรดตามกลยุทธ์ (placeholder)
async function checkStrategyBonus(userId, strategyType) {
  try {
    // TODO: ตรวจสอบว่าผู้ใช้เทรดตามกลยุทธ์ที่ระบบแนะนำหรือไม่
    // สำหรับตอนนี้จะให้โบนัสแบบสุ่ม 10% ของการเทรด
    const shouldGiveBonus = Math.random() < 0.1; // 10% chance
    
    if (shouldGiveBonus) {
      const result = await addExp(userId, 50, `Strategy Bonus (${strategyType})`);
      if (result.success && result.levelUp) {
        console.log(`🎯 Strategy Bonus! User reached level ${result.newLevel}`);
      }
      return result;
    }
    
    return { success: true, bonusGiven: false };
  } catch (error) {
    console.error('❌ Error checking strategy bonus:', error);
    return { success: false, error: error.message };
  }
}

// ดึงข้อมูลเลเวลของผู้ใช้
async function getUserLevelInfo(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const currentLevelInfo = LEVEL_REQUIREMENTS[user.level];
    const nextLevelExp = getExpForNextLevel(user.level);
    const progressToNextLevel = nextLevelExp ? ((user.exp - currentLevelInfo.exp) / nextLevelExp) * 100 : 100;
    
    return {
      success: true,
      level: user.level,
      exp: user.exp,
      levelInfo: currentLevelInfo,
      nextLevelExp,
      progressToNextLevel: Math.min(progressToNextLevel, 100),
      isMaxLevel: user.level >= 5
    };
  } catch (error) {
    console.error('❌ Error getting user level info:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  addExp,
  getLevelFromExp,
  getExpForNextLevel,
  checkDailyTradeBonus,
  checkStrategyBonus,
  getUserLevelInfo,
  LEVEL_REQUIREMENTS
}; 