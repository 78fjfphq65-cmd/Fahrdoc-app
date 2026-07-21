// ══════════════════════════════════════════════════════════════════
//  FAHRDOC · TEXTBAUSTEINE
//  Kuratierte Bausteine für schnelle Notizen bei Bewertungen und
//  Karten-Markierungen. Kontextabhängig pro Bewertungs-Item.
//
//  Namen der Items müssen 1:1 zu OBSERVATION_CATEGORIES /
//  GRUNDFAHRAUFGABEN_B / GRUNDFAHRAUFGABEN_A / FAHRAUFGABEN_VERKEHR
//  in app.js passen (unicode-sicher, keine Sonderzeichen-Drift).
// ══════════════════════════════════════════════════════════════════
(function(global) {
  'use strict';

  // Bausteine pro Bewertungs-Item.
  // Jeder Eintrag = kurzer Satz oder Kernbegriff. Klick fügt Baustein
  // ins Textarea ein — mehrere Bausteine werden mit "; " verbunden.
  var ITEM_BAUSTEINE = {
    // ── Beobachtungskategorien ──
    'Verkehrsbeobachtung': [
      'Schulterblick vergessen',
      'Rückspiegel zu selten geprüft',
      'Seitenspiegel nicht genutzt',
      'Kreuzungsverkehr zu spät erkannt',
      'Fußgänger übersehen',
      'Radfahrer übersehen',
      'Aufmerksamkeit gut, Rundumblick systematisch',
      'Verkehr vorausschauend erfasst'
    ],
    'Fahrzeugpositionierung': [
      'Zu weit rechts an der Bordsteinkante',
      'Zu weit links, Gegenverkehr zu nah',
      'Spurhaltung unsicher, pendelt',
      'Zu nah aufgefahren, Sicherheitsabstand zu gering',
      'Positionierung vor Abbiegen zu spät',
      'Fahrzeugposition sauber und mittig',
      'Abstand zum Vordermann korrekt'
    ],
    'Geschwindigkeitsanpassung': [
      'Zu schnell für die Situation',
      'Zu langsam, behindert Verkehrsfluss',
      'Geschwindigkeit vor Kurve nicht reduziert',
      'Innerorts über 50 gefahren',
      'Bremsbereitschaft fehlte',
      'Geschwindigkeit gut an Verkehr angepasst',
      'Beschleunigung dosiert und flüssig'
    ],
    'Kommunikation': [
      'Blinker vergessen',
      'Blinker zu spät gesetzt',
      'Blinker nach Manöver nicht deaktiviert',
      'Handzeichen wäre hier hilfreich gewesen',
      'Lichthupe/Hupe unpassend eingesetzt',
      'Klare Kommunikation mit anderen Verkehrsteilnehmern'
    ],
    'Fahrzeugbedienung/Umweltbewusste Fahrweise': [
      'Ruckeliges Kuppeln',
      'Motor abgewürgt',
      'Zu hohe Drehzahl beim Schalten',
      'Vorausschauendes Fahren fehlt',
      'Bremsen statt Rollen lassen',
      'Bedienung ruhig und routiniert',
      'Kraftstoffsparend gefahren'
    ],

    // ── Grundfahraufgaben (Klasse B) ──
    'Abbremsen mit höchstmöglicher Verzögerung': [
      'Bremsweg zu lang',
      'Nicht vollständig zum Stehen gekommen',
      'Kupplung zu früh getreten',
      'Blockierende Räder trotz ABS',
      'Bremsung entschlossen und sicher',
      'Ruhige Fahrzeugkontrolle beim Notbremsen'
    ],
    'Rückwärtsfahren mit Abbiegen': [
      'Bordstein berührt',
      'Zu weiter Bogen, Fahrbahn verlassen',
      'Zu enger Bogen, kein Nachlenken',
      'Rundumblick fehlt beim Rückwärtsfahren',
      'Sauber am Bordstein entlang',
      'Kontrolliert und gleichmäßig zurückgesetzt'
    ],
    'Umkehren': [
      'Zu viele Züge benötigt',
      'Bordstein berührt',
      'Verkehrsbeobachtung fehlt zwischen den Zügen',
      'Fahrbahn nicht vollständig freigemacht',
      'Wendemanöver flüssig und in wenigen Zügen'
    ],
    'Einparken längs': [
      'Zu weit von der Bordsteinkante entfernt',
      'Bordsteinberührung',
      'Zu viele Korrekturen',
      'Endposition schief',
      'Sauber, in einem Zug, korrekter Abstand'
    ],
    'Einparken quer': [
      'Schief im Parkfeld',
      'Über der Markierung',
      'Zu viele Korrekturen',
      'Rundumblick beim Einlenken fehlte',
      'Präzise mittig eingeparkt'
    ],

    // ── Grundfahraufgaben (Klasse A/Motorrad) ──
    'Slalom mit Schrittgeschwindigkeit': [
      'Fuß abgesetzt',
      'Pylon berührt',
      'Zu schnell, kein Slalomrhythmus',
      'Sauber im Schritttempo durchgezogen'
    ],
    'Ausweichen ohne Abbremsen': [
      'Zu spät gelenkt',
      'Pylon berührt',
      'Nach Ausweichen nicht stabilisiert',
      'Klar und sauber ausgewichen'
    ],
    'Ausweichen nach Abbremsen': [
      'Zu schwach gebremst',
      'Blockiert und stürzt fast',
      'Ausweichbewegung unsicher',
      'Kombination gut gemeistert'
    ],
    'Slalom': [
      'Rhythmus verloren',
      'Pylon berührt',
      'Sauberer Slalom in gutem Tempo'
    ],
    'Langer Slalom': [
      'Rhythmus im hinteren Bereich verloren',
      'Pylon berührt',
      'Konzentriert durchgezogen'
    ],
    'Fahren mit Schrittgeschwindigkeit geradeaus': [
      'Fuß abgesetzt',
      'Zu schnell, Aufgabe nicht erfüllt',
      'Stabil im Schritttempo'
    ],
    'Stop and Go': [
      'Motor abgewürgt',
      'Zu ruckelig',
      'Kontrollierter Anhalte- und Anfahrvorgang'
    ],
    'Kreisfahrt': [
      'Zu weiter Radius',
      'Pylon berührt',
      'Enge Kreisfahrt stabil gemeistert'
    ],

    // ── Fahraufgaben im Straßenverkehr ──
    'Kurven befahren': [
      'Zu schnell in die Kurve',
      'Zu weit ausgeschert',
      'Zu weit geschnitten',
      'Blick zu kurz, nicht in die Kurve',
      'Sauber angebremst, Kurve stabil gezogen',
      'Kurventempo gut gewählt'
    ],
    'Vorbeifahren / Überholen / Begegnen': [
      'Sicherheitsabstand zu Radfahrer/Fußgänger zu gering',
      'Gegenverkehr nicht abgewartet',
      'Überholverbot missachtet',
      'Wiedereinscheren zu früh',
      'Klar und mit ausreichendem Abstand vorbeigefahren'
    ],
    'Abbiegen / Kreuzungen / Einmündungen': [
      'Blinker vergessen',
      'Vorfahrt missachtet',
      'Blick nach links zu kurz',
      'Zu schnell eingebogen',
      'Halten an Stopp-Linie unpräzise',
      'Sauber eingeordnet, klar geblinkt, sicher abgebogen'
    ],
    'Kreisverkehr': [
      'Blinker beim Ausfahren vergessen',
      'Beim Einfahren geblinkt (falsch)',
      'Vorfahrt nicht beachtet',
      'Zu schnell im Kreis',
      'Sauber ein- und ausgefahren'
    ],
    'Fahrstreifenwechsel': [
      'Schulterblick vergessen',
      'Blinker vergessen',
      'Abrupt statt fließend gewechselt',
      'Vor Wechsel nicht beschleunigt',
      'Sauber und rechtzeitig gewechselt'
    ],
    'Autobahn / Kraftfahrstraße': [
      'Zu langsam auf Beschleunigungsstreifen',
      'Ohne ausreichende Beschleunigung eingefädelt',
      'Rechtsfahrgebot missachtet',
      'Abstand zum Vordermann zu gering',
      'Blinker beim Wechseln vergessen',
      'Autobahn sicher und regelkonform gefahren'
    ],
    'Bahnübergang': [
      'Nicht ausreichend Blick nach beiden Seiten',
      'Zu schnell überquert',
      'Anhalten vor rotem Licht/Andreaskreuz unpräzise',
      'Sicher und mit angepasstem Tempo passiert'
    ],
    'Haltestellen / Fußgängerüberwege': [
      'Bushaltestelle: Verkehr um Bus nicht beachtet',
      'Zebrastreifen: Fußgänger nicht die Vorfahrt gelassen',
      'Zu schnell an Haltestelle vorbei',
      'Angehalten für Fußgänger, Schulterblick beim Anfahren',
      'Vorsichtig und regelkonform passiert'
    ]
  };

  // Allgemeine Bausteine für Karten-Markierungen (kein Item-Bezug).
  // Kategorisiert für schnelle Auswahl auf der Karte.
  var MARKER_BAUSTEINE = {
    'Geschwindigkeit': [
      'Zu schnell für die Situation',
      'Innerorts über 50',
      'Zu schnell in Kurve',
      'Beschleunigung zu ruckartig',
      'Zu langsam, Verkehrsfluss behindert'
    ],
    'Positionierung': [
      'Zu weit rechts',
      'Zu weit links',
      'Zu nah aufgefahren',
      'Falsche Spur',
      'Spurwechsel ohne Schulterblick'
    ],
    'Beobachtung': [
      'Schulterblick vergessen',
      'Spiegel nicht genutzt',
      'Kreuzungsverkehr zu spät erkannt',
      'Fußgänger übersehen',
      'Radfahrer übersehen'
    ],
    'Vorfahrt & Regeln': [
      'Vorfahrt missachtet',
      'Stopp-Linie überfahren',
      'Rote Ampel zu spät erkannt',
      'Rechtsfahrgebot missachtet',
      'Überholverbot ignoriert'
    ],
    'Kommunikation': [
      'Blinker vergessen',
      'Blinker zu spät',
      'Blinker nicht ausgeschaltet',
      'Handzeichen fehlte'
    ],
    'Fahrzeugbedienung': [
      'Motor abgewürgt',
      'Ruckeliges Kuppeln',
      'Zu hohe Drehzahl',
      'Bremsen statt Rollen'
    ],
    'Positiv': [
      'Sicher und souverän gemeistert',
      'Sehr gute Verkehrsbeobachtung',
      'Vorausschauende Fahrweise',
      'Klare Kommunikation'
    ]
  };

  // API
  global.FahrdocBausteine = {
    // Bausteine für ein konkretes Bewertungs-Item (kontextabhängig).
    forItem: function(itemName) {
      return (ITEM_BAUSTEINE[itemName] || []).slice();
    },
    // Bausteine für Karten-Markierungen (nach Kategorien gruppiert).
    forMarker: function() {
      return MARKER_BAUSTEINE;
    },
    // Verfügbar für Debug/Tests.
    _all: ITEM_BAUSTEINE
  };
})(typeof window !== 'undefined' ? window : this);
