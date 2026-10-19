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
      contact_requests: {
        Row: {
          created_at: string
          effectif: string
          email: string
          entreprise: string
          fonction: string
          fonction_autre: string | null
          horizon: string
          id: string
          maturite_ia: number
          message: string | null
          newsletter_opt_in: boolean
          nom: string
          pre_diagnostic: string
          prenom: string
          priorite: string
          secteur: string
          status: string
          telephone: string | null
        }
        Insert: {
          created_at?: string
          effectif: string
          email: string
          entreprise: string
          fonction: string
          fonction_autre?: string | null
          horizon: string
          id?: string
          maturite_ia: number
          message?: string | null
          newsletter_opt_in?: boolean
          nom: string
          pre_diagnostic: string
          prenom: string
          priorite: string
          secteur: string
          status?: string
          telephone?: string | null
        }
        Update: {
          created_at?: string
          effectif?: string
          email?: string
          entreprise?: string
          fonction?: string
          fonction_autre?: string | null
          horizon?: string
          id?: string
          maturite_ia?: number
          message?: string | null
          newsletter_opt_in?: boolean
          nom?: string
          pre_diagnostic?: string
          prenom?: string
          priorite?: string
          secteur?: string
          status?: string
          telephone?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          clients: string
          consent_rgpd: boolean
          created_at: string
          effectif_tranche: string | null
          email: string
          familles_metiers: string[]
          fonction: string | null
          id: string
          naf_code: string | null
          nom: string | null
          plaquette_path: string | null
          prenom: string | null
          produits_services: string
          report_json: Json | null
          secteur_activite: string
          siret: string | null
          site_url: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telephone: string | null
        }
        Insert: {
          clients: string
          consent_rgpd?: boolean
          created_at?: string
          effectif_tranche?: string | null
          email: string
          familles_metiers: string[]
          fonction?: string | null
          id?: string
          naf_code?: string | null
          nom?: string | null
          plaquette_path?: string | null
          prenom?: string | null
          produits_services: string
          report_json?: Json | null
          secteur_activite: string
          siret?: string | null
          site_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telephone?: string | null
        }
        Update: {
          clients?: string
          consent_rgpd?: boolean
          created_at?: string
          effectif_tranche?: string | null
          email?: string
          familles_metiers?: string[]
          fonction?: string | null
          id?: string
          naf_code?: string | null
          nom?: string | null
          plaquette_path?: string | null
          prenom?: string | null
          produits_services?: string
          report_json?: Json | null
          secteur_activite?: string
          siret?: string | null
          site_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telephone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          generated_at: string
          id: string
          lead_id: string
          model: string | null
          needs_review: boolean
          pdf_path: string
          sources: Json | null
          validation_findings: Json | null
        }
        Insert: {
          generated_at?: string
          id?: string
          lead_id: string
          model?: string | null
          needs_review?: boolean
          pdf_path: string
          sources?: Json | null
          validation_findings?: Json | null
        }
        Update: {
          generated_at?: string
          id?: string
          lead_id?: string
          model?: string | null
          needs_review?: boolean
          pdf_path?: string
          sources?: Json | null
          validation_findings?: Json | null
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
      stat_sources: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          in_socle: boolean
          nature: string
          note: string | null
          org: string
          report: string
          sections: string[]
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          nature: string
          note?: string | null
          org: string
          report: string
          sections?: string[]
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          nature?: string
          note?: string | null
          org?: string
          report?: string
          sections?: string[]
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: []
      }
      stats: {
        Row: {
          archived_at: string | null
          claim: string
          created_at: string
          id: string
          isco: string[]
          original_source: string | null
          page: string | null
          projection: boolean
          provenance: string
          scope: string
          source_code: string
          theme: string
          unit: string
          updated_at: string
          updated_by: string | null
          value: number
          verbatim: string
        }
        Insert: {
          archived_at?: string | null
          claim: string
          created_at?: string
          id: string
          isco?: string[]
          original_source?: string | null
          page?: string | null
          projection?: boolean
          provenance: string
          scope: string
          source_code: string
          theme: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value: number
          verbatim: string
        }
        Update: {
          archived_at?: string | null
          claim?: string
          created_at?: string
          id?: string
          isco?: string[]
          original_source?: string | null
          page?: string | null
          projection?: boolean
          provenance?: string
          scope?: string
          source_code?: string
          theme?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
          verbatim?: string
        }
        Relationships: [
          {
            foreignKeyName: "stats_source_code_fkey"
            columns: ["source_code"]
            isOneToOne: false
            referencedRelation: "stat_sources"
            referencedColumns: ["code"]
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
