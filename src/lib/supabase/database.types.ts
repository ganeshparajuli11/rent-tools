export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          id: string;
          organisation_id: string;
          record_id: string | null;
          table_name: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          organisation_id: string;
          record_id?: string | null;
          table_name: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          changes?: Json | null;
          created_at?: string;
          id?: string;
          organisation_id?: string;
          record_id?: string | null;
          table_name?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          id: string;
          organisation_id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organisation_id: string;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organisation_id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      organisations: {
        Row: {
          account_type: string;
          contact_email: string | null;
          created_at: string;
          id: string;
          name: string;
          overdue_email_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          account_type?: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          overdue_email_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          overdue_email_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      owner_leases: {
        Row: {
          created_at: string;
          due_day: number;
          end_date: string | null;
          id: string;
          organisation_id: string;
          owner_email: string | null;
          owner_name: string;
          owner_phone: string | null;
          property_id: string;
          rent_pence: number;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          due_day: number;
          end_date?: string | null;
          id?: string;
          organisation_id: string;
          owner_email?: string | null;
          owner_name: string;
          owner_phone?: string | null;
          property_id: string;
          rent_pence: number;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          due_day?: number;
          end_date?: string | null;
          id?: string;
          organisation_id?: string;
          owner_email?: string | null;
          owner_name?: string;
          owner_phone?: string | null;
          property_id?: string;
          rent_pence?: number;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "owner_leases_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "owner_leases_property_id_organisation_id_fkey";
            columns: ["property_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id", "organisation_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_pence: number;
          created_at: string;
          id: string;
          method: string | null;
          note: string | null;
          organisation_id: string;
          paid_on: string;
          recorded_by: string | null;
          removed_at: string | null;
          rent_charge_id: string;
          updated_at: string;
        };
        Insert: {
          amount_pence: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          note?: string | null;
          organisation_id: string;
          paid_on?: string;
          recorded_by?: string | null;
          removed_at?: string | null;
          rent_charge_id: string;
          updated_at?: string;
        };
        Update: {
          amount_pence?: number;
          created_at?: string;
          id?: string;
          method?: string | null;
          note?: string | null;
          organisation_id?: string;
          paid_on?: string;
          recorded_by?: string | null;
          removed_at?: string | null;
          rent_charge_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_rent_charge_id_organisation_id_fkey";
            columns: ["rent_charge_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "rent_charges";
            referencedColumns: ["id", "organisation_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          archived_at: string | null;
          city: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          organisation_id: string;
          postcode: string | null;
          property_type: string | null;
          updated_at: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          archived_at?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          organisation_id: string;
          postcode?: string | null;
          property_type?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          archived_at?: string | null;
          city?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          organisation_id?: string;
          postcode?: string | null;
          property_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      property_photos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          organisation_id: string;
          property_id: string;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organisation_id: string;
          property_id: string;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organisation_id?: string;
          property_id?: string;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_photos_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_photos_property_id_organisation_id_fkey";
            columns: ["property_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id", "organisation_id"];
          },
        ];
      };
      rent_charges: {
        Row: {
          amount_pence: number;
          created_at: string;
          due_date: string;
          id: string;
          organisation_id: string;
          period_start: string;
          tenancy_id: string;
          updated_at: string;
        };
        Insert: {
          amount_pence: number;
          created_at?: string;
          due_date: string;
          id?: string;
          organisation_id: string;
          period_start: string;
          tenancy_id: string;
          updated_at?: string;
        };
        Update: {
          amount_pence?: number;
          created_at?: string;
          due_date?: string;
          id?: string;
          organisation_id?: string;
          period_start?: string;
          tenancy_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rent_charges_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rent_charges_tenancy_id_organisation_id_fkey";
            columns: ["tenancy_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "tenancies";
            referencedColumns: ["id", "organisation_id"];
          },
        ];
      };
      rooms: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          organisation_id: string;
          property_id: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          organisation_id: string;
          property_id: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          organisation_id?: string;
          property_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_property_id_organisation_id_fkey";
            columns: ["property_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id", "organisation_id"];
          },
        ];
      };
      tenancies: {
        Row: {
          created_at: string;
          deposit_pence: number;
          due_day: number;
          end_date: string | null;
          id: string;
          organisation_id: string;
          property_id: string;
          rent_pence: number;
          room_id: string | null;
          start_date: string;
          tenant_email: string | null;
          tenant_name: string;
          tenant_phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deposit_pence?: number;
          due_day: number;
          end_date?: string | null;
          id?: string;
          organisation_id: string;
          property_id: string;
          rent_pence: number;
          room_id?: string | null;
          start_date: string;
          tenant_email?: string | null;
          tenant_name: string;
          tenant_phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deposit_pence?: number;
          due_day?: number;
          end_date?: string | null;
          id?: string;
          organisation_id?: string;
          property_id?: string;
          rent_pence?: number;
          room_id?: string | null;
          start_date?: string;
          tenant_email?: string | null;
          tenant_name?: string;
          tenant_phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenancies_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenancies_property_id_organisation_id_fkey";
            columns: ["property_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id", "organisation_id"];
          },
          {
            foreignKeyName: "tenancies_room_id_property_id_organisation_id_fkey";
            columns: ["room_id", "property_id", "organisation_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id", "property_id", "organisation_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_organisation: {
        Args: {
          creator_full_name: string;
          org_account_type: string;
          org_contact_email: string;
          org_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
