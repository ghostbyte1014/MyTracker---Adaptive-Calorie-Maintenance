'use client';

import React, { useState, useMemo } from 'react';
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

interface MacrosTrendChartProps {
  data: DailyLog[];
}

export function MacrosTrendChart({ data }: MacrosTrendChartProps) {
  const [viewMode, setViewMode] = useState<'grams' | 'percentage'>('grams');

  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  // Calculate calories per gram: Protein=4, Carbs=4, Fat=9
  const chartData = useMemo(() => {
    if (viewMode === 'grams') {
      return {
        labels: sortedData.map((log) => formatDateShort(log.date)),
        datasets: [
          {
            label: 'Protein',
            data: sortedData.map((log) => log.protein),
            borderColor: '#f59e0b', // orange accent
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b',
          },
          {
            label: 'Carbs',
            data: sortedData.map((log) => log.carbs),
            borderColor: '#22c55e', // green
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
          },
          {
            label: 'Fat',
            data: sortedData.map((log) => log.fats),
            borderColor: '#f87171', // soft red
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#f87171',
          },
        ],
      };
    } else {
      // Percentage view - calculate calories from each macro
      const percentages = sortedData.map((log) => {
        const proteinCals = (log.protein || 0) * 4;
        const carbsCals = (log.carbs || 0) * 4;
        const fatCals = (log.fats || 0) * 9;
        const total = proteinCals + carbsCals + fatCals;
        
        if (total === 0) {
          return { protein: 0, carbs: 0, fat: 0 };
        }
        
        return {
          protein: Math.round((proteinCals / total) * 100),
          carbs: Math.round((carbsCals / total) * 100),
          fat: Math.round((fatCals / total) * 100),
        };
      });

      return {
        labels: sortedData.map((log) => formatDateShort(log.date)),
        datasets: [
          {
            label: 'Protein %',
            data: percentages.map((p) => p.protein),
            borderColor: '#f59e0b', // orange accent
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b',
          },
          {
            label: 'Carbs %',
            data: percentages.map((p) => p.carbs),
            borderColor: '#22c55e', // green
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
          },
          {
            label: 'Fat %',
            data: percentages.map((p) => p.fat),
            borderColor: '#f87171', // soft red
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#f87171',
          },
        ],
      };
    }
  }, [sortedData, viewMode]);

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
        max: viewMode === 'grams' ? undefined : 100,
        grid: {
          color: '#e5e5e5',
        },
        ticks: {
          color: '#6b7280',
          callback: function(value: number | string) {
            if (viewMode === 'percentage') {
              return value + '%';
            }
            return value;
          },
        },
      },
    },
  };

  return (
    <div>
      {/* Toggle Button */}
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg bg-dark-200 p-0.5">
          <button
            onClick={() => setViewMode('grams')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'grams'
                ? 'bg-gold-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Grams
          </button>
          <button
            onClick={() => setViewMode('percentage')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'percentage'
                ? 'bg-gold-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Percentage
          </button>
        </div>
      </div>
      
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
