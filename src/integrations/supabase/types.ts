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
          free_dispute_used: boolean
          id: string
          paid: boolean
          paid_at: string | null
          plate_number: string
          state: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          free_dispute_used?: boolean
          id?: string
          paid?: boolean
          paid_at?: string | null
          plate_number: string
          state?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          free_dispute_used?: boolean
          id?: string
          paid?: boolean
          paid_at?: string | null
          plate_number?: string
          state?: string | null
          stripe_session_id?: string | null
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
          state: string | null
          vehicle_label: string | null
        }
        Insert: {
          added_at?: string
          company_id: string
          id?: string
          plate_number: string
          state?: string | null
          vehicle_label?: string | null
        }
        Update: {
          added_at?: string
          company_id?: string
          id?: string
          plate_number?: string
          state?: string | null
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
          state: string | null
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
          state?: string | null
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
          state?: string | null
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
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          credits: number
          display_name: string | null
          home_state: string | null
          id: string
          joined_at: string
          last_report_date: string | null
          streak_days: number
          terms_accepted_at: string | null
          terms_version: string | null
          total_reports: number
          user_id: string
          xp: number
        }
        Insert: {
          credits?: number
          display_name?: string | null
          home_state?: string | null
          id?: string
          joined_at?: string
          last_report_date?: string | null
          streak_days?: number
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_reports?: number
          user_id: string
          xp?: number
        }
        Update: {
          credits?: number
          display_name?: string | null
          home_state?: string | null
          id?: string
          joined_at?: string
          last_report_date?: string | null
          streak_days?: number
          terms_accepted_at?: string | null
          terms_version?: string | null
          total_reports?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          key: string
          last_refill: string
          tokens: number
        }
        Insert: {
          key: string
          last_refill?: string
          tokens: number
        }
        Update: {
          key?: string
          last_refill?: string
          tokens?: number
        }
        Relationships: []
      }
      report_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          report_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          report_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "report_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      report_disputes: {
        Row: {
          created_at: string
          disputer_id: string
          id: string
          note: string | null
          paid: boolean
          plate_number: string
          reason: string
          report_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          created_at?: string
          disputer_id: string
          id?: string
          note?: string | null
          paid?: boolean
          plate_number: string
          reason: string
          report_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          created_at?: string
          disputer_id?: string
          id?: string
          note?: string | null
          paid?: boolean
          plate_number?: string
          reason?: string
          report_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      report_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "report_upvotes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          comment: string | null
          created_at: string
          downvote_count: number
          driver_gender: string | null
          hot_take: string | null
          id: string
          infraction: string
          latitude: number | null
          location: string
          longitude: number | null
          plate_number: string
          reporter_id: string | null
          state: string | null
          tags: string[] | null
          upvote_count: number
          vehicle_color: string | null
          vehicle_features: string[] | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          downvote_count?: number
          driver_gender?: string | null
          hot_take?: string | null
          id?: string
          infraction: string
          latitude?: number | null
          location: string
          longitude?: number | null
          plate_number: string
          reporter_id?: string | null
          state?: string | null
          tags?: string[] | null
          upvote_count?: number
          vehicle_color?: string | null
          vehicle_features?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          downvote_count?: number
          driver_gender?: string | null
          hot_take?: string | null
          id?: string
          infraction?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          plate_number?: string
          reporter_id?: string | null
          state?: string | null
          tags?: string[] | null
          upvote_count?: number
          vehicle_color?: string | null
          vehicle_features?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          plate_number: string | null
          price_id: string
          product_id: string
          state: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plate_number?: string | null
          price_id: string
          product_id: string
          state?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plate_number?: string | null
          price_id?: string
          product_id?: string
          state?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_plate_lists: {
        Row: {
          account_id: string
          account_type: string
          created_at: string
          file_name: string
          id: string
          name: string
          plate_count: number
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_type: string
          created_at?: string
          file_name: string
          id?: string
          name: string
          plate_count?: number
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_type?: string
          created_at?: string
          file_name?: string
          id?: string
          name?: string
          plate_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_plates: {
        Row: {
          id: string
          label: string | null
          last_scanned_at: string | null
          list_id: string
          plate_number: string
          risk_score: number
          state: string | null
          total_reports: number
          verified_reports: number
        }
        Insert: {
          id?: string
          label?: string | null
          last_scanned_at?: string | null
          list_id: string
          plate_number: string
          risk_score?: number
          state?: string | null
          total_reports?: number
          verified_reports?: number
        }
        Update: {
          id?: string
          label?: string | null
          last_scanned_at?: string | null
          list_id?: string
          plate_number?: string
          risk_score?: number
          state?: string | null
          total_reports?: number
          verified_reports?: number
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_plates_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "uploaded_plate_lists"
            referencedColumns: ["id"]
          },
        ]
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
      reports_public: {
        Row: {
          blacklist_tier: string | null
          comment: string | null
          created_at: string | null
          downvote_count: number | null
          driver_gender: string | null
          hot_take: string | null
          id: string | null
          infraction: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          plate_number: string | null
          reporter_id: string | null
          tags: string[] | null
          upvote_count: number | null
          vehicle_color: string | null
          vehicle_features: string[] | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          blacklist_tier?: never
          comment?: string | null
          created_at?: string | null
          downvote_count?: number | null
          driver_gender?: string | null
          hot_take?: string | null
          id?: string | null
          infraction?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          plate_number?: never
          reporter_id?: string | null
          tags?: string[] | null
          upvote_count?: number | null
          vehicle_color?: string | null
          vehicle_features?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          blacklist_tier?: never
          comment?: string | null
          created_at?: string | null
          downvote_count?: number | null
          driver_gender?: string | null
          hot_take?: string | null
          id?: string | null
          infraction?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          plate_number?: never
          reporter_id?: string | null
          tags?: string[] | null
          upvote_count?: number | null
          vehicle_color?: string | null
          vehicle_features?: string[] | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      wall_of_shame_mv: {
        Row: {
          last_reported_at: string | null
          plate_number: string | null
          report_count: number | null
          state: string | null
          top_infraction: string | null
          total_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonymize_old_reports: { Args: never; Returns: undefined }
      batch_plate_screening: { Args: { p_plates: string[] }; Returns: Json }
      check_rate_limit: {
        Args: { p_capacity: number; p_key: string; p_refill_per_sec: number }
        Returns: boolean
      }
      dispute_eligibility: { Args: { p_report_id: string }; Returns: Json }
      get_homepage_stats: { Args: never; Returns: Json }
      get_wall_of_shame: {
        Args: { p_limit?: number; p_state?: string }
        Returns: {
          last_reported_at: string
          plate_number: string
          report_count: number
          state: string
          top_infraction: string
          total_score: number
        }[]
      }
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
      plate_blacklist_tier: { Args: { p_plate: string }; Returns: string }
      plate_display: { Args: { p_plate: string }; Returns: string }
      purge_old_notifications: { Args: never; Returns: undefined }
      purge_stale_rate_limits: { Args: never; Returns: undefined }
      refresh_wall_of_shame: { Args: never; Returns: undefined }
      resolve_dispute: {
        Args: { p_decision: string; p_dispute_id: string }
        Returns: undefined
      }
      scan_uploaded_plates: { Args: { p_list_id: string }; Returns: undefined }
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
        | {
            Args: {
              p_comment?: string
              p_driver_gender?: string
              p_infraction: string
              p_latitude?: number
              p_location: string
              p_longitude?: number
              p_plate_number: string
              p_vehicle_color?: string
              p_vehicle_features?: string[]
              p_vehicle_make?: string
              p_vehicle_model?: string
              p_vehicle_type?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_comment?: string
              p_driver_gender?: string
              p_infraction: string
              p_ip?: string
              p_latitude?: number
              p_location: string
              p_longitude?: number
              p_plate_number: string
              p_state?: string
              p_vehicle_color?: string
              p_vehicle_features?: string[]
              p_vehicle_make?: string
              p_vehicle_model?: string
              p_vehicle_type?: string
            }
            Returns: string
          }
      submit_dispute: {
        Args: { p_note?: string; p_reason: string; p_report_id: string }
        Returns: Json
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
