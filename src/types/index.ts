// =============================================================================
// BidByHand — Auction Management Platform
// Comprehensive TypeScript Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type OrgMemberRole = "admin" | "manager" | "staff" | "readonly";

export type EventType = "silent" | "virtual" | "hybrid" | "live" | "gala";

export type EventStatus = "draft" | "published" | "active" | "closed" | "archived";

export type TicketTypeKind = "individual" | "table" | "sponsorship" | "comp";

export type GuestCategory = "vip" | "sponsor" | "general";

export type ItemType =
  | "silent"
  | "live"
  | "buy_now"
  | "donation"
  | "paddle_raise"
  | "raffle"
  | "merchandise";

export type ItemStatus = "draft" | "active" | "paused" | "closed" | "fulfilled";

export type BidStatus = "active" | "outbid" | "won" | "voided";

export type InvoiceStatus = "pending" | "paid" | "partial" | "refunded";

export type PaymentMethod = "card" | "cash" | "check";

export type PaymentStatus = "succeeded" | "pending" | "failed" | "refunded";

export type MessageChannel = "push" | "sms" | "email";

export type RecipientType = "all" | "vip" | "sponsor" | "individual";

export type DiscountType = "percentage" | "fixed";

// -----------------------------------------------------------------------------
// Database Row Types
// -----------------------------------------------------------------------------

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  /** Stripe Connect account id for receiving payouts */
  stripe_account_id: string | null;
  /** Default currency code (e.g. "USD") */
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  /** Display name within the organization */
  display_name: string;
  email: string;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  type: EventType;
  status: EventStatus;
  description: string | null;
  cover_image_url: string | null;
  venue_name: string | null;
  venue_address: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  /** Whether guests can register themselves via the public page */
  allow_self_registration: boolean;
  /** Whether guests can bid online (vs. in-person only) */
  allow_online_bidding: boolean;
  /** Minimum increment for silent auction bids (in cents) */
  bid_increment: number;
  currency: string;
  /** Optional fundraising target (in cents) */
  goal_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  kind: TicketTypeKind;
  /** Price in cents */
  price: number;
  /** Number of seats included (e.g. 10 for a table) */
  seats: number;
  /** Maximum tickets available; null = unlimited */
  quantity: number | null;
  /** Number of tickets sold so far */
  sold_count: number;
  description: string | null;
  /** Ticket sales open/close window */
  sale_start: string | null;
  sale_end: string | null;
  created_at: string;
  updated_at: string;
};

export type Guest = {
  id: string;
  event_id: string;
  /** Bidder/paddle number assigned at check-in */
  paddle_number: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  category: GuestCategory;
  /** Associated ticket type (if purchased a ticket) */
  ticket_type_id: string | null;
  /** Table or seating assignment label */
  table_assignment: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  /** Auth user id if guest has a linked account */
  user_id: string | null;
  /** Stripe customer id for payment processing */
  stripe_customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Item = {
  id: string;
  event_id: string;
  /** Lot number displayed in the catalog */
  lot_number: string;
  title: string;
  description: string | null;
  type: ItemType;
  item_type: ItemType;
  status: ItemStatus;
  /** Category for filtering (Travel, Experiences, Sports, etc.) */
  category: string | null;
  /** Primary display image */
  photo_url: string | null;
  /** Multiple photos for the item */
  photos: string[];
  /** Additional gallery images */
  gallery_urls: string[];
  /** Estimated fair market value in cents */
  fair_market_value: number | null;
  /** Starting bid amount in cents */
  starting_bid: number;
  /** Minimum bid increment in cents; overrides event default */
  bid_increment: number | null;
  /** Fixed price for buy_now items, in cents */
  buy_now_price: number | null;
  /** Current highest bid amount in cents (denormalized) */
  current_bid: number | null;
  /** Number of bids placed (denormalized) */
  bid_count: number;
  /** Guest id of current highest bidder (denormalized) */
  winner_id: string | null;
  /** Name of the donor/sponsor who provided the item */
  donor_name: string | null;
  donor_email: string | null;
  /** When this item's bidding closes */
  closes_at: string | null;
  /** Whether item is visible to bidders */
  is_visible: boolean;
  /** Reserve price in cents */
  reserve_price: number | null;
  /** Available quantity */
  quantity: number;
  /** Display order within the catalog */
  sort_order: number;
  /** Consignment/donor info */
  consignment_donor_name: string | null;
  consignment_donor_id: string | null;
  /** Bundled package items */
  package_items: unknown | null;
  created_at: string;
  updated_at: string;
};

export type Bid = {
  id: string;
  item_id: string;
  guest_id: string;
  /** Bid amount in cents */
  amount: number;
  /** Maximum proxy/auto-bid ceiling in cents */
  proxy_max: number | null;
  status: BidStatus;
  /** Whether this bid was placed by staff on behalf of the guest */
  is_proxy: boolean;
  /** Whether this is currently the winning bid */
  is_winning: boolean;
  created_at: string;
};

export type Aircode = {
  id: string;
  event_id: string;
  /** Short alphanumeric code guests enter to join the event */
  code: string;
  /** Whether the code is currently usable */
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type Donation = {
  id: string;
  event_id: string;
  guest_id: string | null;
  /** Donation amount in cents */
  amount: number;
  /** Whether the donor wishes to remain anonymous */
  anonymous: boolean;
  /** Optional message from the donor */
  message: string | null;
  /** Associated fundraising page, if any */
  fundraising_page_id: string | null;
  created_at: string;
};

export type FundraisingPage = {
  id: string;
  event_id: string;
  title: string;
  slug: string;
  description: string | null;
  /** Fundraising target in cents */
  goal_amount: number;
  /** Total raised so far in cents (denormalized) */
  raised_amount: number;
  cover_image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  event_id: string;
  guest_id: string;
  /** Human-readable invoice number (e.g. "INV-00042") */
  invoice_number: string;
  status: InvoiceStatus;
  /** Itemized line entries on the invoice */
  line_items: InvoiceLineItem[];
  /** Subtotal before discounts/fees, in cents */
  subtotal: number;
  /** Discount amount in cents */
  discount_amount: number;
  /** Tax amount in cents */
  tax_amount: number;
  /** Final total in cents */
  total: number;
  /** Amount paid so far in cents */
  paid_amount: number;
  /** Applied discount code id */
  discount_code_id: string | null;
  notes: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItem = {
  /** Reference to the source item or donation */
  reference_id: string | null;
  description: string;
  /** Amount in cents */
  amount: number;
  quantity: number;
};

export type Payment = {
  id: string;
  invoice_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Payment amount in cents */
  amount: number;
  /** Stripe PaymentIntent id (for card payments) */
  stripe_payment_intent_id: string | null;
  /** Last 4 digits of card, or check number */
  reference: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  event_id: string;
  channel: MessageChannel;
  recipient_type: RecipientType;
  /** Specific guest ids when recipient_type is "individual" */
  recipient_ids: string[] | null;
  subject: string | null;
  body: string;
  /** Whether the message has been dispatched */
  sent: boolean;
  sent_at: string | null;
  /** Delivery/open stats */
  delivered_count: number;
  opened_count: number;
  created_at: string;
};

export type DiscountCode = {
  id: string;
  event_id: string;
  code: string;
  discount_type: DiscountType;
  /** Discount value: percentage (0–100) or fixed amount in cents */
  value: number;
  /** Maximum number of times this code can be redeemed; null = unlimited */
  max_uses: number | null;
  /** Number of times the code has been used */
  used_count: number;
  /** Whether the code is currently redeemable */
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type EventAnalytics = {
  id: string;
  event_id: string;
  /** Total revenue raised in cents */
  total_raised: number;
  /** Total number of bids placed */
  bid_count: number;
  /** Number of unique guests who placed at least one bid */
  active_bidders: number;
  /** Number of registered guests */
  registered_guests: number;
  /** Number of guests who checked in */
  checked_in_guests: number;
  /** Total donations received in cents */
  donation_total: number;
  /** Snapshot timestamp */
  recorded_at: string;
};

// -----------------------------------------------------------------------------
// Form / Input Types
// -----------------------------------------------------------------------------

export type CreateOrganization = {
  name: string;
  slug: string;
  logo_url?: string | null;
  website?: string | null;
  currency?: string;
  timezone?: string;
};

export type UpdateOrganization = Partial<
  Pick<Organization, "name" | "slug" | "logo_url" | "website" | "currency" | "timezone" | "stripe_account_id">
>;

export type CreateEvent = {
  org_id: string;
  name: string;
  slug: string;
  type: EventType;
  description?: string | null;
  cover_image_url?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  allow_self_registration?: boolean;
  allow_online_bidding?: boolean;
  bid_increment?: number;
  currency?: string;
  goal_amount?: number | null;
};

export type UpdateEvent = Partial<
  Omit<CreateEvent, "org_id"> & Pick<Event, "status">
>;

export type CreateTicketType = {
  event_id: string;
  name: string;
  kind: TicketTypeKind;
  /** Price in cents */
  price: number;
  seats?: number;
  quantity?: number | null;
  description?: string | null;
  sale_start?: string | null;
  sale_end?: string | null;
};

export type CreateItem = {
  event_id: string;
  lot_number: string;
  title: string;
  description?: string | null;
  type: ItemType;
  photo_url?: string | null;
  gallery_urls?: string[];
  fair_market_value?: number | null;
  /** Starting bid in cents */
  starting_bid: number;
  bid_increment?: number | null;
  buy_now_price?: number | null;
  donor_name?: string | null;
  donor_email?: string | null;
  sort_order?: number;
};

export type UpdateItem = Partial<
  Omit<CreateItem, "event_id"> & Pick<Item, "status">
>;

export type PlaceBid = {
  item_id: string;
  guest_id: string;
  /** Bid amount in cents */
  amount: number;
  /** Optional proxy/auto-bid ceiling in cents */
  proxy_max?: number | null;
};

export type RegisterGuest = {
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  category?: GuestCategory;
  ticket_type_id?: string | null;
  table_assignment?: string | null;
  notes?: string | null;
};

export type UpdateGuest = Partial<
  Omit<RegisterGuest, "event_id"> & Pick<Guest, "paddle_number" | "checked_in" | "checked_in_at">
>;

export type CreateDonation = {
  event_id: string;
  guest_id?: string | null;
  /** Donation amount in cents */
  amount: number;
  anonymous?: boolean;
  message?: string | null;
  fundraising_page_id?: string | null;
};

export type CreateInvoice = {
  event_id: string;
  guest_id: string;
  line_items: InvoiceLineItem[];
  discount_code_id?: string | null;
  notes?: string | null;
};

export type CreatePayment = {
  invoice_id: string;
  method: PaymentMethod;
  /** Payment amount in cents */
  amount: number;
  stripe_payment_intent_id?: string | null;
  reference?: string | null;
};

export type CreateMessage = {
  event_id: string;
  channel: MessageChannel;
  recipient_type: RecipientType;
  recipient_ids?: string[] | null;
  subject?: string | null;
  body: string;
};

export type CreateDiscountCode = {
  event_id: string;
  code: string;
  discount_type: DiscountType;
  /** Percentage (0–100) or fixed amount in cents */
  value: number;
  max_uses?: number | null;
  active?: boolean;
  expires_at?: string | null;
};

export type CreateFundraisingPage = {
  event_id: string;
  title: string;
  slug: string;
  description?: string | null;
  goal_amount: number;
  cover_image_url?: string | null;
  active?: boolean;
};

export type CreateAircode = {
  event_id: string;
  code: string;
  active?: boolean;
  expires_at?: string | null;
};

// -----------------------------------------------------------------------------
// Composite / View Types
// -----------------------------------------------------------------------------

/** Item with its full bid history and current winner details */
export type ItemWithBids = Item & {
  bids: Bid[];
  winner: Pick<Guest, "id" | "first_name" | "last_name" | "paddle_number"> | null;
};

/** Guest with their invoice and payment breakdown */
export type GuestWithInvoice = Guest & {
  invoice: Invoice | null;
  payments: Payment[];
};

/** Top-level event dashboard used on the admin overview screen */
export type EventDashboard = Event & {
  summary: {
    /** Total raised across bids, donations, and tickets (in cents) */
    total_raised: number;
    bid_count: number;
    active_bidders: number;
    registered_guests: number;
    checked_in_guests: number;
    donation_total: number;
    top_items: Pick<Item, "id" | "title" | "current_bid" | "bid_count">[];
    top_bidders: (Pick<Guest, "id" | "first_name" | "last_name" | "paddle_number"> & {
      total_spent: number;
    })[];
  };
};

/** Bid enriched with item details for the bidder's "My Bids" view */
export type BidWithItem = Bid & {
  item: Pick<Item, "id" | "title" | "photo_url" | "current_bid" | "status" | "lot_number">;
};

/** Event with its available ticket types for the public event page */
export type EventWithTickets = Event & {
  ticket_types: TicketType[];
};

/** Guest row joined with their bid activity for checkout / admin views */
export type GuestWithBids = Guest & {
  bids: Bid[];
  /** Sum of all winning bid amounts in cents */
  total_owed: number;
};

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

/** Standard API response wrapper */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/** Paginated list response */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Realtime subscription payload from Supabase */
export type RealtimePayload<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T | null;
  old: T | null;
};
