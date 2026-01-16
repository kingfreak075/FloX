const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Recupero dati dal localStorage
const impiantoCorrente = JSON.parse(localStorage.getItem('selected_plant'));
const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

document.addEventListener('DOMContentLoaded', () => {
    // Leggiamo l'ID dall'URL (es: ?id=ASC0001)
    const urlParams = new URLSearchParams(window.location.search);
    const idDalLink = urlParams.get('id');

    if (idDalLink) {
        document.getElementById('display-impianto').innerText = idDalLink;
    } else if (impiantoCorrente) {
        // Fallback: se manca nell'URL, usa il codice o il nome dal localStorage
        document.getElementById('display-impianto').innerText = impiantoCorrente.impianto || impiantoCorrente.codice || impiantoCorrente.nome;
    } else {
        alert("Dati mancanti. Torna alla ricerca.");
        window.location.href = 'parco.html';
        return;
    }

    if (impiantoCorrente) {
        document.getElementById('display-indirizzo').innerText = impiantoCorrente.indirizzo;
    }
    document.getElementById('data-lavoro').valueAsDate = new Date();
});

/**
 * 1. AUTO-ARROTONDAMENTO E CALCOLO LIVE
 */
function validateTimeAndCalculate(input) {
    if (!input.value) return;
    let [h, m] = input.value.split(':').map(Number);
    m = Math.round(m / 15) * 15;
    if (m === 60) { m = 0; h = (h + 1) % 24; }
    input.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    calcolaOre();
}

/**
 * 2. CONTROLLO LIMITI E VALORI NEGATIVI
 */
function checkLimiti(input, min, max) {
    let val = parseFloat(input.value);
    if (isNaN(val) || val < min) {
        input.value = min;
    } else if (val > max) {
        input.value = max;
        alert(`Il valore massimo consentito è ${max}`);
    }
}

/**
 * 3. SELEZIONE CODICE INTERVENTO
 */
function selectCodice(val, element) {
    document.querySelectorAll('.card-codice').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('select-codice').value = val;
    document.getElementById('area-lavoro').style.display = 'block';

    document.getElementById('label-stra').style.display = (['21','22','13','10'].includes(val)) ? 'flex' : 'none';
    document.getElementById('label-rep').style.display = (val == '22') ? 'flex' : 'none';

    const isCommessa = (val == '13' || val == '10');
    document.getElementById('display-impianto').style.display = isCommessa ? 'none' : 'block';
    document.getElementById('input-commessa').style.display = isCommessa ? 'block' : 'none';
    
    if (isCommessa && impiantoCorrente && impiantoCorrente.id) {
        document.getElementById('input-commessa').value = impiantoCorrente.id.toString().substring(0,8);
    }
    updateUI();
}

function updateUI() {
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    document.getElementById('box-ore-dirette').style.display = (tipo === 'ORDINARIA') ? 'block' : 'none';
    document.getElementById('box-orari').style.display = (tipo !== 'ORDINARIA') ? 'block' : 'none';
    if (tipo !== 'ORDINARIA') calcolaOre();
}

function calcolaOre() {
    const inizio = document.getElementById('ora-inizio').value;
    const fine = document.getElementById('ora-fine').value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const dataVal = document.getElementById('data-lavoro').value;
    if (!inizio || !fine) return;
    const res = processHours(inizio, fine, tipo, new Date(dataVal).getDay());
    document.getElementById('res-ord').innerText = res.ord.toFixed(2);
    document.getElementById('res-stra').innerText = res.stra.toFixed(2);
}

/**
 * 4. SALVATAGGIO SU SUPABASE CON NUOVE COLONNE
 */
async function salvaIntervento() {
    const cod = document.getElementById('select-codice').value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const dataSelezionata = new Date(document.getElementById('data-lavoro').value);
    const urlParams = new URLSearchParams(window.location.search);
    const idDalLink = urlParams.get('id');

    if (!cod) { alert("Seleziona un codice!"); return; }

    let oreOrd = 0, oreStra = 0;
    let oraInizioIntervento = "08:00"; // Default per ordinarie

    if (tipo === 'ORDINARIA') {
        oreOrd = parseFloat(document.getElementById('ore-ord-manual').value || 0);
    } else {
        oreOrd = parseFloat(document.getElementById('res-ord').innerText || 0);
        oreStra = parseFloat(document.getElementById('res-stra').innerText || 0);
        if (document.getElementById('ora-inizio').value) {
            oraInizioIntervento = document.getElementById('ora-inizio').value;
        }
    }

    if (oreOrd <= 0 && oreStra <= 0) {
        alert("ERRORE: Inserire almeno un'ora di lavoro.");
        return;
    }

    // Determiniamo il Codice Tecnico dell'Impianto (es. ASC0001)
    const codiceImpiantoDB = idDalLink || (impiantoCorrente ? (impiantoCorrente.impianto || impiantoCorrente.codice || impiantoCorrente.nome) : "N/D");
    const totaleOreLavoro = oreOrd + oreStra;
    const payload = {
        tecnico: tecnicoLoggato,
        giorno: dataSelezionata.getDate(),
        mese: dataSelezionata.getMonth() + 1,
        anno: dataSelezionata.getFullYear(),
        codice: cod,
        // Carica il codice tecnico nella colonna 'impianto'
        impianto: (cod == '13' || cod == '10') ? document.getElementById('input-commessa').value.toUpperCase() : codiceImpiantoDB,
        indirizzo: impiantoCorrente ? impiantoCorrente.indirizzo : "",
        ch_rep: tipo,
        inizio_int: (tipo !== 'ORDINARIA') ? document.getElementById('ora-inizio').value : null,
        fine_int: (tipo !== 'ORDINARIA') ? document.getElementById('ora-fine').value : null,
        ore_ord: oreOrd,
        ore_stra: oreStra,
        ore: totaleOreLavoro, // <--- NUOVA COLONNA AGGIUNTA
        ore_viaggio: parseFloat(document.getElementById('ore-viaggio').value || 0),
        note: document.getElementById('note').value,
        // NUOVE COLONNE RICHIESTE
        data: formatDataOra(dataSelezionata, oraInizioIntervento),
        settimana: getWeekNumber(dataSelezionata),
        "Data/ora creazione": formatDataOra(new Date())
        // L'ID viene gestito automaticamente da Supabase
    };

    const { error } = await supabaseClient.from('fogliolavoro').insert([payload]);

    if (error) {
        alert("Errore durante il salvataggio: " + error.message);
    } else {
        alert("Intervento salvato con successo!");
        window.location.href = 'parco.html';
    }
}

/**
 * FUNZIONI UTILITY (Data, Settimana, Calcolo Ore)
 */
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDataOra(date, hours = null) {
    const gg = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const aaaa = date.getFullYear();
    const orario = hours || (String(date.getHours()).padStart(2, '0') + ":" + String(date.getMinutes()).padStart(2, '0'));
    return `${gg}/${mm}/${aaaa} ${orario}`;
}

function processHours(inizio, fine, tipo, dayOfWeek) {
    if (tipo === 'REPERIBILITA') return { ord: 0, stra: calculateTotalDiff(inizio, fine) };
    const total = calculateTotalDiff(inizio, fine);
    if (dayOfWeek === 0 || dayOfWeek === 6) return { ord: 0, stra: total };
    let ord = 0, stra = 0;
    let [hIn, mIn] = inizio.split(':').map(Number);
    let [hFi, mFi] = fine.split(':').map(Number);
    let startMin = hIn * 60 + mIn, endMin = hFi * 60 + mFi;
    if (endMin < startMin) endMin += 1440;
    for (let m = startMin; m < endMin; m++) {
        let h = (m / 60) % 24;
        if ((h >= 12 && h < 13) || h >= 17 || h < 8) stra++; else ord++;
    }
    return { ord: ord / 60, stra: stra / 60 };
}

function calculateTotalDiff(i, f) {
    let [h1, m1] = i.split(':').map(Number);
    let [h2, m2] = f.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return (diff < 0 ? diff + 1440 : diff) / 60;
}