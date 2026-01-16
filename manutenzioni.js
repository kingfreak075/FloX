
// ========== CONFIGURAZIONE ==========
const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mostrare solo manutentore loggato?
// false = dropdown con TUTTI i manutentori
// true  = dropdown con SOLO il manutentore loggato
const SOLO_LOGGATO = false; // <- come richiesto ora: mostra TUTTI

const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

// ======================================================
// AVVIO PAGINA
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
  // mese corrente
  const meseCorrente = new Date().getMonth() + 1;
  const selMese = document.getElementById('select-mese');
  if (selMese) selMese.value = meseCorrente;

  // carico manutentori e, quando pronto, carico gli impianti
  await caricaManutentori();
  caricaManutenzioni();
});

// ======================================================
// CARICA LISTA MANUTENTORI
// ======================================================
async function caricaManutentori() {
  const select = document.getElementById('select-tecnico');
  if (!select) return;

  select.innerHTML = "<option value=''>Caricamento...</option>";

  let query = supabaseClient
    .from('manutentori')
    .select('Manutentore, Giro')
    .order('Manutentore', { ascending: true });

  if (SOLO_LOGGATO && tecnicoLoggato) {
    query = query.eq('Manutentore', tecnicoLoggato);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[manutenzioni] Errore caricamento manutentori:', error);
    select.innerHTML = "<option value=''>Errore caricamento</option>";
    return;
  }

  select.innerHTML = "";
  if (!data || data.length === 0) {
    select.innerHTML = "<option value=''>Nessun manutentore trovato</option>";
    return;
  }

  data.forEach(m => {
    const opt = document.createElement('option');
    // valore = Giro (ATTENZIONE: in manutentori non conosciamo il tipo; lo tratteremo come string)
    opt.value = String(m.Giro ?? '').trim();
    opt.textContent = m.Manutentore ?? '(senza nome)';
    select.appendChild(opt);
  });

  // se SOLO_LOGGATO=true e c’è un’unica opzione, sarà già selezionata
}

// ======================================================
// CARICA IMPIANTI DEL GIRO + FILTRO SEMESTRALE
// ======================================================
async function caricaManutenzioni() {
  const lista = document.getElementById('lista-manutenzioni');
  if (!lista) return;
  lista.innerHTML = "<div style='color:#64748b'>Caricamento...</div>";

  const meseSelezionato = parseInt(document.getElementById('select-mese').value, 10);
  const giroVal = document.getElementById('select-tecnico').value; // string

  console.log('[manutenzioni] meseSelezionato =', meseSelezionato, 'giro =', giroVal);

  if (!giroVal) {
    lista.innerHTML = "<div>Seleziona un manutentore.</div>";
    return;
  }

  // Query su Parco_app con nome colonne esatte:
  //  - Indirizzo (I maiuscola)
  //  - localit (senza accento)
  //  - mese_sem / ult_sem (text)
  const { data: impianti, error } = await supabaseClient
    .from('Parco_app')
    .select('impianto, "Indirizzo", localit, mese_sem, ult_sem, giro')
    .eq('giro', String(giroVal)); // giro è TEXT in Parco_app

  if (error) {
    console.error('[manutenzioni] Errore lettura impianti:', error);
    lista.innerHTML = `<div style='color:#b91c1c'>Errore lettura impianti: ${error.message}</div>`;
    return;
  }

  if (!impianti || impianti.length === 0) {
    lista.innerHTML = "<div style='color:#64748b;text-align:center;margin-top:40px'>Nessun impianto per questo giro.</div>";
    return;
  }

  // Filtro semestrale
  const filtrati = impianti.filter(imp => {
    const m = parseInt(imp.mese_sem, 10); // mese_sem è text
    if (Number.isNaN(m)) return false;
    const opposto = m > 6 ? m - 6 : m + 6;
    return (m === meseSelezionato || opposto === meseSelezionato);
  });

  if (filtrati.length === 0) {
    lista.innerHTML = "<div style='color:#64748b;text-align:center;margin-top:40px'>Nessuna semestrale per questo mese.</div>";
    return;
  }

  // Render card (layout invariato: inline style semplice)
  lista.innerHTML = "";
  filtrati.forEach(imp => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: white;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      border-left: 6px solid #3b82f6;
    `;

    card.innerHTML = `
      <div style="font-size:1.1rem; font-weight:900; color:#1e293b">
        ${imp.impianto ?? '-'}
      </div>

      <div style="font-size:0.85rem; color:#475569; margin-top:4px">
        ${imp.Indirizzo ?? '-'}
      </div>

      <div style="font-size:0.85rem; color:#475569">
        ${imp.localit ?? '-'}
      </div>

      <div style="margin-top:8px; font-size:0.75rem; color:#0f172a; font-weight:700">
        Ultima Semestrale:
        <span style="color:#2563eb">${imp.ult_sem ?? '-'}</span>
      </div>
    `;

    lista.appendChild(card);
  });
}
