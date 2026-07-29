-- Demo/preview data for DojoPrizes.
-- Optional: run this in the Supabase SQL Editor after the schema and all
-- migrations are applied, to see the Prizes in Queue page (and the rest of
-- the app) populated with realistic-looking sample content. Safe to delete
-- everything it creates afterward -- every row below is tagged so you can
-- find it again (see the cleanup query at the bottom, commented out).

-- ── Franchise tags ──────────────────────────────────────────────────────
insert into franchise_tags (id, name) values
  ('a0000000-0000-4000-8000-000000000001', 'Pokemon'),
  ('a0000000-0000-4000-8000-000000000002', 'Minecraft'),
  ('a0000000-0000-4000-8000-000000000003', 'Hello Kitty'),
  ('a0000000-0000-4000-8000-000000000004', 'Among Us'),
  ('a0000000-0000-4000-8000-000000000005', 'Star Wars'),
  ('a0000000-0000-4000-8000-000000000006', 'Roblox')
on conflict (id) do nothing;

-- ── Filament colors ─────────────────────────────────────────────────────
insert into filaments (id, color_name, swatch_hex, material_type, stock_level, stock_unit, low_stock_threshold) values
  ('b0000000-0000-4000-8000-000000000001', 'Jet Black', '#1a1a1a', 'PLA', 5, 'spools', 2),
  ('b0000000-0000-4000-8000-000000000002', 'Sakura Pink', '#f4a6c1', 'PLA', 2, 'spools', 3),
  ('b0000000-0000-4000-8000-000000000003', 'Sky Blue', '#6ec6e8', 'PLA', 4, 'spools', 2),
  ('b0000000-0000-4000-8000-000000000004', 'Sunburst Gold', '#e8b923', 'PETG', 6, 'spools', 2),
  ('b0000000-0000-4000-8000-000000000005', 'Forest Green', '#3f7d4a', 'PLA', 1, 'spools', 2)
on conflict (id) do nothing;

-- ── Prizes ──────────────────────────────────────────────────────────────
insert into prizes (id, name, photo_url, coin_tier, coin_value_silver_equivalent, coin_price, status, stock_count) values
  ('c0000000-0000-4000-8000-000000000001', 'Bulbasaur Keychain', 'https://placehold.co/400x300/dcecd0/3a342a?text=Bulbasaur', 'silver', 1, 3, 'in_stock', 8),
  ('c0000000-0000-4000-8000-000000000002', 'Creeper Head Box', null, 'gold', 5, 6, 'low_stock', 2),
  ('c0000000-0000-4000-8000-000000000003', 'Hello Kitty Bow Clip', 'https://placehold.co/400x300/f7dce6/3a342a?text=Hello+Kitty', 'silver', 1, 2, 'in_stock', 10),
  ('c0000000-0000-4000-8000-000000000004', 'Baby Yoda Figure', null, 'obsidian', 25, 26, 'print_on_request', 0),
  ('c0000000-0000-4000-8000-000000000005', 'Among Us Crewmate', 'https://placehold.co/400x300/d6e8f0/3a342a?text=Among+Us', 'gold', 5, 5, 'in_stock', 6),
  ('c0000000-0000-4000-8000-000000000006', 'Roblox Noob Figure', null, 'silver', 1, 4, 'low_stock', 1)
on conflict (id) do nothing;

insert into prize_franchise_tags (prize_id, tag_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006')
on conflict do nothing;

insert into prize_filament (prize_id, filament_id) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004')
on conflict do nothing;

-- ── Requests (this is what fills the Prizes in Queue page) ────────────────
insert into requests
  (id, student_name, requested_by, prize_id, free_text_prize, size, color_filament_id, links, date_requested, status, is_print_club, notes)
values
  ('d0000000-0000-4000-8000-000000000001', 'Ava Chen', 'Sensei Jake',
    'c0000000-0000-4000-8000-000000000001', null, 'small',
    'b0000000-0000-4000-8000-000000000005', null,
    current_date - 1, 'pending', true, null),

  ('d0000000-0000-4000-8000-000000000002', 'Marcus Lee', 'Sensei Maria',
    null, 'Custom dragon keychain, wants it shiny', 'medium',
    'b0000000-0000-4000-8000-000000000001', 'https://makerworld.com/en/models/example-dragon',
    current_date - 2, 'pending', false, 'Wants it shiny if possible'),

  ('d0000000-0000-4000-8000-000000000003', 'Priya Patel', 'Sensei Jake',
    'c0000000-0000-4000-8000-000000000003', null, 'small',
    'b0000000-0000-4000-8000-000000000002', null,
    current_date - 4, 'printed', false, null),

  ('d0000000-0000-4000-8000-000000000004', 'Diego Ramirez', 'Sensei Michelle',
    'c0000000-0000-4000-8000-000000000002', null, 'large',
    'b0000000-0000-4000-8000-000000000005', null,
    current_date - 1, 'pending', true, null),

  ('d0000000-0000-4000-8000-000000000005', 'Zoe Nguyen', 'Sensei Maria',
    null, 'Among Us mini figure keychain', 'small',
    'b0000000-0000-4000-8000-000000000003', null,
    current_date - 3, 'pending', false, null),

  ('d0000000-0000-4000-8000-000000000006', 'Liam O''Brien', 'Sensei Jake',
    'c0000000-0000-4000-8000-000000000006', null, 'medium',
    'b0000000-0000-4000-8000-000000000004', null,
    current_date - 5, 'printed', false, null),

  ('d0000000-0000-4000-8000-000000000007', 'Emma Wilson', 'Sensei Michelle',
    'c0000000-0000-4000-8000-000000000004', null, 'large',
    'b0000000-0000-4000-8000-000000000001', null,
    current_date - 1, 'pending', false, 'For her birthday next week'),

  ('d0000000-0000-4000-8000-000000000008', 'Noah Kim', 'Sensei Maria',
    null, 'Minecraft sword', 'large',
    'b0000000-0000-4000-8000-000000000001', 'https://makerworld.com/en/models/example-sword',
    current_date - 12, 'fulfilled', false, null),

  ('d0000000-0000-4000-8000-000000000009', 'Sofia Garcia', 'Sensei Jake',
    'c0000000-0000-4000-8000-000000000005', null, 'small',
    'b0000000-0000-4000-8000-000000000003', null,
    current_date - 8, 'cancelled', false, 'Changed her mind'),

  ('d0000000-0000-4000-8000-000000000010', 'Ethan Brooks', 'Sensei Michelle',
    null, 'Star Wars lightsaber keychain', 'medium',
    'b0000000-0000-4000-8000-000000000001', 'https://makerworld.com/en/models/example-lightsaber',
    current_date - 2, 'pending', false, null)
on conflict (id) do nothing;

insert into request_franchise_tags (request_id, tag_id) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006'),
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005'),
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000005')
on conflict do nothing;

-- ── Checkouts (fills "Recently bought" / "Most popular themes") ────────────
insert into checkouts (prize_id, date_checked_out) values
  ('c0000000-0000-4000-8000-000000000001', current_date - 1),
  ('c0000000-0000-4000-8000-000000000003', current_date - 2),
  ('c0000000-0000-4000-8000-000000000001', current_date - 6),
  ('c0000000-0000-4000-8000-000000000005', current_date - 9),
  ('c0000000-0000-4000-8000-000000000003', current_date - 14);

-- ── To remove all of the above later, run: ─────────────────────────────
-- delete from requests where id::text like 'd0000000-%';
-- delete from checkouts where prize_id::text like 'c0000000-%';
-- delete from prizes where id::text like 'c0000000-%';
-- delete from filaments where id::text like 'b0000000-%';
-- delete from franchise_tags where id::text like 'a0000000-%';
