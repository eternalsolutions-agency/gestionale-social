# KAIRO — modifiche e test progressivi

Aggiornamento: 19 ottobre 2026.

## Blocco 1: strategia, idee e testi AI

- API testi estesa a copy, strategia e gruppi di sei idee con schemi distinti.
- Schema verificato sul server prima del consumo definitivo della quota e nel client prima dell’uso.
- Una generazione riuscita consuma una quota testi, condivisa con titolare e collaboratori.
- Risposte incomplete, errori del provider e timeout rilasciano la prenotazione tramite le RPC esistenti.
- Proposte guidate ancora disponibili senza consumo AI, esplicitamente distinte dalle generazioni AI.
- “Rigenera idee” rinominato “Riordina proposte”: non promette più idee nuove quando cambia soltanto l’ordine.
- Nuovo comando per sei idee AI diverse dalle proposte precedenti; conservazione nella sessione per attività e strategia.
- Se il salvataggio della strategia fallisce, la proposta rimane disponibile nella pagina per riprovare senza nuova generazione.
- Stato del motore AI verificato nelle schermate; credenziali e dettagli del provider non esposti.
- Listino e pannello quote allineati ai limiti testi già presenti nel database: Start 100, Pro 300, Premium 800/mese. Nessuna modifica ai prezzi.

### Verifiche automatiche

- Test delle tre risposte strutturate con provider simulato.
- Richieste anonime, task non valido, configurazione assente, quota esaurita.
- Fallimento del provider e risposta incompleta: rilascio quota, nessuna esposizione di errori interni.
- Build produzione e smoke delle pagine/API.

### Attivazioni esterne ancora necessarie

- Vercel: OPENAI_API_KEY assente alla verifica. Impostarla come variabile server nel progetto gestionale-social e ricostruire la produzione. Non inserire il valore in chat o nel repository.
- Meta: zero account collegati al controllo del database. Il titolare deve autorizzare i propri account.
- La generazione reale con provider a pagamento, la consegna email e la pubblicazione Meta non sono collaudate da questi test simulati.

### Test utente da includere nel riepilogo finale

1. Proposta guidata di strategia: nessun consumo testi; salvataggio e riapertura.
2. Strategia AI dopo attivazione: contesto corretto, una quota, salvataggio e riapertura.
3. Sei nuove idee AI: varietà rispetto alle precedenti, contesto corretto, una quota totale.
4. Riordino proposte: nessuna chiamata AI e nessun consumo.
5. Idea → Crea contenuto → copy AI → salvataggio.
6. Quote condivise owner/collaboratore e isolamento tra due attività.
7. Errori provider, quota esaurita e salvataggio fallito: messaggi corretti e retry senza duplicare la generazione.
8. Layout e comandi su iPhone e Android reali.

## Blocchi successivi

- Abbonamenti e pagamenti: provider, checkout, webhook verificati e idempotenti, rinnovi, cancellazione, cambio piano, extra.
- Percorso di creazione e libreria; notifiche; pubblicazione caroselli/storie e report Meta.
- Sottotitoli automatici opzionali, import Drive/Canva, nuovi canali e offerta agenzie.
- Bot social ancora sospesi, come concordato.

## Blocco 2 — quote e preparazione dei pagamenti (21 ottobre 2026)

- Corretta l’etichetta Testi AI nella pagina quote e aggiunto il limite Start già esistente (100/mese).
- Aggiornamento dei contatori dopo una generazione AI riuscita, anche nel pannello impostazioni.
- Schede quote adattate al numero di categorie presenti.
- Stripe non collegato a Vercel al controllo; integrazione Stripe disponibile ma non installata in ChatGPT.
- Checkout, webhook e acquisti non implementati in questo blocco: richiedono prima il collegamento al provider reale.
- Test aggiuntivi per il riepilogo: etichetta testi visibile; consumo aggiornato dopo copy/strategia/idee; nessun consumo per modifica manuale o proposta guidata; verifica visuale con tutte e cinque le categorie.
