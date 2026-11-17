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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      commandes: {
        Row: {
          articles: Json
          client_nom: string
          client_telephone: string
          created_at: string
          frais_livraison: number
          id: string
          livreur_id: string | null
          note: string | null
          numero: string
          repere: string
          sous_total: number
          statut: string
          total: number
          zone_id: string | null
          zone_nom: string
        }
        Insert: {
          articles: Json
          client_nom: string
          client_telephone: string
          created_at?: string
          frais_livraison?: number
          id?: string
          livreur_id?: string | null
          note?: string | null
          numero?: string
          repere: string
          sous_total: number
          statut?: string
          total: number
          zone_id?: string | null
          zone_nom: string
        }
        Update: {
          articles?: Json
          client_nom?: string
          client_telephone?: string
          created_at?: string
          frais_livraison?: number
          id?: string
          livreur_id?: string | null
          note?: string | null
          numero?: string
          repere?: string
          sous_total?: number
          statut?: string
          total?: number
          zone_id?: string | null
          zone_nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "commandes_livreur_id_fkey"
            columns: ["livreur_id"]
            isOneToOne: false
            referencedRelation: "livreurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones_livraison"
            referencedColumns: ["id"]
          },
        ]
      }
      livreurs: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          nom: string
          telephone: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id?: string
          nom: string
          telephone?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          nom?: string
          telephone?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          categorie: string
          created_at: string
          description: string
          description_courte: string
          disponible: boolean
          formats: string[]
          id: string
          image_url: string | null
          images: Json
          masque: boolean
          nom: string
          nouveau: boolean
          ordre: number
          populaire: boolean
          prix: number
          prix_promo: number | null
          recommande: boolean
          seuil_alerte: number
          sku: string
          slug: string
          sous_categorie: string
          stock: number
          updated_at: string
          variantes: Json
        }
        Insert: {
          categorie?: string
          created_at?: string
          description?: string
          description_courte?: string
          disponible?: boolean
          formats?: string[]
          id?: string
          image_url?: string | null
          images?: Json
          masque?: boolean
          nom: string
          nouveau?: boolean
          ordre?: number
          populaire?: boolean
          prix?: number
          prix_promo?: number | null
          recommande?: boolean
          seuil_alerte?: number
          sku?: string
          slug: string
          sous_categorie?: string
          stock?: number
          updated_at?: string
          variantes?: Json
        }
        Update: {
          categorie?: string
          created_at?: string
          description?: string
          description_courte?: string
          disponible?: boolean
          formats?: string[]
          id?: string
          image_url?: string | null
          images?: Json
          masque?: boolean
          nom?: string
          nouveau?: boolean
          ordre?: number
          populaire?: boolean
          prix?: number
          prix_promo?: number | null
          recommande?: boolean
          seuil_alerte?: number
          sku?: string
          slug?: string
          sous_categorie?: string
          stock?: number
          updated_at?: string
          variantes?: Json
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
      zones_livraison: {
        Row: {
          actif: boolean
          description: string
          frais: number
          id: string
          nom: string
          ordre: number
        }
        Insert: {
          actif?: boolean
          description?: string
          frais?: number
          id?: string
          nom: string
          ordre?: number
        }
        Update: {
          actif?: boolean
          description?: string
          frais?: number
          id?: string
          nom?: string
          ordre?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      passer_commande: {
        Args: {
          p_articles: Json
          p_nom: string
          p_note: string
          p_repere: string
          p_telephone: string
          p_zone_id: string
        }
        Returns: Json
      }
      suivre_commande: {
        Args: { p_numero: string; p_telephone: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
