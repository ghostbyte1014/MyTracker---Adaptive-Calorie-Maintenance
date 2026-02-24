'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DailyLogCreate } from '@/types';
import { getToday } from '@/lib/utils';

interface DailyLogFormProps {
  onSubmit: (data: DailyLogCreate) => Promise<void>;
  initialData?: Partial<DailyLogCreate>;
  isLoading?: boolean;
}

export function DailyLogForm({ onSubmit, initialData, isLoading }: DailyLogFormProps) {
  const [formData, setFormData] = useState<DailyLogCreate>({
    date: initialData?.date || getToday(),
    bodyweight: initialData?.bodyweight,
    calories_intake: initialData?.calories_intake || 0,
    calories_burned: initialData?.calories_burned || 0,
    protein: initialData?.protein || 0,
    carbs: initialData?.carbs || 0,
    fats: initialData?.fats || 0,
    sleep_hours: initialData?.sleep_hours,
    recovery_score: initialData?.recovery_score,
    workout_performance: initialData?.workout_performance,
    stress_level: initialData?.stress_level,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : undefined) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="date"
            name="date"
            type="date"
            label="Date"
            value={formData.date}
            onChange={handleChange}
            required
          />
          <Input
            id="bodyweight"
            name="bodyweight"
            type="number"
            step="0.1"
            label="Body Weight (kg)"
            value={formData.bodyweight || ''}
            onChange={handleChange}
            placeholder="70.5"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calories</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="calories_intake"
            name="calories_intake"
            type="number"
            label="Calories In"
            value={formData.calories_intake || ''}
            onChange={handleChange}
            placeholder="2000"
          />
          <Input
            id="calories_burned"
            name="calories_burned"
            type="number"
            label="Calories Burned"
            value={formData.calories_burned || ''}
            onChange={handleChange}
            placeholder="500"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macros (grams)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="protein"
            name="protein"
            type="number"
            label="Protein"
            value={formData.protein || ''}
            onChange={handleChange}
            placeholder="150"
          />
          <Input
            id="carbs"
            name="carbs"
            type="number"
            label="Carbs"
            value={formData.carbs || ''}
            onChange={handleChange}
            placeholder="200"
          />
          <Input
            id="fats"
            name="fats"
            type="number"
            label="Fats"
            value={formData.fats || ''}
            onChange={handleChange}
            placeholder="65"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Ratings (1-10)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="sleep_hours"
            name="sleep_hours"
            type="number"
            step="0.5"
            label="Sleep Hours"
            value={formData.sleep_hours || ''}
            onChange={handleChange}
            placeholder="7.5"
          />
          <Input
            id="recovery_score"
            name="recovery_score"
            type="number"
            min="1"
            max="10"
            label="Recovery Score"
            value={formData.recovery_score || ''}
            onChange={handleChange}
            placeholder="7"
          />
          <Input
            id="workout_performance"
            name="workout_performance"
            type="number"
            min="1"
            max="10"
            label="Workout Performance"
            value={formData.workout_performance || ''}
            onChange={handleChange}
            placeholder="8"
          />
          <Input
            id="stress_level"
            name="stress_level"
            type="number"
            min="1"
            max="10"
            label="Stress Level"
            value={formData.stress_level || ''}
            onChange={handleChange}
            placeholder="5"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Daily Log'}
        </Button>
      </div>
    </form>
  );
}
