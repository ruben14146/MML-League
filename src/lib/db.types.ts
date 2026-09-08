export type TicketStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "sent_on_dash"
  | "sent_to_lockers";
export type TicketLocation = "inside" | "outside";
export type StaffRole = "developer" | "owner" | "admin";

export type TicketItemRow = {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
};

export type StoreItemRow = {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
};

export type TicketRow = {
  id: string;
  ticket_code: string;
  discord_username: string;
  discord_id: string | null;
  discord_message_link: string;
  player_id: string | null;
  item_id: string | null;
  location: TicketLocation;
  league_name: string | null;
  server_link: string | null;
  status: TicketStatus;
  admin_note: string | null;
  handled_by: string | null;
  is_booster: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffRoleRow = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  role: StaffRole;
  granted_by: string | null;
  created_at: string;
};

export type BannedUserRow = {
  id: string;
  discord_id: string;
  discord_username: string | null;
  reason: string | null;
  banned_by: string | null;
  created_at: string;
};

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  sender_discord_id: string;
  sender_username: string;
  is_staff: boolean;
  body: string;
  created_at: string;
};

export type StaffMessageRow = {
  id: string;
  sender_discord_id: string;
  sender_username: string;
  body: string;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      ticket_items: Table<
        TicketItemRow,
        Partial<TicketItemRow> & { name: string },
        Partial<TicketItemRow>
      >;
      store_items: Table<
        StoreItemRow,
        Partial<StoreItemRow> & { name: string },
        Partial<StoreItemRow>
      >;
      tickets: Table<
        TicketRow,
        Partial<TicketRow> & {
          ticket_code: string;
          discord_username: string;
          discord_message_link: string;
          location: TicketLocation;
        },
        Partial<TicketRow>
      >;
      staff_roles: Table<
        StaffRoleRow,
        Partial<StaffRoleRow> & { discord_id: string; role: StaffRole },
        Partial<StaffRoleRow>
      >;
      banned_users: Table<
        BannedUserRow,
        Partial<BannedUserRow> & { discord_id: string },
        Partial<BannedUserRow>
      >;
      ticket_messages: Table<
        TicketMessageRow,
        Partial<TicketMessageRow> & { ticket_id: string; sender_discord_id: string; sender_username: string; body: string },
        Partial<TicketMessageRow>
      >;
      staff_messages: Table<
        StaffMessageRow,
        Partial<StaffMessageRow> & { sender_discord_id: string; sender_username: string; body: string },
        Partial<StaffMessageRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
