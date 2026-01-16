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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_auth: {
        Row: {
          can_manage_coupons: boolean | null
          can_manage_orders: boolean | null
          can_manage_payment_methods: boolean | null
          can_manage_products: boolean | null
          can_manage_recharges: boolean | null
          can_manage_refunds: boolean | null
          can_manage_stock: boolean | null
          can_manage_tokens: boolean | null
          can_manage_users: boolean | null
          created_at: string
          id: string
          is_super_admin: boolean | null
          user_id: string
        }
        Insert: {
          can_manage_coupons?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_payment_methods?: boolean | null
          can_manage_products?: boolean | null
          can_manage_recharges?: boolean | null
          can_manage_refunds?: boolean | null
          can_manage_stock?: boolean | null
          can_manage_tokens?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string
          id?: string
          is_super_admin?: boolean | null
          user_id: string
        }
        Update: {
          can_manage_coupons?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_payment_methods?: boolean | null
          can_manage_products?: boolean | null
          can_manage_recharges?: boolean | null
          can_manage_refunds?: boolean | null
          can_manage_stock?: boolean | null
          can_manage_tokens?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string
          id?: string
          is_super_admin?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          can_manage_coupons: boolean
          can_manage_orders: boolean
          can_manage_payment_methods: boolean
          can_manage_products: boolean
          can_manage_recharges: boolean
          can_manage_refunds: boolean
          can_manage_stock: boolean
          can_manage_tokens: boolean
          can_manage_users: boolean
          created_at: string
          id: string
          is_active: boolean
          password: string
          updated_at: string
          username: string
        }
        Insert: {
          can_manage_coupons?: boolean
          can_manage_orders?: boolean
          can_manage_payment_methods?: boolean
          can_manage_products?: boolean
          can_manage_recharges?: boolean
          can_manage_refunds?: boolean
          can_manage_stock?: boolean
          can_manage_tokens?: boolean
          can_manage_users?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          password: string
          updated_at?: string
          username: string
        }
        Update: {
          can_manage_coupons?: boolean
          can_manage_orders?: boolean
          can_manage_payment_methods?: boolean
          can_manage_products?: boolean
          can_manage_recharges?: boolean
          can_manage_refunds?: boolean
          can_manage_stock?: boolean
          can_manage_tokens?: boolean
          can_manage_users?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          password?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_amount: number | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_amount?: number | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      device_purchases: {
        Row: {
          created_at: string
          device_fingerprint: string
          id: string
          order_id: string | null
          product_option_id: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          id?: string
          order_id?: string | null
          product_option_id?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          id?: string
          order_id?: string | null
          product_option_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "device_purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_purchases_product_option_id_fkey"
            columns: ["product_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id: string
          sender_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          delivered_at: string | null
          delivered_email: string | null
          delivered_password: string | null
          device_fingerprint: string | null
          discount_amount: number | null
          id: string
          order_number: string
          product_id: string | null
          product_option_id: string | null
          quantity: number
          response_message: string | null
          status: string
          stock_content: string | null
          text_input: string | null
          token_id: string
          total_price: number
          updated_at: string
          verification_link: string | null
        }
        Insert: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_email?: string | null
          delivered_password?: string | null
          device_fingerprint?: string | null
          discount_amount?: number | null
          id?: string
          order_number: string
          product_id?: string | null
          product_option_id?: string | null
          quantity?: number
          response_message?: string | null
          status?: string
          stock_content?: string | null
          text_input?: string | null
          token_id: string
          total_price?: number
          updated_at?: string
          verification_link?: string | null
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_email?: string | null
          delivered_password?: string | null
          device_fingerprint?: string | null
          discount_amount?: number | null
          id?: string
          order_number?: string
          product_id?: string | null
          product_option_id?: string | null
          quantity?: number
          response_message?: string | null
          status?: string
          stock_content?: string | null
          text_input?: string | null
          token_id?: string
          total_price?: number
          updated_at?: string
          verification_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_option_id_fkey"
            columns: ["product_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_info: string | null
          account_name: string | null
          account_number: string | null
          created_at: string
          details: string | null
          display_order: number
          id: string
          instructions: string | null
          is_active: boolean
          is_visible: boolean
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          account_info?: string | null
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          details?: string | null
          display_order?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_visible?: boolean
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          account_info?: string | null
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          details?: string | null
          display_order?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_visible?: boolean
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          original_price: number | null
          price: number
          product_id: string
          requires_email: boolean
          requires_password: boolean
          requires_text_input: boolean
          requires_verification_link: boolean
          text_input_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          original_price?: number | null
          price?: number
          product_id: string
          requires_email?: boolean
          requires_password?: boolean
          requires_text_input?: boolean
          requires_verification_link?: boolean
          text_input_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          original_price?: number | null
          price?: number
          product_id?: string
          requires_email?: boolean
          requires_password?: boolean
          requires_text_input?: boolean
          requires_verification_link?: boolean
          text_input_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      recharge_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string | null
          payment_method_id: string | null
          processed_at: string | null
          proof_image_url: string | null
          sender_reference: string | null
          status: string
          token_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          proof_image_url?: string | null
          sender_reference?: string | null
          status?: string
          token_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          proof_image_url?: string | null
          sender_reference?: string | null
          status?: string
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recharge_requests_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          order_id: string | null
          order_number: string
          processed_at: string | null
          reason: string | null
          status: string
          token_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          order_number: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          token_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          order_number?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          token_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          extra_data: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          extra_data?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          extra_data?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          content: string
          created_at: string
          id: string
          is_sold: boolean
          product_id: string | null
          product_option_id: string
          sold_at: string | null
          sold_to_order_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_sold?: boolean
          product_id?: string | null
          product_option_id: string
          sold_at?: string | null
          sold_to_order_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_sold?: boolean
          product_id?: string | null
          product_option_id?: string
          sold_at?: string | null
          sold_to_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_order_id_fkey"
            columns: ["sold_to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_product_option_id_fkey"
            columns: ["product_option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          balance: number
          created_at: string
          created_ip: string | null
          id: string
          is_blocked: boolean
          token: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          created_ip?: string | null
          id?: string
          is_blocked?: boolean
          token: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          created_ip?: string | null
          id?: string
          is_blocked?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          ip_hash: string | null
          page: string | null
          user_agent: string | null
          visited_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          ip_hash?: string | null
          page?: string | null
          user_agent?: string | null
          visited_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          ip_hash?: string | null
          page?: string | null
          user_agent?: string | null
          visited_at?: string | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const
