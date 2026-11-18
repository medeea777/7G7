// ==========================================
// 1. CONFIGURAZIONE E CARICAMENTO TARIFFE
// ==========================================
function getTariffeSalvate() {
    let tariffeDefault = {
        "capannone": { nome: "Capannone", pagaOraria: 20.00 },
        "ammonrn":   { nome: "AmmonRn",   pagaOraria: 24.00 },
        "ammonbz":   { nome: "AmmonBz",   pagaOraria: 24.00 },
        "parigi":    { nome: "Parigi",    pagaOraria: 24.00 },
        "rossetto":  { nome: "Rossetto",  pagaOraria: 24.00 }
    };
    let salvate = localStorage.getItem("tariffePersonalizzate");
    return salvate ? JSON.parse(salvate) : tariffeDefault;
}

window.onload = function() {
    aggiornaMenuTendinaLavori();
    aggiornaRiepilogoMensile();
};

function aggiornaMenuTendinaLavori() {
    const TARIFFE = getTariffeSalvate();
    const select = document.getElementById("modLavoro");
    select.innerHTML = ""; // Svuota per evitare duplicati

    for (let chiave in TARIFFE) {
        let option = document.createElement("option");
        option.value = chiave;
        option.text = `${TARIFFE[chiave].nome} (${TARIFFE[chiave].pagaOraria.toFixed(2)} €/h)`;
        select.appendChild(option);
    }
}

function aggiungiNuovoLavoro() {
    let nomeInput = document.getElementById("nuovoNomeLavoro").value.trim();
    let pagaInput = parseFloat(document.getElementById("nuovaPagaOraria").value);

    if (!nomeInput || isNaN(pagaInput) || pagaInput <= 0) {
        alert("Inserisci un nome valido e una paga oraria corretta!");
        return;
    }

    let chiaveTecnica = nomeInput.toLowerCase().replace(/\s+/g, '');
    let TARIFFE = getTariffeSalvate();
    TARIFFE[chiaveTecnica] = { nome: nomeInput, pagaOraria: pagaInput };

    localStorage.setItem("tariffePersonalizzate", JSON.stringify(TARIFFE));

    document.getElementById("nuovoNomeLavoro").value = "";
    document.getElementById("nuovaPagaOraria").value = "";
    aggiornaMenuTendinaLavori();

    alert(`Il lavoro "${nomeInput}" è stato aggiunto con successo!`);
}

// ==========================================
// 2. ANALISI DEL TESTO DETTATO (Parser)
// ==========================================
function analizzaTesto() {
    const testo = document.getElementById("inputVoce").value.toLowerCase();
    
    const oggi = new Date().toISOString().split('T')[0];
    document.getElementById("modData").value = oggi;

    const regexOrari = /\b([01]?[0-9]|2[0-3])(?:[:.]([0-5][0-9]))?\b/g;
    let orariTrovati = [];
    let match;

    while ((match = regexOrari.exec(testo)) !== null) {
        let ore = match[1].padStart(2, '0');
        let minuti = match[2] ? match[2] : "00";
        orariTrovati.push(`${ore}:${minuti}`);
    }

    document.getElementById("modInizio").value      = orariTrovati[0] || "08:00";
    document.getElementById("modFine").value        = orariTrovati[1] || "17:00";
    document.getElementById("modPausaInizio").value = orariTrovati[2] || "00:00";
    document.getElementById("modPausaFine").value   = orariTrovati[3] || "00:00";

    const TARIFFE = getTariffeSalvate();
    let lavoroRilevato = Object.keys(TARIFFE)[0];
    
    for (let chiave in TARIFFE) {
        if (testo.includes(chiave) || testo.includes(TARIFFE[chiave].nome.toLowerCase())) {
            lavoroRilevato = chiave;
            break;
        }
    }
    document.getElementById("modLavoro").value = lavoroRilevato;

    document.getElementById("boxVerifica").classList.remove("nascosto");
    ricalcolaAnteprima();
}

// ==========================================
// 3. LOGICA MATEMATICA DI CALCOLO ORE E PAGA
// ==========================================
function orarioInMinuti(orarioStr) {
    if (!orarioStr) return 0;
    const parti = orarioStr.split(":");
    return (parseInt(parti[0]) * 60) + parseInt(parti[1]);
}

function calcolaDatiGiornata() {
    const inizio      = document.getElementById("modInizio").value;
    const fine        = document.getElementById("modFine").value;
    const pausaInizio = document.getElementById("modPausaInizio").value;
    const pausaFine   = document.getElementById("modPausaFine").value;

    const minInizio      = orarioInMinuti(inizio);
    const minFine        = orarioInMinuti(fine);
    const minPausaInizio = orarioInMinuti(pausaInizio);
    const minPausaFine   = orarioInMinuti(pausaFine);

    let minutiTotali = minFine - minInizio;
    if (minutiTotali < 0) minutiTotali += 24 * 60; 

    let minutiPausa = minPausaFine - minPausaInizio;
    if (minutiPausa < 0) minutiPausa = 0;

    const minutiNetti = Math.max(0, minutiTotali - minutiPausa);
    const oreNetto = minutiNetti / 60;

    const tipoLavoro = document.getElementById("modLavoro").value;
    const TARIFFE = getTariffeSalvate();
    const tariffa = TARIFFE[tipoLavoro] ? TARIFFE[tipoLavoro].pagaOraria : 20.00;
    const nomeLavoro = TARIFFE[tipoLavoro] ? TARIFFE[tipoLavoro].nome : tipoLavoro;
    const guadagno = oreNetto * tariffa;

    return {
        oraInizio: inizio,
        oraFine: fine,
        pausaInizio: pausaInizio,
        pausaFine: pausaFine,
        oreNetto: oreNetto,
        guadagno: guadagno,
        nomeLavoro: nomeLavoro
    };
}

function ricalcolaAnteprima() {
    const risultati = calcolaDatiGiornata();
    document.getElementById("anteprimaCalcolo").innerText = 
        `Ore nette: ${risultati.oreNetto.toFixed(2)}h | Guadagno: ${risultati.guadagno.toFixed(2)} €`;
}

// ==========================================
// 4. SALVATAGGIO IN MEMORIA (LocalStorage)
// ==========================================
function salvaGiornata() {
    const dataScelta = document.getElementById("modData").value;
    const risultati = calcolaDatiGiornata();

    const nuovaGiornata = {
        id: Date.now(),
        data: dataScelta,
        meseAnno: dataScelta.substring(0, 7),
        lavoro: risultati.nomeLavoro,
        inizio: risultati.oraInizio || "00:00",
        fine: risultati.oraFine || "00:00",
        pausaInizio: risultati.pausaInizio || "00:00",
        pausaFine: risultati.pausaFine || "00:00",
        ore: risultati.oreNetto,
        guadagno: risultati.guadagno
    };

    let archivio = JSON.parse(localStorage.getItem("registroLavoro")) || [];
    archivio.push(nuovaGiornata);
    localStorage.setItem("registroLavoro", JSON.stringify(archivio));

    document.getElementById("inputVoce").value = "";
    document.getElementById("boxVerifica").classList.add("nascosto");

    aggiornaRiepilogoMensile();
}

function eliminaGiornata(idDaEliminare) {
    let archivio = JSON.parse(localStorage.getItem("registroLavoro")) || [];
    archivio = archivio.filter(giorno => giorno.id !== idDaEliminare);
    localStorage.setItem("registroLavoro", JSON.stringify(archivio));
    aggiornaRiepilogoMensile();
}

// ==========================================
// 5. CALCOLO E VISUALIZZAZIONE MENSILE
// ==========================================
function aggiornaRiepilogoMensile() {
    const archivio = JSON.parse(localStorage.getItem("registroLavoro")) || [];
    const meseCorrente = new Date().toISOString().substring(0, 7);

    let totaleSoldiMese = 0;
    let totaleOreMese = 0;
    const contenitoreLista = document.getElementById("listaGiornate");
    contenitoreLista.innerHTML = "";

    archivio.slice().reverse().forEach(giorno => {
        if (giorno.meseAnno === meseCorrente) {
            totaleSoldiMese += giorno.guadagno;
            totaleOreMese += giorno.ore;

            const riga = document.createElement("div");
            riga.className = "riga-giorno";
            riga.innerHTML = `
                <div>
                    <strong>${giorno.data}</strong> (${giorno.inizio}-${giorno.fine}) - ${giorno.lavoro}<br>
                    <small>${giorno.ore.toFixed(2)} ore &rarr; <b>${giorno.guadagno.toFixed(2)} €</b></small>
                </div>
                <button class="btn-danger" onclick="eliminaGiornata(${giorno.id})">Elimina</button>
            `;
            contenitoreLista.appendChild(riga);
        }
    });

    document.getElementById("totaleMensile").innerText = 
        `Totale Mese (${meseCorrente}): ${totaleSoldiMese.toFixed(2)} € (${totaleOreMese.toFixed(2)} ore)`;
}

// ==========================================
// 6. ESPORTAZIONE EXCEL CON DETTAGLI E DATA ITALIANA
// ==========================================
function scaricaExcel() {
    let archivio = JSON.parse(localStorage.getItem("registroLavoro")) || [];
    
    if (archivio.length === 0) {
        alert("Non ci sono dati salvati da esportare!");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Data;Tipo Lavoro;Inizio;Fine;Inizio Pausa;Fine Pausa;Ore Nette;Guadagno (Euro)\n";

    archivio.forEach(giorno => {
        let partiData = giorno.data.split("-");
        let dataItaliana = `${partiData[2]}/${partiData[1]}/${partiData[0]}`;
        
        let dataFormattata = `="${dataItaliana}"`;

        let oreStr = giorno.ore.toFixed(2).replace('.', ',');
        let guadagnoStr = giorno.guadagno.toFixed(2).replace('.', ',');

        let inizioStr = `="${giorno.inizio || '00:00'}"`;
        let fineStr = `="${giorno.fine || '00:00'}"`;
        let pausaInizioStr = `="${giorno.pausaInizio || '00:00'}"`;
        let pausaFineStr = `="${giorno.pausaFine || '00:00'}"`;

        let riga = `${dataFormattata};"${giorno.lavoro}";${inizioStr};${fineStr};${pausaInizioStr};${pausaFineStr};${oreStr};${guadagnoStr}`;
        csvContent += riga + "\n";
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "registro_ore_lavoro_dettaglio.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
}