// API client for communicating with FastAPI backend - Meal Notes Extension
import { MealNote } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class NotesApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mytracker_token', token);
    } else {
      localStorage.removeItem('mytracker_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = typeof window !== 'undefined' ? localStorage.getItem('mytracker_token') : null;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 404 as null (no note exists) instead of throwing error
    if (response.status === 404) {
      return null as T;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Meal Notes - NO trailing slash (backend routes don't have trailing slash)
  async getNotes(limit: number = 100): Promise<MealNote[]> {
    return this.request<MealNote[]>(`/notes?limit=${limit}`);
  }

  async getNoteByDate(date: string): Promise<MealNote | null> {
    return this.request<MealNote | null>(`/notes/${date}`);
  }

  async createNote(logDate: string, content: string): Promise<MealNote> {
    return this.request<MealNote>('/notes', {
      method: 'POST',
      body: JSON.stringify({ log_date: logDate, content }),
    });
  }

  async updateNote(date: string, content: string): Promise<MealNote> {
    return this.request<MealNote>(`/notes/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteNote(date: string): Promise<void> {
    await this.request(`/notes/${date}`, { method: 'DELETE' });
  }
}

export const notesApi = new NotesApiClient();
