# KAIRO — Stripe sandbox

Aggiornato il 21 ottobre 2026. Ambiente Stripe `Sandbox di RP SOCIAL OS`, account `acct_1USsfnFMrRGLG1OB`.

## Risorse reali predisposte

| Piano | Mensile EUR | Annuale EUR | Prodotto |
|---|---:|---:|---|
| Start | 19,00 | 182,40 | kairo_start_launch_2026 |
| Pro | 39,00 | 374,40 | kairo_pro_launch_2026 |
| Premium | 69,00 | 662,40 | kairo_premium_launch_2026 |

I sei Price ID verificati sono in `supabase/functions/_shared/billing-core.mjs`. Prezzi esclusi dalle imposte; nessuna raccolta fiscale automatica è stata abilitata.

- Portale configurato: `bpc_1USspZFMrRGLG1OBU8Od6yPh`.
- Webhook configurato: `we_1USsudFMrRGLG1OB7TciyX0W`.
- URL webhook: `https://tkjajqizdjaynslvwcfp.supabase.co/functions/v1/kairo-billing-webhook`.
- API/SDK: Stripe 23.0.0, API eventi 2026-09-30.endive.
- Funzioni Edge: `kairo-billing`, `kairo-billing-webhook`.

## Attivazione del test (richiede accesso ai dashboard)

Il collegamento Stripe a ChatGPT non trasferisce chiavi riservate nel server dell’app.

1. Nel sandbox Stripe crea una chiave **con restrizioni**, per il solo backend KAIRO. Consenti lettura di prezzi, abbonamenti e fatture; lettura/scrittura dei clienti, Checkout Sessions e portale di fatturazione. Non usare credenziali live.
2. Apri il webhook KAIRO già creato e copia il relativo segreto di firma dal dashboard Stripe.
3. In Supabase, progetto `tkjajqizdjaynslvwcfp`, **Edge Functions → Secrets**, configura:
   - `KAIRO_STRIPE_TEST_KEY`: chiave con restrizioni del sandbox (`rk_test_…`).
   - `KAIRO_STRIPE_TEST_WEBHOOK_SECRET`: segreto del webhook KAIRO (`whsec_…`).
   - `KAIRO_BILLING_TEST_USERS`: UUID degli utenti KAIRO autorizzati ai test, separati da virgole; recuperali da Auth → Users.
   - `KAIRO_BILLING_TEST_ENABLED`: `true`, soltanto quando i punti precedenti sono pronti.
4. Apri `/abbonamento` da titolare dell’attività e premi Aggiorna stato.

Non inserire valori segreti in chat, file del repository o variabili NEXT_PUBLIC_. Il backend usa le credenziali Supabase predefinite della funzione; non occorre copiarle.

## Cosa è implementato

- Scelta dei piani e del periodo, con ritorno alla scelta dopo il login.
- Checkout Stripe ospitato e portale per fatture, metodo di pagamento, cambi piano e disdetta a fine periodo.
- Accesso solo al titolare e agli utenti di test autorizzati; nessun endpoint accetta dal browser importi, ID cliente o ID di un altro abbonamento.
- Prenotazione di checkout nel database e chiave di idempotenza persistente; riuso della sessione aperta.
- Webhook obbligatorio verificato con corpo originale, firma e tolleranza temporale.
- Rilettura dello stato attuale da Stripe; pagamento confermato solo da fattura pagata dello stesso cliente e abbonamento.
- Registro eventi idempotente, controllo eventi fuori ordine e associazione cliente/titolare.
- Tabelle sandbox protette da RLS e accessibili solo al servizio backend; RPC SECURITY INVOKER e permessi negati a utenti/anonimi.
- Nessuna scrittura in `public.subscriptions`; i test non cambiano le quote o i piani reali. Le quote attuali continuano a rinnovarsi mensilmente.

## Validazione eseguita

- Build Next.js produzione riuscita.
- 11 test automatici: prezzi, autorizzazione, configurazione assente, doppio clic/checkout aperto, abbonamento già esistente, redirect, fattura pagata e firme webhook valide/non valide/scadute, rifiuto di eventi live e Connect.
- Database, transazione annullata: tentativo checkout riutilizzato; evento duplicato bloccato; evento vecchio ignorato; nessuna modifica agli abbonamenti reali.
- Verificati i permessi: anonimo non legge le tabelle; utente autenticato non scrive e non richiama la sincronizzazione.
- L’advisor segnala intenzionalmente RLS senza policy per le due tabelle service-only. Gli avvisi preesistenti su funzioni amministrative e protezione password restano fuori da questa modifica.

## Test finali da eseguire dopo le credenziali

1. Titolare autorizzato: scegliere Start/Pro/Premium, mensile e annuale; verificare importo e rinnovo in Checkout.
2. Pagamento di prova riuscito: ritorno, webhook confermato e stato aggiornato nel sandbox.
3. Pagamento rifiutato e autenticazione richiesta: nessuna falsa conferma.
4. Doppio clic e riapertura: una sola sessione; nessun secondo abbonamento.
5. Annullare un checkout aperto e scegliere un altro piano.
6. Portale: aggiornare il metodo di pagamento e vedere le fatture.
7. Upgrade e downgrade: verificare conguaglio/rinvio nel portale e sincronizzazione del piano di test.
8. Disdetta: rinnovo disattivato, stato coerente fino a fine periodo.
9. Rinnovo riuscito e fallito, usando un test clock se disponibile.
10. Collaboratore e altro account: nessun accesso alla fatturazione altrui.
11. Controllare che `public.subscriptions` e le quote reali rimangano invariati.
12. Ripetere scelta piano e portale su iPhone e Android.

## Prima degli incassi reali

Il modulo attuale è deliberatamente sandbox-only. Occorrono prodotti/prezzi e credenziali live, verifica fiscale e condizioni commerciali, validazione end-to-end e una successiva integrazione esplicita dei pagamenti verificati con i piani reali. Non basta sostituire una chiave: le chiavi live sono rifiutate dal codice.
