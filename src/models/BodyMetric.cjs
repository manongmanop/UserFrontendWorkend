import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const bodyMetricSchema = new Schema({
    // ID ของผู้ใช้ที่เป็นเจ้าของข้อมูลนี้ (เชื่อมกับ Collection 'users')
    userId: {
        type: Schema.Types.ObjectId,
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

module.exports = BodyMetric;