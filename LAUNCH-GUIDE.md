# FahrDoc — Launch Guide (v2)

## Status ✅

- [x] Supabase-Datenbank (15 Tabellen + RLS)
- [x] E-Mail-Verifizierung (Resend)
- [x] Passwort-Reset per E-Mail
- [x] PWA (Service Worker, Icons)
- [x] Rate Limiting
- [x] DSGVO Consent-Banner
- [ ] Domain einrichten (fahrdoc.app)
- [ ] Resend-Account erstellen + Domain verifizieren
- [ ] Hosting (Railway empfohlen)
- [ ] Stripe Payment (kommt als nächstes)

---

## Schritt 1: Domain kaufen (fahrdoc.app)

### Option A: INWX (empfohlen, deutscher Anbieter)
1. Gehe zu [inwx.de](https://www.inwx.de)
2. Registriere dich und kaufe **fahrdoc.app** (~6€/Jahr)
3. DNS-Einstellungen kommen in Schritt 3

### Option B: Namecheap
1. Gehe zu [namecheap.com](https://www.namecheap.com)
2. Suche und kaufe **fahrdoc.app**

---

## Schritt 2: Resend einrichten (E-Mail-Versand)

1. Gehe zu [resend.com](https://resend.com) und erstelle einen Account
2. **Domain verifizieren:**
   - Im Resend-Dashboard → **Domains** → **Add Domain**
   - Gib `fahrdoc.app` ein
   - Resend zeigt dir DNS-Einträge (MX, TXT, DKIM)
   - Trage diese bei deinem Domain-Anbieter (INWX/Namecheap) ein
   - Warte bis die Verifizierung abgeschlossen ist (meist 5-30 Min)
3. **API Key erstellen:**
   - Im Dashboard → **API Keys** → **Create API Key**
   - Name: "FahrDoc Production"
   - Kopiere den Key (beginnt mit `re_...`)
4. Trage den Key in deine `.env` ein:
   ```
   RESEND_API_KEY=re_DEIN_ECHTER_KEY
   FROM_EMAIL=FahrDoc <noreply@fahrdoc.app>
   ```

---

## Schritt 3: Railway Hosting (empfohlen)

Railway ist am einfachsten für Node.js-Apps: Git push = automatisches Deployment.

### Ersteinrichtung:
1. Gehe zu [railway.app](https://railway.app) und logge dich ein (GitHub empfohlen)
2. **New Project** → **Deploy from GitHub Repo**
3. Verbinde dein GitHub-Repository (oder erstelle eines)
4. Railway erkennt automatisch Node.js

### Git-Repository erstellen:
```bash
cd fahrdoc-app
git init
git add .
git commit -m "FahrDoc v2 - Supabase Edition"
git remote add origin https://github.com/DEIN_USERNAME/fahrdoc.git
git push -u origin main
```

### Environment Variables in Railway setzen:
Gehe zu **Settings → Variables** und füge alle Werte aus deiner `.env` ein:

| Variable | Wert |
|---|---|
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *(langer zufälliger String)* |
| `SUPABASE_URL` | `https://tjqobyorudyvgmqwfpox.supabase.co` |
| `SUPABASE_ANON_KEY` | *(dein anon key)* |
| `SUPABASE_SERVICE_KEY` | *(dein service_role key)* |
| `GOOGLE_MAPS_API_KEY` | *(dein Maps Key)* |
| `RESEND_API_KEY` | *(dein Resend Key)* |
| `FROM_EMAIL` | `FahrDoc <noreply@fahrdoc.app>` |

### Custom Domain verbinden:
1. In Railway → **Settings → Domains** → **Custom Domain**
2. Gib `fahrdoc.app` und `www.fahrdoc.app` ein
3. Railway zeigt dir einen CNAME-Eintrag
4. Trage diesen bei deinem Domain-Anbieter ein:
   - `fahrdoc.app` → A Record → Railway IP (oder ALIAS)
   - `www.fahrdoc.app` → CNAME → `*.up.railway.app`
5. SSL wird automatisch eingerichtet

---

## Schritt 4: Supabase SQL (einmalig)

Führe dieses SQL im Supabase SQL-Editor aus (für die E-Mail-Verifizierung):

```sql
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('school', 'instructor', 'student')),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email_verify' CHECK(type IN ('email_verify', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, type, used);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, type);
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
```

---

## Schritt 5: Google Maps API Key einschränken

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Klicke auf deinen API Key
3. **Anwendungseinschränkungen** → "HTTP-Referrer":
   - `https://fahrdoc.app/*`
   - `https://www.fahrdoc.app/*`
4. **API-Einschränkungen** → nur aktivieren:
   - Maps JavaScript API
   - Street View Static API

---

## Checkliste vor dem Launch

- [ ] fahrdoc.app gekauft
- [ ] Resend-Account + Domain verifiziert
- [ ] `verification_codes`-Tabelle im SQL-Editor erstellt
- [ ] Railway-Projekt erstellt + Environment Variables gesetzt
- [ ] Domain mit Railway verbunden
- [ ] Google Maps API Key auf fahrdoc.app eingeschränkt
- [ ] App testen (Registrierung → E-Mail kommt an → Code eingeben → Login)
- [ ] Demo-Daten entfernen (optional: `seed-data.js` nicht ausführen auf Production)

---

## Alternative Hosting-Optionen

| Anbieter | Preis | Vorteile |
|---|---|---|
| **Railway** | ~$5/Monat | Am einfachsten, Git-Push Deploy, auto SSL |
| **Render** | Kostenlos (Hobby) | Gut zum Testen, langsamer Cold Start |
| **Hetzner Cloud** | Ab €4,51/Monat | Deutsch, DSGVO-konform, mehr Kontrolle |
| **Fly.io** | Kostenlos (Hobby) | Schnell, global verteilt |

---

## Neue API-Endpunkte (E-Mail-Verifizierung)

| Endpunkt | Beschreibung |
|---|---|
| `POST /api/auth/signup` | Registrierung + sendet Verifizierungscode per E-Mail |
| `POST /api/auth/verify-email` | Prüft den echten 6-stelligen Code |
| `POST /api/auth/resend-code` | Sendet neuen Verifizierungscode |
| `POST /api/auth/forgot-password` | Sendet Passwort-Reset-Code per E-Mail |
| `POST /api/auth/reset-password` | Setzt neues Passwort mit Reset-Code |
