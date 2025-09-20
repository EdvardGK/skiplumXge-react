export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      energy_certificates: {
        Row: {
          id: string
          knr: number | null
          gnr: number | null
          bnr: number | null
          snr: number | null
          fnr: number | null
          andelsnummer: string | null
          building_number: string | null
          address: string
          postal_code: string
          city: string
          unit_number: string | null
          organization_number: string | null
          building_category: string | null
          construction_year: number | null
          energy_class: string | null
          heating_class: string | null
          energy_consumption: number | null
          heating_consumption: number | null
          total_energy_area: number | null
          heated_area: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          knr?: number | null
          gnr?: number | null
          bnr?: number | null
          snr?: number | null
          fnr?: number | null
          andelsnummer?: string | null
          building_number?: string | null
          address: string
          postal_code: string
          city: string
          unit_number?: string | null
          organization_number?: string | null
          building_category?: string | null
          construction_year?: number | null
          energy_class?: string | null
          heating_class?: string | null
          energy_consumption?: number | null
          heating_consumption?: number | null
          total_energy_area?: number | null
          heated_area?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          knr?: number | null
          gnr?: number | null
          bnr?: number | null
          snr?: number | null
          fnr?: number | null
          andelsnummer?: string | null
          building_number?: string | null
          address?: string
          postal_code?: string
          city?: string
          unit_number?: string | null
          organization_number?: string | null
          building_category?: string | null
          construction_year?: number | null
          energy_class?: string | null
          heating_class?: string | null
          energy_consumption?: number | null
          heating_consumption?: number | null
          total_energy_area?: number | null
          heated_area?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      municipality_price_zones: {
        Row: {
          id: string
          kommune_number: string
          kommune_name: string
          price_zone: string
          created_at: string | null
          updated_at: string | null
          fylke_name: string | null
        }
        Insert: {
          id?: string
          kommune_number: string
          kommune_name: string
          price_zone: string
          created_at?: string | null
          updated_at?: string | null
          fylke_name?: string | null
        }
        Update: {
          id?: string
          kommune_number?: string
          kommune_name?: string
          price_zone?: string
          created_at?: string | null
          updated_at?: string | null
          fylke_name?: string | null
        }
        Relationships: []
      }
      electricity_prices_nve: {
        Row: {
          id: string
          week: string
          year: number
          week_number: number
          zone: string
          spot_price_ore_kwh: number
          spot_price_kr_kwh: number | null
          data_source: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          week: string
          year: number
          week_number: number
          zone: string
          spot_price_ore_kwh: number
          spot_price_kr_kwh?: number | null
          data_source?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          week?: string
          year?: number
          week_number?: number
          zone?: string
          spot_price_ore_kwh?: number
          spot_price_kr_kwh?: number | null
          data_source?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_searches: {
        Row: {
          id: string
          session_id: string
          search_query: string
          selected_address: string | null
          search_results_count: number | null
          timestamp: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          session_id: string
          search_query: string
          selected_address?: string | null
          search_results_count?: number | null
          timestamp?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          search_query?: string
          selected_address?: string | null
          search_results_count?: number | null
          timestamp?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          id: string
          session_id: string
          address: string
          building_type: string
          total_bra: number | null
          heated_area: number | null
          current_consumption: number | null
          calculated_consumption: number | null
          energy_grade: string | null
          tek17_requirement: number | null
          tek17_compliant: boolean | null
          annual_waste_kwh: number | null
          annual_waste_kr: number | null
          investment_room_kr: number | null
          created_at: string | null
          building_year: number | null
          heating_system: string | null
          lighting_system: string | null
          ventilation_system: string | null
          hot_water_system: string | null
        }
        Insert: {
          id?: string
          session_id: string
          address: string
          building_type: string
          total_bra?: number | null
          heated_area?: number | null
          current_consumption?: number | null
          calculated_consumption?: number | null
          energy_grade?: string | null
          tek17_requirement?: number | null
          tek17_compliant?: boolean | null
          annual_waste_kwh?: number | null
          annual_waste_kr?: number | null
          investment_room_kr?: number | null
          created_at?: string | null
          building_year?: number | null
          heating_system?: string | null
          lighting_system?: string | null
          ventilation_system?: string | null
          hot_water_system?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          address?: string
          building_type?: string
          total_bra?: number | null
          heated_area?: number | null
          current_consumption?: number | null
          calculated_consumption?: number | null
          energy_grade?: string | null
          tek17_requirement?: number | null
          tek17_compliant?: boolean | null
          annual_waste_kwh?: number | null
          annual_waste_kr?: number | null
          investment_room_kr?: number | null
          created_at?: string | null
          building_year?: number | null
          heating_system?: string | null
          lighting_system?: string | null
          ventilation_system?: string | null
          hot_water_system?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          id: string
          session_id: string
          action_type: string
          timestamp: string | null
          user_agent: string | null
          ip_address: string | null
          analysis_id: string | null
          address: string | null
          conversion_value_estimate: number | null
        }
        Insert: {
          id?: string
          session_id: string
          action_type: string
          timestamp?: string | null
          user_agent?: string | null
          ip_address?: string | null
          analysis_id?: string | null
          address?: string | null
          conversion_value_estimate?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          action_type?: string
          timestamp?: string | null
          user_agent?: string | null
          ip_address?: string | null
          analysis_id?: string | null
          address?: string | null
          conversion_value_estimate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_price_zone: {
        Args: {
          p_kommune_number: string
        }
        Returns: string
      }
      search_addresses: {
        Args: {
          query_text: string
          limit_count?: number
        }
        Returns: {
          address: string
          postal_code: string
          city: string
          energy_class: string | null
          energy_consumption: number | null
          similarity: number
        }[]
      }
      get_postal_statistics: {
        Args: {
          postal: string
        }
        Returns: {
          total_buildings: number
          avg_energy_consumption: number | null
          most_common_energy_class: string | null
          construction_year_range: string | null
        }
      }
      calculate_tek17_requirement: {
        Args: {
          building_type: string
          bra_area: number
        }
        Returns: number
      }
      track_conversion: {
        Args: {
          p_session_id: string
          p_action_type: string
          p_address?: string
          p_analysis_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}