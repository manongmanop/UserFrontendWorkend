const mongoose = require('mongoose');

// ตรวจสอบการเชื่อมต่อ
async function connectDB() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/fitness_app');
    console.log('MongoDB Connected');
  } catch (err) {
    console.log('MongoDB Connection Error:', err);
  }
}

// ตั้งค่า Timeout ในกรณีที่ Buffering ใช้เวลานาน
mongoose.set('bufferTimeoutMS', 20000); // 20 seconds

// สร้าง Schema
const exerciseSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  duration: String,
  caloriesBurned: Number
});

// สร้าง Model
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ข้อมูลเริ่มต้น
const initialExercises = [
  {
    name: 'Push-ups',
    type: 'Push_ups',
    description: 'The lower abdomen and hips are the most difficult',
    duration: '2 min',
    caloriesBurned: 115
  },
  {
    name: 'Hip Raise',
    type: 'Hipe_Raise',
    description: 'Hip raises target your glutes and lower back muscles',
    duration: '3 min',
    caloriesBurned: 90
  },
  {
    name: 'Leg Raises',
    type: 'Leg_Raises',
    description: 'Great for lower abdominal strength',
    duration: '2 min',
    caloriesBurned: 100
  },
  {
    name: 'Plank',
    type: 'Plank',
    description: 'Excellent for core stability',
    duration: '1 min',
    caloriesBurned: 70
  },
  {
    name: 'Squat',
    type: 'Squat',
    description: 'Targets multiple muscle groups',
    duration: '3 min',
    caloriesBurned: 150
  },
  {
    name: 'Dumbbell Curl',
    type: 'Dumbbell_Curl',
    description: 'Builds bicep strength',
    duration: '4 min',
    caloriesBurned: 120
  }
];

// เพิ่มข้อมูลเริ่มต้น
const seedDB = async () => {
  try {
    // ลบข้อมูลเก่าก่อน (ถ้ามี)
    await Exercise.deleteMany({});
    
    // เพิ่มข้อมูลใหม่
    await Exercise.insertMany(initialExercises);
    
    console.log('เพิ่มข้อมูลเริ่มต้นเรียบร้อย');
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', err);
  } finally {
    mongoose.connection.close();
  }
};

// เรียกใช้งานฟังก์ชัน
connectDB().then(() => seedDB());