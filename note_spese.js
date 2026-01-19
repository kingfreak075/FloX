// note_spese.js
const SUPABASE_URL = 'https://berlfufnmolyrmxeyqfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a3USDfV7gbuauU2Kd6DuQQ_8PFVElpy';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tariffe (potrebbero essere caricate da DB)
const TARIFFE = {
    pasto: 12.00,
    pernottamento: 80.00,
    km_auto: 0.50
};

// Foto ricevute
let fotoRicevute = {
    vitto: [],  // {tipo: 'pasti', file: File, url: 'preview'}
    auto: []    // {tipo: 'km-auto', file: File, url: 'preview'}
};

// Validazione input
function validazioneInput(inputId, max = 9999) {
    const input = document.getElementById(inputId);
    const value = parseFloat(input.value) || 0;
    
    if (value < 0) {
        input.value = '0';
        showError('Il valore non può essere negativo');
        input.classList.add('error');
        return false;
    }
    
    if (value > max) {
        input.value = max.toString();
        showError(`Il valore massimo consentito è ${max}`);
        input.classList.add('error');
        return false;
    }
    
    input.classList.remove('error');
    return true;
}

// Scatta foto ricevuta
function scattaFoto(tipo) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Usa fotocamera posteriore su mobile
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Verifica dimensione (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('L\'immagine è troppo grande (max 5MB)');
            return;
        }
        
        // Crea preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const foto = {
                tipo: tipo,
                file: file,
                url: e.target.result,
                nome: file.name,
                data: new Date().toISOString()
            };
            
            // Aggiungi alla categoria corretta
            const isVitto = ['pasti', 'pernottamenti', 'mezzi-trasporto', 'altre-spese'].includes(tipo);
            const categoria = isVitto ? 'vitto' : 'auto';
            fotoRicevute[categoria].push(foto);
            
            // Aggiorna preview
            aggiornaFotoPreview(categoria);
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

// Aggiorna preview foto
function aggiornaFotoPreview(categoria) {
    const containerId = categoria === 'vitto' ? 'foto-preview-vitto' : 'foto-preview-auto';
    const container = document.getElementById(containerId);
    
    container.innerHTML = '';
    
    fotoRicevute[categoria].forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <img src="${foto.url}" alt="Ricevuta">
            <button class="foto-remove" onclick="rimuoviFoto('${categoria}', ${index})">
                <span class="material-symbols-rounded">close</span>
            </button>
        `;
        container.appendChild(div);
    });
}

// Rimuovi foto
function rimuoviFoto(categoria, index) {
    fotoRicevute[categoria].splice(index, 1);
    aggiornaFotoPreview(categoria);
}

// Upload foto su Supabase Storage
async function uploadFoto(foto) {
    try {
        const fileName = `${Date.now()}_${foto.nome}`;
        const filePath = `ricevute/${fileName}`;
        
        const { data, error } = await supabaseClient.storage
            .from('spese')
            .upload(filePath, foto.file);
        
        if (error) throw error;
        
        // Ottieni URL pubblico
        const { data: urlData } = supabaseClient.storage
            .from('spese')
            .getPublicUrl(filePath);
        
        return urlData.publicUrl;
    } catch (error) {
        console.error('Errore upload foto:', error);
        return null;
    }
}

// Salva spesa
async function salvaSpesa() {
    // Validazione base
    const dataSpesa = document.getElementById('data-spesa').value;
    if (!dataSpesa) {
        showError('Seleziona una data');
        return;
    }
    
    const tecnico = localStorage.getItem('tecnico_loggato');
    if (!tecnico) {
        showError('Tecnico non identificato');
        window.location.href = 'index.html';
        return;
    }
    
    // Validazione input numerici
    const inputs = [
        'pasti', 'pernottamenti', 'mezzi-trasporto', 'altre-spese',
        'km-auto', 'pedaggi', 'parcheggi', 'lavaggio', 'carburante'
    ];
    
    for (const inputId of inputs) {
        if (!validazioneInput(inputId, inputId === 'km-auto' ? 9999 : 999)) {
            return;
        }
    }
    
    showLoading();
    
    try {
        // Upload foto
        const fotoUrls = [];
        const allFotos = [...fotoRicevute.vitto, ...fotoRicevute.auto];
        
        for (const foto of allFotos) {
            const url = await uploadFoto(foto);
            if (url) fotoUrls.push(url);
        }
        
        // Prepara dati
        const data = new Date(dataSpesa);
        const spesaData = {
            tecnico: tecnico,
            data: dataSpesa,
            giorno: data.getDate(),
            mese: data.getMonth() + 1,
            anno: data.getFullYear(),
            localita: document.querySelector('input[name="fuori-sede"]:checked').value === 'true' 
                     ? document.getElementById('localita').value || 'Fuori Sede' 
                     : 'In Sede',
            pasti: parseFloat(document.getElementById('pasti').value) || 0,
            pernottamenti: parseFloat(document.getElementById('pernottamenti').value) || 0,
            mezzi_trasp: parseFloat(document.getElementById('mezzi-trasporto').value) || 0,
            altre_spese: parseFloat(document.getElementById('altre-spese').value) || 0,
            km_auto_propria: parseFloat(document.getElementById('km-auto').value) || 0,
            ped_autostrad: parseFloat(document.getElementById('pedaggi').value) || 0,
            parcheggi: parseFloat(document.getElementById('parcheggi').value) || 0,
            lavaggio: parseFloat(document.getElementById('lavaggio').value) || 0,
            carbur_lubrif: parseFloat(document.getElementById('carburante').value) || 0,
            note: document.getElementById('note').value.trim(),
            foto_url: fotoUrls
        };
        
        // Inserisci nel database
        const { data: result, error } = await supabaseClient
            .from('note_spese')
            .insert([spesaData]);
        
        if (error) throw error;
        
        // Successo
        showSuccess();
        
        // Reset dopo 2 secondi
        setTimeout(() => {
            resetForm();
            hideMessages();
        }, 2000);
        
    } catch (error) {
        console.error('Errore salvataggio:', error);
        showError('Errore durante il salvataggio: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Carica tariffe dal database
async function caricaTariffe() {
    try {
        const { data, error } = await supabaseClient
            .from('parametri_spese')
            .select('*')
            .eq('attivo', true);
        
        if (error) throw error;
        
        // Aggiorna tariffe locali
        data.forEach(param => {
            if (param.descrizione.includes('pasto')) TARIFFE.pasto = param.valore;
            if (param.descrizione.includes('pernottamento')) TARIFFE.pernottamento = param.valore;
            if (param.descrizione.includes('km')) TARIFFE.km_auto = param.valore;
        });
        
    } catch (error) {
        console.error('Errore caricamento tariffe:', error);
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    caricaTariffe();
    
    // Validazione in tempo reale
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('blur', () => {
            const max = input.id === 'km-auto' ? 9999 : 999;
            validazioneInput(input.id, max);
        });
    });
});