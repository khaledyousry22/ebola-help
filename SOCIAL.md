# Automatic Facebook posts

Ebola.help publishes a list of what should be shared on social media:

**https://ebola.help/feeds/social.xml**

It contains:

- **official news** (WHO, Africa CDC, DR Congo's national public health
  institute INSP, ECDC and other health authorities), in English and French;
- **each weekly situation update**, in English and French.

That is usually one to three posts a day. Media articles are not included:
their headlines are sometimes alarming, and only official sources are shared
under the Ebola.help name.

A free service, **Zapier**, checks this list every 15 minutes and posts each new
entry on the Ebola.help Facebook Page. Each post shows the headline, the source
and date, and a link to Ebola.help, with a preview of the original page.

## Why Zapier, and not a Facebook app of our own?

Facebook only shows posts made by a new developer app to the Page's own admins.
To show them to everyone, Meta must first review the app, which means business
verification and a screen recording. Zapier has already been approved by Meta,
so it works straight away.

## Setting it up (once, about 10 minutes)

Zapier's buttons may be worded slightly differently from what is written here.

1. Go to **zapier.com** and create a free account.
2. Create a new **Zap** (Zapier's name for an automation).
3. **Trigger** (what starts it):
   - App: **RSS by Zapier**
   - Event: **New Item in Feed**
   - Feed URL: `https://ebola.help/feeds/social.xml` (leave username and
     password empty)
   - Click **Test trigger**: it shows one recent entry.
4. **Action** (what it does):
   - App: **Facebook Pages**
   - Event: **Create Page Post**.
     If you prefer to approve each post before it appears, choose
     **Create Page Post as Draft** instead. The posts then wait in
     Meta Business Suite, under Content, then Drafts.
   - Sign in with the Facebook account that manages the Ebola.help Page, and
     allow Zapier to post on the Page.
   - Page: **Ebola.help**
   - Message: click in the field, then pick **Description** from the list of
     step 1 data (use the **+** or **Insert data** button, or type `/`, if
     the list does not open). Do not type the word: the field must show a
     small coloured tag with the start of a post.
   - Link URL: the same way, pick **Link** from the list. The tag shows a web
     address such as `https://insp.cd/...`. If the field contains the plain
     word "Link", Facebook answers "Failed to parse URL".
5. Click **Test step**. This publishes one real post on the Page (you can
   delete it afterwards).
6. Click **Publish**. From now on, every new entry is posted automatically.

Zapier only posts entries that appear after you switch the Zap on. The older
entries already in the list are not posted.

## Good to know

- **Cost:** free. Zapier's free plan allows 100 posts a month. Ebola.help sends
  about 50 to 70.
- **Hiding a news item:** hide it on the editing page (**Hide or pin news**).
  It then disappears from the site and from the list. If it was already
  posted, delete the post on Facebook.
- **Pausing:** switch the Zap off in Zapier.
- **Changing the languages:** ask Claude (the setting is `SOCIAL_FEED_LOCALES`
  in `src/config.ts`).
- **X (Twitter):** X charges $0.20 for each automatic post with a link,
  paid in advance in X's developer console. The same list can be connected to
  X later. Ask Claude when you are ready.
