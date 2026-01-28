// db-config.js
// Gestione centralizzata della configurazione Supabase per FloX
// ==============================================================

// Importa la libreria Supabase (assicurati che sia caricata prima di questo file)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

/**
 * Controlla se la configurazione del database è presente
 * @returns {boolean} True se entrambe URL e KEY sono configurate
 */
function hasDbConfig() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');
    
    // Verifica che non siano stringhe vuote o placeholder
    const isValidUrl = url && url !== '' && !url.includes('INSERISCI_URL');
    const isValidKey = key && key !== '' && !key.includes('INSERISCI_KEY');
    
    return isValidUrl && isValidKey;
}

/**
 * Ottiene l'URL di Supabase dalla configurazione
 * @returns {string} L'URL di Supabase o stringa vuota se non configurato
 */
function getSupabaseUrl() {
    const url = localStorage.getItem('supabase_url');
    return url && !url.includes('INSERISCI_URL') ? url : '';
}

/**
 * Ottiene la chiave di Supabase dalla configurazione
 * @returns {string} La chiave di Supabase o stringa vuota se non configurato
 */
function getSupabaseKey() {
    const key = localStorage.getItem('supabase_key');
    return key && !key.includes('INSERISCI_KEY') ? key : '';
}

/**
 * Crea e restituisce un client Supabase configurato
 * @returns {object} Client Supabase
 * @throws {Error} Se la configurazione non è presente
 */
function getSupabaseClient() {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    
    if (!url || !key) {
        throw new Error('Configurazione database non trovata. Vai in Configurazione → Database per configurarlo.');
    }
    
    // Crea il client Supabase
    return supabase.createClient(url, key);
}

/**
 * Ottiene informazioni sulla configurazione corrente
 * @returns {object} Oggetto con informazioni di configurazione
 */
function getDbConfigInfo() {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    const timestamp = localStorage.getItem('config_timestamp');
    const tabellaSelezionata = localStorage.getItem('sync_tabella');
    
    return {
        configured: hasDbConfig(),
        url: url,
        urlShort: url ? url.replace('https://', '').substring(0, 20) + '...' : '',
        keyPresent: !!key,
        keyLength: key ? key.length : 0,
        timestamp: timestamp ? new Date(timestamp).toLocaleString('it-IT') : null,
        table: tabellaSelezionata,
        daysSinceConfig: timestamp ? Math.floor((new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24)) : null
    };
}

/**
 * Testa la connessione con le credenziali correnti
 * @returns {Promise<object>} Risultato del test
 */
async function testDbConnection() {
    if (!hasDbConfig()) {
        return {
            success: false,
            error: 'Configurazione non presente'
        };
    }
    
    try {
        const client = getSupabaseClient();
        
        // Prova con tabelle comuni
        const tabelleProva = ['Parco_app', 'manutentori', 'information_schema.tables'];
        let connessioneRiuscita = false;
        let tabellaTrovata = null;
        
        for (const tabellaProva of tabelleProva) {
            try {
                if (tabellaProva === 'information_schema.tables') {
                    const { error } = await client
                        .from('information_schema.tables')
                        .select('table_name')
                        .eq('table_schema', 'public')
                        .limit(1);
                    
                    if (!error) {
                        connessioneRiuscita = true;
                        tabellaTrovata = 'information_schema';
                        break;
                    }
                } else {
                    const { error } = await client
                        .from(tabellaProva)
                        .select('*')
                        .limit(1);
                    
                    if (!error || (error && error.code !== '42P01')) {
                        connessioneRiuscita = true;
                        tabellaTrovata = tabellaProva;
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        if (connessioneRiuscita) {
            return {
                success: true,
                message: `Connesso a ${tabellaTrovata || 'Supabase'}`,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: 'Impossibile stabilire connessione con le tabelle di prova'
            };
        }
        
    } catch (error) {
        console.error('Test connessione fallito:', error);
        
        let messaggioErrore = 'Errore di connessione';
        if (error.message.includes('JWT')) {
            messaggioErrore = 'Chiave API non valida';
        } else if (error.message.includes('fetch')) {
            messaggioErrore = 'URL non raggiungibile';
        } else if (error.code === '42501') {
            messaggioErrore = 'Permessi insufficienti';
        }
        
        return {
            success: false,
            error: messaggioErrore,
            details: error.message
        };
    }
}

/**
 * Resetta la configurazione del database
 */
function resetDbConfig() {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    localStorage.removeItem('config_caricata');
    localStorage.removeItem('config_timestamp');
    localStorage.removeItem('sync_tabella');
    localStorage.removeItem('sync_timestamp');
    
    console.log('Configurazione database resettata');
}

/**
 * Salva una nuova configurazione
 * @param {string} url - URL di Supabase
 * @param {string} key - Chiave anonima di Supabase
 * @returns {boolean} True se salvato con successo
 */
function saveDbConfig(url, key) {
    if (!url || !url.startsWith('https://')) {
        throw new Error('URL non valido. Deve iniziare con https://');
    }
    
    if (!key || key.length < 20) {
        throw new Error('Chiave API non valida');
    }
    
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    localStorage.setItem('config_caricata', 'true');
    localStorage.setItem('config_timestamp', new Date().toISOString());
    
    console.log('Configurazione database salvata:', url.substring(0, 30) + '...');
    return true;
}

/**
 * Esporta la configurazione corrente in formato .kf
 * @returns {string} Contenuto del file .kf
 */
function exportDbConfig() {
    if (!hasDbConfig()) {
        throw new Error('Nessuna configurazione da esportare');
    }
    
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    const timestamp = new Date().toISOString();
    
    return `# FloX Database Configuration
# Generated: ${timestamp}
# Format: KEY=VALUE

SUPABASE_URL=${url}
SUPABASE_KEY=${key}

# End of configuration`;
}

/**
 * Importa configurazione da stringa
 * @param {string} content - Contenuto del file .kf o .json
 * @returns {boolean} True se importato con successo
 */
function importDbConfig(content) {
    let url = '';
    let key = '';
    
    // Prova a parsare come JSON
    try {
        const json = JSON.parse(content);
        url = json.supabase_url || json.SUPABASE_URL || json.url;
        key = json.supabase_key || json.SUPABASE_KEY || json.key;
    } catch (e) {
        // Non è JSON, prova formato key=value
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.trim() && !line.trim().startsWith('#')) {
                if (line.includes('=')) {
                    const [chiave, valore] = line.split('=').map(s => s.trim());
                    if (chiave.toUpperCase().includes('URL')) {
                        url = valore;
                    } else if (chiave.toUpperCase().includes('KEY')) {
                        key = valore;
                    }
                }
            }
        }
    }
    
    if (!url || !key) {
        throw new Error('Formato file non valido. Assicurati di avere SUPABASE_URL e SUPABASE_KEY');
    }
    
    return saveDbConfig(url, key);
}

// ==============================================================
// ESEMPIO DI USO:
/*
// 1. Controlla se configurato
if (hasDbConfig()) {
    console.log('Database configurato');
    
    // 2. Ottieni client
    const supabase = getSupabaseClient();
    
    // 3. Usa normalmente
    const { data, error } = await supabase
        .from('Parco_app')
        .select('*');
} else {
    console.log('Database non configurato');
    
    // 4. Ottieni info
    const info = getDbConfigInfo();
    console.log(info);
    
    // 5. Test connessione (se configurato)
    const test = await testDbConnection();
    console.log(test);
}
*/
// ==============================================================