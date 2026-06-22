// Types générés depuis le schéma Supabase (projet `mira-dev`).
// Régénérer après toute migration : via le MCP Supabase (generate_typescript_types)
// ou la CLI : `supabase gen types typescript --project-id saohfhieudjnwjgsotev`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          clients: string
          consent_rgpd: boolean
          created_at: string
          effectif_tranche: string | null
          email: string
          familles_metiers: string[]
          id: string
          naf_code: string | null
          plaquette_path: string | null
          produits_services: string
          report_json: Json | null
          secteur_activite: string
          siret: string | null
          site_url: string | null
          status: Database["public"]["Enums"]["lead_status"]
        }
        Insert: {
          clients: string
          consent_rgpd?: boolean
          created_at?: string
          effectif_tranche?: string | null
          email: string
          familles_metiers: string[]
          id?: string
          naf_code?: string | null
          plaquette_path?: string | null
          produits_services: string
          report_json?: Json | null
          secteur_activite: string
          siret?: string | null
          site_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Update: {
          clients?: string
          consent_rgpd?: boolean
          created_at?: string
          effectif_tranche?: string | null
          email?: string
          familles_metiers?: string[]
          id?: string
          naf_code?: string | null
          plaquette_path?: string | null
          produits_services?: string
          report_json?: Json | null
          secteur_activite?: string
          siret?: string | null
          site_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          generated_at: string
          id: string
          lead_id: string
          model: string | null
          pdf_path: string
          sources: Json | null
        }
        Insert: {
          generated_at?: string
          id?: string
          lead_id: string
          model?: string | null
          pdf_path: string
          sources?: Json | null
        }
        Update: {
          generated_at?: string
          id?: string
          lead_id?: string
          model?: string | null
          pdf_path?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      lead_status: "received" | "generating" | "sent" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
