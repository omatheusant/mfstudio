/**
 * Hand-written mirror of the Supabase schema, typed in the same shape the
 * official codegen produces (including the `Relationships` array on each
 * table, which @supabase/postgrest-js needs to type nested `.select()`
 * embeds like `organization:organizations(...)`). As tables are added
 * phase by phase, extend `Tables`/`Functions` here to match the migration
 * that introduced them.
 *
 * Once a real Supabase project is linked, prefer regenerating this file
 * with:
 *   npx supabase gen types typescript --linked > src/types/database.ts
 * and re-apply the doc comments if you care about keeping them.
 */

export type OrganizationRole = "OWNER" | "ADMIN" | "PROFESSOR" | "STUDENT";
export type MemberStatus = "ACTIVE" | "INACTIVE";
/** 0 = Sunday … 6 = Saturday — Postgres extract(dow)/JS Date.getDay() convention. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type BillingCycle = "MONTHLY" | "WEEKLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";
export type SessionPeriod = "WEEK" | "MONTH";
export type StudentStatus = "ACTIVE" | "INACTIVE";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "SUSPENDED";
export type BookingStatus = "RESERVED" | "CANCELLED" | "CANCELLED_LATE" | "COMPLETED" | "NO_SHOW";
export type CheckinStatus = "PRESENT" | "ABSENT";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          status: MemberStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_settings: {
        Row: {
          organization_id: string;
          default_capacity: number;
          cancellation_window_minutes: number;
          checkin_open_minutes_before: number;
          checkin_close_minutes_after: number;
          block_booking_when_overdue: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          default_capacity?: number;
          cancellation_window_minutes?: number;
          checkin_open_minutes_before?: number;
          checkin_close_minutes_after?: number;
          block_booking_when_overdue?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_slots: {
        Row: {
          id: string;
          organization_id: string;
          schedule_category_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          capacity: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          schedule_category_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          capacity: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_slots"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_slots_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_slots_schedule_category_id_fkey";
            columns: ["schedule_category_id"];
            isOneToOne: false;
            referencedRelation: "schedule_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          price: number;
          billing_cycle: BillingCycle;
          session_limit: number;
          session_period: SessionPeriod;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          price: number;
          billing_cycle?: BillingCycle;
          session_limit: number;
          session_period: SessionPeriod;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "plans_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_schedule_categories: {
        Row: {
          plan_id: string;
          schedule_category_id: string;
          created_at: string;
        };
        Insert: {
          plan_id: string;
          schedule_category_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_schedule_categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "plan_schedule_categories_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_schedule_categories_schedule_category_id_fkey";
            columns: ["schedule_category_id"];
            isOneToOne: false;
            referencedRelation: "schedule_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          status: StudentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          status?: StudentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "students_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          plan_id: string;
          start_date: string;
          end_date: string | null;
          status: SubscriptionStatus;
          price: number;
          billing_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          plan_id: string;
          start_date?: string;
          end_date?: string | null;
          status?: SubscriptionStatus;
          price: number;
          billing_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          schedule_slot_id: string;
          date: string;
          status: BookingStatus;
          created_at: string;
          cancelled_at: string | null;
          cancelled_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          schedule_slot_id: string;
          date: string;
          status?: BookingStatus;
          created_at?: string;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "bookings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_schedule_slot_id_fkey";
            columns: ["schedule_slot_id"];
            isOneToOne: false;
            referencedRelation: "schedule_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      checkins: {
        Row: {
          id: string;
          organization_id: string;
          booking_id: string;
          student_id: string;
          status: CheckinStatus;
          checked_in_at: string;
          checked_in_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          booking_id: string;
          student_id: string;
          status: CheckinStatus;
          checked_in_at?: string;
          checked_in_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checkins"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checkins_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: {
          p_name: string;
          p_slug: string;
          p_timezone?: string;
        };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      is_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      has_role_in_org: {
        Args: { p_organization_id: string; p_roles: string[] };
        Returns: boolean;
      };
      plan_organization_id: {
        Args: { p_plan_id: string };
        Returns: string;
      };
      sync_plan_categories: {
        Args: { p_plan_id: string; p_category_ids: string[] };
        Returns: undefined;
      };
      student_belongs_to_current_user: {
        Args: { p_student_id: string };
        Returns: boolean;
      };
      create_booking: {
        Args: { p_student_id: string; p_schedule_slot_id: string; p_date: string };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      cancel_booking: {
        Args: { p_booking_id: string };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      student_checkin: {
        Args: { p_booking_id: string };
        Returns: Database["public"]["Tables"]["checkins"]["Row"];
      };
      mark_attendance: {
        Args: { p_booking_id: string; p_status: string };
        Returns: Database["public"]["Tables"]["checkins"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
