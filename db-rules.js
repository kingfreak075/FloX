// db-rules.js
// Regole di validazione e configurazione per le tabelle ESA
// Versione 1.0 - Basato su regole_db.md

const DB_RULES = {
    // ============================================
    // 1. PARCO_APP - Tabella master apparrecchiature
    // ============================================
    'Parco_app': {
        key: 'impianto',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV (utente)
            'impianto': { type: 'text', required: true, unique: true },
            'prov': { type: 'text', validation: 'provincia' }, // 2 lettere maiuscole
            'periodicit': { type: 'integer', validation: 'positive' }, // giorni
            'giro': { type: 'text' },
            'modello': { type: 'text' },
            'serial': { type: 'text' },
            'cliente': { type: 'text' },
            'indirizzo': { type: 'text' },
            'citta': { type: 'text' },
            'cap': { type: 'text', validation: 'cap' },
            'venditore': { type: 'bigint', relation: 'venditori.Cod' },
            'data_installazione': { type: 'date', format: 'DD/MM/YYYY' },
            'ultima_manutenzione': { type: 'date', format: 'DD/MM/YYYY' },
            'prossima_manutenzione': { type: 'date', format: 'DD/MM/YYYY' },
            'note': { type: 'text' },
            
            // Campi automatici (non nel CSV)
            'id': { type: 'serial', auto: true },
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' },
            'updated_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        // Validazioni aggiuntive
        validations: [
            { field: 'prov', rule: 'length', value: 2 },
            { field: 'periodicit', rule: 'min', value: 1 }
        ],
        
        // Relazioni con altre tabelle
        relations: [
            { field: 'venditore', table: 'venditori', foreignKey: 'Cod' },
            { field: 'giro', table: 'manutentori', foreignKey: 'Giro', convert: 'text_to_bigint' }
        ]
    },
    
    // ============================================
    // 2. FESTIVITA_ITALIANE - Calendario festività
    // ============================================
    'festivita_italiane': {
        key: 'data',
        syncMode: 'replace', // Sostituzione totale
        hasDeleteOption: true,
        
        columns: {
            // Campi dal CSV
            'data': { type: 'date', required: true, format: 'DD/MM/YYYY', unique: true },
            'nome': { type: 'text', required: true },
            'tipo': { type: 'text' },
            'zona_id': { type: 'uuid' },
            
            // Campi automatici
            'id': { type: 'uuid', auto: true, default: 'gen_random_uuid()' },
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        validations: [
            { field: 'data', rule: 'date_format', value: 'DD/MM/YYYY' }
        ]
    },
    
    // ============================================
    // 3. MANUTENTORI - Gestione manutentori
    // ============================================
    'manutentori': {
        key: 'Giro',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV
            'Giro': { type: 'bigint', required: true, unique: true },
            'Manutentore': { type: 'text', required: true },
            'Supervisore': { type: 'bigint', relation: 'supervisori.Cod' },
            'Telefono': { type: 'text', validation: 'phone' },
            'Mail': { type: 'text', validation: 'email' },
            'Zona': { type: 'text' },
            'Note': { type: 'text' }
        },
        
        validations: [
            { field: 'Giro', rule: 'positive' },
            { field: 'Telefono', rule: 'phone', optional: true },
            { field: 'Mail', rule: 'email', optional: true }
        ],
        
        relations: [
            { field: 'Supervisore', table: 'supervisori', foreignKey: 'Cod' }
        ]
    },
    
    // ============================================
    // 4. MONTAGGI - Gestione montaggi
    // ============================================
    'montaggi': {
        key: 'impianto',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV
            'impianto': { type: 'text', required: true, unique: true },
            'cod_montaggio': { type: 'bigint' },
            'provincia': { type: 'text', validation: 'provincia' },
            'cap': { type: 'text', validation: 'cap' },
            'stato': { type: 'integer', validation: 'range', min: 1, max: 5 },
            'indirizzo': { type: 'text' },
            'citta': { type: 'text' },
            'cliente': { type: 'text' },
            'tecnico': { type: 'text' },
            'data_montaggio': { type: 'date', format: 'DD/MM/YYYY' },
            'note': { type: 'text' },
            
            // Campi automatici
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' },
            'updated_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        validations: [
            { field: 'provincia', rule: 'length', value: 2 },
            { field: 'cap', rule: 'length', value: 5 },
            { field: 'stato', rule: 'range', min: 1, max: 5 }
        ]
    },
    
    // ============================================
    // 5. SUPERVISORI - Gestione supervisori
    // ============================================
    'supervisori': {
        key: 'Cod',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV
            'Cod': { type: 'bigint', required: true, unique: true },
            'Nome': { type: 'text', required: true },
            'Telefono': { type: 'text', validation: 'phone' },
            'Mail': { type: 'text', validation: 'email' },
            'Zona': { type: 'text' },
            'Note': { type: 'text' }
        },
        
        validations: [
            { field: 'Cod', rule: 'positive' },
            { field: 'Telefono', rule: 'phone', optional: true },
            { field: 'Mail', rule: 'email', optional: true }
        ]
    },
    
    // ============================================
    // 6. TECNICI - Gestione personale tecnico
    // ============================================
    'tecnici': {
        key: 'nome_completo',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV
            'nome_completo': { type: 'text', required: true, unique: true },
            'pin': { type: 'text', default: '0000', validation: 'pin' },
            'cod_supervisore': { type: 'bigint', relation: 'supervisori.Cod' },
            'telefono': { type: 'text', validation: 'phone' },
            'email': { type: 'text', validation: 'email' },
            'indirizzo': { type: 'text' },
            'citta': { type: 'text' },
            'data_assunzione': { type: 'date', format: 'DD/MM/YYYY' },
            'ruolo': { type: 'text' },
            'stato': { type: 'text', default: 'attivo' },
            'note': { type: 'text' },
            
            // Campi automatici
            'id': { type: 'serial', auto: true },
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' },
            'updated_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        validations: [
            { field: 'pin', rule: 'length', value: 4 },
            { field: 'pin', rule: 'numeric' },
            { field: 'telefono', rule: 'phone', optional: true },
            { field: 'email', rule: 'email', optional: true }
        ],
        
        relations: [
            { field: 'cod_supervisore', table: 'supervisori', foreignKey: 'Cod' }
        ]
    },
    
    // ============================================
    // 7. TURNI_REPERIBILITA - Pianificazione turni
    // ============================================
    'turni_reperibilita': {
        key: ['zona_id', 'data_inizio'],
        syncMode: 'upsert',
        hasDeleteOption: false,
        useHash: true, // Usa hash per controllo duplicati
        
        columns: {
            // Campi dal CSV
            'tecnico_id': { type: 'text', required: true, relation: 'tecnici.nome_completo' },
            'zona_id': { type: 'uuid', required: true },
            'data_inizio': { type: 'timestamp', required: true, format: 'DD/MM/YYYY HH:MM' },
            'data_fine': { type: 'timestamp', format: 'DD/MM/YYYY HH:MM' },
            'peso_turno': { type: 'integer', default: 1, validation: 'range', min: 1, max: 10 },
            'note': { type: 'text' },
            
            // Campi automatici
            'id': { type: 'uuid', auto: true, default: 'gen_random_uuid()' },
            'hash_csv': { type: 'text', auto: true }, // Calcolato automaticamente
            'stato': { type: 'text', auto: true, default: "'confermato'" },
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' },
            'updated_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        validations: [
            { field: 'peso_turno', rule: 'range', min: 1, max: 10 },
            { field: 'data_inizio', rule: 'date_format', value: 'DD/MM/YYYY HH:MM' },
            { field: 'data_fine', rule: 'date_format', value: 'DD/MM/YYYY HH:MM' }
        ],
        
        relations: [
            { field: 'tecnico_id', table: 'tecnici', foreignKey: 'nome_completo' }
        ]
    },
    
    // ============================================
    // 8. VEICOLI - Gestione parco veicoli
    // ============================================
    'veicoli': {
        key: 'targa',
        syncMode: 'upsert_with_delete', // Elimina veicoli dismessi
        hasDeleteOption: true,
        
        columns: {
            // Campi dal CSV
            'targa': { type: 'text', required: true, unique: true, validation: 'targa' },
            'tecnico_assegnato': { type: 'text', required: true, relation: 'tecnici.nome_completo' },
            'modello': { type: 'text' },
            'marca': { type: 'text' },
            'anno': { type: 'integer' },
            'km_totali_iniziali': { type: 'integer', validation: 'positive' },
            'data_assegnazione': { type: 'date', format: 'DD/MM/YYYY' },
            'attivo': { type: 'boolean', default: true },
            'note': { type: 'text' },
            
            // Campi automatici
            'id': { type: 'uuid', auto: true, default: 'gen_random_uuid()' },
            'created_at': { type: 'timestamp', auto: true, default: 'NOW()' },
            'updated_at': { type: 'timestamp', auto: true, default: 'NOW()' }
        },
        
        validations: [
            { field: 'targa', rule: 'targa_format' },
            { field: 'km_totali_iniziali', rule: 'positive' },
            { field: 'data_assegnazione', rule: 'date_format', value: 'DD/MM/YYYY' }
        ],
        
        relations: [
            { field: 'tecnico_assegnato', table: 'tecnici', foreignKey: 'nome_completo' }
        ]
    },
    
    // ============================================
    // 9. VENDITORI - Gestione venditori
    // ============================================
    'venditori': {
        key: 'Cod',
        syncMode: 'upsert',
        hasDeleteOption: false,
        
        columns: {
            // Campi dal CSV
            'Cod': { type: 'bigint', required: true, unique: true },
            'Nome': { type: 'text', required: true },
            'Telefono': { type: 'text', validation: 'phone' },
            'Mail': { type: 'text', validation: 'email' },
            'Zona': { type: 'text' },
            'Note': { type: 'text' }
        },
        
        validations: [
            { field: 'Cod', rule: 'positive' },
            { field: 'Telefono', rule: 'phone', optional: true },
            { field: 'Mail', rule: 'email', optional: true }
        ]
    }
};

// ============================================
// FUNZIONI DI VALIDAZIONE
// ============================================

const VALIDATORS = {
    // Validatore per date italiane
    date_format: function(value, format) {
        if (!value) return true;
        
        if (format === 'DD/MM/YYYY') {
            const pattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            if (!pattern.test(value)) return false;
            
            const parts = value.split('/');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            // Controllo base
            if (month < 1 || month > 12) return false;
            if (day < 1 || day > 31) return false;
            
            return true;
        }
        
        if (format === 'DD/MM/YYYY HH:MM') {
            const pattern = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/;
            return pattern.test(value);
        }
        
        return true;
    },
    
    // Validatore per provincia (2 lettere maiuscole)
    provincia: function(value) {
        if (!value) return true;
        return /^[A-Z]{2}$/.test(value);
    },
    
    // Validatore per CAP (5 cifre)
    cap: function(value) {
        if (!value) return true;
        return /^\d{5}$/.test(value);
    },
    
    // Validatore per telefono
    phone: function(value) {
        if (!value) return true;
        // Rimuove spazi, trattini, parentesi
        const cleaned = value.replace(/[\s\-\(\)]/g, '');
        return /^[0-9]{10,15}$/.test(cleaned);
    },
    
    // Validatore per email
    email: function(value) {
        if (!value) return true;
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(value);
    },
    
    // Validatore per PIN (4 numeri)
    pin: function(value) {
        if (!value) return true;
        return /^\d{4}$/.test(value);
    },
    
    // Validatore per targa (AA123BB)
    targa_format: function(value) {
        if (!value) return true;
        return /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(value);
    },
    
    // Validatore per range numerico
    range: function(value, min, max) {
        if (!value) return true;
        const num = parseInt(value, 10);
        return num >= min && num <= max;
    },
    
    // Validatore per lunghezza
    length: function(value, length) {
        if (!value) return true;
        return String(value).length === length;
    },
    
    // Validatore per numerico
    numeric: function(value) {
        if (!value) return true;
        return /^\d+$/.test(value);
    },
    
    // Validatore per positivo
    positive: function(value) {
        if (!value) return true;
        const num = parseInt(value, 10);
        return num > 0;
    }
};

// ============================================
// FUNZIONI DI UTILITÀ
// ============================================

// Converte date italiane in formato ISO
function convertItalianDateToISO(dateString, format = 'DD/MM/YYYY') {
    if (!dateString) return null;
    
    if (format === 'DD/MM/YYYY') {
        const parts = dateString.split('/');
        if (parts.length !== 3) return dateString;
        
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        
        // Assicura che l'anno abbia 4 cifre
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        return `${fullYear}-${month}-${day}`;
    }
    
    if (format === 'DD/MM/YYYY HH:MM') {
        const [datePart, timePart] = dateString.split(' ');
        if (!datePart || !timePart) return dateString;
        
        const isoDate = convertItalianDateToISO(datePart, 'DD/MM/YYYY');
        return `${isoDate}T${timePart}:00`;
    }
    
    return dateString;
}

// Calcola hash per controllo duplicati
function calculateHash(record, tableName) {
    const rule = DB_RULES[tableName];
    if (!rule || !rule.useHash) return null;
    
    // Crea una stringa con i valori chiave
    const keyFields = Array.isArray(rule.key) ? rule.key : [rule.key];
    const hashParts = keyFields.map(key => record[key] || '').join('|');
    
    // Hash semplice (potresti usare algo più sofisticato)
    return btoa(encodeURIComponent(hashParts));
}

// Valida un record per una tabella specifica
function validateRecord(record, tableName) {
    const rule = DB_RULES[tableName];
    if (!rule) {
        return { valid: false, errors: [`Tabella ${tableName} non configurata`] };
    }
    
    const errors = [];
    
    // Controlla campi obbligatori
    Object.entries(rule.columns).forEach(([field, config]) => {
        if (config.required && !record[field]) {
            errors.push(`Campo obbligatorio mancante: ${field}`);
        }
    });
    
    // Applica validatori
    if (rule.validations) {
        rule.validations.forEach(validation => {
            const value = record[validation.field];
            const validator = VALIDATORS[validation.rule];
            
            if (validator && value) {
                let isValid = true;
                
                if (validation.rule === 'range') {
                    isValid = validator(value, validation.min, validation.max);
                } else if (validation.rule === 'date_format') {
                    isValid = validator(value, validation.value);
                } else if (validation.rule === 'length') {
                    isValid = validator(value, validation.value);
                } else {
                    isValid = validator(value);
                }
                
                if (!isValid) {
                    errors.push(`Validazione fallita per ${validation.field}: ${validation.rule}`);
                }
            }
        });
    }
    
    // Converte date italiane
    Object.entries(rule.columns).forEach(([field, config]) => {
        if (config.format && record[field]) {
            record[field] = convertItalianDateToISO(record[field], config.format);
        }
    });
    
    // Aggiungi hash se necessario
    if (rule.useHash) {
        record.hash_csv = calculateHash(record, tableName);
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        cleanedRecord: record
    };
}

// Ottieni la configurazione per una tabella
function getTableConfig(tableName) {
    return DB_RULES[tableName] || null;
}

// Ottieni tutte le tabelle configurate
function getAllTables() {
    return Object.keys(DB_RULES);
}

// Ottieni le colonne CSV per una tabella
function getCsvColumns(tableName) {
    const rule = DB_RULES[tableName];
    if (!rule) return [];
    
    return Object.entries(rule.columns)
        .filter(([field, config]) => !config.auto)
        .map(([field, config]) => field);
}

// Ottieni le colonne automatiche per una tabella
function getAutoColumns(tableName) {
    const rule = DB_RULES[tableName];
    if (!rule) return [];
    
    return Object.entries(rule.columns)
        .filter(([field, config]) => config.auto)
        .map(([field, config]) => field);
}

// Esporta per uso in altri file
window.DB_RULES = DB_RULES;
window.VALIDATORS = VALIDATORS;
window.convertItalianDateToISO = convertItalianDateToISO;
window.validateRecord = validateRecord;
window.getTableConfig = getTableConfig;
window.getAllTables = getAllTables;
window.getCsvColumns = getCsvColumns;
window.getAutoColumns = getAutoColumns;

console.log('✅ DB Rules caricato con successo');
console.log(`📊 Tabelle configurate: ${getAllTables().length}`);