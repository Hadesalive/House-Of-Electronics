# Product Key Setup Guide

## Overview (Supabase-backed, one-time keys)

Product keys are now stored in Supabase and redeemed online. Each key can be used once and is bound to the activating machine. The app keeps a local record only for offline checks after activation.

## Supabase Setup

1) Create the table and policy  
   Run `supabase/product_keys.sql` in the Supabase SQL editor.

2) Insert one-time keys (hash = sha256(normalized key))  
   - Normalize = trim, remove spaces, uppercase.  
   - Example: `BAHA-LPHA-14!` → hash with SHA-256, then insert:  
     ```sql
     insert into public.product_keys (key_hash, status, notes)
     values ('<hash>', 'unused', 'Machine A');
     ```
   - Status should be `unused` initially.

3) Configure env vars in Electron (packager/build):  
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (preferred) or `SUPABASE_SERVICE_KEY`

## Activation Flow (Online)

1. App starts → checks local activation; if not activated, shows Installation Wizard.
2. User enters product key.
3. App validates against Supabase (`status=unused`).
4. On activation, Supabase sets `status=used` and stores `machine_id`/`machine_name`.
5. App stores activation locally (for offline checks on the same machine).
6. If the same key is used on a different machine, activation is rejected.

## Generating Keys

- Use your own secret to produce a key, normalize/uppercase it, hash with SHA-256, and insert the hash into Supabase.
- You can still run `node tools/generate-product-key.js YOUR_SECRET` to get a formatted key and hash.
- You no longer set a master hash in code; Supabase holds the authoritative list.

## Local Database (post-activation)

`product_key` table now stores:
- `product_key_hash`, `activated_at`, `is_active`, `machine_id`, `machine_name`
- Used only for offline checks after a successful online activation.

## Resetting / Rebinding

- To reuse a key, update Supabase row: set `status='unused'`, clear `machine_id/machine_name`.  
- Optionally call the `deactivate-product-key` IPC to clear local state before reactivating.

## Troubleshooting

- “Product key already used on another machine”: key is bound; reset it in Supabase first.  
- “Supabase not configured”: set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your environment.  
- Make sure RLS allows service_role (see `supabase/product_keys.sql`).  
