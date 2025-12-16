export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      deliveries: {
        Row: {
          id: string
          method: string | null
          order_id: string | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          id?: string
          method?: string | null
          order_id?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          id?: string
          method?: string | null
          order_id?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          discount_applied: number | null
          final_amount: number | null
          id: string
          status: string | null
          total_amount: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_applied?: number | null
          final_amount?: number | null
          id?: string
          status?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_applied?: number | null
          final_amount?: number | null
          id?: string
          status?: string | null
          total_amount?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requisites: {
        Row: {
          account_number: string | null
          bank_name: string | null
          bik: string | null
          corr_account: string | null
          full_name: string | null
          id: string
          inn: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          bik?: string | null
          corr_account?: string | null
          full_name?: string | null
          id?: string
          inn?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          bik?: string | null
          corr_account?: string | null
          full_name?: string | null
          id?: string
          inn?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requisites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          method: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          method?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          method?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          description: string | null
          id: string
          image_url: string | null
          price: number | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          title?: string | null
        }
        Relationships: []
      }
      products_new: {
        Row: {
          additional_info: string | null
          badge: string | null
          benefits: string[] | null
          capsule_count: number | null
          capsule_volume: string | null
          category: string
          composition: Json | null
          country_of_origin: string | null
          created_at: string | null
          custom_url: string | null
          description: string | null
          expiration_date: string | null
          how_to_take: string | null
          id: string
          images: string[] | null
          long_description: string | null
          manufacturer: string | null
          name: string
          original_price: number | null
          price: number
          rating: number | null
          reviews: number | null
          servings_per_container: number | null
          sku: string | null
          status: string | null
          stock: number
          storage_conditions: string | null
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          additional_info?: string | null
          badge?: string | null
          benefits?: string[] | null
          capsule_count?: number | null
          capsule_volume?: string | null
          category: string
          composition?: Json | null
          country_of_origin?: string | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          expiration_date?: string | null
          how_to_take?: string | null
          id?: string
          images?: string[] | null
          long_description?: string | null
          manufacturer?: string | null
          name: string
          original_price?: number | null
          price: number
          rating?: number | null
          reviews?: number | null
          servings_per_container?: number | null
          sku?: string | null
          status?: string | null
          stock?: number
          storage_conditions?: string | null
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          additional_info?: string | null
          badge?: string | null
          benefits?: string[] | null
          capsule_count?: number | null
          capsule_volume?: string | null
          category?: string
          composition?: Json | null
          country_of_origin?: string | null
          created_at?: string | null
          custom_url?: string | null
          description?: string | null
          expiration_date?: string | null
          how_to_take?: string | null
          id?: string
          images?: string[] | null
          long_description?: string | null
          manufacturer?: string | null
          name?: string
          original_price?: number | null
          price?: number
          rating?: number | null
          reviews?: number | null
          servings_per_container?: number | null
          sku?: string | null
          status?: string | null
          stock?: number
          storage_conditions?: string | null
          updated_at?: string | null
          usage?: string | null
        }
        Relationships: []
      }
      referral_bonus: {
        Row: {
          bonus_amount: number | null
          id: string
          level: number | null
          order_id: string | null
          paid_out: boolean | null
          referred_user_id: string | null
          referrer_id: string | null
        }
        Insert: {
          bonus_amount?: number | null
          id?: string
          level?: number | null
          order_id?: string | null
          paid_out?: boolean | null
          referred_user_id?: string | null
          referrer_id?: string | null
        }
        Update: {
          bonus_amount?: number | null
          id?: string
          level?: number | null
          order_id?: string | null
          paid_out?: boolean | null
          referred_user_id?: string | null
          referrer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonus_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonus_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonus_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          discount_percent: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          discount_percent?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          promo_code: string | null
          referrer_id: string | null
          telegram_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          promo_code?: string | null
          referrer_id?: string | null
          telegram_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          promo_code?: string | null
          referrer_id?: string | null
          telegram_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
