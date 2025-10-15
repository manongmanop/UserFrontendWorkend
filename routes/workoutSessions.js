const express = require('express');
const router = express.Router();
const WorkoutSession = require('../models/WorkoutSession');
const ExerciseLog = require('../models/ExerciseLog');
const WorkoutProgram = require('../models/WorkoutProgram'); // มีอยู่แล้วในโปรเจกต์คุณ

// 1) เริ่ม Session (รองรับ program/daily)
router.post('/workout_sessions/start', async (req, res) => {
  try {
    const { uid, origin, snapshot, totalExercises } = req.body;
    if (!uid || !origin?.kind) {
      return res.status(400).json({ message: 'uid and origin.kind are required' });
    }

    const doc = {
      uid,
      origin: {
        kind: origin.kind,
        program: origin.kind === 'program' ? origin.programId : undefined,
        snapshot: {
          programName: snapshot?.programName,
          exercises: (snapshot?.exercises || []).map(x => ({
            exercise: x.exercise,
            name: x.name,
            type: x.type,
            value: x.value,
            order: x.order ?? 0
          }))
        }
      },
      totalExercises: totalExercises ?? snapshot?.exercises?.length ?? 0
    };

    // validate program exists (optional but good)
    if (origin.kind === 'program' && origin.programId) {
      const has = await WorkoutProgram.exists({ _id: origin.programId });
      if (!has) return res.status(404).json({ message: 'Program not found' });
    }

    const session = await WorkoutSession.create(doc);
    res.json(session);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to start session' });
  }
});

// 2) Log ต่อท่า
router.post('/workout_sessions/:sessionId/log-exercise', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { uid, order, exerciseId, name, target, performed, calories } = req.body;

    const session = await WorkoutSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const log = await ExerciseLog.create({
      session: session._id,
      uid,
      exercise: exerciseId,
      name,
      target,
      order: order ?? 0,
      performed: performed || {},
      calories: calories ?? 0,
      endedAt: new Date()
    });

    // เพิ่ม count/sum แบบ denormalize ให้ session
    await WorkoutSession.findByIdAndUpdate(session._id, {
      $inc: { completedExercises: 1, calories: calories ?? 0 }
    });

    res.json(log);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to log exercise' });
  }
});

// 3) จบ Session
router.patch('/workout_sessions/:sessionId/finish', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await WorkoutSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const endedAt = new Date();
    session.endedAt = endedAt;
    session.totalSeconds = Math.max(0, Math.floor((endedAt - session.startedAt)/1000));
    await session.save();

    res.json(session);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to finish session' });
  }
});

// 4) ดึง session + logs
router.get('/workout_sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await WorkoutSession.findById(sessionId)
      .populate('origin.program','name');

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const logs = await ExerciseLog.find({ session: session._id })
      .populate('exercise','name image imageUrl type value')
      .sort({ order: 1 });

    res.json({ session, logs });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to get session' });
  }
});

// 5) History ผู้ใช้
router.get('/workout_sessions', async (req, res) => {
  try {
    const { uid, kind, limit = 20 } = req.query;
    const q = {};
    if (uid) q.uid = uid;
    if (kind) q['origin.kind'] = kind; // 'program' | 'daily'

    const items = await WorkoutSession.find(q)
      .sort({ startedAt: -1 })
      .limit(Number(limit))
      .populate('origin.program','name');

    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to list sessions' });
  }
});

module.exports = router;
