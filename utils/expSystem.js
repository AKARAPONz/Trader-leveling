const User = require('../models/user');

// ระดับและ EXP ที่ต้องการ
const LEVEL_REQUIREMENTS = {
  1: { name: 'Beginner', exp: 0 },
  2: { name: 'Apprentice', exp: 150 },
  3: { name: 'Trader', exp: 450 },
  4: { name: 'Pro Trader', exp: 1200 },
  5: { name: 'Elite', exp: 3000 },
  6: { name: 'Legend', exp: 7000 },
  7: { name: 'God', exp: 15000 }
};

// ✅ คำนวณเลเวลจาก EXP
function getLevelFromExp(exp) {
  let level = 1;
  for (let i = 7; i >= 1; i--) {
    if (exp >= LEVEL_REQUIREMENTS[i].exp) {
      level = i;
      break;
    }
  }
  return level;
}

// ✅ คำนวณ EXP ที่ต้องการสำหรับเลเวลถัดไป
function getExpForNextLevel(currentLevel) {
  const nextLevel = currentLevel + 1;
  if (nextLevel > 7) return null; // ✅ ถึงเลเวลสูงสุดแล้ว (God)
  
  const currentExp = LEVEL_REQUIREMENTS[currentLevel].exp;
  const nextExp = LEVEL_REQUIREMENTS[nextLevel].exp;
  return nextExp - currentExp;
}

// ✅ เพิ่ม EXP ให้ผู้ใช้
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

// ✅ ตรวจสอบโบนัสเทรด 3 ครั้งต่อวัน
async function checkDailyTradeBonus(userId) {
  try {
    const TradeLog = require('../models/tradelog');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tradeCount = await TradeLog.countDocuments({
      userId,
      createdAt: { $gte: today, $lt: tomorrow }
    });

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

// ✅ ตรวจสอบโบนัสกลยุทธ์
async function checkStrategyBonus(userId, strategyType) {
  try {
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

// ✅ ดึงข้อมูลเลเวลของผู้ใช้
async function getUserLevelInfo(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    // ✅ ปรับให้รองรับถึงเลเวล 7 (God)
    const level = user.level > 7 ? 7 : user.level;
    const currentLevelInfo = LEVEL_REQUIREMENTS[level];
    const nextLevelExp = getExpForNextLevel(level);

const nextLevelInfo = LEVEL_REQUIREMENTS[level + 1];
let progressToNextLevel = 100;

if (nextLevelInfo) {
  const gainedExp = Math.max(user.exp - currentLevelInfo.exp, 0);
  const requiredExpForNext = nextLevelInfo.exp - currentLevelInfo.exp;

  progressToNextLevel = Math.min((gainedExp / requiredExpForNext) * 100, 100);
}

return {
  success: true,
  level: user.level,
  exp: user.exp,
  levelInfo: currentLevelInfo,
  nextLevelExp,
  progressToNextLevel: progressToNextLevel.toFixed(2),
  isMaxLevel: level >= 7
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