# Contracts Pro Signing Page

Static GitHub Pages prototype for remote contract signing.

## Link format

Use hash routes so GitHub Pages can serve the app without server rewrites:

```text
https://gera3d.github.io/contracts-pro-signing-page/#/sign/<token>
```

The app also accepts:

```text
https://your-domain.example/?token=<token>
https://your-domain.example/sign/<token>
```

Direct `/sign/<token>` links rely on `404.html` redirecting the browser to the hash route.

## Supabase

The page calls these public RPCs with the Supabase anon key:

- `contracts_pro_view_signing_request`
- `contracts_pro_submit_signature`

Do not put a service-role key in this repo. The anon key is expected in browser code; the signing token gates request access.

## Custom Domain

When the final domain is known, add a `CNAME` file containing the bare domain, then configure the DNS record to point at GitHub Pages.
