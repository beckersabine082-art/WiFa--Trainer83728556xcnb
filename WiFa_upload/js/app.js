
  const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxTymUhl29rdmXONuWRlVkoe8xiFXqVf2bWUju1XgC44l2qoUT3LTU_PownQrNHbBKUVA/exec";

  const faecherNachTeilbereich = {
    WQ: [
      "Recht",
      "Steuern",
      "Rechnungswesen",
      "BWL",
      "VWL",
      "Unternehmensführung"
    ],
    HQ: [
      "Führung und Zusammenarbeit",
      "Betriebliches Management",
      "Logistik",
      "Marketing",
      "Vertrieb",
      "Finance Controlling"
    ]
  };

  let aktuellerTeilbereich = "";
  let aktuellesFach = "";
  let aktuelleFrage = "";
  let pruefungTimerInterval = null;
  let pruefungRestzeitSekunden = 0;
  let aktuellePruefungsDaten = [];
  let letztePruefungsAntworten = [];
  let aktuellesThema = "";
  let aktuelleMusterloesung = "";
  let aktuelleStichpunkte = [];
  let aktuelleFrageId = "";
  let aktuellerFragetyp = "TEXT";
  let aktuellerLoesungsschluessel = "";
  let ladeToken = 0;
  let appIstBeschaeftigt = false;

  let aktuellerNutzer = localStorage.getItem("nutzerCode");

  if (!aktuellerNutzer) {
    aktuellerNutzer = prompt("Bitte gib deinen Nutzer-Code ein:");
    if (!aktuellerNutzer || !aktuellerNutzer.trim()) {
      aktuellerNutzer = "Gast";
    }
    aktuellerNutzer = aktuellerNutzer.trim();
    localStorage.setItem("nutzerCode", aktuellerNutzer);
  }

  const sessionStats = {
    totalErreicht: 0,
    totalMax: 0,
    faecher: {},
    eintraege: []
  };

  let glossarDaten = [];
    let formelDaten = [];
let glossarAktiverBuchstabe = "";
 let karteikartenDaten = [];
let aktuelleKartenIndex = 0; 
    
  window.addEventListener("load", function () {
    updateStatAnzeige();
    initialisiereHinweis();
  });

  function zeigeBereich(viewId) {
    document.querySelectorAll(".view").forEach(function(view) {
      view.classList.remove("active");
    });

    const ziel = document.getElementById(viewId);
    if (ziel) {
      ziel.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(function(btn) {
      btn.classList.remove("active");
    });

    if (viewId === "startView") document.getElementById("navStart").classList.add("active");
    if (viewId === "trainerView") document.getElementById("navTrainer").classList.add("active");
    if (viewId === "lernstandView") document.getElementById("navLernstand").classList.add("active");
    if (viewId === "glossarView") {
  document.getElementById("navGlossar").classList.add("active");

  if (!glossarDaten.length && !appIstBeschaeftigt) {
    ladeGlossar();
  }
}
if (viewId === "formelView") {
  document.getElementById("navFormeln").classList.add("active");

  if (!formelDaten.length && !appIstBeschaeftigt) {
    ladeFormelsammlung();
  }
}
    if (viewId === "pruefungView") document.getElementById("navPruefung").classList.add("active");
    if (viewId === "wissenView") document.getElementById("navWissen").classList.add("active");
    if (viewId === "kilianView") document.getElementById("navKilian").classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function oeffneTrainerMitTeilbereich(teilbereich) {
    zeigeBereich("trainerView");
    const select = document.getElementById("teilbereichSelect");
    select.value = teilbereich;
    waehleTeilbereich();
  }

  async function ladeGlossar() {
    if (appIstBeschaeftigt) return;

    try {
      setzeAppBeschaeftigt(true);

      const status = document.getElementById("glossarStatus");
      const liste = document.getElementById("glossarListe");

      status.textContent = "Glossar wird geladen...";
      liste.className = "result-list-empty";
      liste.innerHTML = "Bitte kurz warten...";

      const result = await apiGet("getGlossar");

      if (!result.success) {
        throw new Error(result.error || "Glossar konnte nicht geladen werden.");
      }

      glossarDaten = result.data || [];

      if (!glossarDaten.length) {
        status.textContent = "Keine Glossar-Einträge gefunden.";
        liste.className = "result-list-empty";
        liste.innerHTML = "Im Sheet „Glossar“ wurden keine Einträge gefunden.";
        return;
      }

      status.textContent = glossarDaten.length + " Begriffe geladen.";
baueGlossarFilter();
resetGlossarFilter();

    } catch (error) {
      document.getElementById("glossarStatus").textContent =
        "Fehler beim Laden: " + error.message;
    } finally {
      setzeAppBeschaeftigt(false);
    }
  }

function baueGlossarFilter() {
  const themaSelect = document.getElementById("glossarThemaFilter");
  const alphabet = document.getElementById("glossarAlphabet");

  const themen = [...new Set(glossarDaten.map(function(eintrag) {
    return String(eintrag.thema || "").trim();
  }).filter(Boolean))].sort();

  themaSelect.innerHTML = '<option value="">Alle Themen</option>';

  themen.forEach(function(thema) {
    const option = document.createElement("option");
    option.value = thema;
    option.textContent = thema;
    themaSelect.appendChild(option);
  });

  const buchstaben = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");

  alphabet.innerHTML = buchstaben.map(function(buchstabe) {
    return `
      <button class="alphabet-btn" type="button" onclick="waehleGlossarBuchstabe('${buchstabe}')">
        ${buchstabe}
      </button>
    `;
  }).join("");
}

function waehleGlossarBuchstabe(buchstabe) {
  glossarAktiverBuchstabe = buchstabe;

  document.querySelectorAll(".alphabet-btn").forEach(function(btn) {
    btn.classList.remove("active");
    if (btn.textContent.trim() === buchstabe) {
      btn.classList.add("active");
    }
  });

  filtereGlossar();
}

function resetGlossarFilter() {
  glossarAktiverBuchstabe = "";

  document.getElementById("glossarSuche").value = "";
  document.getElementById("glossarThemaFilter").value = "";

  document.querySelectorAll(".alphabet-btn").forEach(function(btn) {
    btn.classList.remove("active");
  });

  document.getElementById("glossarStatus").textContent =
    glossarDaten.length ? glossarDaten.length + " Begriffe geladen." : "Noch nicht geladen.";

  document.getElementById("glossarListe").className = "result-list-empty";
  document.getElementById("glossarListe").innerHTML =
    "Wähle einen Buchstaben, ein Thema oder nutze die Suche.";
}

function filtereGlossar() {
  const suchbegriff = String(document.getElementById("glossarSuche").value || "").trim().toLowerCase();
  const themaFilter = String(document.getElementById("glossarThemaFilter").value || "").trim().toLowerCase();

  if (!glossarDaten.length) {
    document.getElementById("glossarListe").className = "result-list-empty";
    document.getElementById("glossarListe").innerHTML = "Bitte zuerst das Glossar laden.";
    return;
  }

  if (!suchbegriff && !themaFilter && !glossarAktiverBuchstabe) {
    document.getElementById("glossarListe").className = "result-list-empty";
    document.getElementById("glossarListe").innerHTML =
      "Wähle einen Buchstaben, ein Thema oder nutze die Suche.";
    document.getElementById("glossarStatus").textContent =
      glossarDaten.length + " Begriffe geladen.";
    return;
  }

  const treffer = glossarDaten.filter(function(eintrag) {
    const begriff = String(eintrag.begriff || "").trim().toLowerCase();
    const thema = String(eintrag.thema || "").trim().toLowerCase();

    const suchText = [
      eintrag.begriff,
      eintrag.erklaerung,
      eintrag.fach,
      eintrag.thema,
      eintrag.synonyme
    ].join(" ").toLowerCase();

    const passtZurSuche = !suchbegriff || suchText.includes(suchbegriff);
    const passtZumThema = !themaFilter || thema === themaFilter;
    const passtZumBuchstaben = !glossarAktiverBuchstabe ||
      begriff.startsWith(glossarAktiverBuchstabe.toLowerCase());

    return passtZurSuche && passtZumThema && passtZumBuchstaben;
  });

  document.getElementById("glossarStatus").textContent =
    treffer.length + " passende Begriffe gefunden.";

  renderGlossar(treffer);
}

function renderGlossar(daten) {
  const liste = document.getElementById("glossarListe");

  if (!daten.length) {
    liste.className = "result-list-empty";
    liste.innerHTML = "Keine passenden Begriffe gefunden.";
    return;
  }

  liste.className = "";
  liste.innerHTML = daten.map(function(eintrag) {
    return `
      <div class="result-mini-entry">
        <div class="result-mini-head">
          <div class="result-mini-title">${escapeHtml(eintrag.begriff)}</div>
          <div class="result-mini-score">${escapeHtml(eintrag.fach)}</div>
        </div>

        <div style="font-size:14px; line-height:1.5; color:#4a3970; margin-top:8px;">
          ${escapeHtml(eintrag.erklaerung)}
        </div>

        <div class="result-mini-footer">
          <span><strong>Thema:</strong> ${escapeHtml(eintrag.thema)}</span>
        </div>

        <div style="margin-top:8px; font-size:13px; color:#5a4a80;">
          <strong>Synonyme:</strong> ${escapeHtml(eintrag.synonyme || "keine")}
        </div>
      </div>
    `;
  }).join("");
}

  function setzeAppBeschaeftigt(status) {
    appIstBeschaeftigt = status;

    document.querySelectorAll("button, select, textarea, input").forEach(function(el) {
      if (el.id === "hinweisCheckbox") return;
      if (el.id === "hinweisButton") return;
      if (el.closest("#hinweisOverlay")) return;

      el.disabled = status;
      el.style.opacity = status ? "0.65" : "1";
      el.style.cursor = status ? "wait" : "";
    });
  }

  function waehleTeilbereich() {
    if (appIstBeschaeftigt) return;

    ladeToken++;
    aktuellerTeilbereich = document.getElementById("teilbereichSelect").value;
    aktuellesFach = "";
    aktuellesThema = "";
    aktuelleFrage = "";
    aktuelleMusterloesung = "";
    aktuelleStichpunkte = [];
    aktuelleFrageId = "";

    const fachSelect = document.getElementById("fachSelect");
    const fachBereich = document.getElementById("fachBereich");
    const themaSelect = document.getElementById("themaSelect");
    const themaBereich = document.getElementById("themaBereich");

    fachSelect.innerHTML = '<option value="">-- Fach wählen --</option>';
    themaSelect.innerHTML = '<option value="">-- Thema wählen --</option>';
    themaBereich.style.display = "none";

    if (!aktuellerTeilbereich) {
      fachBereich.style.display = "none";
      document.getElementById("fachStatus").textContent = "Bitte zuerst einen Teilbereich auswählen.";
      document.getElementById("anzeigeTeilbereich").textContent = "Kein Teilbereich";
      document.getElementById("anzeigeFach").textContent = "Kein Fach";
      document.getElementById("anzeigeThema").textContent = "Bitte Thema wählen";
      document.getElementById("frageText").textContent = "Bitte zuerst Teilbereich, Fach und Thema auswählen.";
      resetFrageAnzeige();
      updateStatAnzeige();
      return;
    }

    const faecher = faecherNachTeilbereich[aktuellerTeilbereich] || [];

    faecher.forEach(function(fach) {
      const option = document.createElement("option");
      option.value = fach;
      option.textContent = fach;
      fachSelect.appendChild(option);
    });

    fachBereich.style.display = "block";

    document.getElementById("anzeigeTeilbereich").textContent = aktuellerTeilbereich;
    document.getElementById("anzeigeFach").textContent = "Bitte Fach wählen";
    document.getElementById("anzeigeThema").textContent = "Bitte Thema wählen";
    document.getElementById("frageText").textContent = "Bitte zuerst ein Fach und dann ein Thema auswählen.";
    document.getElementById("fachStatus").textContent = "Teilbereich gewählt: " + aktuellerTeilbereich;

    resetFrageAnzeige();
    updateStatAnzeige();
  }

  function waehleFachAusDropdown() {
    if (appIstBeschaeftigt) return;

    const fach = document.getElementById("fachSelect").value;

    if (!fach) {
      ladeToken++;
      aktuellesFach = "";
      aktuellesThema = "";
      aktuelleFrage = "";
      aktuelleMusterloesung = "";
      aktuelleStichpunkte = [];
      aktuelleFrageId = "";

      document.getElementById("themaBereich").style.display = "none";
      document.getElementById("themaSelect").innerHTML = '<option value="">-- Thema wählen --</option>';
      document.getElementById("anzeigeFach").textContent = "Kein Fach";
      document.getElementById("anzeigeThema").textContent = "Bitte Thema wählen";
      document.getElementById("frageText").textContent = "Bitte zuerst ein Fach auswählen.";
      document.getElementById("fachStatus").textContent = "Bitte ein Fach auswählen.";

      resetFrageAnzeige();
      updateStatAnzeige();
      return;
    }

    waehleFach(fach);
  }

  function ermittleTeilbereich(fach) {
    if (faecherNachTeilbereich.WQ.includes(fach)) return "WQ";
    if (faecherNachTeilbereich.HQ.includes(fach)) return "HQ";
    return aktuellerTeilbereich || "";
  }

  function setzeStatus(text) {
    document.getElementById("ladeStatus").textContent = text || "";
  }

  function resetFrageAnzeige() {
    document.getElementById("antwortInput").value = "";
    document.getElementById("resultBox").style.display = "none";
    document.getElementById("solutionBox").style.display = "none";
    document.getElementById("musterloesungText").textContent = "";
    document.getElementById("ergebnisText").textContent = "Hier erscheint die Bewertung.";
    document.getElementById("punkteAnzeige").textContent = "0 / 0 Punkte";
    document.getElementById("punkteAnzeige").classList.remove("good", "bad");
    setzeStatus("");
  }

  async function apiGet(action, params = {}) {
    const url = new URL(API_BASE_URL);
    url.searchParams.set("action", action);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString(), { method: "GET" });

    if (!response.ok) {
      throw new Error("HTTP-Fehler: " + response.status);
    }

    return await response.json();
  }

  async function apiPost(action, payload = {}) {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error("HTTP-Fehler: " + response.status);
    }

    return await response.json();
  }

  async function ladeThemen(fach) {
    const eigenerToken = ++ladeToken;

    try {
      setzeAppBeschaeftigt(true);

      const select = document.getElementById("themaSelect");
      const bereich = document.getElementById("themaBereich");

      select.innerHTML = '<option value="">Themen werden geladen...</option>';
      bereich.style.display = "block";
      document.getElementById("fachStatus").textContent = "Themen werden geladen für: " + fach;

      const result = await apiGet("topics", { fach });

      if (eigenerToken !== ladeToken) return;

      if (!result.success) {
        throw new Error(result.error || "Themen konnten nicht geladen werden.");
      }

      const themen = result.data || [];

      select.innerHTML = '<option value="">-- Thema wählen --</option>';

      if (!themen.length) {
        select.innerHTML = '<option value="">Keine Themen gefunden</option>';
        document.getElementById("fachStatus").textContent =
          "Keine Themen gefunden für: " + fach + ". Prüfe, ob im Sheet aktive Fragen mit Aktiv = ja vorhanden sind.";
        return;
      }

      themen.forEach(function(thema) {
        const option = document.createElement("option");
        option.value = thema;
        option.textContent = thema;
        select.appendChild(option);
      });

      document.getElementById("fachStatus").textContent =
        "Themen geladen für: " + fach + " (" + themen.length + ")";
    } catch (error) {
      if (eigenerToken !== ladeToken) return;

      document.getElementById("themaSelect").innerHTML =
        '<option value="">Fehler beim Laden</option>';

      document.getElementById("fachStatus").textContent =
        "Fehler beim Laden der Themen: " + error.message;
    } finally {
      if (eigenerToken === ladeToken) {
        setzeAppBeschaeftigt(false);
      }
    }
  }

  function waehleFach(fach) {
    aktuellesFach = String(fach || "").trim();
    aktuellesThema = "";
    aktuelleFrage = "";
    aktuelleMusterloesung = "";
    aktuelleStichpunkte = [];
    aktuelleFrageId = "";

    document.getElementById("anzeigeFach").textContent = aktuellesFach || "Kein Fach";
    document.getElementById("anzeigeThema").textContent = "Bitte Thema wählen";
    document.getElementById("frageText").textContent = "Bitte zuerst ein Thema auswählen.";
    document.getElementById("fachStatus").textContent = "Ausgewähltes Fach: " + aktuellesFach;

    document.getElementById("themaSelect").innerHTML =
      '<option value="">Themen werden geladen...</option>';

    resetFrageAnzeige();
    updateStatAnzeige();

    if (aktuellesFach) {
      ladeThemen(aktuellesFach);
    }
  }

  async function ladeFrageAusFach(fach, thema) {
    const eigenerToken = ++ladeToken;

    try {
      setzeAppBeschaeftigt(true);
      setzeStatus("Frage wird geladen...");

      const result = await apiGet("nextQuestion", { fach, thema });

      if (eigenerToken !== ladeToken) return;

      if (!result.success) {
        throw new Error(result.error || "Frage konnte nicht geladen werden.");
      }

      const daten = result.data || {};

      if (!daten.id) {
        aktuelleFrage = "";
        aktuelleMusterloesung = "";
        aktuelleStichpunkte = [];
        aktuelleFrageId = "";

        document.getElementById("frageText").textContent =
          daten.frage || "Keine aktive Frage gefunden.";
        document.getElementById("anzeigeThema").textContent = thema || "Thema nicht hinterlegt";

        resetFrageAnzeige();
        setzeStatus("Keine aktive Frage gefunden.");
        return;
      }

      aktuelleFrage = daten.frage || "";
      aktuellesThema = daten.thema || thema || "Thema nicht hinterlegt";
      aktuelleMusterloesung = daten.musterloesung || "";
      aktuelleStichpunkte = String(daten.stichpunkte || "")
  .split(";")
  .map(function(punkt) {
    return punkt.trim();
  })
  .filter(Boolean);
      aktuelleFrageId = daten.id || "";
aktuellerFragetyp = String(daten.fragetyp || "TEXT").trim().toUpperCase();
aktuellerLoesungsschluessel = String(daten.loesungsschluessel || "").trim();

const frageTextBox = document.getElementById("frageText");
const antwortLabel = document.querySelector('label[for="antwortInput"]');
const antwortInput = document.getElementById("antwortInput");

const fragetyp = aktuellerFragetyp;
const aufgabenHtml = String(daten.aufgabenHtml || "").trim();

let frageHtml = "";

if (aktuelleFrage) {
  frageHtml += "<div>" + escapeHtml(aktuelleFrage) + "</div>";
}

if (aufgabenHtml) {
  frageHtml += '<div class="aufgaben-html-bereich">' + aufgabenHtml + "</div>";
}

frageTextBox.innerHTML = frageHtml || "Keine Frage hinterlegt.";

if (fragetyp === "TEXT") {
  if (antwortLabel) antwortLabel.style.display = "block";
  antwortInput.style.display = "block";
  antwortInput.placeholder = "Schreibe hier deine Antwort...";
} else if (fragetyp === "RECHNUNG") {
  if (antwortLabel) antwortLabel.style.display = "block";
  antwortInput.style.display = "block";
  antwortInput.placeholder = "Trage hier deinen Rechenweg oder deine Ergänzung ein...";
} else {
  if (antwortLabel) antwortLabel.style.display = "none";
  antwortInput.style.display = "none";
  antwortInput.value = "";
}
if (daten.bilddatei) {
  frageTextBox.innerHTML += `
    <div class="question-image-wrap">
      <img src="bilder/${daten.bilddatei}" alt="Aufgabenbild" class="question-image">
    </div>
  `;
}
      document.getElementById("anzeigeThema").textContent = aktuellesThema;

      setzeStatus("Frage geladen.");
    } catch (error) {
      if (eigenerToken !== ladeToken) return;

      aktuelleFrage = "";
      aktuelleMusterloesung = "";
      aktuelleFrageId = "";

      document.getElementById("frageText").textContent = "Fehler beim Laden der Frage.";
      setzeStatus("Fehler: " + error.message);
    } finally {
      if (eigenerToken === ladeToken) {
        setzeAppBeschaeftigt(false);
      }
    }
  }

  function starteThema() {
    if (appIstBeschaeftigt) return;

    const thema = document.getElementById("themaSelect").value;

    if (!aktuellerTeilbereich) {
      alert("Bitte zuerst einen Teilbereich auswählen.");
      return;
    }

    if (!aktuellesFach) {
      alert("Bitte zuerst ein Fach auswählen.");
      return;
    }

    if (!thema) {
      alert("Bitte zuerst ein Thema auswählen.");
      return;
    }

    aktuellesThema = thema;
    ladeFrageAusFach(aktuellesFach, aktuellesThema);
  }

  async function bewerteAntwort() {
    if (appIstBeschaeftigt) return;

    const antwort = document.getElementById("antwortInput").value.trim();
alert("Fragetyp: " + aktuellerFragetyp + "\nLösungsschlüssel: " + aktuellerLoesungsschluessel);

if (aktuellerFragetyp === "ANKREUZ") {
  bewerteAnkreuzAntwort();
  return;
}

    if (!aktuellerTeilbereich) {
      alert("Bitte zuerst einen Teilbereich auswählen.");
      return;
    }

    if (!aktuellesFach) {
      alert("Bitte zuerst ein Fach auswählen.");
      return;
    }

    if (!aktuellesThema) {
      alert("Bitte zuerst ein Thema auswählen.");
      return;
    }

    if (!aktuelleFrageId) {
      alert("Es ist aktuell keine Frage geladen.");
      return;
    }

    if (!antwort) {
      alert("Bitte zuerst eine Antwort eingeben.");
      return;
    }

    try {
      setzeAppBeschaeftigt(true);
      setzeStatus("Antwort wird ausgewertet...");

      const result = await apiPost("bewerteAntwort", {
        fach: aktuellesFach,
        frageId: aktuelleFrageId,
        antwort: antwort
      });

      if (!result.success) {
        throw new Error(result.error || "Auswertung fehlgeschlagen.");
      }

      const data = result.data || {};

      document.getElementById("resultBox").style.display = "block";

      const punkte = Number(data.punkte || 0);
      const maxPunkte = Number(data.maxPunkte || 0);
const bewertungText = bereinigeBewertungText(
  data.ergebnis || "Keine Auswertung erhalten."
);
      const punkteAnzeige = document.getElementById("punkteAnzeige");
      punkteAnzeige.textContent = punkte + " / " + maxPunkte + " Punkte";
      punkteAnzeige.classList.remove("good", "bad");
      punkteAnzeige.classList.add(maxPunkte > 0 && punkte >= maxPunkte / 2 ? "good" : "bad");

      document.getElementById("ergebnisText").textContent = bewertungText;

      aktuelleMusterloesung = data.musterloesung || "";
      document.getElementById("solutionBox").style.display = "none";
      document.getElementById("musterloesungText").textContent = "";

      verbucheSessionErgebnis(
        aktuellesFach,
        aktuelleFrageId,
        punkte,
        maxPunkte
      );

      updateStatAnzeige();

      setzeStatus("Auswertung abgeschlossen. Lernstand wird gespeichert...");

      const speicherResult = await apiPost("speichereLernstand", {
        nutzer: aktuellerNutzer,
        teilbereich: ermittleTeilbereich(aktuellesFach),
        fach: aktuellesFach,
        thema: aktuellesThema,
        frageId: aktuelleFrageId,
        punkte: punkte,
        maxPunkte: maxPunkte,
        bewertung: bewertungText,
        antwort: antwort
      });

      if (!speicherResult.success) {
        throw new Error(speicherResult.error || "Lernstand konnte nicht gespeichert werden.");
      }

      setzeStatus("Auswertung abgeschlossen und Lernstand gespeichert.");
    } catch (error) {
      setzeStatus("Fehler bei der Auswertung oder Speicherung: " + error.message);
    } finally {
      setzeAppBeschaeftigt(false);
    }
  }

function bewerteAnkreuzAntwort() {
  const checkboxes = document.querySelectorAll("#frageText input[type='checkbox']");
  const loesungen = String(aktuellerLoesungsschluessel || "")
    .split(";")
    .map(function(eintrag) {
      const teile = eintrag.split("=");
      return {
        index: Number(teile[0]),
        wert: String(teile[1] || "").trim().toLowerCase() === "true"
      };
    })
    .filter(function(eintrag) {
      return eintrag.index > 0;
    });

  if (!checkboxes.length || !loesungen.length) {
    alert("Für diese Ankreuzaufgabe fehlen Checkboxen oder Lösungsschlüssel.");
    return;
  }

  let punkte = 0;
  const maxPunkte = loesungen.length;

  loesungen.forEach(function(loesung) {
    const checkbox = checkboxes[loesung.index - 1];
    if (!checkbox) return;

    if (checkbox.checked === loesung.wert) {
      punkte++;
    }
  });

  document.getElementById("resultBox").style.display = "block";

  const punkteAnzeige = document.getElementById("punkteAnzeige");
  punkteAnzeige.textContent = punkte + " / " + maxPunkte + " Punkte";
  punkteAnzeige.classList.remove("good", "bad");
  punkteAnzeige.classList.add(punkte >= maxPunkte / 2 ? "good" : "bad");

  document.getElementById("ergebnisText").textContent =
    punkte === maxPunkte
      ? "vollständig richtig"
      : punkte >= maxPunkte / 2
        ? "teilweise richtig"
        : "unzureichend";
}
  function verbucheSessionErgebnis(fach, frageId, punkte, maxPunkte) {
    if (!fach || !frageId) return;

    if (!sessionStats.faecher[fach]) {
      sessionStats.faecher[fach] = { erreicht: 0, max: 0 };
    }

    const index = sessionStats.eintraege.findIndex(function(e) {
      return e.fach === fach && e.frageId === frageId;
    });

    if (index !== -1) {
      const alt = sessionStats.eintraege[index];

      sessionStats.faecher[fach].erreicht -= alt.punkte;
      sessionStats.faecher[fach].max -= alt.maxPunkte;

      sessionStats.totalErreicht -= alt.punkte;
      sessionStats.totalMax -= alt.maxPunkte;

      sessionStats.eintraege.splice(index, 1);
    }

    const neuerEintrag = {
      teilbereich: ermittleTeilbereich(fach),
      fach: fach,
      frageId: frageId,
      punkte: punkte,
      maxPunkte: maxPunkte,
      prozent: berechneProzent(punkte, maxPunkte)
    };

    sessionStats.eintraege.unshift(neuerEintrag);

    sessionStats.faecher[fach].erreicht += punkte;
    sessionStats.faecher[fach].max += maxPunkte;

    sessionStats.totalErreicht += punkte;
    sessionStats.totalMax += maxPunkte;
  }

  function berechneProzent(erreicht, max) {
    if (!max || max <= 0) return 0;
    return Math.round((erreicht / max) * 100);
  }

  function updateStatAnzeige() {
    const fachStats = aktuellesFach && sessionStats.faecher[aktuellesFach]
      ? sessionStats.faecher[aktuellesFach]
      : { erreicht: 0, max: 0 };

    const fachProzent = berechneProzent(fachStats.erreicht, fachStats.max);
    const sessionProzent = berechneProzent(sessionStats.totalErreicht, sessionStats.totalMax);

    document.getElementById("fachProzent").textContent = fachProzent + "%";
    document.getElementById("fachDetails").textContent =
      fachStats.erreicht + " von " + fachStats.max + " Punkten im aktuellen Fach";
    document.getElementById("fachProgressBar").style.width = fachProzent + "%";

    document.getElementById("sessionProzent").textContent = sessionProzent + "%";
    document.getElementById("sessionDetails").textContent =
      sessionStats.totalErreicht + " von " + sessionStats.totalMax + " Punkten in dieser Session";
    document.getElementById("sessionProgressBar").style.width = sessionProzent + "%";

    renderEinzelergebnisse();
  }

  function renderEinzelergebnisse() {
    const container = document.getElementById("einzelergebnisListe");

    if (!sessionStats.eintraege.length) {
      container.className = "result-list-empty";
      container.innerHTML = "Noch keine Ergebnisse in dieser Session.";
      return;
    }

    container.className = "";
    container.innerHTML = sessionStats.eintraege.map(function(eintrag) {
      return `
        <div class="result-mini-entry">
          <div class="result-mini-head">
            <div class="result-mini-title">${escapeHtml(eintrag.teilbereich)} · ${escapeHtml(eintrag.fach)}</div>
            <div class="result-mini-score">${eintrag.prozent}%</div>
          </div>

          <div class="result-mini-bar">
            <div class="result-mini-fill" style="width: ${eintrag.prozent}%;"></div>
          </div>

          <div class="result-mini-footer">
            <span>${eintrag.punkte} / ${eintrag.maxPunkte} Punkte</span>
          </div>
        </div>
      `;
    }).join("");
  }

    function bereinigeBewertungText(text) {
  let sauber = String(text || "");

  sauber = sauber
    .replace(/Erkannte Stichpunkte:[\s\S]*?(Fehlende Stichpunkte:|$)/gi, "")
    .replace(/Fehlende Stichpunkte:[\s\S]*$/gi, "");

  sauber = sauber
    .split("\n")
    .filter(function(zeile) {
      const z = zeile.trim();

      if (!z) return false;
      if (z.startsWith("-")) return false;

      return true;
    })
    .join("\n")
    .trim();

  return sauber || "Ergebnis wurde berechnet.";
}

    function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

    function formatKilianAntwort(text) {
  return String(text || "")
    .replace(/### (.*?)(\n|$)/g, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n- /g, "<br>• ")
    .replace(/\n/g, "<br>");
}
    
  function resetSession() {
    if (appIstBeschaeftigt) return;

    const bestaetigt = confirm("Möchtest du die komplette Lernsession wirklich zurücksetzen?");
    if (!bestaetigt) return;

    sessionStats.totalErreicht = 0;
    sessionStats.totalMax = 0;
    sessionStats.faecher = {};
    sessionStats.eintraege = [];

    updateStatAnzeige();
    setzeStatus("Lernsession wurde zurückgesetzt.");
  }

function hebeStichpunkteHervor(text, stichpunkte) {
  if (!text) return "";

  let html = escapeHtml(text);

  if (!Array.isArray(stichpunkte)) {
    return html;
  }

  stichpunkte.forEach(function(punkt) {
    const clean = String(punkt || "").trim();

    if (!clean) return;

    const escaped = escapeRegExp(clean);

    html = html.replace(
      new RegExp("(" + escaped + ")", "gi"),
      "<strong><em>$1</em></strong>"
    );
  });

  return html;
}
  function zeigeMusterloesung() {
    if (!aktuelleMusterloesung) {
      alert("Zur aktuellen Frage ist keine Musterlösung vorhanden.");
      return;
    }

    document.getElementById("resultBox").style.display = "block";
    document.getElementById("solutionBox").style.display = "block";
    document.getElementById("musterloesungText").innerHTML =
  hebeStichpunkteHervor(aktuelleMusterloesung, []);
  }

  function naechsteFrage() {
    if (appIstBeschaeftigt) return;

    if (!aktuellerTeilbereich) {
      alert("Bitte zuerst einen Teilbereich auswählen.");
      return;
    }

    if (!aktuellesFach) {
      alert("Bitte zuerst ein Fach auswählen.");
      return;
    }

    if (!aktuellesThema) {
      alert("Bitte zuerst ein Thema auswählen.");
      return;
    }

    ladeFrageAusFach(aktuellesFach, aktuellesThema);
  }

  function antwortLeeren() {
    if (appIstBeschaeftigt) return;
    document.getElementById("antwortInput").value = "";
  }

  function initialisiereHinweis() {
    const checkbox = document.getElementById("hinweisCheckbox");
    const button = document.getElementById("hinweisButton");

    if (!localStorage.getItem("hinweisGelesen")) {
      document.getElementById("hinweisOverlay").style.display = "flex";
    }

    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        button.disabled = false;
        button.style.background = "linear-gradient(135deg, #f0b429, #d97706)";
        button.style.color = "#ffffff";
        button.style.cursor = "pointer";
      } else {
        button.disabled = true;
        button.style.background = "#d9d9d9";
        button.style.color = "#666";
        button.style.cursor = "not-allowed";
      }
    });
  }

  function hinweisAnzeigen() {
    document.getElementById("hinweisOverlay").style.display = "flex";

    const checkboxWrap = document.getElementById("hinweisCheckboxWrap");
    const checkbox = document.getElementById("hinweisCheckbox");
    const button = document.getElementById("hinweisButton");

    checkboxWrap.style.display = "flex";
    checkbox.checked = false;
    button.disabled = true;
    button.style.background = "#d9d9d9";
    button.style.color = "#666";
    button.style.cursor = "not-allowed";
    button.textContent = "Gelesen und fortfahren";
  }

  function hinweisSchliessen() {
    const bereitsGelesen = localStorage.getItem("hinweisGelesen") === "true";
    const checkbox = document.getElementById("hinweisCheckbox");

    if (!bereitsGelesen && !checkbox.checked) {
      return;
    }

    document.getElementById("hinweisOverlay").style.display = "none";
    localStorage.setItem("hinweisGelesen", "true");
  }

  function hinweisNurSchliessen() {
    document.getElementById("hinweisOverlay").style.display = "none";
  }

  async function ladeLernstand() {
    if (appIstBeschaeftigt) return;

    try {
      setzeAppBeschaeftigt(true);

      const status = document.getElementById("lernstandStatus");
      const liste = document.getElementById("lernstandListe");

      status.textContent = "Lernstand wird geladen...";
      liste.className = "result-list-empty";
      liste.innerHTML = "Bitte kurz warten...";

      const result = await apiGet("getLernstand", {
        nutzer: aktuellerNutzer
      });

      if (!result.success) {
        throw new Error(result.error || "Lernstand konnte nicht geladen werden.");
      }

      const daten = result.data || [];
      aktuellePruefungsDaten = daten;
const fachSelect =
  document.getElementById("pruefungFachSelect");

const gewaehlteOption =
  fachSelect.options[fachSelect.selectedIndex];

const minuten =
  Number(gewaehlteOption?.dataset?.zeit || 0);

if (minuten > 0) {
  startePruefungTimer(minuten);
}
      if (!daten.length) {
        status.textContent = "Keine gespeicherten Einträge gefunden.";
        liste.className = "result-list-empty";
        liste.innerHTML = "Für diesen Nutzer-Code wurde noch kein Lernstand gefunden.";
        return;
      }

      status.textContent = daten.length + " gespeicherte Auswertungen geladen.";
      liste.className = "";

      const fachMap = {};

      daten.forEach(function(eintrag) {
        const key = String(eintrag.teilbereich || "") + "||" + String(eintrag.fach || "");

        if (!fachMap[key]) {
          fachMap[key] = {
            teilbereich: eintrag.teilbereich || "",
            fach: eintrag.fach || "",
            erreicht: 0,
            max: 0,
            anzahl: 0,
            eintraege: []
          };
        }

        fachMap[key].erreicht += Number(eintrag.punkte || 0);
        fachMap[key].max += Number(eintrag.maxPunkte || 0);
        fachMap[key].anzahl += 1;
        fachMap[key].eintraege.push(eintrag);
      });

      const fachBloecke = Object.values(fachMap);

      liste.innerHTML = fachBloecke.map(function(fachBlock, index) {
        const prozent = fachBlock.max > 0
          ? Math.round((fachBlock.erreicht / fachBlock.max) * 100)
          : 0;

        return `
          <div class="result-mini-entry">
            <div class="result-mini-head">
              <div class="result-mini-title">
                ${escapeHtml(fachBlock.teilbereich)} · ${escapeHtml(fachBlock.fach)}
              </div>
              <div class="result-mini-score">
                ${prozent}%
              </div>
            </div>

            <div class="result-mini-bar">
              <div class="result-mini-fill" style="width: ${prozent}%;"></div>
            </div>

            <div class="result-mini-footer">
              <span>${fachBlock.erreicht} / ${fachBlock.max} Punkte · ${fachBlock.anzahl} Auswertungen</span>
              <button class="secondary-btn" style="padding:6px 10px; font-size:12px; width:auto;" onclick="toggleDetails(${index})">
                Details
              </button>
            </div>

            <div id="details-${index}" style="display:none; margin-top:10px;">
              ${fachBlock.eintraege.map(function(eintrag) {
                const einzelProzent = Number(eintrag.maxPunkte || 0) > 0
                  ? Math.round((Number(eintrag.punkte || 0) / Number(eintrag.maxPunkte || 0)) * 100)
                  : Number(eintrag.prozent || 0);

                return `
                  <div style="margin-top:10px; font-size:13px; color:#5a4a80; border-top:1px solid #eadfff; padding-top:8px; line-height:1.5;">
                    <strong>${einzelProzent}%</strong> · ${escapeHtml(eintrag.punkte)} / ${escapeHtml(eintrag.maxPunkte)} Punkte · ${escapeHtml(eintrag.datum)}<br>
                    <strong>Thema:</strong> ${escapeHtml(eintrag.thema)}<br>
                    <strong>Frage:</strong> ${escapeHtml(eintrag.frage || eintrag.frageId || "Frage nicht gefunden")}
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `;
      }).join("");

    } catch (error) {
      document.getElementById("lernstandStatus").textContent =
        "Fehler beim Laden: " + error.message;
    } finally {
      setzeAppBeschaeftigt(false);
    }
  }

  function toggleDetails(index) {
    const el = document.getElementById("details-" + index);
    if (!el) return;
    el.style.display = el.style.display === "none" ? "block" : "none";
  }
    function kartenTeilbereichWaehlen() {
  const teilbereich = document.getElementById("kartenTeilbereichSelect").value;
  const fachSelect = document.getElementById("kartenFachSelect");
  const themaSelect = document.getElementById("kartenThemaSelect");

  fachSelect.innerHTML = '<option value="">-- Fach wählen --</option>';
  themaSelect.innerHTML = '<option value="">Alle Themen</option>';

  karteikartenDaten = [];
  aktuelleKartenIndex = 0;

  document.getElementById("karteikartenBox").style.display = "none";
  document.getElementById("kartenStatus").textContent = "Bitte Fach auswählen.";

  if (!teilbereich) {
    document.getElementById("kartenStatus").textContent = "Bitte Teilbereich und Fach auswählen.";
    return;
  }

  const faecher = faecherNachTeilbereich[teilbereich] || [];

  faecher.forEach(function(fach) {
    const option = document.createElement("option");
    option.value = fach;
    option.textContent = fach;
    fachSelect.appendChild(option);
  });
}

async function kartenFachWaehlen() {
  const fach = document.getElementById("kartenFachSelect").value;
  const themaSelect = document.getElementById("kartenThemaSelect");

  themaSelect.innerHTML = '<option value="">Alle Themen</option>';

  karteikartenDaten = [];
  aktuelleKartenIndex = 0;

  document.getElementById("karteikartenBox").style.display = "none";

  if (!fach) {
    document.getElementById("kartenStatus").textContent = "Bitte Fach auswählen.";
    return;
  }

  try {
    document.getElementById("kartenStatus").textContent = "Themen werden geladen...";

    const result = await apiGet("topics", { fach });

    if (!result.success) {
      throw new Error(result.error || "Themen konnten nicht geladen werden.");
    }

    const themen = result.data || [];

    themen.forEach(function(thema) {
      const option = document.createElement("option");
      option.value = thema;
      option.textContent = thema;
      themaSelect.appendChild(option);
    });

    document.getElementById("kartenStatus").textContent =
      "Fach gewählt. Du kannst jetzt ein Thema auswählen oder alle Themen laden.";

  } catch (error) {
    document.getElementById("kartenStatus").textContent =
      "Fehler beim Laden der Themen: " + error.message;
  }
}

async function ladeKarteikarten() {
  const fach = document.getElementById("kartenFachSelect").value;
  const thema = document.getElementById("kartenThemaSelect").value;

  if (!fach) {
    alert("Bitte zuerst ein Fach auswählen.");
    return;
  }

  try {
    document.getElementById("kartenStatus").textContent = "Karteikarten werden geladen...";

    const result = await apiGet("getKarteikarten", {
      fach: fach,
      thema: thema
    });

    if (!result.success) {
      throw new Error(result.error || "Karteikarten konnten nicht geladen werden.");
    }

    karteikartenDaten = result.data || [];
    aktuelleKartenIndex = 0;

    if (!karteikartenDaten.length) {
      document.getElementById("karteikartenBox").style.display = "none";
      document.getElementById("kartenStatus").textContent =
        "Keine Karteikarten gefunden. Prüfe, ob aktive Fragen mit Musterlösung vorhanden sind.";
      return;
    }

    document.getElementById("karteikartenBox").style.display = "block";
    document.getElementById("kartenStatus").textContent =
      karteikartenDaten.length + " Karteikarten geladen.";

    zeigeAktuelleKarte();

  } catch (error) {
    document.getElementById("kartenStatus").textContent =
      "Fehler beim Laden der Karteikarten: " + error.message;
  }
}

function zeigeAktuelleKarte() {
  if (!karteikartenDaten.length) return;

  const karte = karteikartenDaten[aktuelleKartenIndex];

  document.getElementById("kartenZaehler").textContent =
    (aktuelleKartenIndex + 1) + " von " + karteikartenDaten.length;

  document.getElementById("kartenFachAnzeige").textContent =
    karte.fach || "Kein Fach";

  document.getElementById("kartenThemaAnzeige").textContent =
    karte.thema || "Kein Thema";

  document.getElementById("kartenVorderseite").textContent =
    karte.vorderseite || "Keine Vorderseite vorhanden.";

  document.getElementById("kartenRueckseiteText").textContent =
    karte.rueckseite || "Keine Rückseite vorhanden.";

  document.getElementById("kartenRueckseite").style.display = "none";
}

function karteUmdrehen() {
  const rueckseite = document.getElementById("kartenRueckseite");

  if (!karteikartenDaten.length) return;

  rueckseite.style.display =
    rueckseite.style.display === "none" ? "block" : "none";
}

function naechsteKarteAnzeigen() {
  if (!karteikartenDaten.length) return;

  aktuelleKartenIndex++;

  if (aktuelleKartenIndex >= karteikartenDaten.length) {
    aktuelleKartenIndex = 0;
  }

  zeigeAktuelleKarte();
}

function vorherigeKarte() {
  if (!karteikartenDaten.length) return;

  aktuelleKartenIndex--;

  if (aktuelleKartenIndex < 0) {
    aktuelleKartenIndex = karteikartenDaten.length - 1;
  }

  zeigeAktuelleKarte();
}
    function audioAktuelleKarte() {
  if (!karteikartenDaten.length) {
    document.getElementById("audioStatus").textContent =
      "Bitte zuerst Karteikarten laden.";
    return;
  }

  if (!("speechSynthesis" in window)) {
    document.getElementById("audioStatus").textContent =
      "Dein Browser unterstützt die Vorlesefunktion leider nicht.";
    return;
  }

  const karte = karteikartenDaten[aktuelleKartenIndex];

  const text =
    "Frage. " +
    String(karte.vorderseite || "") +
    ". Musterlösung. " +
    String(karte.rueckseite || "");

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  utterance.onstart = function() {
    document.getElementById("audioStatus").textContent =
      "Audio läuft: Karte " + (aktuelleKartenIndex + 1) + " von " + karteikartenDaten.length;
  };

  utterance.onend = function() {
    document.getElementById("audioStatus").textContent =
      "Audio beendet.";
  };

  utterance.onerror = function() {
    document.getElementById("audioStatus").textContent =
      "Audio konnte nicht abgespielt werden.";
  };

  window.speechSynthesis.speak(utterance);
}

function audioStoppen() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  document.getElementById("audioStatus").textContent =
    "Audio gestoppt.";
}
    
async function frageKilian() {
  const frage = document.getElementById("kilianInput").value.trim();

  if (!frage) {
    alert("Bitte zuerst eine Frage eingeben.");
    return;
  }

  try {
    document.getElementById("kilianStatus").textContent = "Kilian denkt nach.";
    document.getElementById("kilianAntwort").textContent = "Antwort wird geladen.";

    const kilianResult = await apiPost("frageKilian", {
      frage: frage
    });

    if (!kilianResult.success) {
      throw new Error(kilianResult.error || "Fehler bei der Anfrage.");
    }

    document.getElementById("kilianAntwort").innerHTML =
      formatKilianAntwort(kilianResult.data?.antwort || "Keine Antwort erhalten.");

    document.getElementById("kilianStatus").textContent = "Antwort erhalten.";

  } catch (error) {
    document.getElementById("kilianStatus").textContent =
      "Fehler: " + error.message;
  }
}
    
function kilianLeeren() {
  document.getElementById("kilianInput").value = "";

  document.getElementById("kilianAntwort").textContent =
    "Hier erscheint die Antwort von Kilian.";

  document.getElementById("kilianStatus").textContent =
    "Kilian wartet auf deine Frage.";
}
    async function ladeFormelsammlung() {
  if (appIstBeschaeftigt) return;

  try {
    setzeAppBeschaeftigt(true);

    const status = document.getElementById("formelStatus");
    const liste = document.getElementById("formelListe");

    status.textContent = "Formelsammlung wird geladen...";
    liste.className = "result-list-empty";
    liste.innerHTML = "Bitte kurz warten...";

    const result = await apiGet("getFormelsammlung");

    if (!result.success) {
      throw new Error(result.error || "Formelsammlung konnte nicht geladen werden.");
    }

    formelDaten = result.data || [];

    if (!formelDaten.length) {
      status.textContent = "Keine aktiven Formeln gefunden.";
      liste.className = "result-list-empty";
      liste.innerHTML = "Im Sheet „Formelsammlung“ wurden keine aktiven Formeln gefunden.";
      return;
    }

    baueFormelFilter();
    resetFormelFilter();

  } catch (error) {
    document.getElementById("formelStatus").textContent =
      "Fehler beim Laden: " + error.message;
  } finally {
    setzeAppBeschaeftigt(false);
  }
}

    const pruefungsEinheitenNachTeilbereich = {
  WQ: [
    { key: "VWL/BWL", label: "VWL/BWL", zeit: 75, punkte: 100 },
    { key: "Rechnungswesen", label: "Rechnungswesen", zeit: 90, punkte: 100 },
    { key: "Recht und Steuern", label: "Recht und Steuern", zeit: 75, punkte: 100 },
    { key: "Unternehmensführung", label: "Unternehmensführung", zeit: 90, punkte: 100 }
  ],
  HQ: [
    {
      key: "HQ_A1",
      label: "Aufgabenstellung 1 – Betriebliches Management | Marketing | Führung und Zusammenarbeit",
      zeit: 240,
      punkte: 100
    },
    {
      key: "HQ_A2",
      label: "Aufgabenstellung 2 – Investition, Finanzierung, Rechnungswesen und Controlling | Logistik | Vertrieb",
      zeit: 240,
      punkte: 100
    }
  ]
};

function pruefungTeilbereichWaehlen() {
  const teilbereich = document.getElementById("pruefungTeilbereichSelect").value;
  const simulationBereich = document.getElementById("pruefungSimulationBereich");
  const simulationSelect = document.getElementById("pruefungSimulationSelect");
  const fachBereich = document.getElementById("pruefungFachBereich");
  const fachSelect = document.getElementById("pruefungFachSelect");

  simulationSelect.innerHTML = '<option value="">-- Simulation wählen --</option>';
  fachSelect.innerHTML = '<option value="">-- Prüfungsfach wählen --</option>';

  fachBereich.style.display = "none";
  document.getElementById("pruefungContainer").innerHTML = "";

  if (!teilbereich) {
    simulationBereich.style.display = "none";
    document.getElementById("pruefungStatus").textContent =
      "Bitte zuerst einen Teilbereich auswählen.";
    return;
  }

  for (let i = 1; i <= 4; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = "Simulation " + i;
    simulationSelect.appendChild(option);
  }

  simulationBereich.style.display = "block";
  document.getElementById("pruefungStatus").textContent =
    "Teilbereich gewählt. Bitte Simulation auswählen.";
}

function pruefungSimulationWaehlen() {
  const teilbereich = document.getElementById("pruefungTeilbereichSelect").value;
  const simulation = document.getElementById("pruefungSimulationSelect").value;
  const fachBereich = document.getElementById("pruefungFachBereich");
  const fachSelect = document.getElementById("pruefungFachSelect");

  fachSelect.innerHTML = '<option value="">-- Prüfungsfach wählen --</option>';
  document.getElementById("pruefungContainer").innerHTML = "";

  if (!teilbereich || !simulation) {
    fachBereich.style.display = "none";
    document.getElementById("pruefungStatus").textContent =
      "Bitte Simulation auswählen.";
    return;
  }

const einheiten = pruefungsEinheitenNachTeilbereich[teilbereich] || [];
  einheiten.forEach(function(eintrag) {
  const option = document.createElement("option");
  option.value = eintrag.key;
  option.textContent =
    eintrag.label + " – " + eintrag.zeit + " Minuten – " + eintrag.punkte + " Punkte";
  option.dataset.zeit = eintrag.zeit;
  option.dataset.punkte = eintrag.punkte;
  fachSelect.appendChild(option);
});

  fachBereich.style.display = "block";
  document.getElementById("pruefungStatus").textContent =
    "Simulation gewählt. Bitte Prüfungsfach auswählen.";
}

function startePruefungSimulation() {
  const teilbereich = document.getElementById("pruefungTeilbereichSelect").value;
  const simulation = document.getElementById("pruefungSimulationSelect").value;
  const fach = document.getElementById("pruefungFachSelect").value;

  if (!teilbereich) {
    alert("Bitte zuerst einen Teilbereich auswählen.");
    return;
  }

  if (!simulation) {
    alert("Bitte zuerst eine Simulation auswählen.");
    return;
  }

  if (!fach) {
    alert("Bitte zuerst ein Prüfungsfach auswählen.");
    return;
  }

  ladePruefungSimulation();
}
function ermittlePruefungsEinheitTitel(teilbereich, einheitKey) {
  const einheiten = pruefungsEinheitenNachTeilbereich[teilbereich] || [];
  const einheit = einheiten.find(function(item) {
    return String(item.key) === String(einheitKey);
  });

  if (!einheit) return einheitKey;

  if (String(einheit.key) === "HQ_A1") return "Aufgabenstellung 1";
  if (String(einheit.key) === "HQ_A2") return "Aufgabenstellung 2";

  return einheit.label || einheit.key;
}
   async function ladePruefungSimulation() {
  const box = document.getElementById("pruefungContainer");

  box.innerHTML = "<div class='status'>Prüfung wird geladen...</div>";

  try {
    const teilbereich = document.getElementById("pruefungTeilbereichSelect").value;
    const simulation = document.getElementById("pruefungSimulationSelect").value;
    const einheit = document.getElementById("pruefungFachSelect").value;

    const response = await fetch(
      API_BASE_URL
      + "?action=getPruefungSimulation"
      + "&teilbereich=" + encodeURIComponent(teilbereich)
      + "&simulation=" + encodeURIComponent(simulation)
      + "&einheit=" + encodeURIComponent(einheit)
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Fehler");
    }

    const daten = result.data || [];
    aktuellePruefungsDaten = daten;

    const fachSelect = document.getElementById("pruefungFachSelect");
    const gewaehlteOption = fachSelect.options[fachSelect.selectedIndex];
    const minuten = Number(gewaehlteOption?.dataset?.zeit || 0);

    if (minuten > 0) {
      startePruefungTimer(minuten);
    }

    if (!daten.length) {
      box.innerHTML = "<div class='status'>Keine Prüfung gefunden.</div>";
      return;
    }

       let html = "";
    let letzteAufgabe = "";

    const hauptSituation = String(
      daten.find(function(item) {
        return String(item.hauptsituation || "").trim();
      })?.hauptsituation || ""
    ).trim();

    if (teilbereich === "HQ" && hauptSituation) {
      html += `
        <div class="card" style="margin-bottom:18px;">

          <h2 class="section-title">
            ${escapeHtml(ermittlePruefungsEinheitTitel(teilbereich, einheit))}
          </h2>

          <div style="
            background:#f4ecff;
            padding:16px;
            border-radius:14px;
            line-height:1.7;
            white-space:pre-wrap;
          ">
            ${escapeHtml(hauptSituation)}
          </div>

        </div>
      `;
    }

    daten.forEach(function(item, index) {
      const fragetyp = String(item.fragetyp || "text").trim().toLowerCase();
      const aufgabenHtml = String(item.aufgabenHtml || item.aufgabenHTML || "").trim();

      if (letzteAufgabe !== "" && letzteAufgabe !== item.aufgabe) {
        html += `</div>`;
      }

      if (letzteAufgabe !== item.aufgabe) {
        html += `
          <div class="card" style="margin-bottom:18px;">
            <h2 style="margin-bottom:10px;">
              Aufgabe ${escapeHtml(item.aufgabe)}
            </h2>

            <div style="
              background:#f4ecff;
              padding:14px;
              border-radius:12px;
              margin-bottom:16px;
              line-height:1.6;
            ">
              ${escapeHtml(item.situation)}
            </div>
        `;

        letzteAufgabe = item.aufgabe;
      }

      html += `
        <div style="
          border:1px solid #ddd;
          border-radius:12px;
          padding:14px;
          margin-bottom:14px;
        ">

          <div style="
            font-weight:700;
            margin-bottom:8px;
          ">
            ${escapeHtml(item.teilaufgabe)})
            (${escapeHtml(item.punkte)} Punkte)
          </div>

          <div style="
            margin-bottom:12px;
            line-height:1.6;
          ">
            ${item.frage}
          </div>

          ${bauePruefungsZusatzbereich(item, index)}

          <textarea
            class="input pruefung-antwort"
            rows="6"
            placeholder="Deine schriftliche Ergänzung..."
            data-index="${index}"
            data-fragetyp="${escapeHtml(fragetyp)}"
            data-simulation-id="${escapeHtml(item.simulationId)}"
            data-aufgabe="${escapeHtml(item.aufgabe)}"
            data-teilaufgabe="${escapeHtml(item.teilaufgabe)}"
            data-fach="${escapeHtml(item.fach)}"
            data-thema="${escapeHtml(item.thema)}"
            data-punkte="${escapeHtml(item.punkte)}"
            data-frage="${escapeHtml(item.frage)}"
            data-musterloesung="${escapeHtml(item.musterloesung)}"
            data-stichpunkte="${escapeHtml(item.stichpunkte)}"
          ></textarea>

        </div>
      `;
    });

    html += `</div>`;
    box.innerHTML = html;

    initialisiereAlleSkizzenfelder();

  } catch (error) {
    box.innerHTML = "<div class='status'>Fehler: " + escapeHtml(error.message || error) + "</div>";
  }
}
    function bauePruefungsZusatzbereich(item, index) {
  const fragetyp = String(item.fragetyp || "text").trim().toLowerCase();
  const aufgabenHtml = String(item.aufgabenHtml || item.aufgabenHTML || "").trim();

  if (fragetyp === "diagramm") {
    return `
      <div class="pruefung-zusatzbereich">
        <strong>Skizzenbereich:</strong>
        <div class="skizzen-toolbar">
          <button type="button" onclick="zeichneAchsenvorlage(${index})">Achsenvorlage</button>
          <button type="button" onclick="loescheSkizze(${index})">Skizze löschen</button>
        </div>
        <canvas class="skizzen-canvas" id="skizze-${index}" width="760" height="420"></canvas>
      </div>
    `;
  }

  if (fragetyp === "tabelle" && aufgabenHtml) {
    return `
      <div class="pruefung-zusatzbereich">
        <strong>Tabellen-/Aufgabenstruktur:</strong>
        <div>${aufgabenHtml}</div>
      </div>
    `;
  }

  if ((fragetyp === "rechnung" || fragetyp === "formel") && aufgabenHtml) {
    return `
      <div class="pruefung-zusatzbereich">
        <strong>Rechen-/Formelstruktur:</strong>
        <div>${aufgabenHtml}</div>
      </div>
    `;
  }

  return "";
}

function initialisiereAlleSkizzenfelder() {
  document.querySelectorAll(".skizzen-canvas").forEach(function(canvas) {
    initialisiereSkizzenCanvas(canvas);
  });
}

function initialisiereSkizzenCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  let zeichnet = false;

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#111111";

  function position(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches && event.touches[0];

    const clientX = touch ? touch.clientX : event.clientX;
    const clientY = touch ? touch.clientY : event.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function start(event) {
    event.preventDefault();
    zeichnet = true;

    const pos = position(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function zeichnen(event) {
    if (!zeichnet) return;
    event.preventDefault();

    const pos = position(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopp(event) {
    if (!zeichnet) return;
    event.preventDefault();
    zeichnet = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", zeichnen);
  canvas.addEventListener("mouseup", stopp);
  canvas.addEventListener("mouseleave", stopp);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", zeichnen, { passive: false });
  canvas.addEventListener("touchend", stopp, { passive: false });
}

function loescheSkizze(index) {
  const canvas = document.getElementById("skizze-" + index);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function zeichneAchsenvorlage(index) {
  const canvas = document.getElementById("skizze-" + index);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#111111";
  ctx.fillStyle = "#111111";
  ctx.font = "18px Arial";

  ctx.beginPath();
  ctx.moveTo(80, 360);
  ctx.lineTo(720, 360);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(80, 360);
  ctx.lineTo(80, 40);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(720, 360);
  ctx.lineTo(700, 350);
  ctx.moveTo(720, 360);
  ctx.lineTo(700, 370);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(80, 40);
  ctx.lineTo(70, 60);
  ctx.moveTo(80, 40);
  ctx.lineTo(90, 60);
  ctx.stroke();

  ctx.fillText("Preis", 25, 45);
  ctx.fillText("Menge", 690, 395);
}
function baueFormelFilter() {
  const themaSelect = document.getElementById("formelThemaFilter");

  const faecher = [...new Set(formelDaten.map(function(eintrag) {
    return String(eintrag.fach || "").trim();
  }).filter(Boolean))].sort();

  themaSelect.innerHTML = '<option value="">Alle Fächer</option>';

  faecher.forEach(function(fach) {
    const option = document.createElement("option");
    option.value = fach;
    option.textContent = fach;
    themaSelect.appendChild(option);
  });
}

function resetFormelFilter() {
  document.getElementById("formelSuche").value = "";
  document.getElementById("formelThemaFilter").value = "";

  document.getElementById("formelStatus").textContent =
    formelDaten.length + " Formeln geladen.";

  renderFormeln(formelDaten);
}

function filtereFormeln() {
  const suche = String(document.getElementById("formelSuche").value || "").trim().toLowerCase();
  const themaFilter = String(document.getElementById("formelThemaFilter").value || "").trim().toLowerCase();

  if (!formelDaten.length) {
    document.getElementById("formelListe").className = "result-list-empty";
    document.getElementById("formelListe").innerHTML = "Formelsammlung wird noch geladen.";
    return;
  }

  const treffer = formelDaten.filter(function(eintrag) {
    const kapitelAnzeige = eintrag.unterkapitel
      ? String(eintrag.kapitel || "") + " / " + String(eintrag.unterkapitel || "")
      : String(eintrag.kapitel || "");

    const suchText = [
      eintrag.fach,
      eintrag.kapitel,
      eintrag.unterkapitel,
      eintrag.formelname,
      eintrag.ihkSeite,
      eintrag.ihkFormel,
      eintrag.variablen,
      eintrag.erklaerung,
      eintrag.beispiel
    ].join(" ").toLowerCase();

    const passtZurSuche = !suche || suchText.includes(suche);
const passtZumThema = !themaFilter || String(eintrag.fach || "").toLowerCase() === themaFilter;
    return passtZurSuche && passtZumThema;
  });

  document.getElementById("formelStatus").textContent =
    treffer.length + " passende Formeln gefunden.";

  renderFormeln(treffer);
}

function renderFormeln(daten) {
  const liste = document.getElementById("formelListe");

  if (!daten.length) {
    liste.className = "result-list-empty";
    liste.innerHTML = "Keine passenden Formeln gefunden.";
    return;
  }

  liste.className = "";
  liste.innerHTML = daten.map(function(eintrag) {
    const kapitelAnzeige = eintrag.unterkapitel
      ? escapeHtml(eintrag.kapitel) + " / " + escapeHtml(eintrag.unterkapitel)
      : escapeHtml(eintrag.kapitel);

    return `
      <div class="result-mini-entry">
        <div class="result-mini-head">
          <div class="result-mini-title">${escapeHtml(eintrag.formelname)}</div>
          <div class="result-mini-score">IHK S. ${escapeHtml(eintrag.ihkSeite || "-")}</div>
        </div>

        <div class="result-mini-footer">
          <span><strong>Fach:</strong> ${escapeHtml(eintrag.fach)}</span>
          <span><strong>Kapitel:</strong> ${kapitelAnzeige}</span>
        </div>

        <div style="font-size:16px; line-height:1.6; color:#2d1f46; margin-top:10px;">
          <strong>IHK-Formel:</strong><br>
          ${escapeHtml(eintrag.ihkFormel)}
        </div>

        <div style="font-size:14px; line-height:1.6; color:#4a3970; margin-top:10px;">
          <strong>Variablen / Kürzel:</strong><br>
          ${escapeHtml(eintrag.variablen || "keine hinterlegt")}
        </div>

        <div style="font-size:14px; line-height:1.6; color:#4a3970; margin-top:10px;">
          <strong>Kurz-Erklärung:</strong><br>
          ${escapeHtml(eintrag.erklaerung || "keine Erklärung hinterlegt")}
        </div>

        <div style="font-size:14px; line-height:1.6; color:#4a3970; margin-top:10px;">
          <strong>Beispiel:</strong><br>
          ${escapeHtml(eintrag.beispiel || "kein Beispiel hinterlegt")}
        </div>
      </div>
    `;
  }).join("");
}

 function toggleKilianBubble() {
  const fenster = document.getElementById("kilianBubbleFenster");

  fenster.style.display =
    fenster.style.display === "block" ? "none" : "block";
}

async function frageKilianBubble() {
  const frage = document.getElementById("kilianBubbleInput").value.trim();

  if (!frage) {
    alert("Bitte zuerst eine Frage eingeben.");
    return;
  }

  try {
    document.getElementById("kilianBubbleStatus").textContent =
      "Kilian denkt nach...";

    document.getElementById("kilianBubbleAntwort").innerHTML =
      "Antwort wird geladen...";

    const result = await apiPost("frageKilian", {
      frage: frage
    });

    if (!result.success) {
      throw new Error(result.error || "Fehler bei der Anfrage.");
    }

    const antwort =
      result.data?.antwort || "Keine Antwort erhalten.";

    document.getElementById("kilianBubbleAntwort").innerHTML =
      formatKilianAntwort(antwort);

    document.getElementById("kilianBubbleStatus").textContent =
      "Antwort erhalten.";

  } catch (error) {
    document.getElementById("kilianBubbleStatus").textContent =
      "Fehler: " + error.message;
  }
}

function kilianBubbleVorlesen() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const text =
    document.getElementById("kilianBubbleAntwort").textContent;

  if (!text.trim()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "de-DE";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

function kilianBubbleAudioStoppen() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}  
    function startePruefungTimer(minuten) {

stoppePruefungTimer();
      
  pruefungRestzeitSekunden = minuten * 60;

  const timerBox =
    document.getElementById("pruefungTimerBox");

  const timerText =
    document.getElementById("pruefungTimerText");

timerBox.style.display = "block";
  aktualisierePruefungTimerAnzeige();

  pruefungTimerInterval = setInterval(function() {

    pruefungRestzeitSekunden--;

    aktualisierePruefungTimerAnzeige();

   if (pruefungRestzeitSekunden <= 0) {
  pruefungBeendenWegenZeitablauf();
}
  }, 1000);
}
function pruefungBeendenWegenZeitablauf() {
  clearInterval(pruefungTimerInterval);
  pruefungTimerInterval = null;
  pruefungRestzeitSekunden = 0;

  document.getElementById("pruefungTimerText").textContent =
    "Zeit abgelaufen";

  document.querySelectorAll("#pruefungContainer textarea").forEach(function(textarea) {
    textarea.disabled = true;
    textarea.style.background = "#f3f4f6";
    textarea.style.cursor = "not-allowed";
  });

  document.querySelectorAll("#pruefungContainer button").forEach(function(button) {
    button.disabled = true;
    button.style.opacity = "0.6";
    button.style.cursor = "not-allowed";
  });

  document.getElementById("pruefungTimerStatus").textContent =
    "Die Bearbeitungszeit ist abgelaufen. Die Prüfung wurde gesperrt.";

  document.getElementById("pruefungStatus").textContent =
    "Prüfung beendet: Zeit abgelaufen.";
}
    function pruefungManuellAbgeben() {

  const bestaetigt = confirm(
    "Möchtest du die Prüfung wirklich abgeben?"
  );

  if (!bestaetigt) {
    return;
  }

  clearInterval(pruefungTimerInterval);

  document.querySelectorAll(
    "#pruefungContainer textarea"
  ).forEach(function(textarea) {

    textarea.disabled = true;
    textarea.style.background = "#f3f4f6";
  });

  document.getElementById("pruefungStatus").textContent =
    "Prüfung manuell abgegeben.";

  document.getElementById("pruefungTimerText").textContent =
    "Prüfung beendet";
      startePruefungsAuswertung();
}
    function renderPruefungsAuswertung(data) {
  const gesamtPunkte = Number(data.gesamtPunkte || 0);
  const gesamtMaxPunkte = Number(data.gesamtMaxPunkte || 0);

  const prozent =
    gesamtMaxPunkte > 0
      ? Math.round((gesamtPunkte / gesamtMaxPunkte) * 100)
      : 0;

  const bestanden = prozent >= 50;

  let html = `
    <div class="card">
      <h2 class="section-title">Prüfungsauswertung</h2>

      <div class="stat-value">
        ${gesamtPunkte} / ${gesamtMaxPunkte} Punkte
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${prozent}%;"></div>
      </div>

      <div class="status">
        Ergebnis: <strong>${prozent}%</strong><br>
        Status:
        <strong style="color:${bestanden ? "#16a34a" : "#dc2626"};">
          ${bestanden ? "BESTANDEN" : "NICHT BESTANDEN"}
        </strong>
      </div>
    </div>
  `;

  const aufgaben = data.aufgaben || [];

  if (aufgaben.length) {
    html += `
      <div class="card">
        <h2 class="section-title">Einzelbewertung</h2>
    `;

    aufgaben.forEach(function(item, index) {
      const eigeneAntwort = letztePruefungsAntworten.find(function(eintrag) {
        return String(eintrag.aufgabe) === String(item.aufgabe)
          && String(eintrag.teilaufgabe) === String(item.teilaufgabe);
      }) || {};

      const musterloesung =
        item.musterloesung ||
        eigeneAntwort.musterloesung ||
        "Keine Musterlösung hinterlegt.";

      html += `
        <div class="result-mini-entry">

          <div class="result-mini-head">
            <div class="result-mini-title">
              Aufgabe ${escapeHtml(item.aufgabe)}${escapeHtml(item.teilaufgabe)}
            </div>

            <div class="result-mini-score">
              ${Number(item.punkte || 0)} / ${Number(item.maxPunkte || 0)} Punkte
            </div>
          </div>

          <div style="font-size:13px; line-height:1.5; color:#5a4a80;">

            <strong>Deine Antwort:</strong><br>
            ${escapeHtml(eigeneAntwort.antwort || "keine schriftliche Ergänzung")}

            <br><br>

            ${eigeneAntwort.skizze ? `
              <strong>Deine Skizze:</strong><br>

              <img
                src="${eigeneAntwort.skizze}"
                style="
                  max-width:100%;
                  border:1px solid #d8c8f8;
                  border-radius:12px;
                  margin:8px 0 14px 0;
                "
              >

              <br>
            ` : ""}

            <button
              class="secondary-btn"
              type="button"
              onclick="togglePruefungsMusterloesung(${index})"
              style="margin-top:10px;"
            >
              Musterlösung anzeigen
            </button>

            <div
              class="solution-box"
              id="pruefungMusterloesung-${index}"
              style="display:none; margin-top:12px;"
            >
              <strong>Musterlösung:</strong><br>
              ${escapeHtml(musterloesung)}
            </div>

          </div>

        </div>
      `;
    });

    html += `</div>`;
  }

  document.getElementById("pruefungStatus").innerHTML =
    "Prüfung abgeschlossen.";

  document.getElementById("pruefungContainer").innerHTML += html;
}
    function togglePruefungsMusterloesung(index) {
  const box = document.getElementById("pruefungMusterloesung-" + index);
  if (!box) return;

  box.style.display =
    box.style.display === "none" ? "block" : "none";
}
    function stoppePruefungTimer() {

  clearInterval(pruefungTimerInterval);

  pruefungTimerInterval = null;

  pruefungRestzeitSekunden = 0;

  document.getElementById("pruefungTimerText").textContent =
    "00:00";

  document.getElementById("pruefungTimerBox").style.display =
    "none";
}
    
function aktualisierePruefungTimerAnzeige() {

  const minuten =
    Math.floor(pruefungRestzeitSekunden / 60);

  const sekunden =
    pruefungRestzeitSekunden % 60;

  document.getElementById("pruefungTimerText").textContent =
    String(minuten).padStart(2, "0")
    + ":"
    + String(sekunden).padStart(2, "0");
}
    function toggleTrainerDropdown(event) {
  event.stopPropagation();

  const dropdown = document.getElementById("navTrainer").closest(".dropdown");
  dropdown.classList.toggle("open");
}

document.addEventListener("click", function() {
  document.querySelectorAll(".dropdown.open").forEach(function(dropdown) {
    dropdown.classList.remove("open");
  });
});
   async function startePruefungsAuswertung() {
  try {
    const antworten = document.querySelectorAll("#pruefungContainer textarea.pruefung-antwort");
    const daten = [];

    antworten.forEach(function(textarea) {
      const aufgabenBlock = textarea.closest("div");

      const tabellenFelder = aufgabenBlock
        ? aufgabenBlock.querySelectorAll(".pruefung-input")
        : [];

      let tabellenAntwort = "";

      if (tabellenFelder.length) {
        const tabellenWerte = [];

tabellenFelder.forEach(function(feld, index) {

    const wert = String(feld.value || "").trim();

    if (wert) {

        const zeile = feld.closest("tr");
        let zeilenTitel = "";

        if (zeile) {
            const ersteZelle = zeile.querySelector("td");

            zeilenTitel = ersteZelle
                ? ersteZelle.textContent.trim()
                : "";
        }

        tabellenWerte.push(
            (zeilenTitel
                ? zeilenTitel + " = " + wert
                : "Tabellenfeld " + (index + 1) + " = " + wert)
        );
    }
});

        if (tabellenWerte.length) {
          tabellenAntwort =
            "Tabelleneingaben:\n- " +
            tabellenWerte.join("\n- ");
        }
      }

      const freieAntwort = String(textarea.value || "").trim();

      let kompletteAntwort = "";

      if (tabellenAntwort && freieAntwort) {
        kompletteAntwort = tabellenAntwort + "\n\nSchriftliche Ergänzung:\n" + freieAntwort;
      } else if (tabellenAntwort) {
        kompletteAntwort = tabellenAntwort;
      } else {
        kompletteAntwort = freieAntwort;
      }

      const simulationId = textarea.dataset.simulationId || "";
      const aufgabe = textarea.dataset.aufgabe || "";
      const teilaufgabe = textarea.dataset.teilaufgabe || "";

      const passendeAufgabe = aktuellePruefungsDaten.find(function(item) {
        return String(item.simulationId) === String(simulationId)
          && String(item.aufgabe) === String(aufgabe)
          && String(item.teilaufgabe) === String(teilaufgabe);
      });

      const index = textarea.dataset.index || "";
      const fragetyp = textarea.dataset.fragetyp || "text";
      let skizze = "";

      if (fragetyp === "diagramm") {
        const canvas = document.getElementById("skizze-" + index);
        if (canvas) {
          skizze = canvas.toDataURL("image/png");
        }
      }

      daten.push({
        simulationId: simulationId,
        aufgabe: aufgabe,
        teilaufgabe: teilaufgabe,
        fach: textarea.dataset.fach || "",
        thema: textarea.dataset.thema || "",
        frage: textarea.dataset.frage || "",
        fragetyp: fragetyp,
        musterloesung: textarea.dataset.musterloesung || "",
        stichpunkte: textarea.dataset.stichpunkte || "",
        maxPunkte: Number(
          textarea.dataset.punkte
          || passendeAufgabe?.punkte
          || 0
        ),
        antwort: kompletteAntwort,
        skizze: skizze
      });
    });

    letztePruefungsAntworten = daten;

    document.getElementById("pruefungStatus").textContent =
      "Prüfungsauswertung läuft...";

    const bewertung = await bewertePruefungsAntworten(daten);

    console.log("Bewertung:", bewertung);

    if (!bewertung || bewertung.success !== true) {
      throw new Error(bewertung?.error || "Unbekannter Fehler bei der Prüfungsauswertung.");
    }

    renderPruefungsAuswertung(bewertung.data || {});

  } catch (error) {
    document.getElementById("pruefungStatus").textContent =
      "Fehler bei der Prüfungsauswertung: " + error.message;

    alert("Fehler bei der Prüfungsauswertung:\n\n" + error.message);
  }
}
    async function bewertePruefungsAntworten(daten) {

  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "bewertePruefung",
      daten: daten
    })
  });

  return await response.json();
}
    function togglePruefungDropdown(event) {
  event.stopPropagation();

  const dropdown =
    document.getElementById("navPruefung").closest(".dropdown");

  dropdown.classList.toggle("open");
}

function oeffnePruefungMitTeilbereich(teilbereich) {
  zeigeBereich("pruefungView");

  const select =
    document.getElementById("pruefungTeilbereichSelect");

  select.value = teilbereich;

  pruefungTeilbereichWaehlen();
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.max(42, el.scrollHeight) + "px";

  const td = el.closest("td");
  const tr = el.closest("tr");

  if (td) {
    td.style.height = "auto";
    td.style.verticalAlign = "top";
  }

  if (tr) {
    tr.style.height = "auto";
  }
}

document.addEventListener("input", function(e) {
  if (
    e.target.tagName === "TEXTAREA" ||
    e.target.classList.contains("pruefung-input")
  ) {
    autoResizeTextarea(e.target);
  }
});

window.addEventListener("load", function() {
  document.querySelectorAll("textarea, .pruefung-input").forEach(function(el) {
    autoResizeTextarea(el);
  });
});

