// ========== CONFIGURAZIONE ==========
const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

document.addEventListener('DOMContentLoaded', async () => {
    // Imposta mese corrente nel select
    const meseCorrente = new Date().getMonth() + 1;
    const selMese = document.getElementById('select-mese');
    if (selMese) selMese.value = meseCorrente;

    // Carica prima i manutentori, poi gli impianti
    await caricaManutentori();
    caricaManutenzioni();
});

// Carica la lista dei tecnici per il filtro
async function caricaManutentori() {
    const select = document.getElementById('select-tecnico');
    try {
        // Estraiamo i tecnici unici dalla tabella Parco_app
        const { data, error } = await supabaseClient
            .from('Parco_app')
            .select('tecnico');

        if (error) throw error;

        const tecniciUnici = [...new Set(data.map(item => item.tecnico))].filter(Boolean).sort();
        
        select.innerHTML = ""; 
        tecniciUnici.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t;
            if (t === tecnicoLoggato) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Errore caricamento tecnici:", err);
    }
}

async function caricaManutenzioni() {
    const meseSelezionato = parseInt(document.getElementById('select-mese').value);
    const tecnicoScelto = document.getElementById('select-tecnico').value;
    const lista = document.getElementById('lista-manutenzioni');
    
    lista.innerHTML = "<div style='text-align:center; padding:20px;'>Caricamento in corso...</div>";

    try {
        // 1) QUERY IMPIANTI (Nome tabella esatto: Parco_app)
        const { data: impianti, error } = await supabaseClient
            .from('Parco_app')
            .select('*')
            .eq('tecnico', tecnicoScelto);

        if (error) throw error;

        // 2) FILTRO SEMESTRALE (Colonna: mese_sem)
        const filtrati = impianti.filter(imp => {
            const m = parseInt(imp.mese_sem);
            if (isNaN(m)) return false;
            const opposto = m > 6 ? m - 6 : m + 6;
            return (m === meseSelezionato || opposto === meseSelezionato);
        });

        // 3) CONTROLLO ESEGUITI (Tabella: fogliolavoro)
        // Supponiamo che il codice '10' identifichi la manutenzione
        const { data: eseguiti } = await supabaseClient
            .from('fogliolavoro')
            .select('impianto')
            .eq('mese', meseSelezionato)
            .eq('anno', new Date().getFullYear())
            .eq('codice', '10');

        const listaEseguiti = eseguiti ? eseguiti.map(e => e.impianto) : [];

        // 4) RENDERING
        if (filtrati.length === 0) {
            lista.innerHTML = "<div style='text-align:center; margin-top:40px; color:#64748b;'>Nessuna manutenzione programmata.</div>";
            return;
        }

        // ... (mantenere la parte iniziale della funzione caricaManutenzioni fino al ciclo forEach) ...

lista.innerHTML = "";
filtrati.forEach(imp => {
    const giaFatto = listaEseguiti.includes(imp.impianto);
    const mP = parseInt(imp.mese_sem);
    const mS = mP > 6 ? mP - 6 : mP + 6;

    // Funzione per avere il nome del mese abbreviato
    const nomiMesi = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
    const testoFiligrana = `${nomiMesi[mP-1]} - ${nomiMesi[mS-1]}`;

    const card = document.createElement('div');
    card.style.cssText = `
        background: white; border-radius: 16px; padding: 18px; margin-bottom: 15px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 6px solid ${giaFatto ? '#22c55e' : '#3b82f6'};
        display: flex; flex-direction: column; position: relative; overflow: hidden;
    `;

    card.innerHTML = `
        <div style="position: absolute; bottom: -5px; right: 10px; font-size: 2.2rem; font-weight: 900; color: #e2e8f0; z-index: 0; pointer-events: none; letter-spacing: -1px; opacity: 0.8;">
            ${testoFiligrana}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; z-index: 1;">
            <div style="flex:1">
                <div style="font-weight:800; color:#1e293b; font-size: 1.1rem; letter-spacing: -0.3px;">${imp.impianto}</div>
                
                <div style="font-size:0.85rem; color:#64748b; margin-top: 2px;">
                    ${imp.Indirizzo}${imp.localit ? ' - ' + imp.localit : ''}
                </div>
                
                <div style="display: flex; align-items: center; gap: 5px; margin-top: 10px; color: #475569;">
                    <span class="material-symbols-rounded" style="font-size: 16px;">history</span>
                    <span style="font-size: 0.75rem; font-weight: 600;">Ultima semestrale: ${imp.ult_sem || '---'}</span>
                </div>
            </div>

            <div style="z-index: 2;">
                ${giaFatto 
                    ? '<span class="material-symbols-rounded" style="color:#22c55e; font-size: 32px;">check_circle</span>' 
                    : `<button onclick="vaiAEsegui('${imp.impianto}', '${imp.Indirizzo.replace(/'/g, "\\'")} - ${imp.localit ? imp.localit.replace(/'/g, "\\'") : ''}')" 
                        style="background:#2563eb; color:white; border:none; padding:10px 18px; border-radius:10px; font-weight:700; font-size:0.8rem; cursor:pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.2);">ESEGUI</button>`
                }
            </div>
        </div>
    `;
    lista.appendChild(card);
});
    } catch (err) {
        lista.innerHTML = `<div style='color:red; text-align:center;'>Errore: ${err.message}</div>`;
    }
}

function vaiAEsegui(codice, indirizzo) {
    localStorage.setItem('selected_plant', JSON.stringify({ impianto: codice, indirizzo: indirizzo }));
    window.location.href = `nuovo_lavoro.html?id=${codice}`;
}