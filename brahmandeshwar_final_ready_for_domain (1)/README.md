# Brahmandeshwar Mahadev — Final Netlify Build

This build preserves the original homepage design and images while moving embedded image payloads into
`assets/images/` so the initial HTML is much smaller and loads faster.

## Supabase
- Supabase URL and publishable key are in `js/supabase-config.js`.
- Database/RLS setup is already part of the project.
- Existing Supabase content can be managed from the Admin Panel.

## Netlify
Deploy the folder containing `index.html` at its root. No build command is required.

## Important
The `mahadev-original.html` file is retained as an untouched backup. It is not required for the live site.
