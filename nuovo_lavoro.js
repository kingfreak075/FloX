const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy'; // Usa la tua KEY
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const impiantoCorrente = JSON.parse(localStorage.getItem('selected_plant'));
const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

document.addEventListener('DOMContentLoaded', () => {
    if (!tecnicoLoggato || !impiantoCorrente) {
        window.location.href = 'index.html';
        return;
    }

    // Precompila dati impianto
    document.getElementById('display-impianto').innerText = impiantoCorrente.nome;
    document.getElementById('display-indirizzo').innerText = impiantoCorrente.indirizzo;
    document.getElementById('data-lavoro').valueAsDate = new Date();
});

function handleCodiceChange() {
    const cod = document.getElementById('select-codice').value;
    const boxTipo = document.getElementById('box-tipo');
    const labelStra = document.getElementById('label-stra');
    const labelRep = document.getElementById('label-rep');
    const inputCommessa = document.getElementById('input-commessa');
    const labelImpianto = document.getElementById('label-impianto');

    boxTipo.style.display = 'block';
    
    // Gestione visibilità Checkbox (Radio) in base al codice
    labelStra.style.display = (cod == '21' || cod == '22' || cod == '13' || cod == '10') ? 'flex' : 'none';
    labelRep.style.display = (cod == '22') ? 'flex' : 'none';

    // Gestione Commessa (Codici 13 e 10)
    if (cod == '13' || cod == '10') {
        labelImpianto.innerText = "Numero Commessa";
        document.getElementById('display-impianto').style.display = 'none';
        inputCommessa.style.display = 'block';
        inputCommessa.value = impiantoCorrente.id || ''; 
    } else {
        labelImpianto.innerText = "Impianto";
        document.getElementById('display-impianto').style.display = 'block';
        inputCommessa.style.display = 'none';
    }

    // Reset selezione tipo alla modifica codice
    document.querySelector('input[name="tipo"][value="ORDINARIA"]').checked = true;
    updateUI();
}

function updateUI() {
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const boxOreDirette = document.getElementById('box-ore-dirette');
    const boxOrari = document.getElementById('box-orari');

    if (tipo === 'ORDINARIA') {
        boxOreDirette.style.display = 'block';
        boxOrari.style.display = 'none';
    } else {
        boxOreDirette.style.display = 'none';
        boxOrari.style.display = 'block';
    }
}

function calcolaOre() {
    const inizio = document.getElementById('ora-inizio').value;
    const fine = document.getElementById('ora-fine').value;
    const preview = document.getElementById('preview-calcolo');
    const splitInfo = document.getElementById('split-info');
    const tipo = document.querySelector('input[name="tipo"]:checked').value;

    if (!inizio || !fine) return;

    let [hIn, mIn] = inizio.split(':').map(Number);
    let [hFi, mFi] = fine.split(':').map(Number);
    
    let totalMinutes = (hFi * 60 + mFi) - (hIn * 60 + mIn);
    if (totalMinutes < 0) totalMinutes += 1440; // Gestione scavalco mezzanotte

    const hTot = totalMinutes / 60;
    preview.style.display = 'block';
    document.getElementById('res-calcolo').innerText = hTot.toFixed(2) + "h";

    // Logica di split se Feriale e tipo STRAORDINARIO
    const dataSelezionata = new Date(document.getElementById('data-lavoro').value);
    const isFeriale = dataSelezionata.getDay() !== 0 && dataSelezionata.getDay() !== 6;

    if (tipo === 'STRAORDINARIO' && isFeriale) {
        // Logica semplificata: calcolo quante ore cadono in 12-13 o post-17
        // Per semplicità qui mostriamo il totale, ma il database riceverà lo split
        splitInfo.innerText = "Il sistema separerà automaticamente ore ordinarie e straordinarie.";
    } else {
        splitInfo.innerText = "Tutte le ore verranno conteggiate come " + tipo;
    }
}

async function salvaIntervento() {
    const cod = document.getElementById('select-codice').value;
    const tipo = document.querySelector('input[name="tipo"]:checked').value;
    const dataVal = document.getElementById('data-lavoro').value;
    const oreViag = parseFloat(document.getElementById('ore-viaggio').value || 0);
    const noteVal = document.getElementById('note').value;
    const commessaVal = document.getElementById('input-commessa').value.toUpperCase();

    if (!cod) { alert("Seleziona un codice!"); return; }
    if ((cod == '13' || cod == '10') && commessaVal.length !== 8) {
        alert("La commessa deve essere di 8 caratteri!"); return;
    }

    const d = new Date(dataVal);
    let oreOrd = 0;
    let oreStra = 0;

    if (tipo === 'ORDINARIA') {
        oreOrd = parseFloat(document.getElementById('ore-ord-manual').value || 0);
    } else {
        // Logica Split Ore (Esempio 11-14)
        const inizio = document.getElementById('ora-inizio').value;
        const fine = document.getElementById('ora-fine').value;
        const calcoli = processHours(inizio, fine, tipo, d.getDay());
        oreOrd = calcoli.ord;
        oreStra = calcoli.stra;
    }

    const { error } = await supabaseClient.from('fogliolavoro').insert([{
        tecnico: tecnicoLoggato,
        giorno: d.getDate(),
        mese: d.getMonth() + 1,
        anno: d.getFullYear(),
        codice: cod,
        impianto: (cod == '13' || cod == '10') ? commessaVal : impiantoCorrente.nome,
        indirizzo: impiantoCorrente.indirizzo,
        ch_rep: tipo.toUpperCase(),
        inizio_int: document.getElementById('ora-inizio').value || null,
        fine_int: document.getElementById('ora-fine').value || null,
        ore_ord: oreOrd,
        ore_stra: oreStra,
        ore_viaggio: oreViag,
        note: noteVal
    }]);

    if (error) {
        alert("Errore salvataggio: " + error.message);
    } else {
        alert("Intervento salvato!");
        window.location.href = 'calendario.html';
    }
}

function processHours(inizio, fine, tipo, dayOfWeek) {
    if (tipo === 'REPERIBILITA') return { ord: 0, stra: calculateTotal(inizio, fine) };
    
    const isFeriale = dayOfWeek !== 0 && dayOfWeek !== 6;
    const total = calculateTotal(inizio, fine);

    if (!isFeriale) return { ord: 0, stra: total };

    // Logica di split per feriali (Semplificata per il tecnico)
    // Qui puoi inserire la logica esatta per i blocchi 12-13 e post-17
    // Per ora facciamo un calcolo basato sulla tua regola 11-14:
    let ord = 0;
    let stra = 0;
    
    // Eseguiamo un loop minuto per minuto (metodo più sicuro per gli split)
    let [hIn, mIn] = inizio.split(':').map(Number);
    let [hFi, mFi] = fine.split(':').map(Number);
    let current = hIn * 60 + mIn;
    let end = hFi * 60 + mFi;
    if (end < current) end += 1440;

    for (let m = current; m < end; m++) {
        let hour = (m / 60) % 24;
        // Se tra le 12 e 13 O dopo le 17 O prima delle 8
        if (hour >= 12 && hour < 13 || hour >= 17 || hour < 8) {
            stra += 1;
        } else {
            ord += 1;
        }
    }

    return { ord: (ord / 60), stra: (stra / 60) };
}

function calculateTotal(i, f) {
    let [h1, m1] = i.split(':').map(Number);
    let [h2, m2] = f.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return (diff < 0 ? diff + 1440 : diff) / 60;
}
