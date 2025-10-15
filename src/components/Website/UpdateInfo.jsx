import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { updateProfile } from 'firebase/auth';
import '../style/global.css'

const UpdateUserDataForm = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEmail(user.email || '');
        setName(user.displayName || '');

        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setHeight(data.height || '');
          setWeight(data.weight || '');
          setGender(data.gender || '');
        }
        setLoading(false);
      } else {
        setError('กรุณาเข้าสู่ระบบก่อน');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!height || !weight || !gender) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('ไม่พบผู้ใช้');
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        name: user.displayName,
        height: parseFloat(height),
        weight: parseFloat(weight),
        gender,
        updatedAt: new Date()
      }, { merge: true });

      navigate('/home');
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-10">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">แก้ไขข้อมูลส่วนตัว</h2>

      <div className="mb-4 text-center text-gray-700">
        <p><strong>อีเมล:</strong> {email}</p>
        <p><strong>ชื่อ:</strong> {name || 'ไม่มีชื่อในบัญชี Google'}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="height">ส่วนสูง (ซม.)</label>
          <input
            id="height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="เช่น 170"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="weight">น้ำหนัก (กก.)</label>
          <input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="เช่น 65"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">เพศ</label>
          <div className="flex gap-4">
            {['male', 'female', 'other'].map((value) => (
              <label key={value} className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value={value}
                  checked={gender === value}
                  onChange={() => setGender(value)}
                  className="mr-2"
                  required
                />
                {value === 'male' ? 'ชาย' : value === 'female' ? 'หญิง' : 'อื่นๆ'}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'อัปเดตข้อมูล'}
        </button>
      </form>
    </div>
  );
};

export default UpdateUserDataForm;
