import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Dumbbell,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  Flame, 
  Timer,
  Calendar,
  ArrowLeft,
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import "./WorkoutHistory.css"; 

const API_BASE = "http://10.198.200.52:5000"; 

/* ========== Helper Functions ========== */
const formatDuration = (totalSeconds) => {
  const seconds = Number(totalSeconds) || 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/* ========== UI Components ========== */
const Card = ({ children, className = "", variant = "default", ...props }) => (
  <div className={`history-card ${variant} ${className}`} {...props}>{children}</div>
);

function HistoryCard({ data, index }) {
  const isHard = data.feedbackLevel === 'hard';
  const iconColor = isHard ? '#ef4444' : '#10b981';
  const iconBg = isHard ? '#fee2e2' : '#d1fae5';

  return (
    <Card 
      className="history-item" 
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="history-item-content">
        <div className="history-icon-wrapper">
          <div className="history-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
            {isHard ? <Activity size={20} /> : <Target size={20} />}
          </div>
        </div>

        <div className="history-details">
          <div className="history-header">
            <h3 className="history-title">{data.programName || "ไม่ระบุชื่อโปรแกรม"}</h3>
            <div className="history-date">
              <Calendar size={12} />
              <span>{formatDate(data.finishedAt)}</span>
            </div>
          </div>
          
          <div className="history-stats-row">
            <div className="stat-pill-timer">
              <Timer size={14} />
              <span>{formatDuration(data.totalSeconds)}</span>
            </div>
            <div className="stat-pill-kcal">
              <Flame size={14} />
              <span>{data.caloriesBurned} kcal</span>
            </div>
            <div className="stat-pill-exercises">
              <Dumbbell size={14} />
              <span>{data.totalExercises} ท่า</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FilterPanel({ filters, onFilterChange, histories }) {
  const [showFilters, setShowFilters] = useState(false);

  // คำนวณสถิติภาพรวมจากข้อมูลที่มีอยู่จริง
  const stats = useMemo(() => {
    const totalWorkouts = histories.length;
    const totalCalories = histories.reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);
    const totalSeconds = histories.reduce((sum, h) => sum + (h.totalSeconds || 0), 0);
    const avgCalories = totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0;

    return { totalWorkouts, totalCalories, totalSeconds, avgCalories };
  }, [histories]);

  return (
    <div className="filter-panel-wrapper">
      {/* Dashboard Stats */}
      <div className="stats-grid-history">
        <div className="stat-card-history">
          <div className="stat-value">{stats.totalWorkouts}</div>
          <div className="stat-label">จำนวนครั้ง</div>
        </div>
        <div className="stat-card-history">
          <div className="stat-value">{stats.totalCalories}</div>
          <div className="stat-label">Kcal รวม</div>
        </div>
        <div className="stat-card-history">
          <div className="stat-value">{Math.round(stats.totalSeconds / 60)}</div>
          <div className="stat-label">นาทีรวม</div>
        </div>
        <div className="stat-card-history">
          <div className="stat-value">{stats.avgCalories}</div>
          <div className="stat-label">Avg Kcal</div>
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
        onClick={() => setShowFilters(!showFilters)}
      >
        <div className="flex-center">
          <Filter size={18} />
          <span>ตัวกรองและการค้นหา</span>
        </div>
        {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Filter Controls Area */}
      {showFilters && (
        <div className="filter-controls fade-in">
          
          {/* Search */}
          <div className="filter-group full-width">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="filter-input"
                placeholder="ค้นหาชื่อโปรแกรม..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
              />
              {filters.search && (
                <button className="clear-search-btn" onClick={() => onFilterChange('search', '')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Difficulty Chips */}
          <div className="filter-group">
            <label className="filter-label">ความยาก</label>
            <div className="filter-chips">
              {[
                { value: '', label: 'ทั้งหมด' },
                { value: 'easy', label: 'ง่าย' },
                { value: 'medium', label: 'ปานกลาง' },
                { value: 'hard', label: 'ยาก' }
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`chip ${filters.difficulty === opt.value ? 'active' : ''}`}
                  onClick={() => onFilterChange('difficulty', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Chips */}
          <div className="filter-group">
            <label className="filter-label">ช่วงเวลา</label>
            <div className="filter-chips">
              {[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'today', label: 'วันนี้' },
                { value: '7days', label: '7 วันล่าสุด' },
                { value: '30days', label: '30 วันล่าสุด' }
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`chip ${filters.dateRange === opt.value ? 'active' : ''}`}
                  onClick={() => onFilterChange('dateRange', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Select */}
          <div className="filter-group">
            <label className="filter-label">เรียงลำดับ</label>
            <select 
              className="filter-select"
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
            >
              <option value="newest">ใหม่ที่สุด</option>
              <option value="oldest">เก่าที่สุด</option>
              <option value="mostCalories">เผาผลาญมากสุด</option>
              <option value="leastCalories">เผาผลาญน้อยสุด</option>
            </select>
          </div>

          {/* Calorie Range Slider */}
          <div className="filter-group full-width">
            <div className="range-header">
              <label className="filter-label">แคลอรี่สูงสุด</label>
              <span className="range-value">{filters.maxCalories} kcal</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              className="filter-range"
              value={filters.maxCalories}
              onChange={(e) => onFilterChange('maxCalories', parseInt(e.target.value))}
              style={{
                backgroundSize: `${(filters.maxCalories / 1000) * 100}% 100%`
              }}
            />
          </div>

          {/* Actions */}
          <div className="filter-actions">
            <button 
              className="clear-filters-btn"
              onClick={() => onFilterChange('reset', true)}
            >
              <RefreshCw size={16} />
              รีเซ็ตตัวกรอง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkoutHistory() {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: '',
    difficulty: '',
    minCalories: 0,
    maxCalories: 1000,
    dateRange: 'all',
    sortBy: 'newest'
  });

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/histories/user/${uid}`);
      setHistories(res.data);
    } catch (err) {
      throw new Error("ไม่สามารถเชื่อมต่อ Server ได้");
    }
  };

  useEffect(() => {
    if (!uid) {
      setError("ไม่พบรหัสผู้ใช้");
      setLoading(false);
      return;
    }
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        await fetchHistory();
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    run();
    return () => { isMounted = false; };
  }, [uid]);

  const filteredHistories = useMemo(() => {
    let result = [...histories];

    if (filters.search) {
      result = result.filter(h => h.programName?.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.difficulty) {
      result = result.filter(h => h.feedbackLevel === filters.difficulty);
    }
    result = result.filter(h => (h.caloriesBurned || 0) <= filters.maxCalories);

    if (filters.dateRange !== 'all') {
      const now = new Date();
      result = result.filter(h => {
        const finishedDate = new Date(h.finishedAt);
        const daysDiff = Math.floor((now - finishedDate) / (1000 * 60 * 60 * 24));
        if (filters.dateRange === 'today') return daysDiff === 0;
        if (filters.dateRange === '7days') return daysDiff <= 7;
        if (filters.dateRange === '30days') return daysDiff <= 30;
        return true;
      });
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest': return new Date(a.finishedAt) - new Date(b.finishedAt);
        case 'mostCalories': return (b.caloriesBurned || 0) - (a.caloriesBurned || 0);
        case 'leastCalories': return (a.caloriesBurned || 0) - (b.caloriesBurned || 0);
        case 'newest': default: return new Date(b.finishedAt) - new Date(a.finishedAt);
      }
    });

    return result;
  }, [histories, filters]);

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({ search: '', difficulty: '', minCalories: 0, maxCalories: 1000, dateRange: 'all', sortBy: 'newest' });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="history-container">
      <div className="history-bg"></div>

      <header className="history-header-section">
        <button className="history-back-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={24} />
        </button>
        <div className="history-header-text">
          <h1 className="history-page-title">ประวัติการฝึก</h1>
          <p className="history-page-subtitle">บันทึกความสำเร็จของคุณ</p>
        </div>
      </header>

      <main className="history-content">
        {loading ? (
          <div className="history-loading">
            <RefreshCw className="spinner-icon" size={32} />
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <Card variant="error" className="history-error">
            <AlertCircle className="error-icon" size={32} />
            <h3>เกิดข้อผิดพลาด</h3>
            <p>{error}</p>
            <button className="error-retry-btn" onClick={() => window.location.reload()}>ลองใหม่</button>
          </Card>
        ) : histories.length > 0 ? (
          <>
            <FilterPanel filters={filters} onFilterChange={handleFilterChange} histories={histories} />
            {filteredHistories.length === 0 ? (
              <div className="history-empty-search">
                <Search size={48} className="empty-icon" />
                <h3>ไม่พบข้อมูลที่ค้นหา</h3>
                <p>ลองเปลี่ยนเงื่อนไขตัวกรองใหม่</p>
                <button className="empty-action-btn" onClick={() => handleFilterChange('reset', true)}>ล้างตัวกรอง</button>
              </div>
            ) : (
              <div className="history-list">
                <div className="history-count-label">พบ {filteredHistories.length} รายการ</div>
                {filteredHistories.map((item, index) => (
                  <HistoryCard key={item._id} data={item} index={index} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="history-empty-state">
            <Dumbbell size={64} className="empty-icon" />
            <h3>ยังไม่มีประวัติการฝึก</h3>
            <p>เริ่มออกกำลังกายเพื่อสร้างสถิติใหม่!</p>
            <button className="empty-action-btn" onClick={() => navigate('/home')}>เริ่มเลย</button>
          </div>
        )}
      </main>
    </div>
  );
}