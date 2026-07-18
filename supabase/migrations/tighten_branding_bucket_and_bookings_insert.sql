-- 1. branding bucket: stop clients LISTing every center's logo. Public buckets
--    serve object URLs via getPublicUrl() without a broad SELECT; the broad
--    `bucket_id='branding'` policy additionally allowed enumerating the bucket.
--    The app only uploads + reads a known path (settings/page.jsx), never .list().
--    Requiring a non-empty object name keeps direct URL reads while a bare list
--    (name IS NULL) returns nothing.
drop policy if exists "branding public read" on storage.objects;
create policy "branding public read" on storage.objects
  for select to public
  using (bucket_id = 'branding' AND name IS NOT NULL AND name <> '');

-- 2. bookings: the public booking form's INSERT had WITH CHECK true (unbounded
--    anonymous insert = spam vector; reads are already admin-only). Require the
--    minimum real-booking fields, rejecting empty/garbage rows without changing
--    the form.
drop policy if exists bookings_insert_public on public.bookings;
create policy bookings_insert_public on public.bookings
  for insert to public
  with check (
    customer_name  IS NOT NULL AND btrim(customer_name)  <> '' AND
    customer_phone IS NOT NULL AND btrim(customer_phone) <> '' AND
    service_type   IS NOT NULL AND btrim(service_type)   <> ''
  );
