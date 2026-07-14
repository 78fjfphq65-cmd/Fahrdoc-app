/*
 * FahrDoc — Stripe-Subs auf cancel_at_period_end setzen
 * ======================================================
 *
 * Kontext: Seit 2026-07-14 ist FahrDoc komplett kostenlos.
 * Dieses Skript setzt alle aktiven Stripe-Subscriptions auf
 * cancel_at_period_end=true. Dadurch:
 *   - keine neuen Abbuchungen ab Ende des aktuellen Zeitraums
 *   - kein Refund fuer die laufende Periode
 *   - App bleibt fuer diese Kunden nutzbar (die neue
 *     computeSubscriptionState liefert immer active=true)
 *
 * Nutzung:
 *   cd /path/to/Fahrdoc-app
 *   node scripts/cancel-all-stripe-subs.js --dry     # trockener Lauf, nur Liste
 *   node scripts/cancel-all-stripe-subs.js --apply   # echt setzen
 *
 * Voraussetzung: STRIPE_SECRET_KEY in .env / Env.
 */
require('dotenv').config();
const Stripe = require('stripe');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error('STRIPE_SECRET_KEY fehlt'); process.exit(1); }
const stripe = Stripe(key);

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry') || !APPLY;

async function main() {
  console.log(DRY ? '=== DRY RUN ===' : '=== APPLY ===');
  let touched = 0, skipped = 0, alreadyCancelled = 0, errors = 0;

  // Alle aktiven Subs iterieren
  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    const shouldCancel = (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')
                     && !sub.cancel_at_period_end;
    const label = `${sub.id} status=${sub.status} cust=${sub.customer} cap=${sub.cancel_at_period_end}`;
    if (sub.cancel_at_period_end) { alreadyCancelled++; console.log('SKIP already cap:', label); continue; }
    if (!shouldCancel) { skipped++; console.log('SKIP status:', label); continue; }
    try {
      if (DRY) {
        console.log('WOULD CANCEL:', label);
      } else {
        const upd = await stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: true,
          metadata: { ...(sub.metadata || {}), fahrdoc_free_transition: '2026-07-14' }
        });
        console.log('CANCELLED:', upd.id, 'ends', new Date(upd.current_period_end * 1000).toISOString());
      }
      touched++;
    } catch (e) {
      errors++;
      console.error('ERROR', sub.id, e.message);
    }
  }

  console.log('\n=== Zusammenfassung ===');
  console.log('Betroffen:', touched);
  console.log('Bereits cancel_at_period_end:', alreadyCancelled);
  console.log('Uebersprungen (falscher Status):', skipped);
  console.log('Fehler:', errors);
  if (DRY) console.log('\nDies war nur ein DRY RUN. Mit --apply nochmal starten, um wirklich zu aendern.');
}

main().catch(e => { console.error(e); process.exit(1); });
