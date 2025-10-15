const mongoose = require('mongoose');

const exerciseLogSchema = new mongoose.Schema({
  session:  { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutSession', required: true, index: true },
  uid:      { type: String, required: true, index: true },

  // อ้างอิง + denormalize เพื่อกันเปลี่ยนชื่อ/ชนิดในอนาคต
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', index: true },
  name:     String,
  target:   { type: { type: String, enum: ['time','reps'] }, value: String },

  order:    { type: Number, default: 0 },

  performed:{ seconds: { type: Number, default: 0 }, reps: { type: Number, default: 0 } },
  calories: { type: Number, default: 0 },

  startedAt:{ type: Date, default: Date.now },
  endedAt:  { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ExerciseLog', exerciseLogSchema);
