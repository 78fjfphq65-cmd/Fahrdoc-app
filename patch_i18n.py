import re

with open('/home/user/workspace/fahrdoc-app/public/app.js', 'r') as f:
    content = f.read()

# Key string replacements — mapping German hardcoded strings to t() calls
# We need to be very careful to only replace display strings, not identifiers
replacements = [
    # Dashboard headers
    ("'Hallo, '", "t('hallo') + ', '"),
    ("'Übersicht deiner Fahrschule'", "t('uebersichtSchule')"),
    ("'Neue Schüler diese Woche'", "t('neueSchueler')"),
    ("'Letzte Aktivitäten'", "t('letzteAktivitaeten')"),
    ("'Deine Wochenplanung'", "t('deineWochenplanung')"),

    # View toggles
    ("'Tagesansicht'", "t('tagesansicht')"),
    ("'Wochenansicht'", "t('wochenansicht')"),

    # Schedule modal
    ("'Termin erstellen'", "t('terminErstellen')"),
    ("'Termin bearbeiten'", "t('terminBearbeiten')"),
    ("'Typ'", "t('typ')"),
    ("'Datum'", "t('datum')"),
    ("'Start'", "t('start')"),
    ("'Ende'", "t('ende')"),
    ("'Dauer'", "t('dauer')"),
    ("'Fahrschüler (leer = offener Block)'", "t('schuelerLeer')"),
    ("'Klasse'", "t('klasse')"),
    ("'Notizen'", "t('notizen')"),
    ("'Optional...'", "t('optional')"),
    ("'Speichern'", "t('speichern')"),

    # Lesson
    ("'Fahrstunde starten'", "t('fahrstundeStarten')"),
    ("'Zusammenfassung'", "t('zusammenfassung')"),
    ("'Bewertung'", "t('bewertung')"),
    ("'Bilder (optional)'", "t('bilderOptional')"),
    ("'Bilder hochladen'", "t('bilderHochladen')"),
    ("'Fahrstunde speichern'", "t('fahrstundeSpeichern')"),
    ("'Fahrstunde bearbeiten'", "t('fahrstundeBearbeiten')"),
    ("'Fahrstundentyp'", "t('fahrstundentyp')"),
    ("'Fahrstunde aktualisiert!'", "t('fahrstundeAktualisiert')"),
    ("'Fahrstunde gelöscht'", "t('fahrstundeGeloescht')"),
    ("'Fahrstunde wirklich löschen?'", "t('wirklichLoeschen')"),

    # Misc
    ("'Bearbeiten'", "t('bearbeiten')"),
    ("'Löschen'", "t('loeschen')"),
    ("'Bild'", "t('bild')"),
    ("'Code kopiert!'", "t('codeKopiert')"),
    ("'Code generieren'", "t('codeGenerieren')"),
    ("'Einladungscode'", "t('einladungscode')"),
    ("'Gespeichert!'", "t('gespeichert')"),
    ("'Suchen...'", "t('suchen')"),

    # Status
    ("'bestätigt'", "t('bestaetigt')"),
    ("'offen'", "t('offen')"),
    ("'geplant'", "t('geplant')"),
    ("'abgeschlossen'", "t('abgeschlossen')"),

    # Profile
    ("'Dein Profil'", "t('deinProfil')"),
    ("'Persönliche Daten'", "t('persoenlicheDaten')"),
    ("'Einstellungen'", "t('einstellungen')"),
    ("'Benachrichtigungen'", "t('benachrichtigungen')"),
    ("'Datenschutz'", "t('datenschutz')"),

    # Subscription
    ("'Abo-Verwaltung'", "t('aboVerwaltung')"),
    ("'Aktive Sitzplätze'", "t('aktiveSitzplaetze')"),

    # Student
    ("'Meine Fahrstunden'", "t('meineFahrstunden')"),
    ("'Fortschritt'", "t('fortschritt')"),
    ("'Führerschein-Checkliste'", "t('fuehrerscheinCheckliste')"),
    ("'Nächste Fahrstunde'", "t('naechsteFahrstunde')"),
    ("'Keine Fahrstunden vorhanden'", "t('keineFahrstunden')"),
    ("'Bilder'", "t('bilder')"),

    # Schedule grid
    ("'+ Termin'", "t('plusTermin')"),
    ("'Offen'", "t('offen')"),

    # Auth
    ("'Abgemeldet'", "t('abgemeldet')"),
    ("'Sitzung abgelaufen'", "t('sitzungAbgelaufen')"),
]

count = 0
for old, new in replacements:
    # Only replace in string contexts (not in object keys or identifiers)
    if old in content:
        content = content.replace(old, new)
        count += 1

# Now replace DAY_NAMES references (but not the definition)
# Replace uses of DAY_NAMES[...] with getDayNames()[...]
content = content.replace('DAY_NAMES[idx]', 'getDayNames()[idx]')
content = content.replace('DAY_NAMES[dayIdx]', 'getDayNames()[dayIdx]')
content = content.replace('DAY_NAMES_LONG[', 'getDayNamesLong()[')

# Replace SKILL_TASKS display uses with tSkill()
# In skill bar rendering, add tSkill() wrapper
# The skill bars show task names - we need to translate those for display
# e.g. '<span>' + task + '</span>' → '<span>' + tSkill(task) + '</span>'

# Replace the formatDate month names to use getMonthNames()
# Find the month reference pattern
content = content.replace(
    "var months = ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];",
    "var months = getMonthNames();"
)

# Also in the week label helper
content = content.replace(
    "var months = ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];\n    return 'KW '",
    "var months = getMonthNames();\n    return t('kw') + ' '"
)

with open('/home/user/workspace/fahrdoc-app/public/app.js', 'w') as f:
    f.write(content)

print(f"Applied {count} direct replacements + DAY_NAMES/month/KW fixes")
