export interface HabitTemplate {
  template_type: 'workout' | 'meditate' | 'water' | 'read' | 'sleep' | 'custom'
  name: string
  description: string
  response_type: 'boolean' | 'number' | 'text'
  response_unit?: string
  default_reminder_time: string
  icon: string
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    template_type: 'workout',
    name: 'Daily Workout',
    description: 'Track your daily exercise',
    response_type: 'number',
    response_unit: 'minutes',
    default_reminder_time: '07:00',
    icon: '💪',
  },
  {
    template_type: 'meditate',
    name: 'Meditation',
    description: 'Track your meditation practice',
    response_type: 'number',
    response_unit: 'minutes',
    default_reminder_time: '06:30',
    icon: '🧘',
  },
  {
    template_type: 'water',
    name: 'Water Intake',
    description: 'Stay hydrated throughout the day',
    response_type: 'number',
    response_unit: 'glasses',
    default_reminder_time: '09:00',
    icon: '💧',
  },
  {
    template_type: 'read',
    name: 'Reading',
    description: 'Build a daily reading habit',
    response_type: 'number',
    response_unit: 'pages',
    default_reminder_time: '21:00',
    icon: '📚',
  },
  {
    template_type: 'sleep',
    name: 'Sleep Tracking',
    description: 'Track your sleep duration',
    response_type: 'number',
    response_unit: 'hours',
    default_reminder_time: '22:00',
    icon: '😴',
  },
]

export interface Habit {
  id: string
  user_id: string
  template_type: string | null
  name: string
  description: string | null
  response_type: 'boolean' | 'number' | 'text'
  response_unit: string | null
  reminder_time: string
  reminder_enabled: boolean
  is_active: boolean
  streak_count: number
  longest_streak: number
  created_at: string
  updated_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed: boolean
  response_value: string | null
  source: 'sms' | 'web' | 'api'
  notes: string | null
  logged_at: string
  created_at: string
}
