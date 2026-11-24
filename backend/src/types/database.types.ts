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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_rewards: {
        Row: {
          ad_network: string
          created_at: string | null
          id: string
          network_tx_id: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          ad_network: string
          created_at?: string | null
          id?: string
          network_tx_id: string
          reward_amount: number
          user_id: string
        }
        Update: {
          ad_network?: string
          created_at?: string | null
          id?: string
          network_tx_id?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      apple_purchases: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apple_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_apple_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_identities: {
        Row: {
          device_id: string
          id: string
          identity_key: string
          registration_id: number
          signed_prekey: string
          signed_prekey_id: number
          signed_prekey_signature: string
        }
        Insert: {
          device_id: string
          id?: string
          identity_key: string
          registration_id?: number
          signed_prekey: string
          signed_prekey_id?: number
          signed_prekey_signature: string
        }
        Update: {
          device_id?: string
          id?: string
          identity_key?: string
          registration_id?: number
          signed_prekey?: string
          signed_prekey_id?: number
          signed_prekey_signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_crypto_identities_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_one_time_prekeys: {
        Row: {
          identity_id: string
          key_id: number
          public_key: string
        }
        Insert: {
          identity_id: string
          key_id: number
          public_key: string
        }
        Update: {
          identity_id?: string
          key_id?: number
          public_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_crypto_one_time_prekeys_identity"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
        }
        Insert: {
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Update: {
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
        }
        Relationships: []
      }
      entity_block_tickets: {
        Row: {
          block_id: string
          created_at: string
          entity_id: string
          ticket_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          entity_id: string
          ticket_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          entity_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_block_tickets_to_block"
            columns: ["block_id", "entity_id"]
            isOneToOne: false
            referencedRelation: "entity_blocks"
            referencedColumns: ["id", "entity_id"]
          },
          {
            foreignKeyName: "fk_block_tickets_to_ticket"
            columns: ["ticket_id", "entity_id"]
            isOneToOne: false
            referencedRelation: "review_tickets"
            referencedColumns: ["id", "target_id"]
          },
        ]
      }
      entity_blocks: {
        Row: {
          blocked_at: string
          entity_id: string
          id: string
          period: unknown
          reason: string
          unblocked_at: string | null
        }
        Insert: {
          blocked_at?: string
          entity_id: string
          id?: string
          period?: unknown
          reason?: string
          unblocked_at?: string | null
        }
        Update: {
          blocked_at?: string
          entity_id?: string
          id?: string
          period?: unknown
          reason?: string
          unblocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_entity_blocks_entity_id"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_purge_queue: {
        Row: {
          created_at: string
          entity_id: string
          error_message: string | null
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_purge_queue_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          space_id: string
          subject_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          space_id: string
          subject_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          space_id?: string
          subject_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_relations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          client_message_id: string
          created_at: string
          encrypted_payload: string
          group_id: string
          id: string
          sender_identity_id: string
          sequence_iteration: number
        }
        Insert: {
          client_message_id: string
          created_at?: string
          encrypted_payload: string
          group_id: string
          id?: string
          sender_identity_id: string
          sequence_iteration: number
        }
        Update: {
          client_message_id?: string
          created_at?: string
          encrypted_payload?: string
          group_id?: string
          id?: string
          sender_identity_id?: string
          sequence_iteration?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_messages_sender"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "participant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_participants: {
        Row: {
          group_id: string
          id: string
          identity_id: string
        }
        Insert: {
          group_id: string
          id?: string
          identity_id: string
        }
        Update: {
          group_id?: string
          id?: string
          identity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_participants_identity"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "participant_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sender_keys: {
        Row: {
          created_at: string
          encrypted_sender_key: string
          generation: number
          group_id: string
          id: string
          message_type: number
          receiver_identity_id: string
          sender_identity_id: string
        }
        Insert: {
          created_at?: string
          encrypted_sender_key: string
          generation: number
          group_id: string
          id?: string
          message_type: number
          receiver_identity_id: string
          sender_identity_id: string
        }
        Update: {
          created_at?: string
          encrypted_sender_key?: string
          generation?: number
          group_id?: string
          id?: string
          message_type?: number
          receiver_identity_id?: string
          sender_identity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_sender_keys_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "participant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_group_sender_keys_receiver"
            columns: ["receiver_identity_id"]
            isOneToOne: false
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_group_sender_keys_sender"
            columns: ["sender_identity_id"]
            isOneToOne: false
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          client_message_id: string
          encrypted_payload: string
          id: string
          inbox_id: string
          message_type: number
        }
        Insert: {
          client_message_id: string
          encrypted_payload: string
          id?: string
          inbox_id: string
          message_type: number
        }
        Update: {
          client_message_id?: string
          encrypted_payload?: string
          id?: string
          inbox_id?: string
          message_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      inboxes: {
        Row: {
          access_level: number
          id: string
          identity_id: string
          is_accepting_messages: boolean
          is_locked_for_review: boolean
        }
        Insert: {
          access_level?: number
          id?: string
          identity_id: string
          is_accepting_messages?: boolean
          is_locked_for_review?: boolean
        }
        Update: {
          access_level?: number
          id?: string
          identity_id?: string
          is_accepting_messages?: boolean
          is_locked_for_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_inboxes_identity"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "crypto_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_game_states: {
        Row: {
          created_at: string
          game_state: Json
          match_id: string
        }
        Insert: {
          created_at?: string
          game_state: Json
          match_id: string
        }
        Update: {
          created_at?: string
          game_state?: Json
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_game_states_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          room_id: string
          settings_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          version: number
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          room_id: string
          settings_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          version?: number
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          room_id?: string
          settings_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "participant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "settings"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_groups: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      review_tickets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_review_tickets_reporter_id"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_tickets_target_id"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active_deadline: number | null
          bet_amount: number
          display_name: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          join_code_hash: string | null
          updated_at: string
        }
        Insert: {
          active_deadline?: number | null
          bet_amount: number
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          join_code_hash?: string | null
          updated_at?: string
        }
        Update: {
          active_deadline?: number | null
          bet_amount?: number
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          join_code_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_entity_fkey"
            columns: ["id", "entity_type"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "entity_type"]
          },
        ]
      }
      settings: {
        Row: {
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          required_players: number
          rules_payload: Json
          turn_duration: number
        }
        Insert: {
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          required_players: number
          rules_payload?: Json
          turn_duration: number
        }
        Update: {
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          required_players?: number
          rules_payload?: Json
          turn_duration?: number
        }
        Relationships: []
      }
      store_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          reward_amount: number
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          reward_amount: number
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reward_amount?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          description: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_entity_fkey"
            columns: ["id", "entity_type"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "entity_type"]
          },
        ]
      }
      stripe_purchases: {
        Row: {
          created_at: string | null
          id: string
          payment_intent_id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_intent_id: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_intent_id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stripe_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_chat_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          sent_at: string
          signature: string
          signed_payload: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          sent_at: string
          signature: string
          signed_payload: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          sent_at?: string
          signature?: string
          signed_payload?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "review_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_matches: {
        Row: {
          match_id: string
          ticket_id: string
        }
        Insert: {
          match_id: string
          ticket_id: string
        }
        Update: {
          match_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_matches_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "review_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_deletion_custom_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string
          id: string
          reason_id: string
          reason_type: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Insert: {
          created_at?: string | null
          feedback_text: string
          id?: string
          reason_id: string
          reason_type?: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Update: {
          created_at?: string | null
          feedback_text?: string
          id?: string
          reason_id?: string
          reason_type?: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Relationships: [
          {
            foreignKeyName: "user_deletion_custom_feedback_reason_id_reason_type_fkey"
            columns: ["reason_id", "reason_type"]
            isOneToOne: false
            referencedRelation: "user_deletion_reasons"
            referencedColumns: ["id", "reason"]
          },
        ]
      }
      user_deletion_reasons: {
        Row: {
          count: number
          created_at: string | null
          id: string
          reason: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          reason: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["user_deletion_reason_type"]
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_devices_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          abandons_count: number
          dodges_count: number
          last_abandon_at: string | null
          last_dodge_at: string | null
          user_id: string
        }
        Insert: {
          abandons_count?: number
          dodges_count?: number
          last_abandon_at?: string | null
          last_dodge_at?: string | null
          user_id: string
        }
        Update: {
          abandons_count?: number
          dodges_count?: number
          last_abandon_at?: string | null
          last_dodge_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          deleted_at: string | null
          deletion_reason_id: string | null
          display_name: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_admin: boolean
          is_incognito: boolean
          settings: Json
        }
        Insert: {
          avatar?: string | null
          deleted_at?: string | null
          deletion_reason_id?: string | null
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          gender?: Database["public"]["Enums"]["gender"]
          id: string
          is_admin?: boolean
          is_incognito?: boolean
          settings?: Json
        }
        Update: {
          avatar?: string | null
          deleted_at?: string | null
          deletion_reason_id?: string | null
          display_name?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_admin?: boolean
          is_incognito?: boolean
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_deletion_reason"
            columns: ["deletion_reason_id"]
            isOneToOne: false
            referencedRelation: "user_deletion_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_entity_fkey"
            columns: ["id", "entity_type"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "entity_type"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "wallet_transactions_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          entity_id: string
        }
        Insert: {
          balance?: number
          entity_id: string
        }
        Update: {
          balance?: number
          entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallets_entity_id"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      create_relation_tx: {
        Args: { p_space_id: string; p_subject_id: string; p_target_id: string }
        Returns: {
          created_at: string
          expires_at: string | null
          id: string
          space_id: string
          subject_id: string
          target_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entity_relations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_ai_schema_dump: { Args: never; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      entity_type: "user" | "room" | "store" | "system"
      game_type: "pasur" | "durak"
      gender: "male" | "female"
      match_status: "waiting" | "playing" | "paused" | "finished" | "cancelled"
      ticket_status: "pending" | "resolved"
      user_deletion_reason_type:
        | "privacy_concerns"
        | "bad_matchmaking"
        | "too_many_bugs"
        | "found_alternative"
        | "no_longer_needed"
        | "other"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entity_type: ["user", "room", "store", "system"],
      game_type: ["pasur", "durak"],
      gender: ["male", "female"],
      match_status: ["waiting", "playing", "paused", "finished", "cancelled"],
      ticket_status: ["pending", "resolved"],
      user_deletion_reason_type: [
        "privacy_concerns",
        "bad_matchmaking",
        "too_many_bugs",
        "found_alternative",
        "no_longer_needed",
        "other",
      ],
    },
  },
} as const
