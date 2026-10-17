# RoastMaster AI · Coffee Roasting Lab

A working, mobile-first pilot app for coffee roasting educators and students. It can run as a web app on Android, iPhone and desktop and can be installed as a PWA after HTTPS deployment. Built with **vanilla JavaScript and a dependency-free Node.js 20+ server**, so there is **no `npm install` step**.

## What is implemented

| Feature | State |
|---|---|
| Mobile-friendly dashboard and bottom navigation | Working |
| AI roasting Q&A via Groq | Implemented; requires your Groq API key and shared pilot access code |
| Limited offline reference answers | Working without API key; explicitly labeled offline |
| Eight roasting lessons and quizzes | Working; progress saved to browser storage |
| Roasting profile planning | Working; creates a qualitative roast plan, does not invent Kuban setpoints |
| Kuban Base 5KG safety and fault help | Working; general, not a manufacturer manual |
| Roast logging, DTR and weight-loss calculations | Working; saved to device/browser |
| CSV export | Working |
| Installable Android/iOS home-screen web app | Web manifest + service worker included; requires HTTPS for deployment |
| Separate real teacher and student accounts | **Not implemented**; current mode switch is a UI preference only |
| Cloud sync / shared class dashboard | **Not implemented** |
| Official app-store-native binaries | **Not implemented**; this is a PWA |

The code has **no telemetry** or external fonts/images. When enabled, questions are sent via the server to Groq; the API key never reaches the browser. Chat history and roast logs are stored in the browser and are not synchronized.

## Run locally

**Prerequisites:** Node.js >= 20.12 (Node.js 22 recommended).

```bash
cp .env.example .env
# Edit .env (you can first leave GROQ_API_KEY blank for offline mode)
node --env-file=.env server.mjs
```

Open `http://localhost:3000`.

No dependencies to install.

For convenience, the package scripts support:

```bash
npm run dev      # watch server.mjs for changes
npm start        # loads .env automatically
npm test         # test calculations
```

**Windows PowerShell:** Copy `.env.example` to `.env` and run `node --env-file=.env server.mjs` in the project folder.

## Enable real AI

1. Create a free API key at https://console.groq.com/keys.
2. Edit `.env` (never put the key in JavaScript files):

```dotenv
GROQ_API_KEY=gsk-your-secret-key
GROQ_MODEL=openai/gpt-oss-120b
APP_ACCESS_CODE=a-long-random-code-unique-to-your-pilot
CHAT_REQUESTS_PER_MINUTE=10
```

3. Restart the Node server.
4. Open the **AI Assistant** screen, enter the **pilot access code** in the sidebar card, choose **Use access code**, and ask a question.

The app sends `POST /api/chat` to its own server. That server validates the shared code, rate limits the request, and sends it to `https://api.groq.com/openai/v1/chat/completions`. The model's text response is returned to the app. Free-tier limits apply to your Groq account.

**Security caveat:** The shared access code is suitable for a small private demonstration, **not** public, untrusted, production-scale use. A real release needs per-user authentication, server-side user authorization, persistent cloud rate limiting, abuse controls, costs/budgets, and a database. The included rate limiter is in-memory and applies per Node process. To avoid exposing the key or exhausting your API balance, do not distribute the pilot access code widely. Protect production traffic with HTTPS.

## Publish on an Ubuntu VPS with Docker

With an existing VPS and reverse proxy:

```bash
unzip roastmaster-ai.zip -d /var/www/apps
cd /var/www/apps/roastmaster-ai
cp .env.example .env
nano .env                         # set secrets; do not commit them
sudo docker compose up -d --build
curl http://127.0.0.1:3108/api/status
```

Create an Nginx site for a domain/subdomain you own (replace `roast.example.com`):

```nginx
server {
    listen 80;
    server_name roast.example.com;

    location / {
        proxy_pass http://127.0.0.1:3108;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 70s;
    }
}
```

After saving the Nginx config, enable/test/reload it and obtain an HTTPS certificate:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d roast.example.com
```

Point your DNS `A` record to the VPS first. After you have a working public HTTPS URL, friends can open it and add it to their home screen.

If Nginx is your only way into the Docker service (recommended), you can add `TRUST_PROXY=1` to `.env` so the pilot rate limiter reads Nginx's `X-Real-IP`. **Never enable this when untrusted clients can reach the Node server directly or when your proxy fails to overwrite X-Real-IP**.

**Update the deployed app** after changing code:

```bash
sudo docker compose up -d --build
```

## Home-screen installation

- **Android Chrome:** Open the published HTTPS address, then choose *Install app* or *Add to Home screen* from the browser menu.
- **iPhone Safari:** Open the published HTTPS address, tap *Share*, then *Add to Home Screen*.

This is not a Google Play / Apple App Store release. For native store binaries, a later iteration can use Capacitor or a separate React Native/Flutter client against the same backend.

## App design and caveats

### Coffee and equipment safety

The AI system prompt explicitly avoids inventing Kuban specifications or fixed gas, airflow, temperature, or RPM numbers. The roast planner deliberately provides a **planning worksheet**, not an equipment-control recipe. First-crack times and DTR are descriptive, not universal quality targets. Troubleshooting avoids live electrical repairs, bypassing interlocks, or unsafe gas work. Uploading an official Kuban manual and implementing evidence-backed retrieval would be a useful later version.

### Data and privacy

- Roast logs: `localStorage` in the browser. Browser data can be cleared by the user or OS. Export CSV regularly.
- Chat history: `localStorage`; the last few messages are submitted in context when asking the model.
- Pilot access code: `sessionStorage` only, cleared with the browser session; transmitted to your server over HTTPS.
- Groq API key: server `.env` only; never exposed to the browser.
- Groq requests: review Groq's current API privacy and retention policies before a production deployment.
- Service worker: caches only static app assets for offline viewing; API calls are never cached.

### CSV data

CSV includes date, coffee, roast level, mass readings, yellowing, first crack, drop, development time, weight loss, DTR and notes. Times are stored as seconds so analysis tools can use them. Formula-looking text is escaped to reduce spreadsheet formula injection risk.

## Important source files

```text
server.mjs                secure local HTTP server and Groq API gateway
public/index.html         single-page app layout
public/styles.css         responsive styling
public/app.js             UI screens, lessons, logs, planner, troubleshooting
public/lib.js             tested time and roast math
public/manifest.webmanifest + sw.js  installable/offline PWA support
public/icons/            app icons
Dockerfile + compose.yaml VPS deployment
.env.example              server configuration template
tests/                    Node built-in test runner
```

## API

- `GET /api/status` returns `{ aiEnabled, model, version }` (model `null` when no key/code).
- `POST /api/chat` accepts `{ "messages": [{ "role":"user", "content":"..." }] }` and requires `x-access-code: <your pilot code>`. Returns `{ "answer": "..." }` or `{ "error": "..." }`.

For successful AI calls, keep the Groq API key valid and within the free-tier limits. For public use, implement real student/instructor authentication and a more durable rate limiter first.

## Suggested next milestones

1. Supabase Auth and Postgres tables for students, classes, lessons, roast sessions and discussions.
2. Teacher dashboard, individual course assignments and private student results.
3. Manufacturer-verified Kuban Base 5KG documentation with a cited knowledge search feature.
4. Photo-based roast defect support, graphical curves and CSV/Artisan or RoastLog imports.
5. Real PWA deployment and user testing; then native packaging only if app-store installation is required.
