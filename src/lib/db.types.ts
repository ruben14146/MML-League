export type TicketStatus = "pending" | "accepted" | "rejected";
export type TicketLocation = "inside" | "outside";

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
  item_id: string | null;
  location: TicketLocation;
  league_name: string | null;
  server_link: string | null;
  status: TicketStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
