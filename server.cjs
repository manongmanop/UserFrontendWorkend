const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
console.log("🚀 SERVER STARTING - VERSION: WITH_SESSION_ID_AND_FEEDBACK_FIXED"); // Unique Log
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());

const bodyMetricSchema = new Schema({
  // ID ของผู้ใช้ที่เป็นเจ้าของข้อมูลนี้ (เชื่อมกับ Collection 'users')
  userId: {
    type: Schema.Types.String,
    ref: 'User', // สมมติว่าคุณมีโมเดล User
    required: true,
    index: true // ทำ index เพื่อให้ค้นหาตาม userId ได้เร็วขึ้น
  },
  // วันที่และเวลาที่บันทึกข้อมูล
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // น้ำหนัก (หน่วยเป็น กก.)
  weight: {
    type: Number,
    required: true
  },
  // ส่วนสูง (หน่วยเป็น ซม.)
  height: {
    type: Number,
    required: true
  },
  // ค่า BMI (คำนวณและเก็บไว้เลยเพื่อความเร็วในการดึงข้อมูล)
  bmi: {
    type: Number
  },
  // เปอร์เซ็นต์ไขมันในร่างกาย (ถ้ามี)
  fatPercentage: {
    type: Number
  },
  // มวลกล้ามเนื้อ (ถ้ามี, หน่วยเป็น กก.)
  muscleMass: {
    type: Number
  }
}, {
  // เพิ่ม field createdAt และ updatedAt อัตโนมัติ
  timestamps: true
});

// สร้าง Model จาก Schema
const BodyMetric = mongoose.model('BodyMetric', bodyMetricSchema);
app.post('/api/metrics', async (req, res) => {
  // ในแอปจริง คุณควรจะดึง userId จาก Token ที่ผ่านการยืนยันตัวตนแล้ว
  // เช่น const userId = req.user.id;
  // แต่ในตัวอย่างนี้ เราจะรับจาก body ไปก่อน
  const { userId, weight, height, fatPercentage, muscleMass } = req.body;

  if (!userId || !weight || !height) {
    return res.status(400).json({ msg: 'กรุณากรอกข้อมูล userId, weight, และ height' });
  }

  try {
    // คำนวณ BMI
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);

    const newMetric = new BodyMetric({
      userId,
      weight,
      height,
      bmi,
      fatPercentage,
      muscleMass
    });

    const savedMetric = await newMetric.save();
    res.status(201).json(savedMetric);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    // ใช้ userId จาก query parameter หรือ body แทน
    const userId = req.query.userId; // เพิ่มบรรทัดนี้

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { range } = req.query;
    let startDate;
    const today = new Date();

    switch (range) {
      case '1m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 1));
        break;
      case '3m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 3));
        break;
      case '6m':
        startDate = new Date(new Date().setMonth(today.getMonth() - 6));
        break;
      case '1y':
        startDate = new Date(new Date().setFullYear(today.getFullYear() - 1));
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    const query = { userId };
    if (startDate) {
      query.date = { $gte: startDate };
    }

    const metrics = await BodyMetric.find(query).sort({ date: 'asc' });
    res.json(metrics);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// =========================================================================
// ================ CLEAN ARCHITECTURE V2 SCHEMAS ==========================
// =========================================================================

const exerciseV2Schema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String },
  category: { type: String, enum: ['strength', 'cardio', 'flexibility', 'hiit'], index: true },
  difficulty: { type: Number, enum: [1, 2, 3] }, // 1=Beginner, 2=Int, 3=Adv
  imageUrl: { type: String },
  videoUrl: { type: String },
  targetMuscles: [{ type: String, index: true }],
  equipmentRequired: [{ type: String }],
  baseCaloriesPerMinute: { type: Number, default: 5 },
  baseCaloriesPerRep: { type: Number, default: 0.5 },
}, { timestamps: true });
const ExerciseV2 = mongoose.model('ExerciseV2', exerciseV2Schema, 'exercises_v2');

const programTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  coverImageUrl: { type: String },
  category: { type: String, enum: ['strength', 'cardio', 'flexibility', 'hiit'], index: true },
  difficulty: { type: Number, enum: [1, 2, 3], index: true },
  totalMinutes: { type: Number, required: true },
  estimatedTotalCalories: { type: Number },
  workouts: [{
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseV2' },
    order: { type: Number },
    targetType: { type: String, enum: ['reps', 'seconds'] },
    targetValue: { type: Number, required: true },
    restSecondsAfter: { type: Number, default: 30 }
  }],
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });
const ProgramTemplate = mongoose.model('ProgramTemplate', programTemplateSchema, 'program_templates_v2');

const userV2Schema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, index: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  gender: { type: String, enum: ['M', 'F', 'O'] },
  birthDate: { type: Date },
  heightCm: { type: Number },
  currentWeightKg: { type: Number },
  fitnessLevel: { type: Number, enum: [1, 2, 3] },
  primaryGoal: { type: String },
  activePlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPlan', default: null },
  stats: {
    totalWorkouts: { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    totalDurationSecs: { type: Number, default: 0 }
  }
}, { timestamps: true });
const UserV2 = mongoose.model('UserV2', userV2Schema, 'users_v2');

const userPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2', required: true, index: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramTemplate', required: true },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active', index: true },
  startDate: { type: Date, default: Date.now },
  completedDate: { type: Date },
  progress: {
    totalDaysExpected: { type: Number, required: true },
    daysCompleted: { type: Number, default: 0 },
    dailyLog: [{
      dayNumber: { type: Number },
      status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
      completedAt: { type: Date }
    }]
  }
}, { timestamps: true });
userPlanSchema.index({ userId: 1, status: 1 });
const UserPlan = mongoose.model('UserPlan', userPlanSchema, 'user_plans_v2');

const workoutSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2', required: true, index: true },
  userPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPlan' },
  programTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramTemplate' },
  dayNumber: { type: Number },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  durationSeconds: { type: Number, required: true },
  caloriesBurned: { type: Number, required: true },
  performanceLog: [{
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseV2' },
    targetValue: { type: Number },
    actualValue: { type: Number },
    aiAccuracyScore: { type: Number },
  }],
  feedback: {
    difficultyRating: { type: Number, min: 1, max: 5 },
    feelingNote: { type: String }
  }
}, { timestamps: true });
workoutSessionSchema.index({ userId: 1, endedAt: -1 });
const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema, 'workout_sessions_v2');

// =========================================================================

// --- Routes ---
app.post('/api/workoutplan', async (req, res) => {
  try {
    const { uid, plans } = req.body;

    if (!uid || !plans) {
      return res.status(400).json({ error: 'UID and plans are required' });
    }

    // ตรวจสอบว่าผู้ใช้มีแผนอยู่แล้วหรือไม่
    const existingPlan = await WorkoutPlan.findOne({ uid });
    if (existingPlan) {
      // ถ้ามีแล้ว ให้อัปเดตแทน
      existingPlan.plans = plans;
      existingPlan.updatedAt = new Date();
      const updatedPlan = await existingPlan.save();
      return res.json(updatedPlan);
    }

    // สร้างแผนใหม่
    const newPlan = new WorkoutPlan({
      uid,
      plans,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);

  } catch (error) {
    console.error('Error creating workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างแผนการออกกำลังกายได้' });
  }
});
// GET workout plan ของผู้ใช้
app.get('/api/workoutplan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const workoutPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    if (!workoutPlan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    res.json(workoutPlan);

  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงแผนการออกกำลังกายได้' });
  }
});


// DELETE workout plan ของผู้ใช้
app.delete('/api/workoutplan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const deletedPlan = await WorkoutPlan.findOneAndDelete({ uid });
    if (!deletedPlan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    // อัปเดต user profile ให้ workoutPlanId เป็น null
    await User.findOneAndUpdate(
      { uid },
      { workoutPlanId: null, updatedAt: new Date() }
    );

    res.json({ message: 'Workout plan deleted successfully' });

  } catch (error) {
    console.error('Error deleting workout plan:', error);
    res.status(500).json({ error: 'ไม่สามารถลบแผนการออกกำลังกายได้' });
  }
});


// PATCH - อัปเดตเฉพาะความก้าวหน้า (completed) ของ exercise ใน workout plan
app.patch('/api/workoutplan/:uid/progress', async (req, res) => {
  try {
    const { uid } = req.params;
    const { day, exerciseIndex, completed } = req.body;

    if (day === undefined || exerciseIndex === undefined || completed === undefined) {
      return res.status(400).json({ message: 'ต้องระบุ day, exerciseIndex, และ completed' });
    }

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    if (exerciseIndex >= dayPlan.exercises.length || exerciseIndex < 0) {
      return res.status(400).json({ message: 'exerciseIndex ไม่ถูกต้อง' });
    }

    // อัปเดตค่า completed
    dayPlan.exercises[exerciseIndex].completed = completed;
    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - เพิ่มท่าออกกำลังกายในวันที่ระบุ
// POST - เพิ่มท่าออกกำลังกายในวันที่ระบุ (UPDATED: เก็บเฉพาะ reference + performed ว่าง)
app.post('/api/workoutplan/:uid/day/:day/exercise', async (req, res) => {
  try {
    const { uid, day } = req.params;
    const { exercise } = req.body;

    if (!exercise) return res.status(400).json({ message: 'ต้องระบุ exercise ID' });

    const exerciseExists = await ExerciseV2.findById(exercise);
    if (!exerciseExists) return res.status(404).json({ message: 'ไม่พบ exercise ที่ระบุ' });

    let workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) {
      workoutPlan = new WorkoutPlan({
        uid,
        plans: [
          { day: 'monday', exercises: [] },
          { day: 'tuesday', exercises: [] },
          { day: 'wednesday', exercises: [] },
          { day: 'thursday', exercises: [] },
          { day: 'friday', exercises: [] },
          { day: 'saturday', exercises: [] },
          { day: 'sunday', exercises: [] }
        ]
      });
    }

    let dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) {
      dayPlan = { day, exercises: [] };
      workoutPlan.plans.push(dayPlan);
    }

    dayPlan.exercises.push({ exercise, performed: {} });
    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(201).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// DELETE - ลบท่าออกกำลังกายในวันที่ระบุ
app.delete('/api/workoutplan/:uid/day/:day/exercise/:index', async (req, res) => {
  try {
    const { uid, day, index } = req.params;

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    // ตรวจสอบ index
    const exerciseIndex = parseInt(index);
    if (isNaN(exerciseIndex) || exerciseIndex < 0 || exerciseIndex >= dayPlan.exercises.length) {
      return res.status(400).json({ message: 'index ไม่ถูกต้อง' });
    }

    // ลบท่าออกกำลังกาย
    dayPlan.exercises.splice(exerciseIndex, 1);

    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - แก้ไขท่าออกกำลังกายในวันที่ระบุ
// PUT - แก้ไขท่าในวันนั้นโดย index (UPDATED: ไม่ใช้ sets/reps/weight/completed แล้ว)
app.put('/api/workoutplan/:uid/day/:day/exercise/:index', async (req, res) => {
  try {
    const { uid, day, index } = req.params;
    const { exercise } = req.body;

    if (!exercise) return res.status(400).json({ message: 'ต้องระบุ exercise ID' });

    const exerciseExists = await ExerciseV2.findById(exercise);
    if (!exerciseExists) return res.status(404).json({ message: 'ไม่พบ exercise ที่ระบุ' });

    const workoutPlan = await WorkoutPlan.findOne({ uid });
    if (!workoutPlan) return res.status(404).json({ message: 'ไม่พบ workout plan ของผู้ใช้' });

    const dayPlan = workoutPlan.plans.find(p => p.day === day);
    if (!dayPlan) return res.status(404).json({ message: `ไม่พบข้อมูลของวัน ${day}` });

    const i = parseInt(index, 10);
    if (Number.isNaN(i) || i < 0 || i >= dayPlan.exercises.length) {
      return res.status(400).json({ message: 'index ไม่ถูกต้อง' });
    }

    // เก็บ performed เดิมไว้
    const current = dayPlan.exercises[i];
    dayPlan.exercises[i] = { exercise, performed: current?.performed || {} };

    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// สร้างโฟลเดอร์ uploads อัตโนมัติ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// กำหนดที่เก็บไฟล์สำหรับ Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// กำหนด filter สำหรับไฟล์ที่อนุญาต
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('ไม่อนุญาตให้อัปโหลดไฟล์ประเภทนี้! กรุณาอัปโหลดเฉพาะรูปภาพหรือวิดีโอ'), false);
  }
};

// ตั้งค่า Multer
const upload = multer({
  storage, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

// เชื่อมต่อกับ MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/fitness_app')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// --- เพิ่มส่วน User Schema และ Routes ---
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  caloriesBurned: { type: Number, default: 0 },
  workoutsDone: { type: Number, default: 0 },
  weeklyGoal: { type: Number, default: 3 },
  workoutPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan', default: null },

  // ✅ Onboarding Fields
  fitnessLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  primaryGoal: { type: String, default: '' },
  preferredDays: [{ type: String }], // e.g. ["Monday", "Wednesday"]

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'users');

// API Routes สำหรับ User
// API Routes สำหรับ User (V2)
app.post('/api/users', async (req, res) => {
  try {
    const {
      uid, email, displayName, avatarUrl,
      fitnessLevel = 'Beginner',
      primaryGoal = '',
      caloriesBurned = 0,
      workoutsDone = 0
    } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    const existingUser = await UserV2.findOne({ uid });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const levelMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };

    const newUser = new UserV2({
      uid,
      email,
      displayName,
      avatarUrl,
      fitnessLevel: levelMap[fitnessLevel] || 1,
      primaryGoal,
      stats: {
        totalWorkouts: workoutsDone,
        totalCalories: caloriesBurned,
        totalDurationSecs: 0
      }
    });

    const savedUser = await newUser.save();

    // Convert new UserV2 format to what Frontend expects (Backward Compatible)
    const reverseLevel = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
    const responseUser = {
      ...savedUser.toObject(),
      fitnessLevel: reverseLevel[savedUser.fitnessLevel] || 'Beginner',
      workoutsDone: savedUser.stats?.totalWorkouts || 0,
      caloriesBurned: savedUser.stats?.totalCalories || 0,
    };

    res.status(201).json(responseUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างผู้ใช้ได้' });
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้ (ใช้สำหรับ Onboarding หรือแก้ไขโปรไฟล์)
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;

    // ป้องกันการแก้ไข uid
    delete updateData.uid;

    if (updateData.fitnessLevel) {
      const levelMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      if (levelMap[updateData.fitnessLevel]) {
        updateData.fitnessLevel = levelMap[updateData.fitnessLevel];
      }
    }

    const updatedUser = await UserV2.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...updateData
        }
      },
      { new: true } // คืนค่าข้อมูลใหม่หลังอัปเดต
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reverseLevel = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
    const responseUser = {
      ...updatedUser,
      fitnessLevel: reverseLevel[updatedUser.fitnessLevel] || 'Beginner',
      workoutsDone: updatedUser.stats?.totalWorkouts || 0,
      caloriesBurned: updatedUser.stats?.totalCalories || 0,
    };

    res.json(responseUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้' });
  }
});

// GET: ดึงข้อมูลผู้ใช้ตาม UID
// GET /api/users/:uid
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    let user = await UserV2.findOne({ uid }).lean();

    // Auto-migrate from old User collection to UserV2
    if (!user) {
      const oldUser = await User.findOne({ uid }).lean();
      if (oldUser) {
        const levelMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
        const newUserV2 = new UserV2({
          uid: oldUser.uid,
          email: oldUser.email || '',
          displayName: oldUser.displayName || '',
          avatarUrl: oldUser.avatarUrl || '',
          fitnessLevel: levelMap[oldUser.fitnessLevel] || 1,
          primaryGoal: oldUser.primaryGoal || '',
          stats: {
            totalWorkouts: oldUser.workoutsDone || 0,
            totalCalories: oldUser.caloriesBurned || 0,
            totalDurationSecs: 0
          }
        });
        await newUserV2.save();
        user = newUserV2.toObject();
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Convert new UserV2 format to what Frontend expects (Backward Compatible)
    const reverseLevel = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
    const responseUser = {
      ...user,
      fitnessLevel: reverseLevel[user.fitnessLevel] || 'Beginner',
      workoutsDone: user.stats?.totalWorkouts || 0,
      caloriesBurned: user.stats?.totalCalories || 0,
    };

    res.json(responseUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});


// PUT: อัปเดตสถิติผู้ใช้ (ใช้เมื่อทำ workout เสร็จ)
app.put('/api/users/:uid/stats', async (req, res) => {
  try {
    const { caloriesToAdd, workoutsToAdd } = req.body;
    const user = await UserV2.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $inc: {
          "stats.totalCalories": caloriesToAdd || 0,
          "stats.totalWorkouts": workoutsToAdd || 0
        }
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.put('/api/users/:uid/workoutPlan', async (req, res) => {
  const { workoutPlanId } = req.body;
  const user = await UserV2.findOneAndUpdate(
    { uid: req.params.uid },
    { activePlanId: workoutPlanId },
    { new: true }
  );
  res.json(user);
});

// --- สิ้นสุดส่วน User Schema และ Routes ---

// แก้ไข Exercise Schema ให้สอดคล้องกัน
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String },
  video: { type: String, default: null },     // path ไฟล์จริง
  videoUrl: { type: String, default: null },
  type: { type: String, enum: ['reps', 'time'], required: true },
  value: { type: Number }, // target reps or duration in minutes
  duration: { type: Number }, // for time-based exercises (in seconds)
  time: { type: Number }, // alternative field for time
  minutes: { type: Number }, // alternative field for minutes
  reps: { type: Number }, // target reps for rep-based exercises
  caloriesBurned: { type: Number, default: 0 }, // calories for completing target
  caloriesPerRep: { type: Number, default: 0.5 }, // calories per rep
  caloriesPerMinute: { type: Number, default: 5 }, // calories per minute
  muscleGroups: [{ type: String }],
  muscles: [{ type: String }], // ✅ Added muscles field
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  equipment: [{ type: String }],
  instructions: [{ type: String }],
  tips: [{ type: String }]
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes for Exercises

// Helper mapping function for backward compatibility
const mapExerciseForFrontend = (ex) => ({
  _id: ex._id,
  name: ex.name,
  type: 'reps', // backward compatibility
  description: ex.description,
  duration: 30,
  caloriesBurned: ex.baseCaloriesPerMinute,
  value: 15,
  muscles: ex.targetMuscles || [],
  image: ex.imageUrl,
  video: ex.videoUrl,
  imageUrl: ex.imageUrl,
  videoUrl: ex.videoUrl,
  category: ex.category
});

// GET - ดึงข้อมูล Exercise ทั้งหมด
app.get('/api/exercises', async (req, res) => {
  try {
    const exercises = await ExerciseV2.find({}).lean();
    res.json(exercises.map(mapExerciseForFrontend));

  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลท่าออกกำลังกายได้' });
  }
});

// GET - ดึงข้อมูล Exercise ตาม _id
app.get('/api/exercises/:id', async (req, res) => {
  try {
    const exercise = await ExerciseV2.findById(req.params.id).lean();
    if (!exercise) {
      return res.status(404).json({ message: 'ไม่พบข้อมูล Exercise ที่ระบุ' });
    }
    res.json(mapExerciseForFrontend(exercise));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ตัวอย่าง Express
app.post("/api/exercises/byIds", async (req, res) => {
  try {
    const { ids } = req.body;
    const exercises = await ExerciseV2.find({ _id: { $in: ids } }).lean();
    res.json(exercises.map(mapExerciseForFrontend));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// แก้ไข POST - เพิ่มข้อมูลใหม่พร้อมอัปโหลดไฟล์
app.post('/api/exercises', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, type, description, duration, caloriesBurned, value, muscles } = req.body;

    let imageUrl = null;
    let videoUrl = null;
    let imagePath = null;
    let videoPath = null;

    // ตรวจสอบไฟล์รูปภาพ
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = req.files.image[0].path; // path เต็ม
      imageUrl = `/uploads/${req.files.image[0].filename}`; // URL สำหรับเข้าถึง
    }

    // ตรวจสอบไฟล์วิดีโอ
    if (req.files && req.files.video && req.files.video[0]) {
      videoPath = req.files.video[0].path; // path เต็ม
      videoUrl = `/uploads/${req.files.video[0].filename}`; // URL สำหรับเข้าถึง
    }

    // สร้าง Exercise ใหม่
    const exercise = new ExerciseV2({
      name,
      description,
      category: req.body.category || 'strength',
      baseCaloriesPerMinute: parseInt(caloriesBurned) || 5, // map backward compatible
      targetMuscles: muscles ? (Array.isArray(muscles) ? muscles : JSON.parse(muscles)) : [],
      imageUrl: imageUrl,
      videoUrl: videoUrl
    });

    const newExercise = await exercise.save();
    res.status(201).json(newExercise);

  } catch (err) {
    console.error('Error creating exercise:', err);
    res.status(400).json({ message: err.message });
  }
});

// แก้ไข PUT - อัพเดทข้อมูลพร้อมอัปโหลดไฟล์
app.put('/api/exercises/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, type, description, duration, caloriesBurned, value, muscles } = req.body;

    // หาข้อมูลเดิม
    const existingExercise = await ExerciseV2.findById(req.params.id);
    if (!existingExercise) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึก' });
    }
    const existing = existingExercise;
    const updateData = {
      name: name ?? existing.name,
      description: description ?? existing.description,
      baseCaloriesPerMinute: (caloriesBurned !== undefined ? Number(caloriesBurned) : existing.baseCaloriesPerMinute),
      targetMuscles: muscles ? (Array.isArray(muscles) ? muscles : JSON.parse(muscles)) : existing.targetMuscles,
    };

    // อัพเดทรูปภาพหากมีการอัปโหลดใหม่
    if (req.files && req.files.image && req.files.image[0]) {
      updateData.image = req.files.image[0].path;
      updateData.imageUrl = `/uploads/${req.files.image[0].filename}`;

      // ลบไฟล์เดิม (ถ้าต้องการ)
      if (existingExercise.image && fs.existsSync(existingExercise.image)) {
        fs.unlinkSync(existingExercise.image);
      }
    }

    // อัพเดทวิดีโอหากมีการอัปโหลดใหม่
    if (req.files && req.files.video && req.files.video[0]) {
      updateData.video = req.files.video[0].path;
      updateData.videoUrl = `/uploads/${req.files.video[0].filename}`;

      // ลบไฟล์เดิม (ถ้าต้องการ)
      if (existingExercise.video && fs.existsSync(existingExercise.video)) {
        fs.unlinkSync(existingExercise.video);
      }
    }

    const exercise = await ExerciseV2.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(exercise);

  } catch (err) {
    console.error('Error updating exercise:', err);
    res.status(400).json({ message: err.message });
  }
});

// แก้ไข DELETE - ลบข้อมูลพร้อมไฟล์
app.delete('/api/exercises/:id', async (req, res) => {
  try {
    const exercise = await ExerciseV2.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึก' });
    }

    // ลบไฟล์จริงออกจาก server
    if (exercise.image && fs.existsSync(exercise.image)) {
      fs.unlinkSync(exercise.image);
    }
    if (exercise.video && fs.existsSync(exercise.video)) {
      fs.unlinkSync(exercise.video);
    }

    await ExerciseV2.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบข้อมูลเรียบร้อย' });

  } catch (err) {
    console.error('Error deleting exercise:', err);
    res.status(500).json({ message: err.message });
  }
});

// WorkoutProgram Schema และ Routes (ไม่เปลี่ยนแปลง)
const workoutProgramSchema = new Schema({
  name: String,
  description: String,
  duration: String,
  caloriesBurned: Number,
  image: String,
  category: {
    type: String,
    enum: ['ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'],
    default: 'ความแข็งแรง'
  },
  DataFeedback: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
  },
  workoutList: [
    {
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
    }
  ]
});

const WorkoutProgram = mongoose.model('WorkoutProgram', workoutProgramSchema, 'program');

// WorkoutProgram Routes (Adapted backwards compatible// ดึงข้อมูลทั้งหมด หรือตามหมวดหมู่
app.get('/api/workout_programs', async (req, res) => {
  try {
    const { category } = req.query;
    const categoryMap = { 'ความแข็งแรง': 'strength', 'คาร์ดิโอ': 'cardio', 'ความยืดหยุ่น': 'flexibility', 'แอนแอโรบิค': 'hiit', 'HIIT': 'hiit' };
    const reverseCategoryMap = { 'strength': 'ความแข็งแรง', 'cardio': 'คาร์ดิโอ', 'flexibility': 'ความยืดหยุ่น', 'hiit': 'HIIT' };

    let filter = { isActive: true };
    if (category && category !== 'ทั้งหมด') filter.category = categoryMap[category] || category;

    const programs = await ProgramTemplate.find(filter).populate('workouts.exerciseId').lean();

    // Normalize Data
    const formattedPrograms = programs.map(p => {
      let oldWorkoutList = [];
      if (p.workouts && p.workouts.length > 0) {
        p.workouts.forEach(w => {
          const ex = w.exerciseId || {};
          oldWorkoutList.push({
            _id: ex._id,
            name: ex.name,
            image: ex.imageUrl,
            imageUrl: ex.imageUrl,
            type: w.targetType || 'reps',
            value: w.targetValue || 0,
            muscles: ex.targetMuscles || []
          });
        });
      }

      return {
        _id: p._id,
        name: p.title,
        description: p.description,
        duration: p.totalMinutes ? `${p.totalMinutes} mins` : "1 mins",
        caloriesBurned: p.estimatedTotalCalories || 0,
        image: p.coverImageUrl,
        category: reverseCategoryMap[p.category] || p.category,
        workoutList: oldWorkoutList
      };
    });
    res.json(formattedPrograms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/workout_programs/:id", async (req, res) => {
  try {
    const program = await ProgramTemplate.findById(req.params.id)
      .populate({ path: "workouts.exerciseId" })
      .lean();
    if (!program) return res.status(404).json({ message: "Program not found" });

    let oldWorkoutList = [];
    if (program.workouts) {
      program.workouts.forEach((w, order) => {
        const ex = w.exerciseId || {};
        oldWorkoutList.push({
          _id: ex._id,
          name: ex.name,
          image: ex.imageUrl,
          imageUrl: ex.imageUrl,
          type: w.targetType || 'reps',
          value: w.targetValue || 0,
          muscles: ex.targetMuscles || [],
          order: order + 1
        });
      });
    }

    const reverseCategoryMap = { 'strength': 'ความแข็งแรง', 'cardio': 'คาร์ดิโอ', 'flexibility': 'ความยืดหยุ่น', 'hiit': 'HIIT' };

    res.json({
      _id: program._id,
      name: program.title,
      description: program.description,
      duration: program.totalMinutes ? `${program.totalMinutes} mins` : "1 mins",
      caloriesBurned: program.estimatedTotalCalories || 0,
      image: program.coverImageUrl,
      category: reverseCategoryMap[program.category] || program.category,
      workoutList: oldWorkoutList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post('/api/workout_programs', upload.single('image'), async (req, res) => {
  try {
    const { name, description, duration, caloriesBurned, category, workoutList } = req.body;
    const categoryMap = { 'ความแข็งแรง': 'strength', 'คาร์ดิโอ': 'cardio', 'ความยืดหยุ่น': 'flexibility', 'HIIT': 'hiit' };
    const parsedCategory = categoryMap[category] || 'strength';

    const parsedList = workoutList ? JSON.parse(workoutList) : [];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const program = new ProgramTemplate({
      title: name,
      description,
      category: parsedCategory,
      totalMinutes: Number(duration) || 0,
      estimatedTotalCalories: Number(caloriesBurned) || 0,
      coverImageUrl: imageUrl,
      workouts: parsedList.map((item, index) => ({
        exerciseId: item.exercise, // Map from old "exercise" key
        order: index + 1,
        targetType: 'reps', // Default backward compatibility
        targetValue: item.value || 0,
        restSecondsAfter: item.rest || 30
      }))
    });

    const savedProgram = await program.save();
    res.status(201).json(savedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/workout_programs/:id/add-workout', async (req, res) => {
  try {
    const programId = req.params.id;
    const newWorkout = req.body.workout;

    const newExercise = {
      exerciseId: newWorkout.exercise,
      targetType: 'reps',
      targetValue: newWorkout.value || 15
    };

    const updatedProgram = await ProgramTemplate.findByIdAndUpdate(
      programId,
      { $push: { 'dailyRoutines.0.workouts': newExercise } },
      { new: true }
    ).populate({
      path: 'dailyRoutines.workouts.exerciseId',
      select: 'name imageUrl category difficulty'
    });

    res.json(updatedProgram);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/workout_programs/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, duration, caloriesBurned, category, workoutList } = req.body;
    const categoryMap = { 'ความแข็งแรง': 'strength', 'คาร์ดิโอ': 'cardio', 'ความยืดหยุ่น': 'flexibility', 'HIIT': 'hiit' };
    const parsedCategory = categoryMap[category] || 'strength';

    const parsedList = workoutList ? JSON.parse(workoutList) : [];
    const workouts = parsedList.map((item, index) => ({
      exerciseId: item.exercise,
      order: index + 1,
      targetType: 'reps',
      targetValue: item.value || 0,
      restSecondsAfter: item.rest || 30
    }));

    const updateData = {
      title: name,
      description: description,
      totalMinutes: Number(duration) || 0,
      estimatedTotalCalories: Number(caloriesBurned) || 0,
      category: parsedCategory,
      workouts: workouts
    };

    if (req.file) {
      updateData.coverImageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedProgram = await ProgramTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ error: 'Workout program not found' });
    }

    res.json(updatedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API endpoint สำหรับดึงรายการหมวดหมู่ทั้งหมด
app.get('/api/categories', async (req, res) => {
  try {
    const categories = ['ทั้งหมด', 'ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'];
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint สำหรับอัปเดต category ของโปรแกรมที่มีอยู่
app.patch('/api/workout_programs/:id/category', async (req, res) => {
  try {
    const { category } = req.body;

    const categoryMap = { 'ความแข็งแรง': 'strength', 'คาร์ดิโอ': 'cardio', 'ความยืดหยุ่น': 'flexibility', 'HIIT': 'hiit' };

    if (!['ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const updatedProgram = await ProgramTemplate.findByIdAndUpdate(
      req.params.id,
      { category: categoryMap[category] || 'strength' },
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ error: 'Workout program not found' });
    }

    res.json(updatedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/workout_programs/:id', async (req, res) => {
  try {
    const program = await ProgramTemplate.findByIdAndDelete(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Workout program not found' });
    }
    res.json({ message: 'ลบโปรแกรมเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Workout History (replaces "Recent") ==================
// ================== Histories (collection: histories) ==================
const historySchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  sessionId: { type: String, index: true }, // ✅ เพิ่ม field sessionId เพื่อใช้เชื่อมโยงตอน update feedback
  programId: { type: String },
  programName: { type: String, default: "" },
  totalSeconds: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  feedbackLevel: { type: String, default: "" },
  feedback: { type: String, default: "" }, // ✅ Added per user request
  weight: { type: Number, default: null }, // ✅ เพิ่ม field น้ำหนัก
  totalExercises: { type: Number, default: 0 },
  finishedAt: { type: Date, default: Date.now },
}, { timestamps: true });
const History = mongoose.models.History || mongoose.model("History", historySchema, "histories");


// ================== CRUD API ==================

// Create

app.get('/api/workout-plans/templates/:level', async (req, res) => {
  try {
    const { level } = req.params;

    // ตัวอย่างแผนการออกกำลังกายสำหรับแต่ละระดับ
    const templatePlans = {
      beginner: [
        {
          _id: "template_beginner_1",
          name: "แผนเริ่มต้นสำหรับมือใหม่",
          level: "beginner",
          description: "แผนการออกกำลังกายที่เหมาะสำหรับผู้เริ่มต้น",
          plans: [
            {
              day: "sunday",
              exercises: []
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "687605170f6991e1457e6727", // Push-ups
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728", // Squats
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722", // Plank
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: []
            },
            {
              day: "wednesday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "thursday",
              exercises: []
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: []
            }
          ]
        }
      ],
      normal: [
        {
          _id: "template_normal_1",
          name: "แผนกลางสำหรับระดับปานกลาง",
          level: "normal",
          description: "แผนการออกกำลังกายระดับกลางที่เน้นความสมดุล",
          plans: [
            {
              day: "sunday",
              exercises: []
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: [
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "wednesday",
              exercises: []
            },
            {
              day: "thursday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: []
            }
          ]
        }
      ],
      professional: [
        {
          _id: "template_professional_1",
          name: "แผนสำหรับระดับสูง",
          level: "professional",
          description: "แผนการออกกำลังกายที่ท้าทายสำหรับผู้มีประสบการณ์",
          plans: [
            {
              day: "sunday",
              exercises: [
                {
                  exercise: "687602db0f6991e1457e6722", // Active recovery
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "monday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                }
              ]
            },
            {
              day: "tuesday",
              exercises: [
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                },
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "wednesday",
              exercises: [
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                },
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "thursday",
              exercises: [
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605360f6991e1457e6728",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "friday",
              exercises: [
                {
                  exercise: "687604fa0f6991e1457e6726",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687602db0f6991e1457e6722",
                  performed: { seconds: 0 }
                },
                {
                  exercise: "6875fadb0f6991e1457e6711",
                  performed: { reps: 0 }
                }
              ]
            },
            {
              day: "saturday",
              exercises: [
                {
                  exercise: "687604cb0f6991e1457e6725",
                  performed: { reps: 0 }
                },
                {
                  exercise: "687605170f6991e1457e6727",
                  performed: { reps: 0 }
                }
              ]
            }
          ]
        }
      ]
    };

    const plans = templatePlans[level] || [];
    res.json(plans);

  } catch (error) {
    console.error('Error fetching workout plan templates:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงแผนการออกกำลังกายได้' });
  }
});
// --- WorkoutPlan Schema (UPDATED) ---
const workoutPlanSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  plans: [{
    day: { type: String, required: true },
    exercises: [{
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseV2', required: true },
      performed: {
        reps: { type: Number, default: 0 },
        seconds: { type: Number, default: 0 }
      }
    }]
  }]
}, { timestamps: true });
const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
// ================== Submit Feedback ==================

app.patch("/api/workout_programs/:id/feedback", async (req, res) => {
  try {
    const { id } = req.params;
    const { level } = req.body;
    console.log(`📝 Received Feedback: ID=${id}, Level=${level}`);

    if (!['easy', 'medium', 'hard'].includes(level)) {
      return res.status(400).json({ error: "Invalid level" });
    }

    const incField = `DataFeedback.${level}`;
    const updated = await WorkoutProgram.findByIdAndUpdate(
      id,
      { $inc: { [incField]: 1 } },
      { new: true, upsert: false } // upsert: false เพราะต้องมี program อยู่แล้ว
    );

    if (!updated) return res.status(404).json({ error: "Workout program not found" });

    console.log("✅ Feedback Updated:", updated.DataFeedback);
    res.json({ ok: true, DataFeedback: updated.DataFeedback });
  } catch (err) {
    console.error("❌ Feedback Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== Stats Dashboard Endpoint ==================
app.get("/api/stats/dashboard/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 1. Fetch User Data for Summary Stats (Total Calories, Goal)
    const user = await UserV2.findOne({ uid }).lean();

    // Default values if user fields are missing
    const totalCalories = user?.stats?.totalCalories || 0;
    const weeklyGoal = 3; // hardcoded for now or add to UserV2

    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Fetch history for Weekly Progress & Heatmap (sorted by date)
    const histories = await WorkoutSession.find({ userId: user._id }).sort({ endedAt: 1 }).lean();

    // ✅ Count workouts directly from history as requested
    const totalWorkouts = histories.length;

    // 3. Weekly Progress Calculation
    const now = new Date();
    // Get start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyWorkouts = histories.filter(h => {
      const d = new Date(h.endedAt);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const workoutsDoneThisWeek = weeklyWorkouts.length;

    // Map workouts to day of week (0-6, Mon-Sun)
    const weeklyWorkoutDays = weeklyWorkouts.map(h => {
      const d = new Date(h.endedAt).getDay();
      return d === 0 ? 6 : d - 1;
    });

    // 4. Heatmap Data
    const heatmapMap = {};
    histories.forEach(h => {
      const d = new Date(h.endedAt);
      const dateStr = d.toISOString().split('T')[0];
      heatmapMap[dateStr] = (heatmapMap[dateStr] || 0) + 1;
    });

    const heatmap = Object.keys(heatmapMap).map(date => ({
      date,
      count: heatmapMap[date],
      intensity: heatmapMap[date] >= 2 ? 2 : 1
    }));

    res.json({
      summary: {
        totalWorkouts, // From User collection
        totalCalories, // From User collection
        weeklyGoal     // From User collection
      },
      weekly: {
        total: workoutsDoneThisWeek,
        goal: weeklyGoal,
        percent: Math.min((workoutsDoneThisWeek / weeklyGoal) * 100, 100),
        days: weeklyWorkoutDays,
        remainingDays: 7 - ((now.getDay() === 0 ? 7 : now.getDay()))
      },
      heatmap
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== Workout History (CRUD) ==================
app.patch("/api/histories/:sessionId/feedback", async (req, res) => {
  const { sessionId } = req.params;
  const { feedback, weight } = req.body; // Expect 'feedback' and 'weight'

  console.log(`� [Feedback] Session: ${sessionId}, Feedback: ${feedback}, Weight: ${weight}`);

  const updateFields = {};
  if (feedback) updateFields.feedback = feedback;

  // ✅ Validate Weight: Must be a positive integer only (No decimals, No negatives)
  if (weight !== undefined && weight !== null && weight !== "") {
    const numWeight = Number(weight);
    if (Number.isInteger(numWeight) && numWeight > 0) {
      updateFields.weight = numWeight;
    } else {
      console.log(`⚠️ Invalid weight received: ${weight} (Must be positive integer)`);
    }
  }

  // Also update feedbackLevel for backward compatibility if needed, or just leave it.
  // The user requested 'feedback', so we focus on that.

  try {
    const updated = await WorkoutSession.findByIdAndUpdate(
      sessionId,
      { $set: { "feedback.feelingNote": updateFields.feedback || "" } },
      { new: true }
    );

    if (!updated) {
      console.log("❌ History not found for feedback update");
      return res.status(404).json({ error: "History not found" });
    }

    if (updateFields.weight) {
      const u = await UserV2.findByIdAndUpdate(updated.userId, { currentWeightKg: updateFields.weight });
    }

    console.log("✅ Feedback updated:", updated.feedback);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// CREATE: บันทึกประวัติ (default 0 ได้เลย)
app.post("/api/histories", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.sessionId) return res.status(400).json({ error: "sessionId required" });

    const doc = await History.findOneAndUpdate(
      { sessionId: body.sessionId },
      { $setOnInsert: body },
      { upsert: true, new: true }
    );

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get("/api/histories/latest/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await UserV2.findOne({ uid }).lean();
    if (!user) return res.status(404).json({ error: "no user" });
    const latest = await WorkoutSession.findOne({ userId: user._id }).sort({ endedAt: -1, createdAt: -1 }).populate('programTemplateId').lean();
    if (!latest) return res.status(404).json({ error: "no history" });

    // map format
    res.json({
      _id: latest._id, sessionId: String(latest._id), uid: user.uid,
      programId: latest.programTemplateId ? String(latest.programTemplateId._id) : null,
      programName: latest.programTemplateId ? latest.programTemplateId.title : "Unknown Program",
      totalSeconds: latest.durationSeconds, caloriesBurned: latest.caloriesBurned,
      totalExercises: latest.performanceLog ? latest.performanceLog.length : 0,
      finishedAt: latest.endedAt, feedback: latest.feedback ? latest.feedback.feelingNote : ""
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// READ ALL: (admin ใช้ดูทั้งหมด)
app.get("/api/histories", async (_req, res) => {
  try {
    const items = await History.find({}).sort({ finishedAt: -1, createdAt: -1 }).lean();
    return res.json(items);
  } catch (err) {
    console.error("[histories] list error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// READ BY USER: ดูประวัติของผู้ใช้
app.get("/api/histories/user/:uid", async (req, res) => {
  try {
    const user = await UserV2.findOne({ uid: req.params.uid }).lean();
    if (!user) return res.json([]);
    const items = await WorkoutSession.find({ userId: user._id }).sort({ endedAt: -1 }).populate('programTemplateId').lean();

    const mapped = items.map(s => ({
      _id: s._id, sessionId: String(s._id), uid: user.uid,
      programId: s.programTemplateId ? String(s.programTemplateId._id) : null,
      programName: s.programTemplateId ? s.programTemplateId.title : "Unknown Program",
      totalSeconds: s.durationSeconds, caloriesBurned: s.caloriesBurned,
      totalExercises: s.performanceLog ? s.performanceLog.length : 0,
      finishedAt: s.endedAt, feedback: s.feedback ? s.feedback.feelingNote : ""
    }));
    res.json(mapped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE: แก้รายการ history (ถ้าต้องใช้)
app.put("/api/histories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const updated = await History.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(body.programName !== undefined ? { programName: String(body.programName || "") } : {}),
          ...(body.totalSeconds !== undefined ? { totalSeconds: Number(body.totalSeconds || 0) } : {}),
          ...(body.caloriesBurned !== undefined ? { caloriesBurned: Number(body.caloriesBurned || 0) } : {}),
          ...(body.feedbackLevel !== undefined ? { feedbackLevel: String(body.feedbackLevel || "") } : {}),
          ...(body.totalExercises !== undefined ? { totalExercises: Number(body.totalExercises || 0) } : {}),
          ...(body.finishedAt !== undefined ? { finishedAt: new Date(body.finishedAt) } : {}),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "history not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[histories] update error:", err);
    return res.status(400).json({ error: err.message });
  }
});

// DELETE: ลบรายการ history
app.delete("/api/histories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WorkoutSession.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "history not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[histories] delete error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ================== WorkoutSession (Schema + Model) ==================
const workoutSessionExerciseSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
  name: { type: String, default: "" },

  // เป้าหมายของท่านั้น (มาจาก exercise.type)
  target: {
    type: { type: String, enum: ["reps", "time"], required: true }, // reps | time
    value: { type: Number, required: true }, // reps = จำนวนครั้ง, time = วินาที (แนะนำให้เก็บเป็นวินาทีให้ชัดเจน)
  },

  order: { type: Number, default: 0 },
}, { _id: false });

const workoutSessionLogSchema = new mongoose.Schema({
  order: Number,
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
  name: String,
  target: { type: Object },
  performed: {
    reps: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
  },
  status: { type: String, default: "completed" },
  calories: { type: Number, default: 0 }
}, { _id: false });

const oldWorkoutSessionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  origin: {
    kind: { type: String, default: "program" },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkoutProgram" }
  },
  snapshot: {
    programName: String,
    exercises: []
  },
  logs: [workoutSessionLogSchema],
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });
const OldWorkoutSession = mongoose.model("OldWorkoutSession", oldWorkoutSessionSchema, "workout_sessions_legacy");
// ================== API: Start Session ==================
app.post("/api/workout_sessions/start", async (req, res) => {
  try {
    const { uid, origin, snapshot } = req.body;

    // เงื่อนไขในการค้นหา: User เดิม, Program เดิม, และ "ยังไม่จบ" (finishedAt: null)
    const filter = {
      uid,
      "origin.programId": origin.programId,
      finishedAt: null
    };

    // ข้อมูลที่จะใช้สร้าง ถ้าหาไม่เจอ
    const update = {
      $setOnInsert: { // $setOnInsert ทำงานเฉพาะตอนสร้างใหม่เท่านั้น
        uid,
        origin,
        snapshot,
        logs: [],
        startedAt: new Date()
      }
    };

    // ใช้ findOneAndUpdate พร้อม upsert: true
    // - ถ้าเจอ: จะคืนค่าเดิมกลับมา
    // - ถ้าไม่เจอ: จะสร้างใหม่ให้ทันที (Atomic Operation) ป้องกันการชนกัน
    const session = await OldWorkoutSession.findOneAndUpdate(
      filter,
      update,
      {
        new: true,   // คืนค่า document หลังอัปเดต (หรือสร้างใหม่)
        upsert: true, // ถ้าไม่มีให้สร้างใหม่
        setDefaultsOnInsert: true // ใช้ default value จาก Schema
      }
    );

    console.log(`✅ Session Active: ${session._id} (Is New: ${session.createdAt === session.updatedAt})`);

    return res.status(201).json({ _id: session._id });

  } catch (err) {
    console.error("Start Session Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Log Exercise ==================
app.post("/api/workout_sessions/:id/log-exercise", async (req, res) => {
  try {
    const { id } = req.params;
    const logData = req.body;

    // 1. ดึงค่าออกมาให้ชัดเจน
    const seconds = Math.max(0, Number(logData.performed?.seconds || 0));
    const reps = Math.max(0, Number(logData.performed?.reps || 0));

    // 2. คำนวณแคลอรี่
    let rawCalories = (seconds / 60) * 5;
    const calories = seconds > 10 ? Math.ceil(rawCalories) : parseFloat(rawCalories.toFixed(2));

    // 3. สร้าง Object Log ที่ถูกต้องตาม Schema เป๊ะๆ
    const newLog = {
      order: logData.order,
      exerciseId: logData.exerciseId,
      name: logData.name,
      target: logData.target,
      performed: {
        reps: reps,
        seconds: seconds // บันทึกวินาทีที่ถูกต้องแน่นอน
      },
      status: logData.status,
      calories: calories,
      startedAt: logData.startedAt,
      endedAt: logData.endedAt
    };

    console.log(`📝 Logging Order ${logData.order}: ${seconds}s`); // เพิ่ม Log ดูว่า Backend เห็นกี่วินาที

    // 4. ลบอันเก่า (ถ้ามี) แล้วเพิ่มอันใหม่
    await OldWorkoutSession.findByIdAndUpdate(id, {
      $pull: { logs: { order: logData.order } }
    });

    await OldWorkoutSession.findByIdAndUpdate(id, {
      $push: { logs: newLog }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Finish Session ==================
app.patch("/api/workout_sessions/:id/finish", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🏁 Finishing Session ID: ${id}`);

    // 1. ค้นหา Session ก่อน
    const session = await OldWorkoutSession.findById(id);

    // ✅ FIX: เช็คก่อนเลยว่าเจอไหม ถ้าไม่เจอให้เด้งออกทันที กัน Error
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Debug: ปริ้นท์ Log หลังจากมั่นใจว่า session มีอยู่จริง
    console.log("---- Session Logs Debug ----");
    if (session.logs) {
      session.logs.forEach(l => console.log(`Order ${l.order}: ${l.performed?.seconds}s`));
    }
    console.log("----------------------------");

    // 🔥 FIX: ถ้า Session นี้จบไปแล้ว (มี finishedAt) ให้หยุดเลย ไม่ต้องสร้าง History ซ้ำ
    if (session.finishedAt) {
      console.log("⚠️ Session already finished. Skipping history creation.");
      return res.json({ msg: "Session already finished", sessionId: session._id });
    }

    // 2. ถ้ายังไม่จบ -> อัปเดต finishedAt
    session.finishedAt = new Date();
    await session.save();

    // 3. คำนวณผลรวม (Logic ของคุณถูกต้องแล้วครับ)
    const totals = session.logs.reduce((acc, log) => {
      // แปลงเป็น Number อีกรอบกันเหนียว
      const s = Number(log.performed?.seconds);
      const c = Number(log.calories);

      // ถ้าเป็น NaN ให้เป็น 0
      acc.seconds += isNaN(s) ? 0 : s;
      acc.calories += isNaN(c) ? 0 : c;
      return acc;
    }, { seconds: 0, reps: 0, calories: 0 });

    console.log(`∑ Totals: ${totals.seconds}s, ${totals.calories}kcal`);
    totals.calories = Math.ceil(totals.calories);

    // 4. สร้าง WorkoutSession ถาวร (แทน History เดิม)
    const u = await UserV2.findOne({ uid: session.uid }).lean();

    let performanceLog = [];
    if (session.logs) {
      performanceLog = session.logs.map(l => ({
        exerciseId: l.exerciseId || null,
        targetValue: (l.target?.value || 0),
        actualValue: l.performed?.seconds > 0 ? l.performed.seconds : (l.performed?.reps || 0)
      }));
    }

    const newSessionData = {
      userId: u ? u._id : new mongoose.Types.ObjectId(),
      programTemplateId: mongoose.isValidObjectId(session.origin?.programId) ? session.origin.programId : null,
      startedAt: session.startedAt || new Date(),
      endedAt: session.finishedAt || new Date(),
      durationSeconds: totals.seconds,
      caloriesBurned: totals.calories,
      performanceLog: performanceLog
    };

    const newHistory = await WorkoutSession.create(newSessionData);
    console.log("✅ WorkoutSession Created (Full):", newHistory);

    // 5. อัปเดต User Stats
    if (u) {
      await UserV2.findByIdAndUpdate(
        u._id,
        {
          $inc: {
            "stats.totalCalories": totals.calories,
            "stats.totalWorkouts": 1,
            "stats.totalDurationSecs": totals.seconds
          }
        }
      );
    }

    res.json({
      sessionId: newHistory._id, // return new permanent session id for feedbacks
      historyId: newHistory._id,
      msg: "Session finished and History saved",
      totals
    });

  } catch (err) {
    console.error("❌ Finish Session Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================== API: Latest Summary (Program) ==================
app.get("/api/__summary_internal/program/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const latest = await OldWorkoutSession.findOne({
      uid,
      finishedAt: { $ne: null }
    }).sort({ finishedAt: -1 }).lean();

    if (!latest) return res.status(404).json({ error: "ไม่พบประวัติการเล่น" });

    const totals = (latest.logs || []).reduce((acc, l) => {
      acc.seconds += Number(l.performed?.seconds || 0);
      acc.calories += Number(l.calories || 0);
      return acc;
    }, { seconds: 0, calories: 0 });

    res.json({
      uid,
      sessionId: latest._id,
      programName: latest.snapshot?.programName,
      totalExercises: latest.snapshot?.exercises?.length || 0,
      doneExercises: latest.logs?.length || 0,
      totals,
      finishedAt: latest.finishedAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

