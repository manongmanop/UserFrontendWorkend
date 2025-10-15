// routes/analytics.js
const express = require('express');
const router = express.Router();

const WorkoutSession = require('../models/WorkoutSession');
const ExerciseLog = require('../models/ExerciseLog');
const Exercise = require('../models/Exercise'); // ถ้ามี

// === [A] Recent: รายการท่าออกกำลังกายล่าสุดของผู้ใช้ ===
// Frontend เรียก: GET /api/recent/user/:userId
router.get('/recent/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // ดึง log ล่าสุด 30 รายการ (จะได้ท่าที่เพิ่งเล่นจริง ๆ)
    const logs = await ExerciseLog.find({ uid: userId })
      .sort({ endedAt: -1, createdAt: -1 })
      .limit(30)
      .select({ _id: 1, exercise: 1, target: 1, endedAt: 1 });

    const recents = logs.map(l => ({
      _id: String(l._id),
      exerciseId: String(l.exercise || ''),
      type: l.target?.type || 'time',
      date: l.endedAt || l.createdAt || new Date(),
    }));

    res.json(recents);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get recent workouts' });
  }
});

// === [B] Exercise detail (ใช้ในหน้า Recent เพื่อเติมชื่อ/รูป) ===
// Frontend เรียก: GET /api/exercises/:id
router.get('/exercises/:id', async (req, res) => {
  try {
    const ex = await Exercise.findById(req.params.id).lean();
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });

    res.json({
      _id: String(ex._id),
      name: ex.name,
      image: ex.image,
      imageUrl: ex.imageUrl,
      type: ex.type,
      value: ex.value
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get exercise' });
  }
});

// === [C] Summary: สรุปผลล่าสุดหลังออกกำลังกาย ===
// หน้าของคุณเรียก: GET http://localhost:8000/summary/:workoutType/:userId
// เพื่อให้ "ไม่ต้องแก้ frontend" เราจะทำ route เดิม (/summary/...) ไว้ที่เซิร์ฟเวอร์พอร์ต 8000
// ถ้าแอปคุณรันอยู่ที่พอร์ต 5000 ให้ดูหมายเหตุด้านล่าง (ตัวเลือก Proxy) 
router.get('/__summary_internal/:workoutType/:userId', async (req, res) => {
  try {
    const { workoutType, userId } = req.params; // workoutType: 'program' | 'daily' (สมมติ)
    const q = { uid: userId };
    if (workoutType === 'program' || workoutType === 'daily') {
      q['origin.kind'] = workoutType;
    }

    // หา session ล่าสุดของผู้ใช้ตามชนิด (ถ้ามีระบุ)
    const session = await WorkoutSession.findOne(q).sort({ startedAt: -1 }).lean();
    if (!session) {
      return res.json({
        reps: 0,
        kcal_burned: 0,
        duration_min: 0,
        feedback: 'ยังไม่มีข้อมูลการออกกำลังกายล่าสุด'
      });
    }

    // รวม log เฉพาะของ session นี้
    const logs = await ExerciseLog.find({ session: session._id }).lean();

    const totalReps = logs.reduce((acc, l) => acc + (l.performed?.reps || 0), 0);
    const totalSecs = session.totalSeconds || logs.reduce((acc, l) => acc + (l.performed?.seconds || 0), 0);
    const kcal = session.calories || logs.reduce((acc, l) => acc + (l.calories || 0), 0);

    // feedback ง่าย ๆ (คุณปรับสูตรได้)
    let feedback = 'เยี่ยมมาก! รักษาความสม่ำเสมอไว้ให้ได้ 👏';
    if (totalSecs >= 1800) feedback = 'สุดยอด! วันนี้คุณซ้อมหนักกว่าปกติ 💥';
    else if (totalSecs < 300) feedback = 'เริ่มต้นได้ดี! ลองเพิ่มเวลาอีกสักหน่อยนะ 💪';

    res.json({
      reps: totalReps,
      kcal_burned: kcal,
      duration_min: Math.round(totalSecs / 60),
      feedback
    });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get summary' });
  }
});

module.exports = router;
