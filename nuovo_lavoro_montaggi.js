// === Supabase init ===
const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === Variabili globali ===
let datiMontaggio = null;      // Dati del montaggio dalla tabella 'montaggi'
let codMontaggio = null;       // cod_montaggio (es: "007" o "001")
const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

// ─────────────────────────────────────────────────────────────────────────────
// Caricamento iniziale
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ottieni ID impianto dall'URL (es: ?id=Q2K10001)
        const urlParams = new URLSearchParams(window.location.search);
        const impiantoId = urlParams.get('id');
        
        if (!impiantoId) {
            alert('Nessun impianto specificato');
            window.location.href = 'montaggi.html';
            return;
        }

        // 1. CARICA DATI MONTAGGIO
        const { data: montaggioData, error: montError } = await supabaseClient
            .from('montaggi')
            .select('*')
            .eq('impianto', impiantoId)
            .single();
        
        if (montError) throw new Error(`Errore caricamento montaggio: ${montError.message}`);
        
        datiMontaggio = montaggioData;
        codMontaggio = datiMontaggio.cod_montaggio;

        // 2. POPOLA INTERFACCIA
        // Codice montaggio
        document.getElementById('display-codice-montaggio').textContent = codMontaggio || 'N/D';
        
        // Impianto e indirizzo
        document.getElementById('display-impianto').textContent = datiMontaggio.impianto || 'N/D';
        document.getElementById('display-indirizzo').textContent = datiMontaggio.Indirizzo || 'Indirizzo non disponibile';
        document.getElementById('display-cliente').textContent = datiMontaggio.cliente || 'Cliente non specificato';
        
        // 3. DATA ODIIERNA DI DEFAULT
        const elData = document.getElementById('data-lavoro');
        if (elData && !elData.value) {
            elData.valueAsDate = new Date();
        }

    } catch (error) {
        console.error('Errore inizializzazione:', error);
        alert(`Errore: ${error.message}\nTorno alla lista montaggi.`);
        window.location.href = 'montaggi.html';
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// UI toggle (Ordinarie vs Straordinarie)
// ─────────────────────────────────────────────────────────────────────────────
function updateUI() {
    const tipoOre = document.querySelector('input[name="tipo-ore"]:checked').value;
    
    document.getElementById('box-ore-dirette').style.display = 
        (tipoOre === 'ORDINARIE') ? 'block' : 'none';
    
    document.getElementById('box-orari').style.display = 
        (tipoOre === 'STRAORDINARIE') ? 'block' : 'none';
    
    // Se straordinarie, calcola ore
    if (tipoOre === 'STRAORDINARIE') {
        calcolaOre();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validazione e calcolo orari (stesso sistema di nuovo_lavoro.js)
// ─────────────────────────────────────────────────────────────────────────────
function validateTimeAndCalculate(input) {
    if (!input.value) return;
    
    let [h, m] = input.value.split(':').map(Number);
    
    // Arrotondamento a 15' (stesso sistema)
    m = Math.round(m / 15) * 15;
    if (m === 60) { 
        m = 0; 
        h = (h + 1) % 24; 
    }
    
    input.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    calcolaOre();
}

function calcolaOre() {
    const inizio = document.getElementById('ora-inizio').value;
    const fine = document.getElementById('ora-fine').value;
    const dataVal = document.getElementById('data-lavoro').value;
    
    if (!inizio || !fine || !dataVal) return;

    // Usa la stessa funzione di calcolo di nuovo_lavoro.js
    const res = processHoursMontaggio(inizio, fine, new Date(dataVal).getDay());
    
    document.getElementById('res-ord').textContent = res.ord.toFixed(2);
    document.getElementById('res-stra').textContent = res.stra.toFixed(2);
}

function checkLimiti(input, min, max) {
    let val = parseFloat(input.value);
    
    if (isNaN(val) || val < min) {
        input.value = min;
    } else if (val > max) {
        input.value = max;
        alert(`Il valore massimo consentito è ${max}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcolo ore per montaggi (adattato da nuovo_lavoro.js)
// ─────────────────────────────────────────────────────────────────────────────
function processHoursMontaggio(inizio, fine, dayOfWeek) {
    const total = calculateTotalDiff(inizio, fine); // in ore
    
    // Weekend: tutto straordinario
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { ord: 0, stra: total };
    }

    // Feriale: fasce come in nuovo_lavoro.js
    let [hIn, mIn] = inizio.split(':').map(Number);
    let [hFi, mFi] = fine.split(':').map(Number);
    let startMin = hIn * 60 + mIn;
    let endMin = hFi * 60 + mFi;
    
    if (endMin < startMin) endMin += 1440; // attraversa mezzanotte

    let ord = 0, stra = 0;
    for (let m = startMin; m < endMin; m++) {
        const hh = (m / 60) % 24;

        // Fasce ordinarie: [8,12) e [13,17) - STESSO SISTEMA
        const isOrd = (hh >= 8 && hh < 12) || (hh >= 13 && hh < 17);

        if (isOrd) ord++;
        else stra++;
    }
    
    return { ord: ord / 60, stra: stra / 60 };
}

function calculateTotalDiff(i, f) {
    let [h1, m1] = i.split(':').map(Number);
    let [h2, m2] = f.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return (diff < 0 ? diff + 1440 : diff) / 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// Salvataggio intervento montaggio
// ─────────────────────────────────────────────────────────────────────────────
async function salvaIntervento() {
    try {
        // Validazione dati base
        if (!datiMontaggio || !codMontaggio) {
            alert('Dati montaggio non disponibili');
            return;
        }

        if (!tecnicoLoggato) {
            alert('Tecnico non identificato');
            return;
        }

        const dataSelezionata = new Date(document.getElementById('data-lavoro').value);
        const tipoOre = document.querySelector('input[name="tipo-ore"]:checked').value;
        
        // CALCOLO ORE
        let oreOrd = 0, oreStra = 0;
        let oraInizioIntervento = '08:00'; // default

        if (tipoOre === 'ORDINARIE') {
            // Ore ordinarie dirette
            oreOrd = parseFloat(document.getElementById('ore-ord-manual').value || '0') || 0;
            
            if (oreOrd <= 0) {
                alert("ERRORE: Inserire almeno un'ora di lavoro.");
                return;
            }
        } else {
            // Ore da orari (straordinarie)
            const inizio = document.getElementById('ora-inizio').value;
            const fine = document.getElementById('ora-fine').value;
            
            if (!inizio || !fine) {
                alert("Inserire orario di inizio e fine");
                return;
            }

            const res = processHoursMontaggio(inizio, fine, dataSelezionata.getDay());
            oreOrd = res.ord;
            oreStra = res.stra;
            oraInizioIntervento = inizio;

            if (oreOrd <= 0 && oreStra <= 0) {
                alert("ERRORE: Intervallo orario non valido");
                return;
            }
        }

        const totaleOreLavoro = oreOrd + oreStra;
        const oreViaggio = parseFloat(document.getElementById('ore-viaggio').value || '0') || 0;
        const note = document.getElementById('note').value;

        // PAYLOAD per Supabase (coerente con tabella fogliolavoro)
        const payload = {
            tecnico: tecnicoLoggato,
            giorno: dataSelezionata.getDate(),
            mese: dataSelezionata.getMonth() + 1,
            anno: dataSelezionata.getFullYear(),
            
            // CODICE: sempre cod_montaggio (es: "007" o "001")
            codice: codMontaggio,
            
            // IMPIANTO: codice impianto dalla tabella montaggi
            impianto: datiMontaggio.impianto,
            
            // INDIRIZZO: dall'impianto
            indirizzo: datiMontaggio.Indirizzo || '',
            
            // TIPO FISSO: "MONTAGGIO"
            ch_rep: 'MONTAGGIO',
            
            // ORARI (solo se straordinarie)
            inizio_int: (tipoOre === 'STRAORDINARIE') ? document.getElementById('ora-inizio').value : null,
            fine_int: (tipoOre === 'STRAORDINARIE') ? document.getElementById('ora-fine').value : null,
            
            // ORE
            ore_ord: oreOrd,
            ore_stra: oreStra,
            ore: totaleOreLavoro,
            ore_viaggio: oreViaggio,
            
            // NOTE
            note: note,
            
            // COLONNE EXTRA (come in nuovo_lavoro.js)
            data: formatDataOra(dataSelezionata, oraInizioIntervento),
            settimana: getWeekNumber(dataSelezionata),
            "Data/ora creazione": formatDataOra(new Date())
        };

        // SALVATAGGIO SU SUPABASE
        const { error } = await supabaseClient
            .from('fogliolavoro')
            .insert([payload]);

        if (error) throw error;

        // SUCCESSO
        alert('Montaggio salvato con successo!');
        
        // REDIRECT a montaggi.html (come richiesto)
        window.location.href = 'montaggi.html';

    } catch (error) {
        console.error('Errore salvataggio:', error);
        alert('Errore durante il salvataggio: ' + error.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions (stesse di nuovo_lavoro.js)
// ─────────────────────────────────────────────────────────────────────────────
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDate() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDataOra(date, hours = null) {
    const gg = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const aaaa = date.getFullYear();
    const orario = hours || 
        (String(date.getHours()).padStart(2, '0') + ":" + 
         String(date.getMinutes()).padStart(2, '0'));
    return `${gg}/${mm}/${aaaa} ${orario}`;
}