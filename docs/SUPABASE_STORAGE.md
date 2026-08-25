# Supabase Storage Media Uploads

The admin Media page requests a short-lived signed upload URL from the application, then uploads the selected file directly to Supabase Storage. The service-role key stays on the server and is never returned to the browser.

## Environment

Set these server environment variables locally and in the deployment platform:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`NEXT_PUBLIC_SUPABASE_URL` may be used as a fallback for `SUPABASE_URL`, but `SUPABASE_SERVICE_ROLE_KEY` is required and must not be prefixed with `NEXT_PUBLIC_`.

## Bucket setup

1. In Supabase Dashboard, create a bucket named `media`.
2. Set the bucket to **public** only if uploaded files must be rendered by public storefront pages using their paths. Keep it private if the application will later generate signed read URLs instead.
3. Configure the bucket's maximum file size to at least 25 MB and allow `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, `video/mp4`, and `video/webm`.
4. No client storage policy is required for this workflow: uploads use service-generated signed URLs. Do not grant the `anon` role blanket insert access to `storage.objects`.

Uploaded paths have the form `uploads/YYYY-MM-DD/<uuid>.<extension>`. Store that path in the appropriate existing media-path field when it is assigned to an entity.

## Security behavior

- `POST /api/admin/media/upload-url` requires an active admin session with the existing `catalog` permission.
- The endpoint accepts only the documented media MIME types and limits the declared upload size to 25 MB.
- Object paths are generated server-side, so clients cannot choose an arbitrary bucket location or overwrite another object.
- Signed upload URLs are single-object and short-lived according to Supabase Storage defaults.
