'use client';

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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DailyLog } from '@/types';
import { formatDateShort } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceChartProps {
  data: DailyLog[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = {
    labels: sortedData.map((log) => formatDateShort(log.date)),
    datasets: [
      {
        label: 'Workout Performance',
        data: sortedData.map((log) => log.workout_performance),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#f59e0b',
      },
      {
        label: 'Recovery Score',
        data: sortedData.map((log) => log.recovery_score),
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
      },
      {
        label: 'Stress Level',
        data: sortedData.map((log) => log.stress_level),
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#ef4444',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#000000',
        borderColor: '#e5e5e5',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
      y: {
        min: 0,
        max: 10,
        grid: {
          color: '#e5e5e5',
        },
        ticks: {
          color: '#6b7280',
          stepSize: 2,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}
