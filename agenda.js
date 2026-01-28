// ✅ SOSTITUIRE CON QUESTO:
// 1. Controllo configurazione
if (!hasDbConfig()) {
    showDbConfigOverlay();
    throw new Error('Configurazione database mancante');
}

// 2. Ottenere client
let supabaseClient;
try {
    supabaseClient = getSupabaseClient();
} catch (error) {
    console.error('Errore creazione client:', error);
    mostraErroreDB(error.message);
}

// 3. Funzione errore DB
function mostraErroreDB(messaggio) {
    console.error('Errore DB:', messaggio);
    
    // Mostra messaggio nella pagina
    const listaDiv = document.getElementById('lista-manutenzioni');
    if (listaDiv) {
        listaDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
                <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 20px;">error</span>
                <h3 style="margin-bottom: 10px;">Errore Database</h3>
                <p>${messaggio}</p>
                <button onclick="window.location.href='config.html'" 
                        style="margin-top: 20px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600;">
                    Configura Database
                </button>
            </div>
        `;
    }
    
    // Disabilita filtro periodicità se presente
    const filtroDiv = document.querySelector('.filtro-btn');
    if (filtroDiv) {
        filtroDiv.style.opacity = '0.5';
        filtroDiv.style.pointerEvents = 'none';
    }
}

const tecnicoLoggato = localStorage.getItem('tecnico_loggato');

document.addEventListener('DOMContentLoaded', () => {
    mostraData();
    caricaImpegniGiorno();
});

function mostraData() {
    const opzioni = { weekday: 'long', day: 'numeric', month: 'long' };
    const oggi = new Date().toLocaleDateString('it-IT', opzioni);
    document.getElementById('current-date-display').innerText = oggi;
}

async function caricaImpegniGiorno() {
    const container = document.getElementById('agenda-container');
    container.innerHTML = "<div style='text-align:center; padding:20px;'>Caricamento impegni...</div>";

    // ESEMPIO: Carichiamo gli impianti che hanno una nota specifica o una scadenza oggi
    // Per ora simuliamo un'interfaccia a "Timeline"
    
    const htmlPlaceholder = `
        <div style="border-left: 2px solid #e2e8f0; margin-left: 10px; padding-left: 20px; position: relative;">
            
            <div style="margin-bottom: 25px; position: relative;">
                <div style="position: absolute; left: -29px; top: 0; background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 4px solid #f8fafc;"></div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">08:30</div>
                <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 5px;">
                    <div style="font-weight: 800;">Partenza Magazzino</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">Ritiro materiali per riparazioni</div>
                </div>
            </div>

            <div style="margin-bottom: 25px; position: relative;">
                <div style="position: absolute; left: -29px; top: 0; background: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 4px solid #f8fafc;"></div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">09:15</div>
                <div style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 5px;">
                    <div style="font-weight: 800;">Condominio Belvedere</div>
                    <div style="font-size: 0.8rem; color: #64748b;">Via delle Rose 12</div>
                    <div style="display: flex; gap: 5px; margin-top: 8px;">
                        <span style="background: #f1f5f9; font-size: 0.65rem; padding: 3px 7px; border-radius: 4px; font-weight: 700; color: #475569;">RIPARAZIONE</span>
                    </div>
                </div>
            </div>

        </div>
    `;
    
    container.innerHTML = htmlPlaceholder;
}