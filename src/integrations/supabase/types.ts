export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      claimed_plates: {
        Row: {
          claimed_at: string
          id: string
          plate_number: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          plate_number: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          plate_number?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          name: string
          owner_id: string
          tier: Database["public"]["Enums"]["fleet_tier"]
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          tier?: Database["public"]["Enums"]["fleet_tier"]
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          tier?: Database["public"]["Enums"]["fleet_tier"]
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      fleet_vehicles: {
        Row: {
          added_at: string
          company_id: string
          id: string
          plate_number: string
          vehicle_label: string | null
        }
        Insert: {
          added_at?: string
          company_id: string
          id?: string
          plate_number: string
          vehicle_label?: string | null
        }
        Update: {
          added_at?: string
          company_id?: string
          id?: string
          plate_number?: string
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_accounts: {
        Row: {
          approved: boolean
          company_name: string
          contact_email: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          company_name: string
          contact_email: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          company_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      law_enforcement_accounts: {
        Row: {
          approved: boolean
          badge_number: string | null
          contact_email: string
          created_at: string
          department_name: string
          id: string
          tier: Database["public"]["Enums"]["le_tier"]
          user_id: string
        }
        Insert: {
          approved?: boolean
          badge_number?: string | null
          contact_email: string
          created_at?: string
          department_name: string
          id?: string
          tier?: Database["public"]["Enums"]["le_tier"]
          user_id: string
        }
        Update: {
          approved?: boolean
          badge_number?: string | null
          contact_email?: string
          created_at?: string
          department_name?: string
          id?: string
          tier?: Database["public"]["Enums"]["le_tier"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          infraction: string
          location: string
          plate_number: string
          read: boolean
          report_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          infraction: string
          location: string
          plate_number: string
          read?: boolean
          report_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          infraction?: string
          location?: string
          plate_number?: string
          read?: boolean
          report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          credits: number
          display_name: string | null
          id: string
          joined_at: string
          last_report_date: string | null
          streak_days: number
          total_reports: number
          user_id: string
          xp: number
        }
        Insert: {
          credits?: number
          display_name?: string | null
          id?: string
          joined_at?: string
          last_report_date?: string | null
          streak_days?: number
          total_reports?: number
          user_id: string
          xp?: number
        }
        Update: {
          credits?: number
          display_name?: string | null
          id?: string
          joined_at?: string
          last_report_date?: string | null
          streak_days?: number
          total_reports?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      report_upvotes: {
        Row: {
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_upvotes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          infraction: string
          latitude: number | null
          location: string
          longitude: number | null
          plate_number: string
          reporter_id: string | null
          upvote_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          infraction: string
          latitude?: number | null
          location: string
          longitude?: number | null
          plate_number: string
          reporter_id?: string | null
          upvote_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          infraction?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          plate_number?: string
          reporter_id?: string | null
          upvote_count?: number
        }
        Relationships: []
      }
      saved_screenings: {
        Row: {
          created_at: string
          id: string
          name: string
          plates: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plates: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plates?: string[]
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_plate_screening: { Args: { p_plates: string[] }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insurance_plate_lookup: {
        Args: { p_plate_number: string }
        Returns: Json
      }
      is_approved_insurance: { Args: { p_user_id: string }; Returns: boolean }
      is_company_owner: { Args: { p_company_id: string }; Returns: boolean }
      spend_credit_on_report:
        | {
            Args: {
              p_infraction: string
              p_location: string
              p_plate_number: string
            }
            Returns: string
          }
        | {
            Args: {
              p_infraction: string
              p_latitude?: number
              p_location: string
              p_longitude?: number
              p_plate_number: string
            }
            Returns: string
          }
      upvote_report: { Args: { p_report_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      fleet_tier: "starter" | "business" | "premium"
      le_tier: "department" | "precinct" | "agency"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      fleet_tier: ["starter", "business", "premium"],
      le_tier: ["department", "precinct", "agency"],
    },
  },
} as const
