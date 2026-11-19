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
    PostgrestVersion: "14.17"
  }
  core: {
    Tables: {
      accomplishment_reports: {
        Row: {
          activities: Json
          amount: number | null
          amount_in_words: string | null
          approver_name: string | null
          approver_position: string | null
          created_at: string
          daily_entries: Json
          designation: string | null
          funding: string
          id: string
          period_end: string
          period_start: string
          profile_id: string
          review_remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          supervisor_name: string | null
          updated_at: string
        }
        Insert: {
          activities?: Json
          amount?: number | null
          amount_in_words?: string | null
          approver_name?: string | null
          approver_position?: string | null
          created_at?: string
          daily_entries?: Json
          designation?: string | null
          funding: string
          id?: string
          period_end: string
          period_start: string
          profile_id: string
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          supervisor_name?: string | null
          updated_at?: string
        }
        Update: {
          activities?: Json
          amount?: number | null
          amount_in_words?: string | null
          approver_name?: string | null
          approver_position?: string | null
          created_at?: string
          daily_entries?: Json
          designation?: string | null
          funding?: string
          id?: string
          period_end?: string
          period_start?: string
          profile_id?: string
          review_remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          supervisor_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          am_check_in: string | null
          am_check_out: string | null
          am_in_status: Database["core"]["Enums"]["punch_status"] | null
          am_out_status: Database["core"]["Enums"]["punch_status"] | null
          attendance_date: string
          created_at: string
          id: string
          pm_check_in: string | null
          pm_check_out: string | null
          pm_in_status: Database["core"]["Enums"]["punch_status"] | null
          pm_out_status: Database["core"]["Enums"]["punch_status"] | null
          profile_id: string
        }
        Insert: {
          am_check_in?: string | null
          am_check_out?: string | null
          am_in_status?: Database["core"]["Enums"]["punch_status"] | null
          am_out_status?: Database["core"]["Enums"]["punch_status"] | null
          attendance_date?: string
          created_at?: string
          id?: string
          pm_check_in?: string | null
          pm_check_out?: string | null
          pm_in_status?: Database["core"]["Enums"]["punch_status"] | null
          pm_out_status?: Database["core"]["Enums"]["punch_status"] | null
          profile_id: string
        }
        Update: {
          am_check_in?: string | null
          am_check_out?: string | null
          am_in_status?: Database["core"]["Enums"]["punch_status"] | null
          am_out_status?: Database["core"]["Enums"]["punch_status"] | null
          attendance_date?: string
          created_at?: string
          id?: string
          pm_check_in?: string | null
          pm_check_out?: string | null
          pm_in_status?: Database["core"]["Enums"]["punch_status"] | null
          pm_out_status?: Database["core"]["Enums"]["punch_status"] | null
          profile_id?: string
        }
        Relationships: []
      }
      evaluation_questions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gip_evaluations: {
        Row: {
          answers: Json
          attitude_score: number | null
          created_at: string
          evaluator_id: string | null
          id: string
          overall_score: number | null
          performance_score: number | null
          period_month: string
          profile_id: string
          remarks: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          attitude_score?: number | null
          created_at?: string
          evaluator_id?: string | null
          id?: string
          overall_score?: number | null
          performance_score?: number | null
          period_month: string
          profile_id: string
          remarks?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          attitude_score?: number | null
          created_at?: string
          evaluator_id?: string | null
          id?: string
          overall_score?: number | null
          performance_score?: number | null
          period_month?: string
          profile_id?: string
          remarks?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pacd_files: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string
          size_bytes: number
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          size_bytes: number
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      walkin_attendances: {
        Row: {
          barangay: string
          check_in: string
          check_out: string | null
          contact_number: string | null
          created_at: string
          firstname: string
          gender: Database["core"]["Enums"]["gender_type"]
          geographic: string
          id: string
          lastname: string
          middlename: string | null
          province: string
          purok: string
          purpose: Database["core"]["Enums"]["service_required"]
        }
        Insert: {
          barangay: string
          check_in?: string
          check_out?: string | null
          contact_number?: string | null
          created_at?: string
          firstname: string
          gender?: Database["core"]["Enums"]["gender_type"]
          geographic: string
          id?: string
          lastname: string
          middlename?: string | null
          province: string
          purok: string
          purpose?: Database["core"]["Enums"]["service_required"]
        }
        Update: {
          barangay?: string
          check_in?: string
          check_out?: string | null
          contact_number?: string | null
          created_at?: string
          firstname?: string
          gender?: Database["core"]["Enums"]["gender_type"]
          geographic?: string
          id?: string
          lastname?: string
          middlename?: string | null
          province?: string
          purok?: string
          purpose?: Database["core"]["Enums"]["service_required"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      flag_daily_absences: {
        Args: { target_date?: string }
        Returns: undefined
      }
    }
    Enums: {
      gender_type: "male" | "female" | "not specified"
      punch_status: "ontime" | "late" | "early_out" | "absent"
      service_required:
        | "gip"
        | "spes"
        | "job_start"
        | "ofw"
        | "cea"
        | "skills"
        | "others"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      directories: {
        Row: {
          created_at: string
          id: string
          office_code: string | null
          office_head: string | null
          office_name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_code?: string | null
          office_head?: string | null
          office_name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          office_code?: string | null
          office_head?: string | null
          office_name?: string
          status?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      offices: {
        Row: {
          code: string | null
          created_at: string | null
          directory_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          directory_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          directory_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offices_directory_id_fkey"
            columns: ["directory_id"]
            isOneToOne: false
            referencedRelation: "directories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          firstname: string
          funding: string | null
          id: string
          lastname: string
          middlename: string | null
          office_id: string | null
          passcode: string | null
          position: Database["public"]["Enums"]["profile_position"]
          role: Database["public"]["Enums"]["profile_roles"] | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          firstname: string
          funding?: string | null
          id: string
          lastname: string
          middlename?: string | null
          office_id?: string | null
          passcode?: string | null
          position: Database["public"]["Enums"]["profile_position"]
          role?: Database["public"]["Enums"]["profile_roles"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          firstname?: string
          funding?: string | null
          id?: string
          lastname?: string
          middlename?: string | null
          office_id?: string | null
          passcode?: string | null
          position?: Database["public"]["Enums"]["profile_position"]
          role?: Database["public"]["Enums"]["profile_roles"] | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      profile_position: "employee" | "gip" | "tupad" | "client" | "admin"
      profile_roles: "admin" | "beneficiary" | "supervisor"
      profile_status: "active" | "inactive" | "pending"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  core: {
    Enums: {
      gender_type: ["male", "female", "not specified"],
      punch_status: ["ontime", "late", "early_out", "absent"],
      service_required: [
        "gip",
        "spes",
        "job_start",
        "ofw",
        "cea",
        "skills",
        "others",
      ],
    },
  },
  public: {
    Enums: {
      profile_position: ["employee", "gip", "tupad", "client", "admin"],
      profile_roles: ["admin", "beneficiary", "supervisor"],
      profile_status: ["active", "inactive", "pending"],
    },
  },
} as const
