const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEvents = [];
const tecnicoLoggato = localStorage.getItem('tecnico_loggato');
const mesiNomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

document.addEventListener('DOMContentLoaded', () => {
    if (!tecnicoLoggato) {
        window.location.href = 'index.html';
        return;
    }
    initSelectors();
    fetchMese();
});

function initSelectors() {
    const selectMese = document.getElementById('select-mese');
    const selectAnno = document.getElementById('select-anno');
    const oggi = new Date();

    selectMese.innerHTML = '';
    mesiNomi.forEach((m, i) => {
        let opt = document.createElement('option');
        opt.value = i + 1;
        opt.innerText = m;
        if (i === oggi.getMonth()) opt.selected = true;
        selectMese.appendChild(opt);
    });

    selectAnno.innerHTML = '';
    for (let i = 2024; i <= 2026; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        if (i === oggi.getFullYear()) opt.selected = true;
        selectAnno.appendChild(opt);
    }

    selectMese.onchange = fetchMese;
    selectAnno.onchange = fetchMese;
}

async function fetchMese() {
    const loading = document.getElementById('loading-overlay');
    const m = parseInt(document.getElementById('select-mese').value);
    const a = parseInt(document.getElementById('select-anno').value);
    
    if (loading) loading.style.display = 'block';
    document.getElementById('day-detail').style.display = 'none';

    try {
        const { data, error } = await supabaseClient
            .from('fogliolavoro')
            .select('*')
            .eq('tecnico', tecnicoLoggato)
            .eq('mese', m)
            .eq('anno', a);

        if (error) throw error;
        currentEvents = data || [];
        renderCalendar();
    } catch (err) {
        console.error("ERRORE SUPABASE:", err);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const selectMese = document.getElementById('select-mese');
    const selectAnno = document.getElementById('select-anno');
    
    container.innerHTML = '';
    
    // Intestazione giorni (L M M G V S D)
    ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(g => {
        container.innerHTML += `<div class="calendar-day header">${g}</div>`;
    });

    const m = parseInt(selectMese.value) - 1;
    const a = parseInt(selectAnno.value);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0); 

    const primoGiorno = new Date(a, m, 1).getDay();
    const offset = (primoGiorno === 0) ? 6 : primoGiorno - 1;
    const giorniMese = new Date(a, m + 1, 0).getDate();

    // Celle vuote iniziali
    for (let i = 0; i < offset; i++) {
        container.innerHTML += `<div class="calendar-day" style="background:transparent; cursor:default;"></div>`;
    }

    // Generazione giorni del mese
    for (let d = 1; d <= giorniMese; d++) {
        const dataCorrente = new Date(a, m, d);
        const giornoSettimana = dataCorrente.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
        const isFeriale = giornoSettimana !== 0 && giornoSettimana !== 6;
        const isGiornoFestivo = isFestivo(dataCorrente);
        const isPassato = dataCorrente <= oggi;

        // Filtro interventi e calcolo ore ordinarie totali del giorno
        const interventiGiorno = currentEvents.filter(e => parseInt(e.giorno) === d);
        let oreOrdinarieTotali = 0;
        interventiGiorno.forEach(e => {
            const o = parseFloat(String(e.ore_ord || 0).replace(',', '.'));
            oreOrdinarieTotali += o;
        });

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.innerText = d;

        // --- 1. COLORAZIONE ESTETICA (Sfondo) ---
        if (isGiornoFestivo || giornoSettimana === 0) {
            // Sfondo rosso chiaro per festivi e domeniche
            dayEl.style.backgroundColor = '#fee2e2'; 
            dayEl.style.color = '#b91c1c';           
            dayEl.title = isGiornoFestivo ? "Giorno Festivo" : "Domenica";
            dayEl.style.fontWeight = "800";
        } else if (giornoSettimana === 6) {
            // Grigio chiaro per i sabati
            dayEl.style.backgroundColor = '#f1f5f9';
        }

        // --- 2. LOGICA AVVISI/PALLINI (Controllo 8h su Lun-Ven, inclusi i festivi) ---
        if (isFeriale && isPassato) {
            // Essendo un giorno feriale (Lun-Ven), deve avere 8 ore anche se festivo
            if (oreOrdinarieTotali === 8) {
                dayEl.classList.add('status-ok');      // VERDE: 8h precise
            } else if (oreOrdinarieTotali > 0 && oreOrdinarieTotali < 8) {
                dayEl.classList.add('status-warning'); // GIALLO: Incompleto
            } else {
                // ROSSO: 0 ore inserite o più di 8 ore (es. 8.50)
                dayEl.classList.add('status-error');   
            }
        } else if (interventiGiorno.length > 0) {
            // Per i weekend o giorni futuri, pallino blu standard se ci sono dati
            dayEl.classList.add('has-events');
        }

        // Click per i dettagli
        dayEl.onclick = () => showDetail(d, dayEl);
        container.appendChild(dayEl);
    }
}

function showDetail(giorno, element) {
    // Gestione selezione grafica sul calendario
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // Filtro interventi del giorno selezionato
    const evts = currentEvents.filter(e => parseInt(e.giorno) === giorno);
    const detail = document.getElementById('day-detail');
    const list = document.getElementById('events-list');
    
    // Aggiornamento titolo dettaglio
    document.getElementById('selected-date-title').innerText = giorno + " " + mesiNomi[document.getElementById('select-mese').value-1];
    detail.style.display = 'block';
    list.innerHTML = '';

    let tOrd = 0, tStra = 0, tViag = 0;

    if (evts.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.6;">Nessun intervento oggi.</p>';
    } else {
        evts.forEach(e => {
            // Calcolo ore con gestione virgola/punto
            const oreO = parseFloat(String(e.ore_ord || 0).replace(',', '.'));
            const oreS = parseFloat(String(e.ore_stra || 0).replace(',', '.'));
            const oreV = parseFloat(String(e.ore_viaggio || 0).replace(',', '.'));
            tOrd += oreO; tStra += oreS; tViag += oreV;

            // Mappatura Icone e Stili
            const tipi = {
                'ORDINARIA': { bg: 'rgba(255,255,255,0.9)', txt: '#475569', icon: 'build_circle' },
                'REPERIBILITÀ': { bg: 'rgba(239,68,68,0.15)', txt: '#b91c1c', icon: 'e911_emergency' },
                'ALTRO': { bg: 'rgba(234,179,8,0.15)', txt: '#a16207', icon: 'pending_actions' },
                'MONTAGGIO': { bg: 'rgba(59,130,246,0.15)', txt: '#1d4ed8', icon: 'precision_manufacturing' },
                'STRAORDINARIO': { bg: 'rgba(249,115,22,0.15)', txt: '#c2410c', icon: 'handyman' },
                'Attività in Filiale': { bg: 'rgba(100,116,139,0.15)', txt: '#334155', icon: 'domain' }
            };

            const stile = tipi[e.ch_rep] || tipi['ALTRO'];
            
            // Formattazione Orari (nasconde se 00:00)
            const ini = (e.inizio_int && e.inizio_int !== '00:00:00' && e.inizio_int !== '00:00') ? e.inizio_int.substring(0,5) : '';
            const fin = (e.fine_int && e.fine_int !== '00:00:00' && e.fine_int !== '00:00') ? e.fine_int.substring(0,5) : '';
            const orarioLabel = (ini && fin) ? `${ini} / ${fin}` : '';

            // LOGICA GESTIONE N/D E TITOLO MAGGIORATO
            const haImpianto = e.impianto && e.impianto !== 'N/D' && e.impianto.trim() !== '';
            const titoloVisibile = haImpianto ? e.impianto : e.indirizzo;
            const sottotitoloVisibile = haImpianto ? e.indirizzo : '';
            // Se l'impianto è N/D, il titolo (indirizzo) diventa quasi il doppio (1.8rem)
            const fontTitolo = haImpianto ? '1.1rem' : '1.8rem';

            const card = document.createElement('div');
            card.className = 'section-card';
            card.style.cssText = `
                background: ${stile.bg};
                border-left: 6px solid ${stile.txt};
                padding: 16px;
                margin-bottom: 14px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            `;
            
           card.innerHTML = `
    <div style="position: absolute; right: 10px; bottom: -10px; font-size: 3.5rem; font-weight: 900; color: rgba(0,0,0,0.05); pointer-events: none; user-select: none; z-index: 0;">
        ${e.codice || ''}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-start; position: relative; z-index: 1;">
        <div style="flex:1">
            <div style="display:flex; align-items:center; gap:6px; color:${stile.txt}; margin-bottom:6px;">
                <span class="material-symbols-rounded" style="font-size:18px;">${stile.icon}</span>
                <span style="font-weight:800; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.6px;">${e.ch_rep}</span>
            </div>
            
            <div style="font-weight:900; color:#1e293b; font-size:${fontTitolo}; line-height:1.2; margin-bottom:4px;">
                ${titoloVisibile}
            </div>
            
            ${sottotitoloVisibile ? `<div style="font-size:0.9rem; color:#64748b; font-weight:500;">${sottotitoloVisibile}</div>` : ''}
            
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                ${oreO > 0 ? `<div style="display:flex; align-items:center; gap:4px; font-size:0.85rem; font-weight:800; color:#2563eb; background:#eff6ff; padding:2px 6px; border-radius:4px;"><span class="material-symbols-rounded" style="font-size:16px;">schedule</span>${oreO.toFixed(2)}</div>` : ''}
                ${oreS > 0 ? `<div style="display:flex; align-items:center; gap:4px; font-size:0.85rem; font-weight:800; color:#dc2626; background:#fef2f2; padding:2px 6px; border-radius:4px;"><span class="material-symbols-rounded" style="font-size:16px;">bolt</span>${oreS.toFixed(2)}</div>` : ''}
                ${oreV > 0 ? `<div style="display:flex; align-items:center; gap:4px; font-size:0.85rem; font-weight:800; color:#16a34a; background:#f0fdf4; padding:2px 6px; border-radius:4px;"><span class="material-symbols-rounded" style="font-size:16px;">directions_car</span>${oreV.toFixed(2)}</div>` : ''}
            </div>
        </div>
        
        <div style="text-align:right; font-weight:900; font-size:0.95rem; color:#1e293b; background: rgba(255,255,255,0.6); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05);">
            ${orarioLabel}
        </div>
    </div>

    <div style="display:flex; justify-content:flex-start; align-items:center; gap:20px; margin-top:8px; position: relative; z-index: 2;">
        
        <button onclick="modificaIntervento(${JSON.stringify(e).replace(/"/g, '&quot;')})" 
                style="background:none; border:none; color:#2563eb; display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:800; cursor:pointer; padding:0; text-transform:uppercase;">
            <span class="material-symbols-rounded" style="font-size:18px;">edit</span> MODIFICA
        </button>

        <button onclick="eliminaIntervento('${e.ID}')" 
                style="background:none; border:none; color:#ef4444; display:flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:800; cursor:pointer; padding:0; text-transform:uppercase;">
            <span class="material-symbols-rounded" style="font-size:18px;">delete</span> CANCELLA
        </button>

    </div>
`;
            list.appendChild(card);
        });
    }

    // Aggiornamento statistiche a fondo pagina
    document.getElementById('sum-ord').innerText = tOrd.toFixed(2);
    document.getElementById('sum-stra').innerText = tStra.toFixed(2);
    document.getElementById('sum-viag').innerText = tViag.toFixed(2);
    
    // Scroll automatico verso il dettaglio
    setTimeout(() => {
        detail.scrollIntoView({ behavior: 'smooth' });
    }, 150);
}

function isFestivo(data) {
    const d = data.getDate();
    const m = data.getMonth() + 1;
    const y = data.getFullYear();

    // 1. Festività Fisse + San Petronio (4 Ottobre)
    const festiviFissi = [
        "1-1",   // Capodanno
        "6-1",   // Epifania
        "25-4",  // Liberazione
        "1-5",   // Festa del Lavoro
        "2-6",   // Festa della Repubblica
        "15-8",  // Ferragosto
        "4-10",  // San Petronio (Bologna) <--- AGGIUNTO
        "1-11",  // Ognissanti
        "8-12",  // Immacolata
        "25-12", // Natale
        "26-12"  // S. Stefano
    ];

    const chiave = `${d}-${m}`;
    if (festiviFissi.includes(chiave)) return true;

    // 2. Calcolo Pasqua e Pasquetta (Algoritmo di Butcher)
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d_div = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d_div - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const n = Math.floor((a + 11 * h + 22 * l) / 451);
    const mesePasqua = Math.floor((h + l - 7 * n + 114) / 31);
    const giornoPasqua = ((h + l - 7 * n + 114) % 31) + 1;

    // Pasqua
    if (d === giornoPasqua && m === mesePasqua) return true;

    // Pasquetta (Giorno dopo Pasqua)
    const dataPasquetta = new Date(y, mesePasqua - 1, giornoPasqua + 1);
    if (d === dataPasquetta.getDate() && m === (dataPasquetta.getMonth() + 1)) return true;

    return false;
}

async function eliminaIntervento(idDaCancellare) {
    const conferma = confirm("Sei sicuro di voler eliminare definitivamente questo intervento?");
    if (!conferma) return;

    try {
        const { error } = await supabaseClient
            .from('fogliolavoro')
            .delete()
            .eq('ID', idDaCancellare);

        if (error) throw error;

        alert("Intervento eliminato con successo.");
        
        // Chiudi il modale solo se l'elemento esiste
        const modal = document.getElementById('modal-details'); // <-- VERIFICA QUESTO ID
        if (modal) {
            modal.style.display = 'none';
        } else {
            // Se l'ID è diverso (es. 'details-modal'), prova quello
            const altModal = document.getElementById('details-modal');
            if (altModal) altModal.style.display = 'none';
        }

        // Ricarica i dati per aggiornare il calendario
        fetchMese(); 

    } catch (err) {
        console.error("Errore:", err.message);
        alert("Errore durante la cancellazione: " + err.message);
    }
}

function modificaIntervento(intervento) {
    // Salviamo l'intero oggetto intervento nel localStorage
    // così la pagina di inserimento potrà leggerlo
    localStorage.setItem('edit_intervento', JSON.stringify(intervento));
    
    // Reindirizziamo l'utente alla pagina di inserimento
    // Passiamo l'ID dell'impianto nell'URL come facciamo di solito
    window.location.href = `nuovo_lavoro.html?id=${intervento.impianto}&mode=edit`;
}