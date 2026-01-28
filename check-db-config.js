// check-db-config.js
// Overlay bloccante per database non configurato
// =================================================

/**
 * Mostra overlay bloccante per database non configurato
 */
function showDbConfigOverlay() {
    // Controlla se l'overlay è già presente
    if (document.getElementById('db-config-overlay')) {
        return;
    }
    
    // Crea overlay
    const overlay = document.createElement('div');
    overlay.id = 'db-config-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: 'Inter', sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; max-width: 500px;">
            <span class="material-symbols-rounded" style="font-size: 4rem; color: #ef4444; margin-bottom: 20px;">
                error
            </span>
            <h1 style="font-size: 1.8rem; margin-bottom: 15px;">Database non configurato</h1>
            <p style="font-size: 1rem; margin-bottom: 25px; color: #cbd5e1;">
                Per utilizzare questa applicazione, devi configurare la connessione al database Supabase.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                <button id="config-btn" style="
                    padding: 12px 30px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Vai alla Configurazione
                </button>
                <button id="reload-btn" style="
                    padding: 12px 30px;
                    background: #64748b;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Ricarica pagina
                </button>
            </div>
            <p style="margin-top: 40px; font-size: 0.85rem; color: #94a3b8;">
                Se hai già configurato il database, prova a ricaricare la pagina.
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Aggiungi event listeners
    document.getElementById('config-btn').addEventListener('click', function() {
        window.location.href = 'config.html';
    });
    
    document.getElementById('reload-btn').addEventListener('click', function() {
        location.reload();
    });
}

/**
 * Nasconde l'overlay
 */
function hideDbConfigOverlay() {
    const overlay = document.getElementById('db-config-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Controlla automaticamente la configurazione all'avvio
 */
if (typeof hasDbConfig === 'function' && !hasDbConfig()) {
    // Mostra overlay solo se non siamo nella pagina di configurazione
    if (!window.location.href.includes('config.html')) {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => showDbConfigOverlay(), 500);
        });
    }
}

/**
 * Funzione per testare la connessione
 */
async function testConnectionWithOverlay() {
    if (typeof testDbConnection !== 'function') {
        console.error('db-config.js non caricato');
        return;
    }
    
    const result = await testDbConnection();
    
    if (result.success) {
        hideDbConfigOverlay();
        return true;
    } else {
        showDbConfigOverlay();
        return false;
    }
}