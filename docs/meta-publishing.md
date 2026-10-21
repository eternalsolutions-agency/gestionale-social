# KAIRO Meta publishing
The Publication page supports immediate and scheduled posts. Every scheduled account has a separate queue entry, containing the confirmed caption, media selection and UTC time. The UI shows the browser time zone.
Supported: Facebook text/JPEG posts, Instagram JPEG posts and Reels. Stories, carousels and Facebook video are not supported.
The workspace calendar alone does not select a destination. Confirm the account, media and time in Publication using Programma invio. The worker checks every minute and handles up to three jobs per run. Instagram processing may delay publication.
Queued posts can be rescheduled or cancelled. Changing a scheduled content to a draft/ready/published in the calendar cancels waiting jobs. Editing the caption does not modify the confirmed caption: cancel and schedule again to change it.
Tokens and the scheduler key are held in Supabase Vault. Only the service role can read tokens, claim due jobs or validate the worker key. The worker has custom key authentication; manual publishing retains JWT and user ownership validation.
A confirmed failure stops automatic retries; an ambiguous timeout is marked uncertain to prevent duplicate public posts. Check the social profile before any further action. Interrupted jobs are marked uncertain after ten minutes.
The scheduler wakes only if due or interrupted jobs exist. Free Supabase projects may pause; this feature cannot send posts while the project is paused.
Configuration: META_APP_ID, META_APP_SECRET; optional META_LOGIN_CONFIG_ID and META_GRAPH_VERSION; KAIRO_SITE_URL defaults to https://gestionale-social.vercel.app.
Valid OAuth Redirect URI: https://tkjajqizdjaynslvwcfp.supabase.co/functions/v1/meta-oauth-callback
For third-party accounts the appropriate Meta permissions and app review remain required.
