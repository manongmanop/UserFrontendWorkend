const express = require('express');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
// const admin = require('firebase-admin');
const bodyMetricsData = require('./test-bodymetrics.json');
// const serviceAccount = require('./path/to/your-serviceAccountKey.json'); // << แก้ path ให้ถูกต้อง

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
// // const BodyMetric = require('./src/models/BodyMetric.cjs');
// // Middleware
app.use(cors());
app.use(express.json());
// const workoutSessionsRoutes = require('./routes/workoutSessions');
// app.use('/api', workoutSessionsRoutes);
// const analyticsRoutes = require('./routes/analytics');

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
// async function verifyToken(req, res, next) {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(403).send('Unauthorized');
//     }
//     const token = authHeader.split(' ')[1];
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(token);
//         req.user = decodedToken; // ส่งข้อมูล user ที่ถอดรหัสแล้วไปกับ request
//         next();
//     } catch (error) {
//         return res.status(403).send('Unauthorized: Invalid Token');
//     }
// }
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
// app.get('/api/workoutplan/:uid', async (req, res) => {
//   try {
//     const { uid } = req.params;
    
//     if (!uid) {
//       return res.status(400).json({ message: 'ต้องระบุ userId' });
//     }
    
//     const plan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    
//     if (!plan) {
//       // สร้าง default plan เมื่อไม่พบข้อมูล
//       const defaultPlan = {
//         uid,
//         plans: [
//           { day: 'monday', exercises: [] },
//           { day: 'tuesday', exercises: [] },
//           { day: 'wednesday', exercises: [] },
//           { day: 'thursday', exercises: [] },
//           { day: 'friday', exercises: [] },
//           { day: 'saturday', exercises: [] },
//           { day: 'sunday', exercises: [] }
//         ]
//       };
      
//       return res.status(404).json({ 
//         message: 'ไม่พบ workout plan ของผู้ใช้',
//         defaultPlan 
//       });
//     }
    
//     res.json(plan);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });
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
// POST สร้างหรืออัปเดต workout plan ของผู้ใช้
app.post('/api/workoutplan/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { plans } = req.body;

    if (!Array.isArray(plans)) {
      return res.status(400).json({ message: 'plans ต้องเป็น array' });
    }
    
    // ตรวจสอบโครงสร้าง plans
    for (const plan of plans) {
      if (!plan.day) {
        return res.status(400).json({ message: 'แต่ละแผนต้องระบุวันด้วย day field' });
      }
      
      if (!Array.isArray(plan.exercises)) {
        return res.status(400).json({ message: 'exercises ต้องเป็น array' });
      }
    }

    let workoutPlan = await WorkoutPlan.findOne({ uid });

    if (workoutPlan) {
      // อัปเดต plans เดิม
      workoutPlan.plans = plans;
    } else {
      // สร้างใหม่
      workoutPlan = new WorkoutPlan({ uid, plans });
    }

    await workoutPlan.save();

    const populatedPlan = await WorkoutPlan.findOne({ uid }).populate('plans.exercises.exercise');
    res.status(200).json(populatedPlan);
  } catch (err) {
    console.error('Error saving workout plan:', err);
    res.status(500).json({ message: err.message });
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

    const exerciseExists = await Exercise.findById(exercise);
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

    const exerciseExists = await Exercise.findById(exercise);
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
  destination: function (req, file, cb) {
      cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
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
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // จำกัดขนาดไฟล์ 10MB
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'users');

// API Routes สำหรับ User
// POST: สร้างหรืออัปเดตผู้ใช้ (ใช้สำหรับตอน login/register)
app.post('/api/users', async (req, res) => {
  try {
    const { uid, caloriesBurned = 0, workoutsDone = 0, weeklyGoal = 3, workoutPlanId = null } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const existingUser = await User.findOne({ uid });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // สร้างผู้ใช้ใหม่
    const newUser = new User({
      uid,
      caloriesBurned,
      workoutsDone,
      weeklyGoal,
      workoutPlanId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างผู้ใช้ได้' });
  }
});

// GET: ดึงข้อมูลผู้ใช้ตาม UID
// GET /api/users/:uid
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = req.body;
    // เพิ่ม updatedAt timestamp
    updateData.updatedAt = new Date();
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้' });
  }
});

// PUT: อัปเดตสถิติผู้ใช้ (ใช้เมื่อทำ workout เสร็จ)
app.put('/api/users/:uid/stats', async (req, res) => {
  try {
      const { caloriesToAdd, workoutsToAdd } = req.body;
      const user = await User.findOneAndUpdate(
          { uid: req.params.uid },
          { $inc: { 
              caloriesBurned: caloriesToAdd || 0,
              workoutsDone: workoutsToAdd || 0
          }},
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
  const user = await User.findOneAndUpdate(
    { uid: req.params.uid },
    { workoutPlanId },
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
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  equipment: [{ type: String }],
  instructions: [{ type: String }],
  tips: [{ type: String }]
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes for Exercises

// GET - ดึงข้อมูล Exercise ทั้งหมด
app.get('/api/exercises', async (req, res) => {
  try {
    const exercises = await Exercise.find({});
    res.json(exercises);

  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลท่าออกกำลังกายได้' });
  }
});

// GET - ดึงข้อมูล Exercise ตาม _id
app.get('/api/exercises/:id', async (req, res) => {
  try {
      const exercise = await Exercise.findById(req.params.id);
      if (!exercise) {
          return res.status(404).json({ message: 'ไม่พบข้อมูล Exercise ที่ระบุ' });
      }
      res.json(exercise);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});
// ตัวอย่าง Express
app.post("/api/exercises/byIds", async (req, res) => {
  try {
    const { ids } = req.body; 
    const exercises = await Exercise.find({ _id: { $in: ids } });
    res.json(exercises);
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
    const { name, type, description, duration, caloriesBurned, value } = req.body;
    
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
    const exercise = new Exercise({
        name,
        type,
        description,
        duration,
        caloriesBurned: parseInt(caloriesBurned) || 0,
        value: value ? JSON.parse(value) : null,
        image: imagePath,     // เก็บ path
        video: videoPath,     // เก็บ path
        imageUrl: imageUrl,   // เก็บ URL
        videoUrl: videoUrl    // เก็บ URL
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
      const { name, type, description, duration, caloriesBurned, value } = req.body;
      
      // หาข้อมูลเดิม
      const existingExercise = await Exercise.findById(req.params.id);
      if (!existingExercise) {
          return res.status(404).json({ message: 'ไม่พบข้อมูลการฝึก' });
      }
const existing = await Exercise.findById(req.params.id);
      const updateData = { 
name: name ?? existing.name,
type: type ?? existing.type,
description: description ?? existing.description,
duration: (duration !== undefined ? Number(duration) : existing.duration),
caloriesBurned: (caloriesBurned !== undefined ? Number(caloriesBurned) : existing.caloriesBurned),
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

      const exercise = await Exercise.findByIdAndUpdate(req.params.id, updateData, { new: true });
      res.json(exercise);
      
  } catch (err) {
      console.error('Error updating exercise:', err);
      res.status(400).json({ message: err.message });
  }
});

// แก้ไข DELETE - ลบข้อมูลพร้อมไฟล์
app.delete('/api/exercises/:id', async (req, res) => {
  try {
      const exercise = await Exercise.findById(req.params.id);
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
      
      await Exercise.findByIdAndDelete(req.params.id);
      res.json({ message: 'ลบข้อมูลเรียบร้อย' });
      
  } catch (err) {
      console.error('Error deleting exercise:', err);
      res.status(500).json({ message: err.message });
  }
});

// WorkoutProgram Schema และ Routes (ไม่เปลี่ยนแปลง)A
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
  workoutList: [
    {
      exercise: {
        type: Schema.Types.ObjectId,
        ref: "Exercise"
      }
    }
  ]
});

const WorkoutProgram = mongoose.model('WorkoutProgram', workoutProgramSchema, 'Program');

// WorkoutProgram Routes
app.get('/api/workout_programs', async (req, res) => {
  try {
    const { category } = req.query; // เพิ่ม query parameter สำหรับ category
    
    let filter = {};
    if (category && category !== 'ทั้งหมด') {
      filter.category = category;
    }

    const programs = await WorkoutProgram.find(filter)
      .populate({
        path: 'workoutList.exercise'
      })
      .lean();

    const formattedPrograms = programs.map(program => ({
      ...program,
      workoutList: program.workoutList.map(item => ({
        _id: item.exercise?._id,
        name: item.exercise?.name,
        image: item.exercise?.image,
        imageUrl: item.exercise?.imageUrl, // เพิ่ม imageUrl
        type: item.exercise?.type,
        value: item.exercise?.value
      }))
    }));

    res.json(formattedPrograms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ใน Backend - ปรับ API ให้ populate ข้อมูล exercise
app.get('/api/workout_programs/:id', async (req, res) => {
  try {
    const program = await WorkoutProgram.findById(req.params.id)
      .populate({
        path: 'workoutList.exercise',
        model: 'Exercise' // ชื่อ model ของ Exercise
      });
    
    // แปลงโครงสร้างข้อมูลให้ Frontend ใช้งานง่าย
    const transformedProgram = {
      ...program.toObject(),
      workoutList: program.workoutList.map(workout => ({
        _id: workout._id,
        ...workout.exercise.toObject(), // ดึงข้อมูลจาก exercise มาขึ้นบนสุด
        originalExerciseId: workout.exercise._id
      }))
    };
    
    res.json(transformedProgram);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/workout_programs', upload.single('image'), async (req, res) => {
  try {
    const newProgram = new WorkoutProgram({
      name: req.body.name,
      description: req.body.description,
      duration: req.body.duration,
      caloriesBurned: req.body.caloriesBurned,
      category: req.body.category || 'ความแข็งแรง', // เพิ่ม category field
      image: req.file ? `/uploads/${req.file.filename}` : '', // แก้ไขให้ใช้ URL
      workoutList: req.body.workoutList ? JSON.parse(req.body.workoutList) : []
    });

    const savedProgram = await newProgram.save();
    res.status(201).json(savedProgram);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/workout_programs/:id/add-workout', async (req, res) => {
  try {
    const programId = req.params.id;
    const newWorkout = req.body.workout;

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      programId,
      { $push: { workoutList: newWorkout } },
      { new: true }
    ).populate({
      path: 'workoutList.exercise',
      select: 'name image imageUrl type value'
    });

    res.json(updatedProgram);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/workout_programs/:id', upload.single('image'), async (req, res) => {
  try {
    const updatedData = {
      name: req.body.name,
      description: req.body.description,
      duration: req.body.duration,
      caloriesBurned: req.body.caloriesBurned,
      category: req.body.category || 'ความแข็งแรง', // เพิ่ม category field
      image: req.file ? `/uploads/${req.file.filename}` : '', // แก้ไขให้ใช้ URL
      workoutList: req.body.workoutList ? JSON.parse(req.body.workoutList) : [],
    };

    if (req.file) {
      updatedData.image = `/uploads/${req.file.filename}`; // แก้ไขให้ใช้ URL
    }

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      req.params.id,
      updatedData,
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
    
    if (!['ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const updatedProgram = await WorkoutProgram.findByIdAndUpdate(
      req.params.id,
      { category },
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
    const program = await WorkoutProgram.findByIdAndDelete(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Workout program not found' });
    }
    res.json({ message: 'ลบโปรแกรมเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Schema & Model ==================
const recentSchema = new Schema({
  calorieBurn: { type: Number, required: true },
  type: { type: String, enum: ["reps", "time"], required: true },
  progress: { type: Number, required: true },
  unit: { type: String, required: true },
  date: { type: String, required: true },
  uid: { type: String, required: true },        // user id
  exerciseId: { type: String, required: true }  // exercise id
});

const Recent = mongoose.model("Recent", recentSchema);

// ================== CRUD API ==================

// ➕ Create
app.post("/api/recent", async (req, res) => {
  try {
    const recent = new Recent(req.body);
    await recent.save();
    res.status(201).json(recent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📖 Read All
app.get("/api/recent", async (req, res) => {
  try {
    const recents = await Recent.find();
    res.json(recents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📖 Read By User
app.get("/api/recent/user/:uid", async (req, res) => {
  try {
    const recents = await Recent.find({ uid: req.params.uid });
    res.json(recents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update
app.put("/api/recent/:id", async (req, res) => {
  try {
    const updated = await Recent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ❌ Delete
app.delete("/api/recent/:id", async (req, res) => {
  try {
    await Recent.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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
    day: {
      type: String,
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    exercises: [{
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
      performed: {
        reps: { type: Number, default: 0 },
        seconds: { type: Number, default: 0 }
      }
    }]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

// async function seedData() {
//     try {
//         // ลบข้อมูลเดิม (ถ้าต้องการ)
//         await BodyMetric.deleteMany({ userId: 'W9wHEQLdVaZ7S5LcclkB1DZ3pFP2' });
        
//         // เพิ่มข้อมูลใหม่
//         for (const item of bodyMetricsData.testData) {
//             const heightInMeters = item.height / 100;
//             const bmi = (item.weight / (heightInMeters * heightInMeters)).toFixed(2);
            
//             const metric = new BodyMetric({
//                 ...item,
//                 bmi: parseFloat(bmi),
//                 date: new Date(item.date)
//             });
            
//             await metric.save();
//             console.log(`Added: ${item.date} - Weight: ${item.weight}kg`);
//         }
        
//         console.log('✅ ข้อมูลทดสอบถูกเพิ่มเรียบร้อยแล้ว!');
//         process.exit(0);
//     } catch (error) {
//         console.error('❌ Error:', error);
//         process.exit(1);
//     }
// }

// seedData();
// =============== Workout Session ===============
// Sub-schemas must be declared before usage in workoutSessionSchema
if (false) {
const __ignored_workoutSessionExerciseSchema = new mongoose.Schema({
  exercise: { type: String },
  name: String,
  type: { type: String, enum: ['reps','time'] },
  value: mongoose.Schema.Types.Mixed,
  order: Number
}, { _id: false });

const __ignored_workoutSessionLogSchema = new mongoose.Schema({
  order: Number,
  exerciseId: String,
  name: String,
  target: {
    type: { type: String },
    value: String
  },
  performed: {
    seconds: { type: Number, default: 0 },
    reps: { type: Number, default: 0 }
  },
  calories: { type: Number, default: 0 },
  at: { type: Date, default: Date.now }
}, { _id: false });
const workoutSessionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  origin: {
    kind: { type: String, enum: ['program','daily'], required: true },
    programId: { type: String, default: null }
  },
  snapshot: {
    programName: { type: String, default: null },
    exercises: [workoutSessionExerciseSchema]   // <<<< สำคัญ: เป็นอาเรย์ของอ็อบเจ็กต์
  },
  totalExercises: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
  logs: [workoutSessionLogSchema]
}, { timestamps: true });

const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);

// เริ่ม session
app.post('/api/workout_sessions/start', async (req, res) => {
  try {
    let { uid, origin, snapshot, totalExercises } = req.body || {};
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    if (!origin?.kind) return res.status(400).json({ error: 'origin.kind is required' });

    // ---- ปรับรูปแบบถ้าถูกส่งมาเป็นสตริง ----
    if (typeof snapshot === 'string') {
      try { snapshot = JSON.parse(snapshot); } catch (_) {}
    }
    if (snapshot && typeof snapshot.exercises === 'string') {
      try { snapshot.exercises = JSON.parse(snapshot.exercises); } catch (_) {}
    }
    if (!Array.isArray(snapshot?.exercises)) snapshot = { ...(snapshot||{}), exercises: [] };

    const doc = await WorkoutSession.create({
      uid,
      origin,
      snapshot,
      totalExercises: Number(totalExercises) || (snapshot.exercises.length || 0),
    });

    return res.status(201).json(doc);
  } catch (e) {
    console.error('start session error:', e);
    return res.status(500).json({ error: 'failed to start session' });
  }
});

// บันทึกผลของ “ท่าหนึ่ง”
app.post('/api/workout_sessions/:id/log-exercise', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const update = {
      $push: {
        logs: {
          order: Number(payload.order ?? 0),
          exerciseId: String(payload.exerciseId ?? ''),
          name: payload.name || '',
          target: {
            type: payload.target?.type || null,
            value: String(payload.target?.value ?? '')
          },
          performed: {
            seconds: Number(payload.performed?.seconds || 0),
            reps: Number(payload.performed?.reps || 0)
          },
          calories: Number(payload.calories || 0)
        }
      }
    };

    const sess = await WorkoutSession.findByIdAndUpdate(id, update, { new: true });
    if (!sess) return res.status(404).json({ error: 'session not found' });

    return res.json({ ok: true });
  } catch (e) {
    console.error('log-exercise error:', e);
    return res.status(500).json({ error: 'failed to log exercise' });
  }
});

// จบ session + สรุปผลอย่างคร่าว
app.patch('/api/workout_sessions/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;

    const sess = await WorkoutSession.findByIdAndUpdate(
      id,
      { finishedAt: new Date() },
      { new: true }
    );
    if (!sess) return res.status(404).json({ error: 'session not found' });

    const totals = sess.logs.reduce((acc, l) => {
      acc.seconds  += Number(l?.performed?.seconds || 0);
      acc.reps     += Number(l?.performed?.reps || 0);
      acc.calories += Number(l?.calories || 0);
      return acc;
    }, { seconds: 0, reps: 0, calories: 0 });

    // อัปเดตสถิติผู้ใช้แบบคร่าว ๆ (ถ้ามี user นั้นอยู่)
    try {
      await User.findOneAndUpdate(
        { uid: sess.uid },
        { 
          $inc: { 
            caloriesBurned: totals.calories, 
            workoutsDone: 1 
          },
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (e) {
      // เงียบไว้ ไม่บล็อค flow
      console.warn('update user stats warn:', e?.message);
    }

    return res.json({
      sessionId: sess._id,
      programName: sess.snapshot?.programName || null,
      totalExercises: sess.totalExercises || (sess.snapshot?.exercises?.length || 0),
      doneExercises: sess.logs.length,
      totals,
      finishedAt: sess.finishedAt
    });
  } catch (e) {
    console.error('finish session error:', e);
    return res.status(500).json({ error: 'failed to finish session' });
  }
});

// ========= Summary endpoint ที่หน้า Summary เรียก =========
// NOTE: ชื่อ path จงใจให้ตรงกับที่ frontend เรียกอยู่ (/api/__summary_internal/...)
app.get('/api/__summary_internal/program/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    // ดึง session ล่าสุดของโปรแกรม (ที่จบแล้วก่อน)
    const latest = await WorkoutSession
      .findOne({ uid, 'origin.kind': 'program' })
      .sort({ finishedAt: -1, startedAt: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({ error: 'no finished session found for this uid' });
    }

    const totals = latest.logs?.reduce((acc, l) => {
      acc.seconds  += Number(l?.performed?.seconds || 0);
      acc.reps     += Number(l?.performed?.reps || 0);
      acc.calories += Number(l?.calories || 0);
      return acc;
    }, { seconds: 0, reps: 0, calories: 0 }) || { seconds: 0, reps: 0, calories: 0 };

    return res.json({
      uid,
      sessionId: String(latest._id),
      programName: latest.snapshot?.programName || null,
      totalExercises: latest.totalExercises || (latest.snapshot?.exercises?.length || 0),
      doneExercises: latest.logs?.length || 0,
      totals,
      logs: latest.logs || [],
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt
    });
  } catch (e) {
    console.error('summary endpoint error:', e);
    return res.status(500).json({ error: 'failed to build summary' });
  }
});
const workoutSessionExerciseSchema = new mongoose.Schema({
  exercise: { type: String },            // เก็บเป็น String ก็พอ (จะเป็น ObjectId string)
  name: String,
  type: { type: String, enum: ['reps','time'] },
  value: mongoose.Schema.Types.Mixed,    // seconds / reps / string
  order: Number
}, { _id: false });

const workoutSessionLogSchema = new mongoose.Schema({
  order: Number,
  exerciseId: String,
  name: String,
  target: {
    type: { type: String },              // 'time' | 'reps'
    value: String
  },
  performed: {
    seconds: { type: Number, default: 0 },
    reps: { type: Number, default: 0 }
  },
  calories: { type: Number, default: 0 },
  at: { type: Date, default: Date.now }
}, { _id: false });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

