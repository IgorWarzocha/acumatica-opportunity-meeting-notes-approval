# Acumatica Dev OAuth

Dev-only OAuth details for the local Acumatica instance and n8n workflows.

## Connected App

- Client name: `Acumatica OAuth`
- Company: `Company`
- Client ID for token requests: `B33396BC-9E1C-3ED0-9240-A3D0E0C0C2D8@Company`
- Raw client GUID in DB: `B33396BC-9E1C-3ED0-9240-A3D0E0C0C2D8`
- Client secret: `Dsxfe19JzMvh8WJ_zDO_xg`
- Flow: `AuthorizationCode`
- Scopes: `api offline_access`

## Token Endpoint

- URL: `https://localhost:443/bpw_25_2/identity/connect/token`

Authorization endpoint:

- `https://localhost:443/bpw_25_2/identity/connect/authorize`

Redirect URI for n8n:

- `http://localhost:5678/rest/oauth2-credential/callback`

## Notes

- Acumatica expects the company suffix in `client_id`, so use `B33396BC-9E1C-3ED0-9240-A3D0E0C0C2D8@Company`, not just the raw GUID.
- This is a dev-only credential set. Replace it in prod.
