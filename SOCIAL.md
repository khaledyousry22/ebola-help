# Automatic Facebook posts

Ebola.help publishes two lists of posts for social media. A free service,
**Zapier**, checks a list every 15 minutes and posts each new entry on the
Ebola.help Facebook Page.

## 1. The main list (free)

**https://ebola.help/feeds/social.xml**, about 90 posts a month:

- **Official news** (WHO, Africa CDC, DR Congo's national public health
  institute INSP, ECDC and other health authorities), in English and French:
  one to two a day, mostly INSP's daily situation report.
- **Each weekly situation update**, in English and French.
- **A daily health tip**, posted with the first site update after 06:00 UTC
  (usually between 08:00 and 11:00 UTC). It is one key point from the site's
  health guides, in English and French in the same post, with a link to the
  guide. The tips go round all the guides (about 40 tips), one guide after
  another.
- **The case figures**, each time the official figures on the site change
  (every 2 to 3 days): the same words as the banner at the top of every
  page, in English and French in the same post, with a link to the map.

## 2. The media list (free with Make.com)

**https://ebola.help/feeds/media.xml**, about 110 posts a month: news
coverage by established media outlets (mostly Actualite.cd in DR Congo, also
RFI, Africanews, BBC, DW, UN News), in English and French.

Headlines with alarming words ("terrifying", "deadly", "panic", "meurtrière",
"peur"...) are left out, to keep the page calm. A few calm stories are left out
with them; that is the safer mistake.

Together the two lists send about 200 posts a month, more than the 100 of
Zapier's free plan. That is why they are separate: the main list alone fits
Zapier's free plan, and the media list goes through a second free service,
**Make.com** (see below). **Do not add the media list to Zapier on the free
plan:** all Zaps in an account share the same 100 posts, and once they are
used up, every post (the official ones too) stops until the next month.

### Setting up the media list on Make.com (once, about 15 minutes)

Make's free plan gives 1,000 "credits" a month. Each check of the list uses 1
credit, even when nothing is new, and each post uses 1 more. Checking every
2 hours uses about 360 credits a month, plus about 110 for the posts: about
470 in total. **Do not check more often than every hour:** every 15 minutes
would use 2,880 credits for the checks alone.

Make's buttons may be worded slightly differently from what is written here.

1. Go to **make.com** and create a free account.
2. Create a new **scenario** (Make's name for an automation).
3. First module: **RSS**, then **Watch RSS Feed Items**.
   - URL: `https://ebola.help/feeds/media.xml`
   - Maximum number of returned items: 10
   - If Make asks where to start, choose **From now on**, so older entries
     are not posted.
4. Second module (click the **+** after the first): **Facebook Pages**, then
   **Create a Post**.
   - Connect your Facebook account and allow access to the Ebola.help Page.
   - Page: **Ebola.help**
   - Message: click in the field and pick **Description** from the RSS
     module's data (do not type it).
   - Link: pick the item's link from the RSS module's data (called **URL** or
     **Link**).
5. Schedule: click the clock on the RSS module, choose **At regular
   intervals** and enter **120** minutes.
6. Save, then switch the scenario **on**. Media news then appears on the Page
   within about 2 hours of reaching the site.

Make's credit usage is shown on its dashboard. If it gets close to 1,000,
change the schedule to every 3 hours.

## What each post looks like

- **News** (official or media): the headline, the source and date, the link to
  the original article, and a line about Ebola.help. The preview card under
  the post shows the Ebola.help news page: Facebook cannot read some other
  websites and then refuses the post ("Failed to parse URL").
- **Weekly update:** its title and summary, with a preview of the update.
- **Health tip and figures:** English, then French, each with its link.

## Setting up a Zap (once per list, about 10 minutes)

Zapier's buttons may be worded slightly differently from what is written here.

1. Go to **zapier.com** and sign in (or create a free account).
2. Create a new **Zap** (Zapier's name for an automation).
3. **Trigger** (what starts it):
   - App: **RSS by Zapier**
   - Event: **New Item in Feed**
   - Feed URL: `https://ebola.help/feeds/social.xml` (or
     `https://ebola.help/feeds/media.xml` for the second Zap). Leave username
     and password empty.
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
     step 1 data (use the **+** button on the right of the field if the list
     does not open). Do not type the word: the field must show a small
     coloured tag with the start of a post.
   - Link URL: the same way, pick **Link** from the list. The tag shows a web
     address such as `https://ebola.help/fr/news/`. If the field contains the
     plain word "Link", Facebook answers "Failed to parse URL".
   - Leave Photo empty.
5. Click **Test step**. This publishes one real post on the Page (you can
   delete it afterwards).
6. Click **Publish**. From now on, every new entry is posted automatically.

Zapier only posts entries that appear after you switch the Zap on. The older
entries already in the list are not posted.

## Good to know

- **Cost:** free. The main list uses Zapier's free plan (100 posts a month),
  the media list Make's free plan (1,000 credits a month).
- **Hiding a news item:** hide it on the editing page (**Hide or pin news**).
  It then disappears from the site and from both lists. If it was already
  posted, delete the post on Facebook.
- **Pausing:** switch the Zap off in Zapier (main list) or the scenario off
  in Make (media list).
- **Problems:** Zapier and Make e-mail you. **Zap history** in Zapier and the
  scenario's **History** in Make show every post and any error.
- **Changing the languages or the alarm words:** ask Claude (settings:
  `SOCIAL_FEED_LOCALES` in `src/config.ts`, word lists in
  `src/lib/social-feed.ts`).
- **X (Twitter):** X charges $0.20 for each automatic post with a link,
  paid in advance in X's developer console. The same lists can be connected
  to X later. Ask Claude when you are ready.
