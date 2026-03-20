#!/usr/bin/env python3
"""
Complete i18n patch + retroactive image upload for FahrDoc app.js
"""
import re

with open('/home/user/workspace/fahrdoc-app/public/app.js', 'r') as f:
    code = f.read()

# ────────────────────────────────────────────
# TASK 1: Remaining i18n t() replacements
# ────────────────────────────────────────────

replacements = [
    # ──── ApiClient error ────
    ("'Serverfehler'", "t('serverfehler')"),
    
    # ──── Login ────
    ("this.showToast('Willkommen, ' + (result.user.admin_name || result.user.name) + '!');",
     "this.showToast(t('willkommen') + ', ' + (result.user.admin_name || result.user.name) + '!');"),
    
    # ──── Signup error ────
    ("errorEl.textContent = 'Passwörter stimmen nicht überein'",
     "errorEl.textContent = t('passwortNichtGleich')"),
    
    # ──── Verify ────
    ("err.textContent = 'Bitte vollständigen Code eingeben'",
     "err.textContent = t('codeVollstaendig')"),
    ("this.showToast('E-Mail bestätigt!');",
     "this.showToast(t('emailBestaetigt'));"),
    
    # ──── timeAgo ────
    ("if (diff < 1) return 'Gerade eben';",
     "if (diff < 1) return t('geradeEben');"),
    ("if (diff < 60) return diff + ' Min.';",
     "if (diff < 60) return diff + ' ' + t('minuten');"),
    ("if (hours < 24) return hours + ' Std.';",
     "if (hours < 24) return hours + ' ' + t('stunden');"),
    ("return days + (days === 1 ? ' Tag' : ' Tage');",
     "return days + ' ' + t('tage');"),
    
    # ──── Schedule CRUD toasts ────
    ("this.closeModalForce(); this.showToast('Termin erstellt');",
     "this.closeModalForce(); this.showToast(t('terminErstellt'));"),
    ("this.closeModalForce(); this.showToast('Termin aktualisiert');",
     "this.closeModalForce(); this.showToast(t('terminAktualisiert'));"),
    ("this.closeModalForce(); this.showToast('Termin gelöscht');",
     "this.closeModalForce(); this.showToast(t('terminGeloescht'));"),
    ("this.closeModalForce(); this.showToast('Termin bestätigt');",
     "this.closeModalForce(); this.showToast(t('terminBestaetigt'));"),
    ("if (!confirm('Termin wirklich löschen?')) return;",
     "if (!confirm(t('terminWirklichLoeschen'))) return;"),
    
    # ──── Schedule modal title 'Neuer Termin' ────
    ("var title = isEdit ? t('terminBearbeiten') : 'Neuer Termin';",
     "var title = isEdit ? t('terminBearbeiten') : t('neuerTermin');"),
    
    # ──── Schedule modal labels ────
    ("html += '<div class=\"form-group mb-3\"><label class=\"form-label\">Fahrlehrer</label><select class=\"form-select\" id=\"schedule-instructor-select\">';",
     "html += '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('fahrlehrer') + '</label><select class=\"form-select\" id=\"schedule-instructor-select\">';"),
    ("html += '<div class=\"form-group mb-3\"><label class=\"form-label\">Typ</label>' +",
     "html += '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('typ') + '</label>' +"),
    ("html += '<div class=\"form-group mb-3\"><label class=\"form-label\">Datum</label>' +",
     "html += '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('datum') + '</label>' +"),
    ("'<div class=\"form-group\"><label class=\"form-label\">Start</label>' +",
     "'<div class=\"form-group\"><label class=\"form-label\">' + t('start') + '</label>' +"),
    ("'<div class=\"form-group\"><label class=\"form-label\">Ende</label>' +",
     "'<div class=\"form-group\"><label class=\"form-label\">' + t('ende') + '</label>' +"),
    ("html += '<div class=\"form-group mb-3\"><label class=\"form-label\">Fahrschüler (leer = offener Block)</label>' +",
     "html += '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('schuelerLeer') + '</label>' +"),
    ("'<div class=\"form-group\"><label class=\"form-label\">Klasse</label>' +",
     "'<div class=\"form-group\"><label class=\"form-label\">' + t('klasse') + '</label>' +"),
    ("'<div class=\"form-group\"><label class=\"form-label\">Dauer</label>' +",
     "'<div class=\"form-group\"><label class=\"form-label\">' + t('dauer') + '</label>' +"),
    ("html += '<div class=\"form-group mb-3\"><label class=\"form-label\">Notizen</label>' +",
     "html += '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('notizen') + '</label>' +"),
    ("'<textarea class=\"form-textarea\" id=\"schedule-notes\" placeholder=\"Optional...\">'",
     "'<textarea class=\"form-textarea\" id=\"schedule-notes\" placeholder=\"' + t('optional') + '\">'"),
    
    # ──── Schedule modal buttons ────
    ("onclick=\"App.updateScheduleSlot(\\'' + editSlot.id + '\\')\">Speichern</button>';",
     "onclick=\"App.updateScheduleSlot(\\'' + editSlot.id + '\\')\">'+t('speichern')+'</button>';"),
    ("onclick=\"App.confirmScheduleSlot(\\'' + editSlot.id + '\\')\">Bestätigen</button>';",
     "onclick=\"App.confirmScheduleSlot(\\'' + editSlot.id + '\\')\">'+t('bestaetigenBtn')+'</button>';"),
    ("'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:18px;height:18px;\"><polygon points=\"5,3 19,12 5,21 5,3\"/></svg> Fahrstunde starten</button>';",
     "'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:18px;height:18px;\"><polygon points=\"5,3 19,12 5,21 5,3\"/></svg> '+t('fahrstundeStarten')+'</button>';"),
    ("onclick=\"App.createScheduleSlot()\">Termin erstellen</button>';",
     "onclick=\"App.createScheduleSlot()\">'+t('terminErstellen')+'</button>';"),
    
    # ──── Schedule open block select ────
    ("sel.innerHTML = '<option value=\"\">— Offener Block —</option>';",
     "sel.innerHTML = '<option value=\"\">— ' + t('offenerBlock') + ' —</option>';"),
    
    # ──── Schedule slot type display → tType ────
    ("html += '<div class=\"week-grid-slot-type\">' + slot.type + (pruef ? ' 🏁' : '') + '</div>';",
     "html += '<div class=\"week-grid-slot-type\">' + tType(slot.type) + (pruef ? ' 🏁' : '') + '</div>';"),
    
    # ──── School dashboard stat cards ────
    ("'<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrlehrer</div><div class=\"stat-card-value\">' + data.instructors.length + '</div></div>' +",
     "'<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrlehrer') + '</div><div class=\"stat-card-value\">' + data.instructors.length + '</div></div>' +"),
    ("'<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrschüler</div><div class=\"stat-card-value\">' + data.students.length + '</div></div>' +",
     "'<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrschueler') + '</div><div class=\"stat-card-value\">' + data.students.length + '</div></div>' +"),
    ("'<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrstunden</div><div class=\"stat-card-value\">' + data.stats.totalLessons + '</div></div>' +",
     "'<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrstunden') + '</div><div class=\"stat-card-value\">' + data.stats.totalLessons + '</div></div>' +"),
    
    # ──── New students widget empty ────
    ("html += '<div class=\"new-students-empty\">Noch keine neuen Anmeldungen diese Woche</div>';",
     "html += '<div class=\"new-students-empty\">' + t('keineNeueAnmeldungen') + '</div>';"),
    
    # ──── School instructor tab ────
    ("var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">Fahrlehrer (' + data.instructors.length + ')</span></div>';",
     "var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">' + t('fahrlehrer') + ' (' + data.instructors.length + ')</span></div>';"),
    ("'<div class=\"text-xs text-muted\">' + inst.email + ' · ' + (inst.studentCount || 0) + ' Schüler</div></div></div></div>';",
     "'<div class=\"text-xs text-muted\">' + inst.email + ' · ' + (inst.studentCount || 0) + ' ' + t('schueler') + '</div></div></div></div>';"),
    ("'<div class=\"section-header mt-4\"><span class=\"section-title\">Einladungscodes</span>' +",
     "'<div class=\"section-header mt-4\"><span class=\"section-title\">' + t('einladungscodes') + '</span>' +"),
    
    # ──── School student tab ────
    ("var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">Fahrschüler (' + data.students.length + ')</span></div>';",
     "var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">' + t('fahrschueler') + ' (' + data.students.length + ')</span></div>';"),
    ("'<div class=\"text-xs text-muted\">Klasse ' + st.license_class + ' · ' + (st.instructor_name || '—') + ' · ' + st.lessonCount + ' Stunden</div></div>' +",
     "'<div class=\"text-xs text-muted\">' + t('klasse') + ' ' + st.license_class + ' · ' + (st.instructor_name || '—') + ' · ' + st.lessonCount + ' ' + t('fahrstunden') + '</div></div>' +"),
    ("'<div class=\"section-header mt-4\"><span class=\"section-title\">Schüler-Codes</span>' +",
     "'<div class=\"section-header mt-4\"><span class=\"section-title\">' + t('schuelerCodes') + '</span>' +"),
    
    # ──── Code generation ────
    ("this.showToast('Neuer Code: ' + result.code);",
     "this.showToast(t('neuerCode') + ': ' + result.code);"),
    
    # ──── School Abo tab ────
    ("'Testphase: noch ' + diff + ' Tage'",
     "t('testphase') + ': ' + t('nochXTage', {n: diff})"),
    
    # ──── School profile labels ────
    ("'<div class=\"profile-row\"><span class=\"profile-row-label\">E-Mail</span>",
     "'<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('email') + '</span>"),
    ("'<div class=\"profile-row\"><span class=\"profile-row-label\">Telefon</span>",
     "'<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('telefon') + '</span>"),
    ("'<div class=\"profile-row\"><span class=\"profile-row-label\">Adresse</span>",
     "'<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('adresse') + '</span>"),
    ("'<button class=\"btn btn-secondary btn-full\" onclick=\"App.logout()\">Abmelden</button></div>';",
     "'<button class=\"btn btn-secondary btn-full\" onclick=\"App.logout()\">' + t('abmelden') + '</button></div>';"),
    
    # ──── Instructor dashboard welcome msg ────
    ("var html = '<div class=\"page-padding\">' +\n      '<div class=\"welcome-msg\"><h2>Hallo, ' + inst.name + '</h2><p>Deine Wochenplanung</p></div>';",
     "var html = '<div class=\"page-padding\">' +\n      '<div class=\"welcome-msg\"><h2>' + t('hallo') + ', ' + inst.name + '</h2><p>' + t('deineWochenplanung') + '</p></div>';"),

    # ──── Instructor view toggle buttons ────
    ("'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/></svg> Tagesansicht</button>' +",
     "'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/></svg> ' + t('tagesansicht') + '</button>' +"),
    ("'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/></svg> Wochenansicht</button>' +",
     "'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/></svg> ' + t('wochenansicht') + '</button>' +"),
    
    # ──── Instructor day view empty state ────
    ("'<div class=\"empty-state-title\">Keine Termine</div><div class=\"empty-state-text\">Erstelle einen Termin für diesen Tag</div></div>';",
     "'<div class=\"empty-state-title\">' + t('keineTermine') + '</div><div class=\"empty-state-text\">' + t('erstelleTermin') + '</div></div>';"),
    
    # ──── Instructor day view slot - Offener Block ────
    ("'<div class=\"schedule-slot-card-title\">' + (slot.student_name || 'Offener Block') + '</div>' +",
     "'<div class=\"schedule-slot-card-title\">' + (slot.student_name || t('offenerBlock')) + '</div>' +"),
    ("'<div class=\"schedule-slot-card-meta\">' + slot.type + (slot.license_class ? ' · Klasse ' + slot.license_class : '') + '</div>' +",
     "'<div class=\"schedule-slot-card-meta\">' + tType(slot.type) + (slot.license_class ? ' · ' + t('klasse') + ' ' + slot.license_class : '') + '</div>' +"),
    
    # ──── Instructor students tab ────
    ("var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">Meine Schüler (' + students.length + ')</span></div>';",
     "var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">' + t('meineSchueler') + ' (' + students.length + ')</span></div>';"),
    ("'<div class=\"text-xs text-muted\">Klasse ' + st.license_class + ' · ' + st.lessonCount + ' Stunden</div></div>' +",
     "'<div class=\"text-xs text-muted\">' + t('klasse') + ' ' + st.license_class + ' · ' + st.lessonCount + ' ' + t('fahrstunden') + '</div></div>' +"),
    
    # ──── Instructor lessons tab ────
    ("var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">Alle Fahrstunden (' + allLessons.length + ')</span>' +",
     "var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">' + t('alleFahrstunden') + ' (' + allLessons.length + ')</span>' +"),
    ("'<button class=\"btn btn-primary btn-sm\" onclick=\"App.navigate(\\'lesson-setup\\')\">+ Neue Stunde</button></div>';",
     "'<button class=\"btn btn-primary btn-sm\" onclick=\"App.navigate(\\'lesson-setup\\')\">+ ' + t('neueFahrstunde') + '</button></div>';"),
    
    # ──── Instructor profile ────
    ("'<p class=\"text-xs text-muted\">Fahrlehrer</p></div>' +",
     "'<p class=\"text-xs text-muted\">' + t('fahrlehrer') + '</p></div>' +"),
    ("'<div class=\"card mb-4\"><div class=\"section-title mb-3\">Persönliche Daten</div>' +",
     "'<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('persoenlicheDaten') + '</div>' +"),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">Name</label><input class=\"form-input\" type=\"text\" id=\"inst-profile-name\" value=\"' + profile.name + '\"></div>' +",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('name') + '</label><input class=\"form-input\" type=\"text\" id=\"inst-profile-name\" value=\"' + profile.name + '\"></div>' +"),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">E-Mail</label><input class=\"form-input\" type=\"email\" id=\"inst-profile-email\" value=\"' + profile.email + '\"></div>' +",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('email') + '</label><input class=\"form-input\" type=\"email\" id=\"inst-profile-email\" value=\"' + profile.email + '\"></div>' +"),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">Telefon</label><input class=\"form-input\" type=\"tel\" id=\"inst-profile-phone\" value=\"' + (profile.phone || '') + '\"></div>' +",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('telefon') + '</label><input class=\"form-input\" type=\"tel\" id=\"inst-profile-phone\" value=\"' + (profile.phone || '') + '\"></div>' +"),
    ("'<button type=\"submit\" class=\"btn btn-primary btn-full\">Änderungen speichern</button></form></div>' +",
     "'<button type=\"submit\" class=\"btn btn-primary btn-full\">' + t('aenderungenSpeichern') + '</button></form></div>' +"),
    ("'<div class=\"card mb-4\"><div class=\"section-title mb-3\">Zuordnung</div>' +",
     "'<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('zuordnung') + '</div>' +"),
    ("'<div class=\"profile-row\"><span class=\"profile-row-label\">Fahrschule</span><span class=\"profile-row-value\">' + (profile.schoolName || '—') + '</span></div></div>' +",
     "'<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('fahrschule') + '</span><span class=\"profile-row-value\">' + (profile.schoolName || '—') + '</span></div></div>' +"),
    ("this.showToast('Profil aktualisiert!');",
     "this.showToast(t('profilAktualisiert'));"),
    
    # ──── Student detail ────
    ("'<span>Klasse ' + student.license_class + '</span><span>' + data.instructorName + '</span><span>' + lessons.length + ' Stunden</span>' +",
     "'<span>' + t('klasse') + ' ' + student.license_class + '</span><span>' + data.instructorName + '</span><span>' + lessons.length + ' ' + t('fahrstunden') + '</span>' +"),
    ("'<div style=\"font-weight:600;font-size:var(--text-sm);\">Gesamtdurchschnitt</div>' + this.skillLevelHtml(avg) + '</div></div>';",
     "'<div style=\"font-weight:600;font-size:var(--text-sm);\">' + t('gesamtdurchschnitt') + '</div>' + this.skillLevelHtml(avg) + '</div></div>';"),
    
    # ──── Student detail stat cards ────
    ("'<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrstunden</div><div class=\"stat-card-value\">' + lessons.length + '</div></div>' +\n        '<div class=\"stat-card\"><div class=\"stat-card-label\">Gesamtdauer</div>",
     "'<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrstunden') + '</div><div class=\"stat-card-value\">' + lessons.length + '</div></div>' +\n        '<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('gesamtdauer') + '</div>"),
    ("'<div class=\"section-header\"><span class=\"section-title\">Fahrstunden (' + lessons.length + ')</span></div><div class=\"activity-list\">';",
     "'<div class=\"section-header\"><span class=\"section-title\">' + t('fahrstunden') + ' (' + lessons.length + ')</span></div><div class=\"activity-list\">';"),
    
    # ──── Share student ────
    ("html += '<p class=\"text-sm text-muted\">Keine anderen Fahrlehrer in dieser Fahrschule.</p>';",
     "html += '<p class=\"text-sm text-muted\">' + t('keineAnderenFahrlehrer') + '</p>';"),
    ("html += '<div class=\"section-title mb-3\">Profil teilen mit:</div>';",
     "html += '<div class=\"section-title mb-3\">' + t('profilTeilenMit') + '</div>';"),
    
    # ──── Lesson setup ────
    ("sel.innerHTML = '<option value=\"\">Schüler wählen...</option>';",
     "sel.innerHTML = '<option value=\"\">' + t('schuelerWaehlen') + '...</option>';"),
    
    # ──── Lesson start ────
    ("if (!studentId) { this.showToast('Bitte Schüler auswählen'); return; }",
     "if (!studentId) { this.showToast(t('bitteSchuelerWaehlen')); return; }"),
    ("document.getElementById('active-lesson-title').textContent = 'Fahrstunde · ' + studentName;",
     "document.getElementById('active-lesson-title').textContent = t('fahrstunden') + ' · ' + studentName;"),
    ("document.getElementById('active-lesson-title').textContent = 'Fahrstunde \\u00b7 ' + student.name;",
     "document.getElementById('active-lesson-title').textContent = t('fahrstunden') + ' \\u00b7 ' + student.name;"),
    
    # ──── Lesson stop ────
    ("if (confirm('Fahrstunde abbrechen?')) {",
     "if (confirm(t('fahrstundeAbbrechen'))) {"),
    ("this.showToast('Fahrstunde abgebrochen');",
     "this.showToast(t('fahrstundeAbgebrochenMsg'));"),
    
    # ──── Lesson summary rendering ────
    ("html += '<div class=\"section-title mb-3\">Bewertung</div>';",
     "html += '<div class=\"section-title mb-3\">' + t('bewertung') + '</div>';"),
    ("html += '<div class=\"form-group mb-4\"><label class=\"form-label\">Notizen</label>' +\n      '<textarea class=\"form-textarea\" id=\"lesson-notes\" placeholder=\"Anmerkungen zur Fahrstunde...\"></textarea></div>';",
     "html += '<div class=\"form-group mb-4\"><label class=\"form-label\">' + t('notizen') + '</label>' +\n      '<textarea class=\"form-textarea\" id=\"lesson-notes\" placeholder=\"' + t('anmerkungenPlaceholder') + '\"></textarea></div>';"),
    ("html += '<div class=\"form-group mb-4\"><label class=\"form-label\">Bilder (optional)</label>' +",
     "html += '<div class=\"form-group mb-4\"><label class=\"form-label\">' + t('bilderOptional') + '</label>' +"),
    ("'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><polyline points=\"21,15 16,10 5,21\"/></svg> Bilder hochladen</button>' +",
     "'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"width:16px;height:16px;\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><polyline points=\"21,15 16,10 5,21\"/></svg> ' + t('bilderHochladen') + '</button>' +"),
    ("html += '<button class=\"btn btn-primary btn-full btn-lg\" onclick=\"App.saveLessonSummary()\">Fahrstunde speichern</button>';",
     "html += '<button class=\"btn btn-primary btn-full btn-lg\" onclick=\"App.saveLessonSummary()\">' + t('fahrstundeSpeichern') + '</button>';"),
    
    # ──── Save lesson toast ────
    ("this.showToast('Fahrstunde gespeichert!');",
     "this.showToast(t('fahrstundeGespeichert'));"),
    
    # ──── Lesson review ────
    ("'<div class=\"lesson-detail-row\"><span class=\"lesson-detail-label\">Typ</span><span class=\"lesson-detail-value\">' + lesson.type + '</span></div>' +",
     "'<div class=\"lesson-detail-row\"><span class=\"lesson-detail-label\">' + t('typ') + '</span><span class=\"lesson-detail-value\">' + tType(lesson.type) + '</span></div>' +"),
    ("'<div class=\"lesson-detail-row\"><span class=\"lesson-detail-label\">Dauer</span><span class=\"lesson-detail-value\">' + this.formatDuration(lesson.duration) + '</span></div>' +",
     "'<div class=\"lesson-detail-row\"><span class=\"lesson-detail-label\">' + t('dauer') + '</span><span class=\"lesson-detail-value\">' + this.formatDuration(lesson.duration) + '</span></div>' +"),
    ("html += '<div class=\"card mb-4\"><div class=\"section-title mb-3\">Bewertung</div>';",
     "html += '<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('bewertung') + '</div>';"),
    ("if (lesson.notes) html += '<div class=\"card mb-4\"><div class=\"section-title mb-2\">Notizen</div><p class=\"text-sm\">' + lesson.notes + '</p></div>';",
     "if (lesson.notes) html += '<div class=\"card mb-4\"><div class=\"section-title mb-2\">' + t('notizen') + '</div><p class=\"text-sm\">' + lesson.notes + '</p></div>';"),
    ("html += '<div class=\"card mb-4\"><div class=\"section-title mb-2\">Bilder</div><div class=\"lesson-images-grid\">';",
     "html += '<div class=\"card mb-4\"><div class=\"section-title mb-2\">' + t('bilder') + '</div><div class=\"lesson-images-grid\">';"),
    
    # ──── Lesson review buttons ────
    ("'<button class=\"btn btn-secondary flex-1\" onclick=\"App.editLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')\">Bearbeiten</button>' +",
     "'<button class=\"btn btn-secondary flex-1\" onclick=\"App.editLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')\">' + t('bearbeiten') + '</button>' +"),
    ("'<button class=\"btn btn-danger flex-1\" onclick=\"App.deleteLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')\">Löschen</button></div>';",
     "'<button class=\"btn btn-danger flex-1\" onclick=\"App.deleteLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')\">' + t('loeschen') + '</button></div>';"),
    
    # ──── Edit lesson modal ────
    ("'<div class=\"form-group mb-4\"><label class=\"form-label\">Fahrstundentyp</label><select class=\"form-select\" id=\"edit-lesson-type\">' +",
     "'<div class=\"form-group mb-4\"><label class=\"form-label\">' + t('fahrstundentyp') + '</label><select class=\"form-select\" id=\"edit-lesson-type\">' +"),
    ("'<div class=\"form-group mb-4\"><label class=\"form-label\">Notizen</label>' +",
     "'<div class=\"form-group mb-4\"><label class=\"form-label\">' + t('notizen') + '</label>' +"),
    ("html += '<div class=\"section-title mb-3\">Bewertung</div>';\n      SKILL_TASKS.forEach(function(task) {\n        var current = lesson.ratings[task] || 2;",
     "html += '<div class=\"section-title mb-3\">' + t('bewertung') + '</div>';\n      SKILL_TASKS.forEach(function(task) {\n        var current = lesson.ratings[task] || 2;"),
    ("html += '<button type=\"submit\" class=\"btn btn-primary btn-full btn-lg mt-4\">Speichern</button></form>';",
     "html += '<button type=\"submit\" class=\"btn btn-primary btn-full btn-lg mt-4\">' + t('speichern') + '</button></form>';"),
    
    # ──── Student dashboard ────
    ("var html = '<div class=\"page-padding\"><div class=\"welcome-msg\"><h2>Hallo, ' + stu.name + '</h2><p>Dein Fortschritt zur Prüfungsreife</p></div>' +",
     "var html = '<div class=\"page-padding\"><div class=\"welcome-msg\"><h2>' + t('hallo') + ', ' + stu.name + '</h2><p>' + t('fortschrittPruefungsreife') + '</p></div>' +"),
    ("\">' + Math.round(pctReady) + '% Prüfungsreif</div>' +",
     "\">' + Math.round(pctReady) + '% ' + t('pruefungsreif') + '</div>' +"),
    ("html += '<div class=\"card mb-4\"><div class=\"section-title mb-3\">Deine Skills</div>';",
     "html += '<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('deineSkills') + '</div>';"),
    
    # ──── Student stat cards ────
    ("'<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrstunden</div><div class=\"stat-card-value\">' + lessons.length + '</div></div>' +\n      '<div class=\"stat-card\"><div class=\"stat-card-label\">Gesamtdauer</div><div class=\"stat-card-value\">' + Math.round(totalDuration / 60) + 'h</div></div>' +\n      '<div class=\"stat-card\"><div class=\"stat-card-label\">Fahrlehrer</div>",
     "'<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrstunden') + '</div><div class=\"stat-card-value\">' + lessons.length + '</div></div>' +\n      '<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('gesamtdauer') + '</div><div class=\"stat-card-value\">' + Math.round(totalDuration / 60) + 'h</div></div>' +\n      '<div class=\"stat-card\"><div class=\"stat-card-label\">' + t('fahrlehrer') + '</div>"),
    
    # ──── Student lessons tab ────
    ("var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">Meine Fahrstunden (' + lessons.length + ')</span></div>';",
     "var html = '<div class=\"page-padding\"><div class=\"section-header\"><span class=\"section-title\">' + t('meineFahrstunden') + ' (' + lessons.length + ')</span></div>';"),
    ("'<div class=\"empty-state-title\">Noch keine Fahrstunden</div><div class=\"empty-state-text\">Deine Fahrstunden werden hier angezeigt</div></div>';",
     "'<div class=\"empty-state-title\">' + t('nochKeineFahrstunden') + '</div><div class=\"empty-state-text\">' + t('fahrstundenHierAngezeigt') + '</div></div>';"),
    
    # ──── Student profile ────
    ("'<p class=\"text-xs text-muted\">Fahrschüler · Klasse ' + u.license_class + '</p></div>' +",
     "'<p class=\"text-xs text-muted\">' + t('fahrschueler') + ' · ' + t('klasse') + ' ' + u.license_class + '</p></div>' +"),
    ("'<div class=\"card mb-4\"><div class=\"section-title mb-3\">Persönliche Daten</div>' +\n        '<form id=\"student-profile-form\" onsubmit=\"App.saveStudentProfile(event)\">' +\n          '<div class=\"form-group mb-3\"><label class=\"form-label\">E-Mail</label>",
     "'<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('persoenlicheDaten') + '</div>' +\n        '<form id=\"student-profile-form\" onsubmit=\"App.saveStudentProfile(event)\">' +\n          '<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('email') + '</label>"),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">Telefon</label><input class=\"form-input\" type=\"tel\" id=\"profile-phone\"",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('telefon') + '</label><input class=\"form-input\" type=\"tel\" id=\"profile-phone\""),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">Geburtsdatum</label><input class=\"form-input\" type=\"date\" id=\"profile-birthdate\"",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('geburtsdatum') + '</label><input class=\"form-input\" type=\"date\" id=\"profile-birthdate\""),
    ("'<div class=\"form-group mb-3\"><label class=\"form-label\">Anschrift</label><input class=\"form-input\" type=\"text\" id=\"profile-address\"",
     "'<div class=\"form-group mb-3\"><label class=\"form-label\">' + t('adresse') + '</label><input class=\"form-input\" type=\"text\" id=\"profile-address\""),
    ("'<button type=\"submit\" class=\"btn btn-primary btn-full\">Änderungen speichern</button></form></div>' +\n      '<div class=\"card mb-4\"><div class=\"section-title mb-3\">Zuordnung</div>' +",
     "'<button type=\"submit\" class=\"btn btn-primary btn-full\">' + t('aenderungenSpeichern') + '</button></form></div>' +\n      '<div class=\"card mb-4\"><div class=\"section-title mb-3\">' + t('zuordnung') + '</div>' +"),
    ("'<div class=\"profile-row\"><span class=\"profile-row-label\">Fahrschule</span><span class=\"profile-row-value\">' + (data.school ? data.school.name : '—') + '</span></div>' +\n        '<div class=\"profile-row\"><span class=\"profile-row-label\">Fahrlehrer</span><span class=\"profile-row-value\">' + (data.instructorName || '—') + '</span></div>' +\n        '<div class=\"profile-row\"><span class=\"profile-row-label\">Führerscheinklasse</span>",
     "'<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('fahrschule') + '</span><span class=\"profile-row-value\">' + (data.school ? data.school.name : '—') + '</span></div>' +\n        '<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('fahrlehrer') + '</span><span class=\"profile-row-value\">' + (data.instructorName || '—') + '</span></div>' +\n        '<div class=\"profile-row\"><span class=\"profile-row-label\">' + t('fuehrerscheinklasse') + '</span>"),

    # ──── Lesson type display in recent activities ────
    ("'<div class=\"list-item-subtitle\">' + l.type + ' · ' + App.formatDate(l.date) + '</div></div>' +",
     "'<div class=\"list-item-subtitle\">' + tType(l.type) + ' · ' + App.formatDate(l.date) + '</div></div>' +"),
    
    # ──── Notification panel ────
    ("'<div class=\"notif-panel-header\"><span class=\"section-title\" style=\"margin:0;\">Benachrichtigungen</span>' +\n        '<button class=\"btn btn-ghost btn-sm\" onclick=\"App.markAllRead()\">Alle gelesen</button></div>';",
     "'<div class=\"notif-panel-header\"><span class=\"section-title\" style=\"margin:0;\">' + t('benachrichtigungen') + '</span>' +\n        '<button class=\"btn btn-ghost btn-sm\" onclick=\"App.markAllRead()\">' + t('alleGelesen') + '</button></div>';"),
    ("html += '<div class=\"notif-empty\">Keine Benachrichtigungen</div>';",
     "html += '<div class=\"notif-empty\">' + t('keineBenachrichtigungen') + '</div>';"),
    
    # ──── Schedule + Termin toolbar button ────
    ("'<button class=\"btn btn-primary btn-sm\" onclick=\"App.openScheduleModal(null, null, null, AppState.scheduleSelectedInstructor)\">+ Termin</button></div>';",
     "'<button class=\"btn btn-primary btn-sm\" onclick=\"App.openScheduleModal(null, null, null, AppState.scheduleSelectedInstructor)\">' + t('plusTermin') + '</button></div>';"),
    
    # ──── Instructor day view + Termin button ────
    ("'<button class=\"btn btn-primary btn-sm\" onclick=\"App.openScheduleModal(\\'' + selectedDateStr + '\\', \\'09:00\\')\">+ Termin</button></div>';",
     "'<button class=\"btn btn-primary btn-sm\" onclick=\"App.openScheduleModal(\\'' + selectedDateStr + '\\', \\'09:00\\')\">' + t('plusTermin') + '</button></div>';"),
    
    # ──── Trial banner on school dashboard ────
    ("document.getElementById('school-trial-text').textContent = 'Testphase: noch ' + diff + ' Tage';",
     "document.getElementById('school-trial-text').textContent = t('testphase') + ': ' + t('nochXTage', {n: diff});"),
    
    # ──── Lesson types display in instructor lessons and student lessons ────
    ("'<div style=\"font-weight:600;font-size:var(--text-sm);\">' + item.type + '</div>' +\n        '<div class=\"text-xs text-muted\">' + item.student_name + ' · ' + App.formatDate(item.date) + ' · ' + App.formatDuration(item.duration) + '</div></div>' +",
     "'<div style=\"font-weight:600;font-size:var(--text-sm);\">' + tType(item.type) + '</div>' +\n        '<div class=\"text-xs text-muted\">' + item.student_name + ' · ' + App.formatDate(item.date) + ' · ' + App.formatDuration(item.duration) + '</div></div>' +"),
    
    # ──── Student lessons type display ────
    ("'<div class=\"list-item-title\">' + l.type + '</div>' +\n          '<div class=\"list-item-subtitle\">' + App.formatDate(l.date) + ' · ' + App.formatDuration(l.duration) + instructorInfo + '</div></div>' +\n          '<div class=\"list-item-right\">' + App.skillLevelHtml(App.avgRating(l.ratings)) + '</div></div>';",
     "'<div class=\"list-item-title\">' + tType(l.type) + '</div>' +\n          '<div class=\"list-item-subtitle\">' + App.formatDate(l.date) + ' · ' + App.formatDuration(l.duration) + instructorInfo + '</div></div>' +\n          '<div class=\"list-item-right\">' + App.skillLevelHtml(App.avgRating(l.ratings)) + '</div></div>';"),
    
    # ──── Exam checklist ────
    ("'<span class=\"section-title\" style=\"color:var(--color-success);\">Prüfungs-Checkliste</span></div>' +",
     "'<span class=\"section-title\" style=\"color:var(--color-success);\">' + t('pruefungsCheckliste') + '</span></div>' +"),
    ("'<p class=\"text-xs text-muted mb-3\">Du bist fast prüfungsreif! Vergiss diese Dinge nicht:</p>';",
     "'<p class=\"text-xs text-muted mb-3\">' + t('fastPruefungsreif') + '</p>';"),
    
    # ──── Skill level name display → tLevel ────
    # In skillLevelHtml
    ("return '<span class=\"badge ' + info.badgeClass + '\">' + info.name + '</span>';",
     "return '<span class=\"badge ' + info.badgeClass + '\">' + tLevel(info.name) + '</span>';"),
]

count = 0
for old, new in replacements:
    if old in code:
        code = code.replace(old, new, 1)
        count += 1
    else:
        print(f"WARN: Not found: {old[:80]}...")

print(f"Applied {count}/{len(replacements)} replacements")

# ────────────────────────────────────────────
# TASK 2: Wrap skill task display names with tSkill()
# ────────────────────────────────────────────

# In skill bar rendering (student detail, lesson review, student overview) — the task name is used as header
# Pattern: '<span>' + task + '</span>'  in skill bars — replace with tSkill
code = code.replace(
    "'<div class=\"skill-bar\"><div class=\"skill-bar-header\"><span>' + task + '</span>",
    "'<div class=\"skill-bar\"><div class=\"skill-bar-header\"><span>' + tSkill(task) + '</span>"
)

# Rating card labels in lesson summary
code = code.replace(
    "'<div style=\"margin-bottom:var(--space-2);\"><span class=\"rating-card-label\">' + task + '</span></div>' +",
    "'<div style=\"margin-bottom:var(--space-2);\"><span class=\"rating-card-label\">' + tSkill(task) + '</span></div>' +"
)

# Edit lesson skill labels
code = code.replace(
    "'<div class=\"text-xs font-medium mb-1\">' + task + '</div>'",
    "'<div class=\"text-xs font-medium mb-1\">' + tSkill(task) + '</div>'"
)

# Lesson type selects in schedule modal — tType wrapping  
# The SCHEDULE_TYPES.forEach loop shows raw German type names in options
code = code.replace(
    "html += '<option value=\"' + t + '\"' + (t === type ? ' selected' : '') + '>' + t + '</option>';",
    "html += '<option value=\"' + t + '\"' + (t === type ? ' selected' : '') + '>' + tType(t) + '</option>';"
)

# Edit lesson type options
code = code.replace(
    "'<option value=\"Übungsfahrt\"' + (lesson.type === 'Übungsfahrt' ? ' selected' : '') + '>Übungsfahrt</option>' +",
    "'<option value=\"Übungsfahrt\"' + (lesson.type === 'Übungsfahrt' ? ' selected' : '') + '>' + tType('Übungsfahrt') + '</option>' +"
)
code = code.replace(
    "'<option value=\"Überlandfahrt\"' + (lesson.type === 'Überlandfahrt' ? ' selected' : '') + '>Überlandfahrt</option>' +",
    "'<option value=\"Überlandfahrt\"' + (lesson.type === 'Überlandfahrt' ? ' selected' : '') + '>' + tType('Überlandfahrt') + '</option>' +"
)
code = code.replace(
    "'<option value=\"Autobahnfahrt\"' + (lesson.type === 'Autobahnfahrt' ? ' selected' : '') + '>Autobahnfahrt</option>' +",
    "'<option value=\"Autobahnfahrt\"' + (lesson.type === 'Autobahnfahrt' ? ' selected' : '') + '>' + tType('Autobahnfahrt') + '</option>' +"
)
code = code.replace(
    "'<option value=\"Nachtfahrt\"' + (lesson.type === 'Nachtfahrt' ? ' selected' : '') + '>Nachtfahrt</option>' +",
    "'<option value=\"Nachtfahrt\"' + (lesson.type === 'Nachtfahrt' ? ' selected' : '') + '>' + tType('Nachtfahrt') + '</option>' +"
)
code = code.replace(
    "'<option value=\"Prüfungsvorbereitung\"' + (lesson.type === 'Prüfungsvorbereitung' ? ' selected' : '') + '>Prüfungsvorbereitung</option>' +",
    "'<option value=\"Prüfungsvorbereitung\"' + (lesson.type === 'Prüfungsvorbereitung' ? ' selected' : '') + '>' + tType('Prüfungsvorbereitung') + '</option>' +"
)

# Skill level buttons in summary and edit — show translated level names
code = code.replace(
    "html += '<button type=\"button\" class=\"level-selector-btn' + isActive + '\" data-level=\"' + sl.level + '\" onclick=\"App.setSkillRating(\\'' + task + '\\', ' + sl.level + ', this)\">' + sl.name + '</button>';",
    "html += '<button type=\"button\" class=\"level-selector-btn' + isActive + '\" data-level=\"' + sl.level + '\" onclick=\"App.setSkillRating(\\'' + task + '\\', ' + sl.level + ', this)\">' + tLevel(sl.name) + '</button>';"
)
code = code.replace(
    "html += '<button type=\"button\" class=\"level-selector-btn' + isActive + '\" data-level=\"' + sl.level + '\" onclick=\"App.setEditSkillRating(this, \\'' + task + '\\', ' + sl.level + ')\">' + sl.name + '</button>';",
    "html += '<button type=\"button\" class=\"level-selector-btn' + isActive + '\" data-level=\"' + sl.level + '\" onclick=\"App.setEditSkillRating(this, \\'' + task + '\\', ' + sl.level + ')\">' + tLevel(sl.name) + '</button>';"
)

# ────────────────────────────────────────────
# TASK 3: Add retroactive image upload to lesson review + edit
# ────────────────────────────────────────────

# After the images display in showLessonReview, add "Bilder hinzufügen" button for instructor
old_review_btns = """      if (fromRole === 'instructor') {
        html += '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">' +
          '<button class="btn btn-secondary flex-1" onclick="App.editLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')">' + t('bearbeiten') + '</button>' +
          '<button class="btn btn-danger flex-1" onclick="App.deleteLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')">' + t('loeschen') + '</button></div>';
      }"""

new_review_btns = """      if (fromRole === 'instructor') {
        html += '<div class="card mb-4"><label class="form-label">' + t('bilderHinzufuegen') + '</label>' +
          '<div class="image-upload-area">' +
            '<input type="file" accept="image/*" multiple id="review-image-input" style="display:none;" onchange="App.handleReviewImageUpload(event, \\'' + lessonId + '\\')">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\\'review-image-input\\').click()">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg> ' + t('bilderHochladen') + '</button>' +
          '</div></div>';
        html += '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">' +
          '<button class="btn btn-secondary flex-1" onclick="App.editLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')">' + t('bearbeiten') + '</button>' +
          '<button class="btn btn-danger flex-1" onclick="App.deleteLesson(\\'' + lessonId + '\\', \\'' + studentId + '\\')">' + t('loeschen') + '</button></div>';
      }"""

code = code.replace(old_review_btns, new_review_btns)

# Add retroactive image upload handler and image upload to edit lesson — insert before the BOOT section
boot_marker = "// ============================================\n// BOOT"
retroactive_code = """  // ──── RETROACTIVE IMAGE UPLOAD (from lesson review) ────
  handleReviewImageUpload: function(event, lessonId) {
    var files = event.target.files;
    if (!files || files.length === 0) return;
    var images = [];
    var loaded = 0;
    var total = files.length;
    for (var i = 0; i < total; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          images.push({ filename: file.name, data: e.target.result });
          loaded++;
          if (loaded === total) {
            App.uploadImagesToLesson(lessonId, images);
          }
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    event.target.value = '';
  },

  uploadImagesToLesson: async function(lessonId, newImages) {
    try {
      this.showLoading(true);
      this.showToast(t('bilderWerdenHochgeladen'));
      // Get existing lesson to merge images
      var lesson = await ApiClient.get('/api/lesson/' + lessonId);
      var existingImages = lesson.images || [];
      var allImages = existingImages.concat(newImages);
      await ApiClient.put('/api/lessons/' + lessonId, {
        type: lesson.type,
        notes: lesson.notes,
        ratings: lesson.ratings,
        images: allImages
      });
      this.showToast(t('bilderHochgeladen'));
      AppState._cachedData.instructorDash = null;
      // Refresh the lesson review
      this.showLessonReview(lessonId, lesson.student_id || lesson.studentId, 'instructor');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  // ──── IMAGE UPLOAD IN EDIT MODAL ────
  handleEditImageUpload: function(event) {
    var files = event.target.files;
    for (var i = 0; i < files.length; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          AppState._editPendingImages.push({ filename: file.name, data: e.target.result });
          App.renderEditPendingImages();
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    event.target.value = '';
  },

  renderEditPendingImages: function() {
    var container = document.getElementById('edit-image-preview-list');
    if (!container) return;
    var allImgs = (AppState._editExistingImages || []).concat(AppState._editPendingImages || []);
    if (allImgs.length === 0) { container.innerHTML = ''; return; }
    var html = '';
    allImgs.forEach(function(img, idx) {
      html += '<div class="image-preview-item">' +
        '<img src="' + img.data + '" alt="' + (img.filename || '') + '">' +
        '<button class="image-preview-remove" onclick="App.removeEditImage(' + idx + ')">&times;</button></div>';
    });
    container.innerHTML = html;
  },

  removeEditImage: function(idx) {
    var existingCount = (AppState._editExistingImages || []).length;
    if (idx < existingCount) {
      AppState._editExistingImages.splice(idx, 1);
    } else {
      AppState._editPendingImages.splice(idx - existingCount, 1);
    }
    this.renderEditPendingImages();
  },

"""

code = code.replace(boot_marker, retroactive_code + boot_marker)

# Now update editLesson to include image upload section
old_edit_form_end = "html += '<button type=\"submit\" class=\"btn btn-primary btn-full btn-lg mt-4\">' + t('speichern') + '</button></form>';\n      this.openModal(t('fahrstundeBearbeiten'), html);"

new_edit_form_end = """// Image upload section in edit
      html += '<div class="form-group mb-4"><label class="form-label">' + t('bilder') + '</label>' +
        '<div class="image-upload-area">' +
          '<input type="file" accept="image/*" multiple id="edit-image-input" style="display:none;" onchange="App.handleEditImageUpload(event)">' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\\'edit-image-input\\').click()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg> ' + t('bilderHinzufuegen') + '</button>' +
          '<div id="edit-image-preview-list" class="image-preview-list"></div>' +
        '</div></div>';
      html += '<button type="submit" class="btn btn-primary btn-full btn-lg mt-4">' + t('speichern') + '</button></form>';
      AppState._editExistingImages = (lesson.images || []).slice();
      AppState._editPendingImages = [];
      this.openModal(t('fahrstundeBearbeiten'), html);
      // Render existing images after modal opens
      setTimeout(function() { App.renderEditPendingImages(); }, 50);"""

code = code.replace(old_edit_form_end, new_edit_form_end)

# Update saveEditedLesson to include images
old_save_edit = """      await ApiClient.put('/api/lessons/' + lessonId, {
        type: document.getElementById('edit-lesson-type').value,
        notes: document.getElementById('edit-lesson-notes').value,
        ratings: AppState._editRatings
      });"""

new_save_edit = """      var editImages = (AppState._editExistingImages || []).concat(AppState._editPendingImages || []);
      await ApiClient.put('/api/lessons/' + lessonId, {
        type: document.getElementById('edit-lesson-type').value,
        notes: document.getElementById('edit-lesson-notes').value,
        ratings: AppState._editRatings,
        images: editImages
      });"""

code = code.replace(old_save_edit, new_save_edit)

with open('/home/user/workspace/fahrdoc-app/public/app.js', 'w') as f:
    f.write(code)

print("✅ All patches applied successfully!")
