// BodyMetricsChart.jsx
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './BodyMetricsChart.css';

// ลงทะเบียนคอมโพเนนต์ที่จำเป็นของ ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BodyMetricsChart = ({ data, timeRange }) => {
  // ตั้งค่าตัวเลือกของกราฟ
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    tension: 0.3, // ทำให้เส้นโค้งมน
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#2d3748',
        bodyColor: '#2d3748',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          // ปรับแต่งการแสดงผลของ tooltip
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              // เพิ่มหน่วยตามประเภทข้อมูล
              if (label.includes('ไขมัน')) {
                label += context.parsed.y + '%';
              } else {
                label += context.parsed.y + ' กก.';
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: '#718096'
        }
      },
      y: {
        grid: {
          color: 'rgba(226, 232, 240, 0.6)'
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: '#718096',
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <div className="chart-time-filter">
        <button className={timeRange === '1m' ? 'active' : ''}>1 เดือน</button>
        <button className={timeRange === '3m' ? 'active' : ''}>3 เดือน</button>
        <button className={timeRange === '6m' ? 'active' : ''}>6 เดือน</button>
        <button className={timeRange === '1y' ? 'active' : ''}>1 ปี</button>
        <button className={timeRange === 'all' ? 'active' : ''}>ทั้งหมด</button>
      </div>
      <div className="chart-wrapper">
        <Line options={options} data={data} height={300} />
      </div>
    </div>
  );
};

export default BodyMetricsChart;