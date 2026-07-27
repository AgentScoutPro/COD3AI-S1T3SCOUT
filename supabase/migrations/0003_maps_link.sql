-- Optional Google Business Profile / Maps link captured at intake, used to
-- resolve a precise Places match instead of guessing from name+city.
-- See src/lib/providers/places/maps-link.ts.

alter table businesses add column google_maps_url text;
