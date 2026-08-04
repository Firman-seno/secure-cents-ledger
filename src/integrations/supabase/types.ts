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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          bank_name: string | null
          created_at: string
          currency: string
          current_balance: number | null
          id: string
          initial_balance: number
          is_demo: boolean
          opening_balance: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          id?: string
          initial_balance?: number
          is_demo?: boolean
          opening_balance?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          bank_name?: string | null
          created_at?: string
          currency?: string
          current_balance?: number | null
          id?: string
          initial_balance?: number
          is_demo?: boolean
          opening_balance?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_events: {
        Row: {
          after_data: Json | null
          backup_batch_id: string | null
          before_data: Json | null
          created_at: string
          entity_type: string
          id: string
          operation: string
          record_id: string
          restored_at: string | null
          user_id: string
        }
        Insert: {
          after_data?: Json | null
          backup_batch_id?: string | null
          before_data?: Json | null
          created_at?: string
          entity_type: string
          id?: string
          operation: string
          record_id: string
          restored_at?: string | null
          user_id: string
        }
        Update: {
          after_data?: Json | null
          backup_batch_id?: string | null
          before_data?: Json | null
          created_at?: string
          entity_type?: string
          id?: string
          operation?: string
          record_id?: string
          restored_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_events_backup_batch_id_fkey"
            columns: ["backup_batch_id"]
            isOneToOne: false
            referencedRelation: "backup_history"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          backup_status: string
          backup_type: string
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          notes: string | null
          range_from: string | null
          range_to: string | null
          row_count: number
          scope: string
          skipped_count: number
          started_at: string
          status: string
          storage_location: string
          user_id: string
        }
        Insert: {
          backup_status?: string
          backup_type?: string
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          notes?: string | null
          range_from?: string | null
          range_to?: string | null
          row_count?: number
          scope?: string
          skipped_count?: number
          started_at?: string
          status?: string
          storage_location?: string
          user_id: string
        }
        Update: {
          backup_status?: string
          backup_type?: string
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          notes?: string | null
          range_from?: string | null
          range_to?: string | null
          row_count?: number
          scope?: string
          skipped_count?: number
          started_at?: string
          status?: string
          storage_location?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_records: {
        Row: {
          backed_up_at: string
          id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          backed_up_at?: string
          id?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          backed_up_at?: string
          id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          auto_backup: boolean
          created_at: string
          entry_map: Json
          form_action_url: string
          form_url: string
          sheet_name: string
          skip_duplicates: boolean
          spreadsheet_url: string
          updated_at: string
          user_id: string
          web_app_url: string
        }
        Insert: {
          auto_backup?: boolean
          created_at?: string
          entry_map?: Json
          form_action_url?: string
          form_url?: string
          sheet_name?: string
          skip_duplicates?: boolean
          spreadsheet_url?: string
          updated_at?: string
          user_id: string
          web_app_url?: string
        }
        Update: {
          auto_backup?: boolean
          created_at?: string
          entry_map?: Json
          form_action_url?: string
          form_url?: string
          sheet_name?: string
          skip_duplicates?: boolean
          spreadsheet_url?: string
          updated_at?: string
          user_id?: string
          web_app_url?: string
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          attempt: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone_number: string
          used: boolean
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone_number: string
          used?: boolean
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone_number?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          allow_overdraft: boolean
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          phone: string | null
          profile_photo: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_overdraft?: boolean
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          profile_photo?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_overdraft?: boolean
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          profile_photo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          attachment: string | null
          balance_after: number | null
          category: string | null
          created_at: string
          description: string | null
          fee: number
          id: string
          is_demo: boolean
          payment_method: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string
          to_account_id: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          attachment?: string | null
          balance_after?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          is_demo?: boolean
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          to_account_id?: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          attachment?: string | null
          balance_after?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          is_demo?: boolean
          payment_method?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          to_account_id?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_user_stats: {
        Args: never
        Returns: {
          account_count: number
          created_at: string
          email: string
          full_name: string
          transaction_count: number
          user_id: string
        }[]
      }
      create_full_backup: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restore_backup_event: { Args: { _event_id: string }; Returns: undefined }
    }
    Enums: {
      account_type: "bank" | "cash" | "ewallet" | "other"
      app_role: "admin" | "user"
      transaction_type: "income" | "expense" | "atm_withdrawal" | "transfer"
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
      account_type: ["bank", "cash", "ewallet", "other"],
      app_role: ["admin", "user"],
      transaction_type: ["income", "expense", "atm_withdrawal", "transfer"],
    },
  },
} as const
