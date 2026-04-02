-- ============================================================================
-- BidByHand: Auction Management & Mobile Bidding Platform
-- Initial Schema Migration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE org_role AS ENUM ('admin', 'manager', 'staff', 'readonly');

CREATE TYPE event_type AS ENUM ('silent', 'virtual', 'hybrid', 'live', 'gala');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'closed', 'archived');

CREATE TYPE ticket_kind AS ENUM ('individual', 'table', 'sponsorship', 'comp');

CREATE TYPE guest_category AS ENUM ('vip', 'sponsor', 'general');

CREATE TYPE item_type AS ENUM ('silent', 'live', 'buy_now', 'donation', 'paddle_raise', 'raffle', 'merchandise');
CREATE TYPE item_status AS ENUM ('draft', 'active', 'paused', 'closed', 'fulfilled');

CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'won', 'voided');

CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'partial', 'refunded');

CREATE TYPE payment_method_kind AS ENUM ('card', 'cash', 'check');
CREATE TYPE payment_status AS ENUM ('succeeded', 'pending', 'failed', 'refunded');

CREATE TYPE message_channel AS ENUM ('push', 'sms', 'email');
CREATE TYPE recipient_type AS ENUM ('all', 'vip', 'sponsor', 'individual');

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Organizations
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo_url    TEXT,
    ein         TEXT,                          -- tax ID / EIN
    stripe_account_id TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),
    CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_stripe_account ON organizations (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- 2. Org Members (join table: auth.users <-> organizations)
CREATE TABLE org_members (
    org_id      UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role        org_role NOT NULL DEFAULT 'readonly',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members (user_id);

-- 3. Events
CREATE TABLE events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    slug             TEXT NOT NULL,
    description      TEXT,
    event_type       event_type NOT NULL DEFAULT 'silent',
    status           event_status NOT NULL DEFAULT 'draft',
    start_date       TIMESTAMPTZ,
    end_date         TIMESTAMPTZ,
    timezone         TEXT NOT NULL DEFAULT 'America/New_York',
    venue_name       TEXT,
    venue_address    TEXT,
    goal_amount      NUMERIC(12,2) DEFAULT 0,
    total_raised     NUMERIC(12,2) NOT NULL DEFAULT 0,
    banner_image_url TEXT,
    logo_url         TEXT,
    theme_color      TEXT DEFAULT '#6366f1',
    custom_css       TEXT,
    white_label      BOOLEAN NOT NULL DEFAULT false,
    custom_domain    TEXT,
    livestream_url   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT events_slug_unique_per_org UNIQUE (org_id, slug),
    CONSTRAINT events_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),
    CONSTRAINT events_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT events_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT events_goal_non_negative CHECK (goal_amount >= 0),
    CONSTRAINT events_total_raised_non_negative CHECK (total_raised >= 0)
);

CREATE INDEX idx_events_org ON events (org_id);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_slug ON events (slug);
CREATE INDEX idx_events_start_date ON events (start_date);

-- 4. Ticket Types
CREATE TABLE ticket_types (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    description        TEXT,
    price              NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity_available INT NOT NULL DEFAULT 0,
    quantity_sold      INT NOT NULL DEFAULT 0,
    type               ticket_kind NOT NULL DEFAULT 'individual',
    table_size         INT,
    benefits           JSONB DEFAULT '[]'::jsonb,
    sort_order         INT NOT NULL DEFAULT 0,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ticket_types_price_non_negative CHECK (price >= 0),
    CONSTRAINT ticket_types_qty_non_negative CHECK (quantity_available >= 0 AND quantity_sold >= 0),
    CONSTRAINT ticket_types_sold_lte_available CHECK (quantity_sold <= quantity_available),
    CONSTRAINT ticket_types_table_size_positive CHECK (table_size IS NULL OR table_size > 0)
);

CREATE INDEX idx_ticket_types_event ON ticket_types (event_id);

-- 5. Guests
CREATE TABLE guests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id              UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    ticket_type_id       UUID REFERENCES ticket_types (id) ON DELETE SET NULL,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    email                TEXT,
    phone                TEXT,
    dietary_restrictions TEXT,
    paddle_number        TEXT,
    qr_code              TEXT,
    checked_in           BOOLEAN NOT NULL DEFAULT false,
    checked_in_at        TIMESTAMPTZ,
    table_number         TEXT,
    is_vip               BOOLEAN NOT NULL DEFAULT false,
    category             guest_category NOT NULL DEFAULT 'general',
    stripe_customer_id   TEXT,
    payment_method_id    TEXT,           -- Stripe payment method ID
    notes                TEXT,
    registered_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT guests_name_not_empty CHECK (length(trim(first_name)) > 0 AND length(trim(last_name)) > 0),
    CONSTRAINT guests_paddle_unique_per_event UNIQUE (event_id, paddle_number)
);

CREATE INDEX idx_guests_event ON guests (event_id);
CREATE INDEX idx_guests_user ON guests (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_guests_email ON guests (email) WHERE email IS NOT NULL;
CREATE INDEX idx_guests_paddle ON guests (event_id, paddle_number) WHERE paddle_number IS NOT NULL;
CREATE INDEX idx_guests_qr_code ON guests (qr_code) WHERE qr_code IS NOT NULL;

-- 6. Items
CREATE TABLE items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    title                 TEXT NOT NULL,
    description           TEXT,
    category              TEXT,
    photos                JSONB DEFAULT '[]'::jsonb,
    fair_market_value     NUMERIC(10,2),
    starting_bid          NUMERIC(10,2) DEFAULT 0,
    bid_increment         NUMERIC(10,2) DEFAULT 1,
    reserve_price         NUMERIC(10,2),
    buy_now_price         NUMERIC(10,2),
    current_bid           NUMERIC(10,2) DEFAULT 0,
    current_winner_id     UUID REFERENCES guests (id) ON DELETE SET NULL,
    item_type             item_type NOT NULL DEFAULT 'silent',
    status                item_status NOT NULL DEFAULT 'draft',
    quantity              INT NOT NULL DEFAULT 1,
    sort_order            INT NOT NULL DEFAULT 0,
    closes_at             TIMESTAMPTZ,
    is_visible            BOOLEAN NOT NULL DEFAULT true,
    consignment_donor_name TEXT,
    consignment_donor_id  TEXT,
    package_items         JSONB DEFAULT '[]'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT items_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT items_starting_bid_non_negative CHECK (starting_bid >= 0),
    CONSTRAINT items_bid_increment_positive CHECK (bid_increment > 0),
    CONSTRAINT items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT items_buy_now_gte_starting CHECK (
        buy_now_price IS NULL OR starting_bid IS NULL OR buy_now_price >= starting_bid
    ),
    CONSTRAINT items_reserve_gte_starting CHECK (
        reserve_price IS NULL OR starting_bid IS NULL OR reserve_price >= starting_bid
    )
);

CREATE INDEX idx_items_event ON items (event_id);
CREATE INDEX idx_items_status ON items (event_id, status);
CREATE INDEX idx_items_type ON items (event_id, item_type);
CREATE INDEX idx_items_closes_at ON items (closes_at) WHERE closes_at IS NOT NULL;
CREATE INDEX idx_items_current_winner ON items (current_winner_id) WHERE current_winner_id IS NOT NULL;

-- 7. Bids
CREATE TABLE bids (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id     UUID NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    guest_id    UUID NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
    amount      NUMERIC(10,2) NOT NULL,
    is_proxy    BOOLEAN NOT NULL DEFAULT false,
    proxy_max   NUMERIC(10,2),
    is_winning  BOOLEAN NOT NULL DEFAULT false,
    status      bid_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT bids_amount_positive CHECK (amount > 0),
    CONSTRAINT bids_proxy_max_gte_amount CHECK (proxy_max IS NULL OR proxy_max >= amount)
);

CREATE INDEX idx_bids_item ON bids (item_id);
CREATE INDEX idx_bids_guest ON bids (guest_id);
CREATE INDEX idx_bids_item_amount ON bids (item_id, amount DESC);
CREATE INDEX idx_bids_winning ON bids (item_id) WHERE is_winning = true;

-- 8. Aircodes (short codes linked to items)
CREATE TABLE aircodes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id      UUID NOT NULL UNIQUE REFERENCES items (id) ON DELETE CASCADE,
    code         TEXT NOT NULL UNIQUE,
    qr_image_url TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT aircodes_code_format CHECK (code ~ '^[A-Z0-9]{3,10}$')
);

CREATE INDEX idx_aircodes_code ON aircodes (code);

-- 9. Donations
CREATE TABLE donations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    guest_id            UUID REFERENCES guests (id) ON DELETE SET NULL,
    campaign_name       TEXT,
    amount              NUMERIC(10,2) NOT NULL,
    is_anonymous        BOOLEAN NOT NULL DEFAULT false,
    tribute_name        TEXT,
    tribute_message     TEXT,
    fundraising_page_id UUID,            -- FK added after fundraising_pages is created
    receipt_sent        BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT donations_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_donations_event ON donations (event_id);
CREATE INDEX idx_donations_guest ON donations (guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_donations_fundraising_page ON donations (fundraising_page_id) WHERE fundraising_page_id IS NOT NULL;

-- 10. Fundraising Pages (peer-to-peer)
CREATE TABLE fundraising_pages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    guest_id         UUID NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    story            TEXT,
    photo_url        TEXT,
    personal_url_slug TEXT NOT NULL,
    goal_amount      NUMERIC(10,2) DEFAULT 0,
    total_raised     NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fundraising_pages_slug_unique_per_event UNIQUE (event_id, personal_url_slug),
    CONSTRAINT fundraising_pages_goal_non_negative CHECK (goal_amount >= 0),
    CONSTRAINT fundraising_pages_total_non_negative CHECK (total_raised >= 0)
);

CREATE INDEX idx_fundraising_pages_event ON fundraising_pages (event_id);
CREATE INDEX idx_fundraising_pages_guest ON fundraising_pages (guest_id);
CREATE INDEX idx_fundraising_pages_slug ON fundraising_pages (event_id, personal_url_slug);

-- Add FK from donations to fundraising_pages now that the table exists
ALTER TABLE donations
    ADD CONSTRAINT donations_fundraising_page_fk
    FOREIGN KEY (fundraising_page_id)
    REFERENCES fundraising_pages (id) ON DELETE SET NULL;

-- 11. Invoices
CREATE TABLE invoices (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    guest_id                UUID NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
    items                   JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{item_id, title, amount}]
    donations_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal                NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax                     NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                   NUMERIC(10,2) NOT NULL DEFAULT 0,
    status                  invoice_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT invoices_total_non_negative CHECK (total >= 0),
    CONSTRAINT invoices_unique_per_guest_event UNIQUE (event_id, guest_id)
);

CREATE INDEX idx_invoices_event ON invoices (event_id);
CREATE INDEX idx_invoices_guest ON invoices (guest_id);
CREATE INDEX idx_invoices_status ON invoices (status);

-- 12. Payments
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    guest_id        UUID NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL,
    method          payment_method_kind NOT NULL DEFAULT 'card',
    stripe_charge_id TEXT,
    status          payment_status NOT NULL DEFAULT 'pending',
    refund_amount   NUMERIC(10,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_refund_non_negative CHECK (refund_amount >= 0),
    CONSTRAINT payments_refund_lte_amount CHECK (refund_amount <= amount)
);

CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_guest ON payments (guest_id);
CREATE INDEX idx_payments_status ON payments (status);

-- 13. Messages
CREATE TABLE messages (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    sender_id          UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    channel            message_channel NOT NULL,
    subject            TEXT,
    body               TEXT NOT NULL,
    recipient_type     recipient_type NOT NULL DEFAULT 'all',
    recipient_guest_id UUID REFERENCES guests (id) ON DELETE SET NULL,
    sent_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT messages_body_not_empty CHECK (length(trim(body)) > 0),
    CONSTRAINT messages_individual_has_recipient CHECK (
        recipient_type != 'individual' OR recipient_guest_id IS NOT NULL
    )
);

CREATE INDEX idx_messages_event ON messages (event_id);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- 14. Discount Codes
CREATE TABLE discount_codes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    code           TEXT NOT NULL,
    discount_type  discount_type NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    max_uses       INT,
    times_used     INT NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT discount_codes_unique_per_event UNIQUE (event_id, code),
    CONSTRAINT discount_codes_value_positive CHECK (discount_value > 0),
    CONSTRAINT discount_codes_percentage_max CHECK (
        discount_type != 'percentage' OR discount_value <= 100
    ),
    CONSTRAINT discount_codes_times_used_non_negative CHECK (times_used >= 0),
    CONSTRAINT discount_codes_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0)
);

CREATE INDEX idx_discount_codes_event ON discount_codes (event_id);
CREATE INDEX idx_discount_codes_lookup ON discount_codes (event_id, code) WHERE is_active = true;

-- 15. Event Analytics
CREATE TABLE event_analytics (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    metric_name  TEXT NOT NULL,
    metric_value NUMERIC NOT NULL DEFAULT 0,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_analytics_event ON event_analytics (event_id);
CREATE INDEX idx_event_analytics_metric ON event_analytics (event_id, metric_name, recorded_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ticket_types_updated_at
    BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fundraising_pages_updated_at
    BEFORE UPDATE ON fundraising_pages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- TICKET QUANTITY SOLD TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_ticket_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_type_id IS NOT NULL THEN
        UPDATE ticket_types
        SET quantity_sold = quantity_sold + 1
        WHERE id = NEW.ticket_type_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_ticket_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ticket_type_id IS NOT NULL THEN
        UPDATE ticket_types
        SET quantity_sold = quantity_sold - 1
        WHERE id = OLD.ticket_type_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guest_created_increment_tickets
    AFTER INSERT ON guests
    FOR EACH ROW EXECUTE FUNCTION increment_ticket_quantity_sold();

CREATE TRIGGER trg_guest_deleted_decrement_tickets
    AFTER DELETE ON guests
    FOR EACH ROW EXECUTE FUNCTION decrement_ticket_quantity_sold();

-- ============================================================================
-- EVENT TOTAL RAISED TRIGGERS
-- ============================================================================

-- Recalculate total_raised for an event from winning bids + donations
CREATE OR REPLACE FUNCTION recalculate_event_total_raised(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    v_bid_total   NUMERIC(12,2);
    v_donation_total NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(b.amount), 0)
    INTO v_bid_total
    FROM bids b
    JOIN items i ON i.id = b.item_id
    WHERE i.event_id = p_event_id
      AND b.status = 'won';

    SELECT COALESCE(SUM(d.amount), 0)
    INTO v_donation_total
    FROM donations d
    WHERE d.event_id = p_event_id;

    UPDATE events
    SET total_raised = v_bid_total + v_donation_total
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- When a bid status changes to 'won' or away from 'won', update event total
CREATE OR REPLACE FUNCTION on_bid_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Only act when status changes involving 'won'
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND (OLD.status = 'won' OR NEW.status = 'won'))
       OR (TG_OP = 'INSERT' AND NEW.status = 'won')
    THEN
        SELECT event_id INTO v_event_id FROM items WHERE id = NEW.item_id;
        PERFORM recalculate_event_total_raised(v_event_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bid_status_update_total
    AFTER INSERT OR UPDATE OF status ON bids
    FOR EACH ROW EXECUTE FUNCTION on_bid_status_change();

-- When a donation is inserted or amount changes, update event total
CREATE OR REPLACE FUNCTION on_donation_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_event_total_raised(OLD.event_id);
        RETURN OLD;
    ELSE
        PERFORM recalculate_event_total_raised(NEW.event_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donation_update_total
    AFTER INSERT OR UPDATE OF amount OR DELETE ON donations
    FOR EACH ROW EXECUTE FUNCTION on_donation_change();

-- Update fundraising page total when a linked donation changes
CREATE OR REPLACE FUNCTION on_donation_fundraising_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle old fundraising page (on UPDATE/DELETE)
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.fundraising_page_id IS NOT NULL THEN
        UPDATE fundraising_pages
        SET total_raised = (
            SELECT COALESCE(SUM(amount), 0) FROM donations WHERE fundraising_page_id = OLD.fundraising_page_id
        )
        WHERE id = OLD.fundraising_page_id;
    END IF;

    -- Handle new fundraising page (on INSERT/UPDATE)
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.fundraising_page_id IS NOT NULL THEN
        UPDATE fundraising_pages
        SET total_raised = (
            SELECT COALESCE(SUM(amount), 0) FROM donations WHERE fundraising_page_id = NEW.fundraising_page_id
        )
        WHERE id = NEW.fundraising_page_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donation_fundraising_page_total
    AFTER INSERT OR UPDATE OF amount, fundraising_page_id OR DELETE ON donations
    FOR EACH ROW EXECUTE FUNCTION on_donation_fundraising_update();

-- ============================================================================
-- BID PLACEMENT FUNCTION (handles concurrency)
-- ============================================================================

CREATE OR REPLACE FUNCTION place_bid(
    p_item_id   UUID,
    p_guest_id  UUID,
    p_amount    NUMERIC(10,2),
    p_is_proxy  BOOLEAN DEFAULT false,
    p_proxy_max NUMERIC(10,2) DEFAULT NULL
)
RETURNS TABLE (
    bid_id     UUID,
    bid_amount NUMERIC(10,2),
    success    BOOLEAN,
    message    TEXT
) AS $$
DECLARE
    v_item          RECORD;
    v_new_bid_id    UUID;
    v_effective_amt NUMERIC(10,2);
BEGIN
    -- Lock the item row to prevent concurrent bid race conditions
    SELECT i.id, i.current_bid, i.current_winner_id, i.starting_bid,
           i.bid_increment, i.reserve_price, i.buy_now_price,
           i.status, i.closes_at, i.item_type
    INTO v_item
    FROM items i
    WHERE i.id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, 0::NUMERIC(10,2), false, 'Item not found'::TEXT;
        RETURN;
    END IF;

    -- Validate item is open for bidding
    IF v_item.status != 'active' THEN
        RETURN QUERY SELECT NULL::UUID, 0::NUMERIC(10,2), false, 'Item is not active for bidding'::TEXT;
        RETURN;
    END IF;

    IF v_item.closes_at IS NOT NULL AND v_item.closes_at < now() THEN
        RETURN QUERY SELECT NULL::UUID, 0::NUMERIC(10,2), false, 'Bidding has closed for this item'::TEXT;
        RETURN;
    END IF;

    -- Cannot bid on your own winning bid
    IF v_item.current_winner_id = p_guest_id THEN
        RETURN QUERY SELECT NULL::UUID, 0::NUMERIC(10,2), false, 'You are already the highest bidder'::TEXT;
        RETURN;
    END IF;

    -- Determine the minimum acceptable bid
    v_effective_amt := GREATEST(
        v_item.starting_bid,
        v_item.current_bid + v_item.bid_increment
    );

    IF p_amount < v_effective_amt THEN
        RETURN QUERY SELECT NULL::UUID, v_effective_amt, false,
            format('Bid must be at least %s', v_effective_amt)::TEXT;
        RETURN;
    END IF;

    -- Mark all previous winning bids on this item as outbid
    UPDATE bids
    SET is_winning = false,
        status = 'outbid'
    WHERE item_id = p_item_id
      AND is_winning = true;

    -- Insert the new bid
    INSERT INTO bids (item_id, guest_id, amount, is_proxy, proxy_max, is_winning, status)
    VALUES (p_item_id, p_guest_id, p_amount, p_is_proxy, p_proxy_max, true, 'active')
    RETURNING id INTO v_new_bid_id;

    -- Update the item's current bid and winner
    UPDATE items
    SET current_bid = p_amount,
        current_winner_id = p_guest_id
    WHERE id = p_item_id;

    RETURN QUERY SELECT v_new_bid_id, p_amount, true, 'Bid placed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLOSE ITEM & MARK WINNER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION close_item(p_item_id UUID)
RETURNS TABLE (
    success       BOOLEAN,
    winner_id     UUID,
    winning_amount NUMERIC(10,2),
    message       TEXT
) AS $$
DECLARE
    v_item   RECORD;
    v_bid    RECORD;
BEGIN
    SELECT * INTO v_item FROM items WHERE id = p_item_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC(10,2), 'Item not found'::TEXT;
        RETURN;
    END IF;

    IF v_item.status = 'closed' THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC(10,2), 'Item is already closed'::TEXT;
        RETURN;
    END IF;

    -- Find the highest bid
    SELECT * INTO v_bid
    FROM bids
    WHERE item_id = p_item_id AND is_winning = true AND status = 'active'
    ORDER BY amount DESC
    LIMIT 1;

    IF FOUND THEN
        -- Check reserve price
        IF v_item.reserve_price IS NOT NULL AND v_bid.amount < v_item.reserve_price THEN
            UPDATE items SET status = 'closed' WHERE id = p_item_id;
            RETURN QUERY SELECT true, NULL::UUID, 0::NUMERIC(10,2),
                'Item closed - reserve price not met'::TEXT;
            RETURN;
        END IF;

        -- Mark the winning bid
        UPDATE bids SET status = 'won' WHERE id = v_bid.id;

        -- Close the item
        UPDATE items
        SET status = 'closed',
            current_bid = v_bid.amount,
            current_winner_id = v_bid.guest_id
        WHERE id = p_item_id;

        RETURN QUERY SELECT true, v_bid.guest_id, v_bid.amount, 'Item closed with winner'::TEXT;
    ELSE
        UPDATE items SET status = 'closed' WHERE id = p_item_id;
        RETURN QUERY SELECT true, NULL::UUID, 0::NUMERIC(10,2), 'Item closed with no bids'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids                ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircodes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraising_pages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER: Check if current user is a member of an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = p_org_id
          AND user_id = auth.uid()
          AND role IN ('admin', 'manager')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get org_id for an event (cached via SQL stable)
CREATE OR REPLACE FUNCTION event_org_id(p_event_id UUID)
RETURNS UUID AS $$
    SELECT org_id FROM events WHERE id = p_event_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS POLICIES: Organizations
-- ============================================================================

CREATE POLICY "org_members_select" ON organizations
    FOR SELECT USING (is_org_member(id));

CREATE POLICY "org_admins_insert" ON organizations
    FOR INSERT WITH CHECK (true);  -- any authenticated user can create an org

CREATE POLICY "org_admins_update" ON organizations
    FOR UPDATE USING (is_org_admin(id));

CREATE POLICY "org_admins_delete" ON organizations
    FOR DELETE USING (is_org_admin(id));

-- ============================================================================
-- RLS POLICIES: Org Members
-- ============================================================================

CREATE POLICY "org_members_select_own" ON org_members
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "org_admins_manage_members" ON org_members
    FOR ALL USING (is_org_admin(org_id));

-- ============================================================================
-- RLS POLICIES: Events
-- ============================================================================

CREATE POLICY "org_members_select_events" ON events
    FOR SELECT USING (is_org_member(org_id));

-- Published/active events are visible to authenticated guests
CREATE POLICY "public_events_select" ON events
    FOR SELECT USING (status IN ('published', 'active'));

CREATE POLICY "org_admins_manage_events" ON events
    FOR ALL USING (is_org_admin(org_id));

-- ============================================================================
-- RLS POLICIES: Ticket Types
-- ============================================================================

CREATE POLICY "ticket_types_select" ON ticket_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = ticket_types.event_id
              AND (e.status IN ('published', 'active') OR is_org_member(e.org_id))
        )
    );

CREATE POLICY "org_admins_manage_ticket_types" ON ticket_types
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Guests
-- ============================================================================

-- Org members can see all guests for their events
CREATE POLICY "org_members_select_guests" ON guests
    FOR SELECT USING (is_org_member(event_org_id(event_id)));

-- Guests can see their own record
CREATE POLICY "guests_select_own" ON guests
    FOR SELECT USING (user_id = auth.uid());

-- Guests can update their own record (limited fields handled at app layer)
CREATE POLICY "guests_update_own" ON guests
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "org_admins_manage_guests" ON guests
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Items
-- ============================================================================

CREATE POLICY "items_select_active" ON items
    FOR SELECT USING (
        is_visible = true
        OR is_org_member(event_org_id(event_id))
    );

CREATE POLICY "org_admins_manage_items" ON items
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Bids
-- ============================================================================

-- Org members can see all bids for their events
CREATE POLICY "org_members_select_bids" ON bids
    FOR SELECT USING (
        is_org_member(event_org_id((SELECT event_id FROM items WHERE id = bids.item_id)))
    );

-- Guests can see their own bids
CREATE POLICY "guests_select_own_bids" ON bids
    FOR SELECT USING (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

-- Guests can place bids (insert)
CREATE POLICY "guests_insert_bids" ON bids
    FOR INSERT WITH CHECK (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

-- ============================================================================
-- RLS POLICIES: Aircodes
-- ============================================================================

CREATE POLICY "aircodes_select" ON aircodes
    FOR SELECT USING (true);  -- aircodes are public-facing (scanned by anyone)

CREATE POLICY "org_admins_manage_aircodes" ON aircodes
    FOR ALL USING (
        is_org_admin(event_org_id((SELECT event_id FROM items WHERE id = aircodes.item_id)))
    );

-- ============================================================================
-- RLS POLICIES: Donations
-- ============================================================================

CREATE POLICY "org_members_select_donations" ON donations
    FOR SELECT USING (is_org_member(event_org_id(event_id)));

CREATE POLICY "guests_select_own_donations" ON donations
    FOR SELECT USING (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

CREATE POLICY "guests_insert_donations" ON donations
    FOR INSERT WITH CHECK (true);  -- anyone can donate

CREATE POLICY "org_admins_manage_donations" ON donations
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Fundraising Pages
-- ============================================================================

-- Public read for published events
CREATE POLICY "fundraising_pages_select" ON fundraising_pages
    FOR SELECT USING (true);

CREATE POLICY "guests_manage_own_pages" ON fundraising_pages
    FOR ALL USING (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

CREATE POLICY "org_admins_manage_fundraising_pages" ON fundraising_pages
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Invoices
-- ============================================================================

CREATE POLICY "org_members_select_invoices" ON invoices
    FOR SELECT USING (is_org_member(event_org_id(event_id)));

CREATE POLICY "guests_select_own_invoices" ON invoices
    FOR SELECT USING (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

CREATE POLICY "org_admins_manage_invoices" ON invoices
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Payments
-- ============================================================================

CREATE POLICY "org_members_select_payments" ON payments
    FOR SELECT USING (
        is_org_member(event_org_id(
            (SELECT event_id FROM invoices WHERE id = payments.invoice_id)
        ))
    );

CREATE POLICY "guests_select_own_payments" ON payments
    FOR SELECT USING (
        guest_id IN (SELECT id FROM guests WHERE user_id = auth.uid())
    );

CREATE POLICY "org_admins_manage_payments" ON payments
    FOR ALL USING (
        is_org_admin(event_org_id(
            (SELECT event_id FROM invoices WHERE id = payments.invoice_id)
        ))
    );

-- ============================================================================
-- RLS POLICIES: Messages
-- ============================================================================

CREATE POLICY "org_members_manage_messages" ON messages
    FOR ALL USING (is_org_member(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Discount Codes
-- ============================================================================

-- Org members can manage; guests can look up active codes
CREATE POLICY "discount_codes_select_active" ON discount_codes
    FOR SELECT USING (is_active = true OR is_org_member(event_org_id(event_id)));

CREATE POLICY "org_admins_manage_discount_codes" ON discount_codes
    FOR ALL USING (is_org_admin(event_org_id(event_id)));

-- ============================================================================
-- RLS POLICIES: Event Analytics
-- ============================================================================

CREATE POLICY "org_members_select_analytics" ON event_analytics
    FOR SELECT USING (is_org_member(event_org_id(event_id)));

CREATE POLICY "org_admins_manage_analytics" ON event_analytics
    FOR ALL USING (is_org_admin(event_org_id(event_id)));
