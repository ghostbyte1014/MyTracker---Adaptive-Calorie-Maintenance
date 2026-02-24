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
  Filler,
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
  Legend,
  Filler
);

interface WeightChartProps {
  data: DailyLog[];
}

export function WeightChart({ data }: WeightChartProps) {
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = {
    labels: sortedData.map((log) => formatDateShort(log.date)),
    datasets: [
      {
        label: 'Body Weight (kg)',
        data: sortedData.map((log) => log.bodyweight),
        borderColor: '#000000',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#000000',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: '7-Day Avg',
        data: sortedData.map((log) => log.rolling_7day_avg_weight),
        borderColor: '#6b7280',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0,
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
        displayColors: true,
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
        grid: {
          color: '#e5e5e5',
        },
        ticks: {
          color: '#6b7280',
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
