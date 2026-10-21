"use client";
import Shell from '../../components/BusinessToolsShell';
import QuotaPanel from '../../components/QuotaPanel';
export default function Quotas(){return <Shell title="Le generazioni del tuo team" eyebrow="PIANO E QUOTE"><p>Qui trovi le quote effettivamente attive nel workspace. Sono condivise tra titolare e collaboratori e vengono applicate anche lato server.</p><QuotaPanel/><section><h2>Come funzionano</h2><p>Start include 100 generazioni testo al mese, Pro 300 e Premium 800. In assenza di un abbonamento attivo il workspace usa temporaneamente il profilo Start.</p><p>I limiti commerciali di immagini AI, modifiche foto, clip video AI e montaggi reel non sono ancora definitivi: per questo non vengono presentati come quote incluse nel piano.</p></section></Shell>}
