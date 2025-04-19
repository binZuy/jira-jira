export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      attachments: {
        Row: {
          created_at: string
          fileName: string | null
          filePath: string | null
          fileType: string | null
          fileUrl: string | null
          id: string
          taskId: number | null
        }
        Insert: {
          created_at?: string
          fileName?: string | null
          filePath?: string | null
          fileType?: string | null
          fileUrl?: string | null
          id?: string
          taskId?: number | null
        }
        Update: {
          created_at?: string
          fileName?: string | null
          filePath?: string | null
          fileType?: string | null
          fileUrl?: string | null
          id?: string
          taskId?: number | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          title: string | null
          userId: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          userId?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string | null
          created_at: string
          id: number
          taskId: string | null
          userId: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          taskId?: string | null
          userId?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          taskId?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["kind"] | null
          title: string | null
          userId: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["kind"] | null
          title?: string | null
          userId?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["kind"] | null
          title?: string | null
          userId?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR" | null
          created_at: string
          details: Json | null
          id: number
          taskId: string | null
          userId: string | null
        }
        Insert: {
          action?: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR" | null
          created_at?: string
          details?: Json | null
          id?: number
          taskId?: string | null
          userId?: string | null
        }
        Update: {
          action?: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR" | null
          created_at?: string
          details?: Json | null
          id?: number
          taskId?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_taskId_fkey"
            columns: ["taskId"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: number
          name: string | null
          role: Database["public"]["Enums"]["memberRole"] | null
          userId: string | null
          workspaceId: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          role?: Database["public"]["Enums"]["memberRole"] | null
          userId?: string | null
          workspaceId?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          role?: Database["public"]["Enums"]["memberRole"] | null
          userId?: string | null
          workspaceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chatId: string | null
          created_at: string
          id: string
          content: string | null
          parts: Json | null
          role: Database["public"]["Enums"]["messageRole"] | null
        }
        Insert: {
          chatId?: string | null
          created_at?: string
          id?: string
          parts?: Json | null
          role?: Database["public"]["Enums"]["messageRole"] | null
        }
        Update: {
          chatId?: string | null
          created_at?: string
          id?: string
          parts?: Json | null
          role?: Database["public"]["Enums"]["messageRole"] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chatId_fkey"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          imageUrl: string | null
          name: string | null
          workspaceId: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          imageUrl?: string | null
          name?: string | null
          workspaceId?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          imageUrl?: string | null
          name?: string | null
          workspaceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: number
          name: string | null
          roomType: Database["public"]["Enums"]["roomType"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          roomType?: Database["public"]["Enums"]["roomType"] | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          roomType?: Database["public"]["Enums"]["roomType"] | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          created_at: string
          description: string | null
          document_create_at: string | null
          documentId: string | null
          id: string
          originalText: string | null
          suggestedText: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_create_at?: string | null
          documentId?: string | null
          id?: string
          originalText?: string | null
          suggestedText?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_create_at?: string | null
          documentId?: string | null
          id?: string
          originalText?: string | null
          suggestedText?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_documentId_document_create_at_fkey"
            columns: ["documentId", "document_create_at"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "created_at"]
          },
        ]
      }
      tasks: {
        Row: {
          assigneeId: string | null
          created_at: string
          credit: number | null
          description: string | null
          dueDate: string | null
          id: string
          name: string | null
          position: number | null
          priority: Database["public"]["Enums"]["cleaningPriority"] | null
          projectId: string | null
          roomId: number | null
          status: Database["public"]["Enums"]["status"] | null
        }
        Insert: {
          assigneeId?: string | null
          created_at?: string
          credit?: number | null
          description?: string | null
          dueDate?: string | null
          id?: string
          name?: string | null
          position?: number | null
          priority?: Database["public"]["Enums"]["cleaningPriority"] | null
          projectId?: string | null
          roomId?: number | null
          status?: Database["public"]["Enums"]["status"] | null
        }
        Update: {
          assigneeId?: string | null
          created_at?: string
          credit?: number | null
          description?: string | null
          dueDate?: string | null
          id?: string
          name?: string | null
          position?: number | null
          priority?: Database["public"]["Enums"]["cleaningPriority"] | null
          projectId?: string | null
          roomId?: number | null
          status?: Database["public"]["Enums"]["status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_projectId_fkey1"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_roomId_fkey1"
            columns: ["roomId"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          imageUrl: string | null
          inviteCode: string
          name: string | null
          userId: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          imageUrl?: string | null
          inviteCode: string
          name?: string | null
          userId?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          imageUrl?: string | null
          inviteCode?: string
          name?: string | null
          userId?: string | null
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
      action: "CREATED" | "UPDATED" | "COMMENTED" | "ASSIGNED_TO"
      cleaningPriority: "LOW" | "HIGH" | "MEDIUM" | "CRITICAL"
      kind: "text" | "code" | "sheet" | "image" | "task"
      memberRole: "ADMIN" | "MEMBER"
      messageRole: "user" | "assistant" | "system" | "data"
      roomType: "STANDARD" | "SUITE" | "DELUXE" | "PRESIDENT"
      status:
        | "TODO"
        | "IN_PROGRESS"
        | "DONE"
        | "OUT_OF_SERVICE"
        | "OUT_OF_ORDER"
        | "READY_FOR_INSPECTION"
        | "PICK_UP"
      taskType: "STAY_OVER" | "DO_NOT_DISTURB" | "DEPARTURE"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action: ["CREATED", "UPDATED", "COMMENTED", "ASSIGNED_TO"],
      cleaningPriority: ["LOW", "HIGH", "MEDIUM", "CRITICAL"],
      kind: ["text", "code", "sheet", "image", "task"],
      memberRole: ["ADMIN", "MEMBER"],
      messageRole: ["user", "assistant", "system", "data"],
      roomType: ["STANDARD", "SUITE", "DELUXE", "PRESIDENT"],
      status: [
        "TODO",
        "IN_PROGRESS",
        "DONE",
        "OUT_OF_SERVICE",
        "OUT_OF_ORDER",
        "READY_FOR_INSPECTION",
        "PICK_UP",
      ],
      taskType: ["STAY_OVER", "DO_NOT_DISTURB", "DEPARTURE"],
    },
  },
} as const