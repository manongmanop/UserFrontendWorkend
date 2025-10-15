const mongoose = require('mongoose');

const workoutSessionSchema = new mongoose.Schema({
  uid:   { type: String, required: true, index: true },

  // รองรับทั้ง program และ daily ตั้งแต่แรก
  origin: {
    kind:    { type: String, enum: ['program','daily'], required: true, index: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutProgram' },
    snapshot: {
      programName: String,
      exercises: [{
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
        name:     String,
        type:     String,  // 'time' | 'reps'
        value:    String,  // "00:30" หรือ "12"
        order:    Number
      }]
    }
  },

  startedAt:          { type: Date, default: Date.now, index: true },
  endedAt:            { type: Date },
  totalExercises:     { type: Number, default: 0 },
  completedExercises: { type: Number, default: 0 },
  totalSeconds:       { type: Number, default: 0 },
  calories:           { type: Number, default: 0 },
}, { timestamps: true });

workoutSessionSchema.virtual('status').get(function () {
  if (!this.endedAt) return 'active';
  if (this.totalExercises > 0 && this.completedExercises >= this.totalExercises) return 'completed';
  return 'aborted';
});

workoutSessionSchema.set('toJSON', { virtuals: true });
workoutSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);
