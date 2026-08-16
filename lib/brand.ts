// White-label identity for this deployment. Everything user-facing that used
// to say "Pages CMS" reads from here, so upstream merges stay mechanical.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Site Editor",
  owner: process.env.NEXT_PUBLIC_BRAND_OWNER || "Joe Waine",
  siteUrl: process.env.NEXT_PUBLIC_BRAND_SITE_URL || "https://www.joewaine.com",
  siteLabel: process.env.NEXT_PUBLIC_BRAND_SITE_LABEL || "joewaine.com",
  supportEmail: process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL || "joe.waine@gmail.com",
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    "Edit your website's text, images and pages. Changes go live in about a minute.",
};
