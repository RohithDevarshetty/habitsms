export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone_number: string
          timezone: string
          subscription_tier: string
          subscription_status: string
          dodo_customer_id: string | null
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone_number: string
          timezone?: string
          subscription_tier?: string
          subscription_status?: string
          dodo_customer_id?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          timezone?: string
          subscription_tier?: string
          subscription_status?: string
          dodo_customer_id?: string | null
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          max_members: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          max_members?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          max_members?: number
          created_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          template_type: string | null
          name: string
          description: string | null
          response_type: string
          response_unit: string | null
          reminder_time: string
          reminder_enabled: boolean
          is_active: boolean
          streak_count: number
          longest_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_type?: string | null
          name: string
          description?: string | null
          response_type: string
          response_unit?: string | null
          reminder_time: string
          reminder_enabled?: boolean
          is_active?: boolean
          streak_count?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_type?: string | null
          name?: string
          description?: string | null
          response_type?: string
          response_unit?: string | null
          reminder_time?: string
          reminder_enabled?: boolean
          is_active?: boolean
          streak_count?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          completed: boolean
          response_value: string | null
          source: string
          notes: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          completed?: boolean
          response_value?: string | null
          source?: string
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          completed?: boolean
          response_value?: string | null
          source?: string
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
      }
      sms_messages: {
        Row: {
          id: string
          user_id: string
          habit_id: string | null
          phone_number: string
          message_body: string
          direction: string
          status: string | null
          provider: string
          provider_message_id: string | null
          cost_cents: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id?: string | null
          phone_number: string
          message_body: string
          direction: string
          status?: string | null
          provider?: string
          provider_message_id?: string | null
          cost_cents?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit_id?: string | null
          phone_number?: string
          message_body?: string
          direction?: string
          status?: string | null
          provider?: string
          provider_message_id?: string | null
          cost_cents?: number | null
          created_at?: string
        }
      }
      subscription_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          provider: string
          provider_event_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          provider: string
          provider_event_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          provider?: string
          provider_event_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      scheduled_tasks: {
        Row: {
          id: string
          task_type: string
          user_id: string | null
          habit_id: string | null
          scheduled_for: string
          status: string
          retry_count: number
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_type: string
          user_id?: string | null
          habit_id?: string | null
          scheduled_for: string
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_type?: string
          user_id?: string | null
          habit_id?: string | null
          scheduled_for?: string
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
