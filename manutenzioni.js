const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

document.addEventListener('DOMContentLoaded', () => {
    // Imposta mese attuale
    const meseCorrente = new Date().getMonth() + 1;
    document.getElementById('select-mese').value = meseCorrente;
    caricaManutenzioni();
});

async function caricaManutenzioni() {
    const meseSelezionato = parseInt(document.getElementById('select-mese').value);
    const listaContainer = document.getElementById('lista-manutenzioni');
    listaContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Analisi scadenze in corso...</div>';

    try {
        // 1. Scarico impianti dalla tabella Parco_app
        const { data: parco, error: errParco } = await supabaseClient
            .from('Parco_app')
            .select('*')
            .eq('tecnico', tecnicoLoggato);

        if (errParco) throw errParco;

        // 2. Logica Semestrale basata su 'mese_sem'
        const impiantiScaduti = parco.filter(imp => {
            const m = parseInt(imp.mese_sem);
            if (isNaN(m)) return false;
            
            // Calcolo il semestre opposto (se 10 -> 4, se 2 -> 8)
            const semestre = m > 6 ? m - 6 : m + 6;
            return m === meseSelezionato || semestre === meseSelezionato;
        });

        if (impiantiScaduti.length === 0) {
            listaContainer.innerHTML = '<div style="text-align: center; color: #64748b; margin-top: 50px;">Nessuna scadenza trovata per questo mese.</div>';
            return;
        }

        // 3. Controllo se già fatte in fogliolavoro (codice manutenzione = 10)
        const { data: fatti, error: errFatti } = await supabaseClient
            .from('fogliolavoro')
            .select('impianto')
            .eq('mese', meseSelezionato)
            .eq('anno', new Date().getFullYear())
            .eq('codice', '10');

        const codiciFatti = fatti ? fatti.map(f => f.impianto) : [];

        // 4. Render Card
        listaContainer.innerHTML = '';
        impiantiScaduti.forEach(imp => {
            const giaEseguito = codiciFatti.includes(imp.impianto);
            const mProg = parseInt(imp.mese_sem);
            const mSem = mProg > 6 ? mProg - 6 : mProg + 6;

            const card = document.createElement('div');
            card.style.cssText = `
                background: white; border-radius: 16px; padding: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                border-left: 6px solid ${giaEseguito ? '#22c55e' : '#3b82f6'};
                display: flex; justify-content: space-between; align-items: center;
            `;

            card.innerHTML = `
                <div style="flex-grow: 1;">
                    <div style="font-weight: 800; color: #1e293b; font-size: 1rem;">${imp.impianto}</div>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${imp.Indirizzo}</div>
                    <div style="display: flex; gap: 8px; margin-top: 6px;">
                        <span style="font-size: 0.65rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; font-weight: 600;">
                            MESI: ${mProg} - ${mSem}
                        </span>
                    </div>
                </div>
                <div>
                    ${giaEseguito 
                        ? '<span class="material-symbols-rounded" style="color: #22c55e; font-size: 28px;">task_alt</span>' 
                        : `<button onclick="vaiAEsegui('${imp.impianto}', '${imp.Indirizzo.replace(/'/g, "\\'")}')" style="background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 0.75rem; cursor: pointer; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">ESEGUI</button>`
                    }
                </div>
            `;
            listaContainer.appendChild(card);
        });

    } catch (err) {
        listaContainer.innerHTML = `<div style="color: #ef4444; padding: 20px;">Errore caricamento: ${err.message}</div>`;
    }
}

function vaiAEsegui(codice, indirizzo) {
    // Salviamo nel localStorage per la pagina nuovo_lavoro
    localStorage.setItem('selected_plant', JSON.stringify({ 
        impianto: codice, 
        indirizzo: indirizzo 
    }));
    // Reindirizziamo con ID nell'URL
    window.location.href = `nuovo_lavoro.html?id=${codice}`;
}