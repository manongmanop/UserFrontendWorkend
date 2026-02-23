const workoutProgramSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  duration: String,              // ex. "4 weeks"
  caloriesBurned: Number,
  image: String,
  category: {
    type: String,
    enum: [
      'ความแข็งแรง', 'คาร์ดิโอ', 'ความยืดหยุ่น', 'HIIT',
      'โปรแกรมช่วงบน', 'โปรแกรมช่วงล่าง', 'โปรแกรมหน้าท้อง',
      'ลดไขมัน', 'เพิ่มกล้าม', 'กระชับก้น & ขา'
    ],
    default: 'ความแข็งแรง'
  },
  workoutList: [
    {
      exercise: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
      sets: { type: Number, default: 3 },      // สำหรับ strength
      reps: { type: Number, default: 10 },     // สำหรับ strength
      time: { type: String },                  // สำหรับ time-based ex. "00:30"
      order: { type: Number, default: 0 },     // ลำดับในโปรแกรม
      weight: { type: String, default: 'Bodyweight' } // optional
    }
  ]
}, { timestamps: true });

const WorkoutProgram = mongoose.model('WorkoutProgram', workoutProgramSchema);
