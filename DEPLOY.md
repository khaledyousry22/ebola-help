# Putting Ebola.help online

This guide puts the website on **ebola.help** and makes
**wrongnumber@ebola.help** deliver to your usual inbox. Everything here is
**free**. It takes about 45 minutes of clicking, plus some waiting (up to a
day) while the internet learns about the change.

You need: your GoDaddy login, your GitHub login and access to your usual
e-mail inbox.

**Who does what after this:**

| Service | What it does | What you pay |
|---|---|---|
| GoDaddy | You keep renting the name ebola.help there. **Keep auto-renew on**: if the name expires, the site disappears. | Domain renewal only |
| Cloudflare | Shows the website, forwards wrongnumber@ e-mails, protects against overload. | Free plan |
| GitHub | Stores the site, collects news every hour, runs the checks. | Free |

Whenever a screen looks different from what is described here (these
services change their menus from time to time), take a screenshot and send
it to Claude.

---

## Step 1: Create a Cloudflare account (5 minutes)

1. Go to **dash.cloudflare.com/sign-up** and create an account with your
   usual e-mail address. Confirm it from the e-mail Cloudflare sends.
2. Recommended: turn on two-step login (your profile icon → **Profile** →
   **Authentication** → **Two-factor authentication**).
3. If Cloudflare offers paid plans at any point, choose **Free**. You never
   need to enter a credit card for this site.

## Step 2: Add ebola.help to Cloudflare (5 minutes)

1. In the Cloudflare dashboard, choose **Add a domain** (it may be called
   "Onboard a domain").
2. Type `ebola.help`, keep **Quick scan for DNS records**, and continue.
3. Choose the **Free** plan.
4. Cloudflare shows the records it copied from GoDaddy ("DNS records").
   **Delete** any record of type **A**, **AAAA** or **CNAME** whose name is
   `ebola.help` (sometimes shown as `@`) or `www`. These point to GoDaddy's
   parking page; Step 5 creates the right ones. Also delete any **MX**
   record (old GoDaddy e-mail); Step 6 adds new ones. Leave everything else.
   Not sure? Send Claude a screenshot first.
5. Cloudflare then shows **two nameservers**, for example
   `anna.ns.cloudflare.com` and `bob.ns.cloudflare.com` (yours will
   differ). Keep this page open for Step 3.

## Step 3: Point ebola.help to Cloudflare, at GoDaddy (5 minutes, then wait)

1. Sign in at **godaddy.com** → **My Products** (or **Domain Portfolio**) →
   click **ebola.help**.
2. Open the **DNS** tab. If you see **DNSSEC** switched on, switch it off
   first.
3. Under **Nameservers**, choose **Change nameservers** → **I'll use my own
   nameservers**. Enter the two Cloudflare nameservers from Step 2 (copy and
   paste them exactly), then **Save** and confirm.
4. Back in Cloudflare, click **Check nameservers**.

The switch usually takes from a few minutes to a few hours (at most 24).
Cloudflare e-mails you when **ebola.help is active**. Do Step 4 while you
wait.

## Step 4: Connect the website from GitHub (10 minutes)

1. In Cloudflare, open **Workers & Pages** (under **Compute** in the menu)
   → **Create** → **Import a repository**. If you are offered "Workers" or
   "Pages", choose **Workers**.
2. **Connect GitHub**. GitHub asks which repositories Cloudflare may see:
   choose **Only select repositories** → `ebola-help` → **Install**.
3. Select the repository `khaledyousry22/ebola-help`, then fill in:
   - **Project name:** `ebola-help` (exactly this; it must match the name
     in the file `wrangler.jsonc`)
   - **Build command:** `npm run build`
   - **Deploy command:** leave the default, `npx wrangler deploy`
   - **Branch:** `main`
   - Leave everything else as it is.
4. Click **Create and deploy** (or **Deploy**). The first build takes 2 to 3
   minutes. When it shows **Success**, the site is online at a test address
   ending in **workers.dev**, shown on the project page. Open it on your
   phone and look around.

From now on, every change on GitHub (your edits on the editing page, the
hourly news) automatically updates the website within a few minutes. If a
build ever fails, the previous version stays online.

## Step 5: Put the site on ebola.help (5 minutes, once Step 3 is active)

1. **Workers & Pages** → **ebola-help** → **Settings** → **Domains &
   Routes** → **Add** → **Custom domain**. Type `ebola.help` and add it.
2. Do the same again with `www.ebola.help`.
3. Always use the secure address: open the **ebola.help** domain →
   **SSL/TLS** → **Edge Certificates** → switch on **Always Use HTTPS**.
4. Make the www address lead to the main one: on the **ebola.help** domain →
   **Rules** → **Templates** → **Redirect from WWW to root** → **Deploy**.
   If that template is not offered, create a **Redirect Rule** instead:
   - When incoming requests match: **Wildcard pattern**, Request URL
     `https://www.*`
   - Then: Target URL `https://${1}`, Status code **301**, **Preserve query
     string** on
   - **Deploy**

After a few minutes, **https://ebola.help** shows the site with the padlock
(secure connection). Cloudflare renews the security certificate by itself.

Optional: once ebola.help works, you can turn off the test address
(**Settings** → **Domains & Routes** → **workers.dev** → **Disable**).

## Step 6: Receive wrongnumber@ebola.help in your inbox (5 minutes)

GoDaddy no longer offers free e-mail forwarding, so Cloudflare does it.

1. In Cloudflare, open **Email Routing** (under **Compute** → **Email
   Service**, or on the ebola.help domain page under **Email**).
2. Choose **Onboard domain** (or **Get started**), select `ebola.help` and
   let Cloudflare add its records (**Add records** / **Done**).
3. **Destination addresses** → add your usual e-mail address, then click the
   link in the confirmation e-mail Cloudflare sends there.
4. **Routing rules** → **Create routing rule**:
   - Email pattern: `wrongnumber` (ebola.help)
   - Action: **Send to an email**
   - Destination: your usual address
   - **Save**
5. Test: from **another** e-mail account (a friend's, or a second address of
   yours), send a message to wrongnumber@ebola.help. It should arrive in your
   usual inbox within a minute. Check the spam folder the first time.

This forwards incoming messages; you reply from your usual address. If you
later want to send messages *from* wrongnumber@ebola.help, a mailbox service
such as Zoho Mail can do that (its free plan is not offered in every region,
and works only in the browser and its app). Ask Claude first: its settings
must go into Cloudflare, not GoDaddy, and it replaces this forwarding.

## Step 7: Google AdSense (10 minutes, once the site is on ebola.help)

1. **Sites** → **Add site** → `ebola.help`. The code Google asks for is
   already on every page, and so is the `ads.txt` file. Click **Request
   review**. Google's review can take from a few days to a few weeks. Until
   then no ads appear, and the site shows no empty ad spaces.
2. **Privacy & messaging** → **European regulations** → **Create message**
   for ebola.help, add every language offered among Arabic, Chinese,
   English, French, Russian and Spanish, then **Publish**. This is Google's
   own consent message, which the law requires for visitors from Europe, the
   UK and Switzerland.
3. **Brand safety** → **Blocking controls** → **All sites**:
   - **Sensitive categories**: block the ones about drugs and supplements,
     and weight loss;
   - **General categories**: block **Health** (or its parts about
     medicines and pharmaceuticals, if shown separately).

   On an Ebola site, ads for "cures" or medicines would mislead readers. The
   category names in your account may differ slightly; send Claude a
   screenshot if unsure.

## Step 8: Tell Google Search about the site (5 minutes, recommended)

1. Go to **search.google.com/search-console** → **Add property** →
   **Domain** → `ebola.help`.
2. Google gives you a line of text starting with `google-site-verification=`.
   In Cloudflare: **ebola.help** → **DNS** → **Records** → **Add record** →
   Type **TXT**, Name `@`, Content: paste the line → **Save**. Back in Search
   Console, click **Verify** (it can take a few minutes).
3. **Sitemaps** → enter `sitemap-index.xml` → **Submit**.

## Step 9: Check that everything works

- [ ] https://ebola.help shows the language picker; choosing a language
      opens the site in that language.
- [ ] http://www.ebola.help leads to https://ebola.help.
- [ ] The **News** page shows recent news.
- [ ] After about an hour: Cloudflare → **Workers & Pages** → **ebola-help**
      → **Deployments** shows a new deployment after GitHub's "News: hourly
      update".
- [ ] An e-mail to wrongnumber@ebola.help reaches your inbox.
- [ ] On your phone, open the site once, switch to airplane mode, and open
      the helplines page again: it still works.

**Is the free plan enough?** Yes. Visits to the pages are free and
unlimited. Building the site uses about 1 to 2 minutes each time, about 25
times a day, which is roughly a third of the 3,000 free build minutes per
month.

If anything fails, Claude can read the build messages if you copy them from
Cloudflare (**Deployments** → the failed one → **View build log**).
