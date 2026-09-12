# Brahmandeshwar Mahadev — Original design + complete Supabase content connection

This build preserves the original single-file website, embedded images, themes, colors, Gujarati content and layout. Supabase is added as the persistent backend.

Connected admin-managed content:
- Today's Darshan + direct image upload + automatic Gallery copy
- Pujari details + direct photo upload/edit/delete
- Gallery + direct image upload/delete
- Announcements + add/delete
- Temple information: intro, history, significance, timings, address, phone, email, Google Maps URL
- Account settings through Supabase Auth
- Contact form inserts into contact_messages when a form is present

Run `supabase/complete-content-migration.sql` once in Supabase SQL Editor before testing Temple Info.

Do not put a Supabase service-role/secret key in this project. The browser uses only the publishable key.
