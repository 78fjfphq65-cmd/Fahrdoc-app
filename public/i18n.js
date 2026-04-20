/* ============================================
   FahrDoc — i18n (Internationalization)
   Languages: de, en, tr, ar, es, fr
   ============================================ */

var LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

var TRANSLATIONS = {
  // ── Navigation & Tabs ──
  dashboard:       { de:'Dashboard', en:'Dashboard', tr:'Panel', ar:'لوحة القيادة', es:'Panel', fr:'Tableau de bord' },
  planung:         { de:'Planung', en:'Schedule', tr:'Planlama', ar:'الجدول', es:'Planificación', fr:'Planning' },
  fahrlehrer:      { de:'Fahrlehrer', en:'Instructors', tr:'Eğitmenler', ar:'المدربون', es:'Instructores', fr:'Moniteurs' },
  schueler:        { de:'Schüler', en:'Students', tr:'Öğrenciler', ar:'الطلاب', es:'Alumnos', fr:'Élèves' },
  abo:             { de:'Abo', en:'Plan', tr:'Abonelik', ar:'الاشتراك', es:'Suscripción', fr:'Abonnement' },
  profil:          { de:'Profil', en:'Profile', tr:'Profil', ar:'الملف الشخصي', es:'Perfil', fr:'Profil' },
  fahrstunden:     { de:'Fahrstunden', en:'Lessons', tr:'Dersler', ar:'الدروس', es:'Clases', fr:'Leçons' },
  anmelden:        { de:'Anmelden', en:'Sign in', tr:'Giriş yap', ar:'تسجيل الدخول', es:'Iniciar sesión', fr:'Connexion' },
  registrieren:    { de:'Registrieren', en:'Register', tr:'Kayıt ol', ar:'تسجيل', es:'Registrarse', fr:'S\'inscrire' },
  abmelden:        { de:'Abmelden', en:'Sign out', tr:'Çıkış', ar:'تسجيل الخروج', es:'Cerrar sesión', fr:'Déconnexion' },

  // ── Auth ──
  email:           { de:'E-Mail', en:'Email', tr:'E-posta', ar:'البريد الإلكتروني', es:'Correo electrónico', fr:'E-mail' },
  passwort:        { de:'Passwort', en:'Password', tr:'Şifre', ar:'كلمة المرور', es:'Contraseña', fr:'Mot de passe' },
  name:            { de:'Name', en:'Name', tr:'İsim', ar:'الاسم', es:'Nombre', fr:'Nom' },
  passwortWdh:     { de:'Passwort wiederholen', en:'Repeat password', tr:'Şifreyi tekrarla', ar:'تكرار كلمة المرور', es:'Repetir contraseña', fr:'Répéter le mot de passe' },
  weiter:          { de:'Weiter', en:'Continue', tr:'Devam', ar:'متابعة', es:'Continuar', fr:'Continuer' },
  codeEingeben:    { de:'Code eingeben', en:'Enter code', tr:'Kodu gir', ar:'أدخل الرمز', es:'Introducir código', fr:'Entrer le code' },
  bestaetigungscode:{ de:'Bestätigungscode', en:'Confirmation code', tr:'Onay kodu', ar:'رمز التأكيد', es:'Código de confirmación', fr:'Code de confirmation' },
  rolleWaehlen:    { de:'Rolle wählen', en:'Choose role', tr:'Rol seçin', ar:'اختر الدور', es:'Elegir rol', fr:'Choisir un rôle' },
  fahrschule:      { de:'Fahrschule', en:'Driving school', tr:'Sürücü kursu', ar:'مدرسة القيادة', es:'Autoescuela', fr:'Auto-école' },
  fahrschueler:    { de:'Fahrschüler', en:'Student', tr:'Öğrenci', ar:'طالب', es:'Alumno', fr:'Élève' },
  fahrschulCode:   { de:'Fahrschul-Code', en:'School code', tr:'Okul kodu', ar:'رمز المدرسة', es:'Código de escuela', fr:'Code de l\'école' },
  adresse:         { de:'Adresse', en:'Address', tr:'Adres', ar:'العنوان', es:'Dirección', fr:'Adresse' },
  fahrschulName:   { de:'Fahrschulname', en:'School name', tr:'Okul adı', ar:'اسم المدرسة', es:'Nombre de escuela', fr:'Nom de l\'école' },

  // ── Dashboard ──
  hallo:           { de:'Hallo', en:'Hello', tr:'Merhaba', ar:'مرحبا', es:'Hola', fr:'Bonjour' },
  uebersichtSchule:{ de:'Übersicht deiner Fahrschule', en:'Your driving school overview', tr:'Sürücü kursu genel bakış', ar:'نظرة عامة على مدرسة القيادة', es:'Resumen de tu autoescuela', fr:'Aperçu de votre auto-école' },
  neueSchueler:    { de:'Neue Schüler diese Woche', en:'New students this week', tr:'Bu hafta yeni öğrenciler', ar:'طلاب جدد هذا الأسبوع', es:'Nuevos alumnos esta semana', fr:'Nouveaux élèves cette semaine' },
  letzteAktivitaeten:{ de:'Letzte Aktivitäten', en:'Recent activities', tr:'Son etkinlikler', ar:'الأنشطة الأخيرة', es:'Actividades recientes', fr:'Activités récentes' },
  deineWochenplanung:{ de:'Deine Wochenplanung', en:'Your weekly schedule', tr:'Haftalık planınız', ar:'جدولك الأسبوعي', es:'Tu planificación semanal', fr:'Votre planning hebdomadaire' },
  tagesansicht:    { de:'Tagesansicht', en:'Day view', tr:'Gün görünümü', ar:'عرض يومي', es:'Vista diaria', fr:'Vue quotidienne' },
  wochenansicht:   { de:'Wochenansicht', en:'Week view', tr:'Hafta görünümü', ar:'عرض أسبوعي', es:'Vista semanal', fr:'Vue hebdomadaire' },

  // ── Schedule ──
  terminErstellen: { de:'Termin erstellen', en:'Create appointment', tr:'Randevu oluştur', ar:'إنشاء موعد', es:'Crear cita', fr:'Créer un rendez-vous' },
  terminBearbeiten:{ de:'Termin bearbeiten', en:'Edit appointment', tr:'Randevuyu düzenle', ar:'تعديل الموعد', es:'Editar cita', fr:'Modifier le rendez-vous' },
  typ:             { de:'Typ', en:'Type', tr:'Tür', ar:'النوع', es:'Tipo', fr:'Type' },
  datum:           { de:'Datum', en:'Date', tr:'Tarih', ar:'التاريخ', es:'Fecha', fr:'Date' },
  start:           { de:'Start', en:'Start', tr:'Başlangıç', ar:'البداية', es:'Inicio', fr:'Début' },
  ende:            { de:'Ende', en:'End', tr:'Bitiş', ar:'النهاية', es:'Fin', fr:'Fin' },
  dauer:           { de:'Dauer', en:'Duration', tr:'Süre', ar:'المدة', es:'Duración', fr:'Durée' },
  schuelerLeer:    { de:'Fahrschüler (leer = offener Block)', en:'Student (empty = open block)', tr:'Öğrenci (boş = açık blok)', ar:'الطالب (فارغ = كتلة مفتوحة)', es:'Alumno (vacío = bloque abierto)', fr:'Élève (vide = bloc ouvert)' },
  klasse:          { de:'Klasse', en:'Class', tr:'Sınıf', ar:'الفئة', es:'Clase', fr:'Catégorie' },
  notizen:         { de:'Notizen', en:'Notes', tr:'Notlar', ar:'ملاحظات', es:'Notas', fr:'Notes' },
  optional:        { de:'Optional...', en:'Optional...', tr:'İsteğe bağlı...', ar:'اختياري...', es:'Opcional...', fr:'Facultatif...' },
  speichern:       { de:'Speichern', en:'Save', tr:'Kaydet', ar:'حفظ', es:'Guardar', fr:'Enregistrer' },
  loeschen:        { de:'Löschen', en:'Delete', tr:'Sil', ar:'حذف', es:'Eliminar', fr:'Supprimer' },
  fahrstundeStarten:{ de:'Fahrstunde starten', en:'Start lesson', tr:'Derse başla', ar:'بدء الدرس', es:'Iniciar clase', fr:'Commencer la leçon' },
  plusTermin:       { de:'+ Termin', en:'+ Appointment', tr:'+ Randevu', ar:'+ موعد', es:'+ Cita', fr:'+ Rendez-vous' },
  offen:           { de:'Offen', en:'Open', tr:'Açık', ar:'مفتوح', es:'Abierto', fr:'Ouvert' },
  offenerBlock:    { de:'Offener Block', en:'Open block', tr:'Açık blok', ar:'كتلة مفتوحة', es:'Bloque abierto', fr:'Bloc ouvert' },

  // ── Lessons ──
  fahrstundeBeenden:{ de:'Fahrstunde beenden', en:'End lesson', tr:'Dersi bitir', ar:'إنهاء الدرس', es:'Finalizar clase', fr:'Terminer la leçon' },
  zusammenfassung: { de:'Zusammenfassung', en:'Summary', tr:'Özet', ar:'ملخص', es:'Resumen', fr:'Résumé' },
  bewertung:       { de:'Bewertung', en:'Assessment', tr:'Değerlendirme', ar:'التقييم', es:'Evaluación', fr:'Évaluation' },
  bilderOptional:  { de:'Bilder (optional)', en:'Images (optional)', tr:'Resimler (isteğe bağlı)', ar:'صور (اختياري)', es:'Imágenes (opcional)', fr:'Images (facultatif)' },
  bilderHochladen: { de:'Bilder hochladen', en:'Upload images', tr:'Resim yükle', ar:'رفع صور', es:'Subir imágenes', fr:'Télécharger des images' },
  bilderHinzufuegen:{ de:'Bilder hinzufügen', en:'Add images', tr:'Resim ekle', ar:'إضافة صور', es:'Añadir imágenes', fr:'Ajouter des images' },
  fahrstundeSpeichern:{ de:'Fahrstunde speichern', en:'Save lesson', tr:'Dersi kaydet', ar:'حفظ الدرس', es:'Guardar clase', fr:'Enregistrer la leçon' },
  fahrstundeBearbeiten:{ de:'Fahrstunde bearbeiten', en:'Edit lesson', tr:'Dersi düzenle', ar:'تعديل الدرس', es:'Editar clase', fr:'Modifier la leçon' },
  fahrstundeLoeschen:{ de:'Fahrstunde löschen', en:'Delete lesson', tr:'Dersi sil', ar:'حذف الدرس', es:'Eliminar clase', fr:'Supprimer la leçon' },
  fahrstundentyp:  { de:'Fahrstundentyp', en:'Lesson type', tr:'Ders türü', ar:'نوع الدرس', es:'Tipo de clase', fr:'Type de leçon' },
  wirklichLoeschen:{ de:'Fahrstunde wirklich löschen?', en:'Really delete this lesson?', tr:'Ders gerçekten silinsin mi?', ar:'هل تريد حقاً حذف هذا الدرس؟', es:'¿Eliminar esta clase?', fr:'Vraiment supprimer cette leçon ?' },
  fahrstundeAktualisiert:{ de:'Fahrstunde aktualisiert!', en:'Lesson updated!', tr:'Ders güncellendi!', ar:'تم تحديث الدرس!', es:'¡Clase actualizada!', fr:'Leçon mise à jour !' },
  fahrstundeGeloescht:{ de:'Fahrstunde gelöscht', en:'Lesson deleted', tr:'Ders silindi', ar:'تم حذف الدرس', es:'Clase eliminada', fr:'Leçon supprimée' },
  bilderWerdenHochgeladen:{ de:'Bilder werden hochgeladen...', en:'Uploading images...', tr:'Resimler yükleniyor...', ar:'جاري رفع الصور...', es:'Subiendo imágenes...', fr:'Téléchargement des images...' },
  bilderHochgeladen:{ de:'Bilder erfolgreich hochgeladen!', en:'Images uploaded successfully!', tr:'Resimler başarıyla yüklendi!', ar:'تم رفع الصور بنجاح!', es:'¡Imágenes subidas correctamente!', fr:'Images téléchargées avec succès !' },
  bilder:          { de:'Bilder', en:'Images', tr:'Resimler', ar:'صور', es:'Imágenes', fr:'Images' },

  // ── Skill Levels ──
  anfaenger:       { de:'Anfänger', en:'Beginner', tr:'Başlangıç', ar:'مبتدئ', es:'Principiante', fr:'Débutant' },
  fortgeschritten: { de:'Fortgeschritten', en:'Advanced', tr:'İleri', ar:'متقدم', es:'Avanzado', fr:'Avancé' },
  sicher:          { de:'Sicher', en:'Confident', tr:'Güvenli', ar:'واثق', es:'Seguro', fr:'Confiant' },
  pruefungsreif:   { de:'Prüfungsreif', en:'Exam ready', tr:'Sınava hazır', ar:'جاهز للامتحان', es:'Listo para examen', fr:'Prêt pour l\'examen' },

  // ── Skill Tasks ──
  abbiegen:        { de:'Abbiegen', en:'Turning', tr:'Dönüş', ar:'الانعطاف', es:'Girar', fr:'Tourner' },
  spurwechsel:     { de:'Spurwechsel', en:'Lane change', tr:'Şerit değişikliği', ar:'تغيير المسار', es:'Cambio de carril', fr:'Changement de voie' },
  vorfahrt:        { de:'Vorfahrt', en:'Right of way', tr:'Geçiş hakkı', ar:'حق الأولوية', es:'Prioridad', fr:'Priorité' },
  einparken:       { de:'Einparken', en:'Parking', tr:'Park etme', ar:'ركن السيارة', es:'Aparcar', fr:'Stationnement' },
  geschwindigkeit: { de:'Geschwindigkeit', en:'Speed', tr:'Hız', ar:'السرعة', es:'Velocidad', fr:'Vitesse' },
  verkehrszeichen: { de:'Verkehrszeichen', en:'Traffic signs', tr:'Trafik işaretleri', ar:'إشارات المرور', es:'Señales de tráfico', fr:'Panneaux de signalisation' },
  schulterblick:   { de:'Schulterblick', en:'Shoulder check', tr:'Omuz bakışı', ar:'نظرة الكتف', es:'Mirar el ángulo muerto', fr:'Regard par-dessus l\'épaule' },
  allgFahrverhalten:{ de:'Allgemeines Fahrverhalten', en:'General driving behavior', tr:'Genel sürüş davranışı', ar:'سلوك القيادة العام', es:'Comportamiento general al volante', fr:'Comportement de conduite général' },

  // ── Lesson Types (display only) ──
  uebungsfahrt:    { de:'Übungsfahrt', en:'Practice drive', tr:'Alıştırma sürüşü', ar:'قيادة تدريبية', es:'Conducción de práctica', fr:'Conduite d\'entraînement' },
  ueberlandfahrt:  { de:'Überlandfahrt', en:'Country road drive', tr:'Kırsal yol sürüşü', ar:'قيادة طرق ريفية', es:'Conducción interurbana', fr:'Conduite sur route' },
  autobahnfahrt:   { de:'Autobahnfahrt', en:'Highway drive', tr:'Otoyol sürüşü', ar:'قيادة على الطريق السريع', es:'Conducción en autopista', fr:'Conduite sur autoroute' },
  nachtfahrt:      { de:'Nachtfahrt', en:'Night drive', tr:'Gece sürüşü', ar:'قيادة ليلية', es:'Conducción nocturna', fr:'Conduite de nuit' },
  pruefungsvorbereitung:{ de:'Prüfungsvorbereitung', en:'Exam preparation', tr:'Sınav hazırlığı', ar:'التحضير للامتحان', es:'Preparación de examen', fr:'Préparation à l\'examen' },
  praktischePruefung:{ de:'Praktische Prüfung', en:'Practical exam', tr:'Pratik sınav', ar:'الامتحان العملي', es:'Examen práctico', fr:'Examen pratique' },
  theoretischePruefung:{ de:'Theoretische Prüfung', en:'Theoretical exam', tr:'Teorik sınav', ar:'الامتحان النظري', es:'Examen teórico', fr:'Examen théorique' },

  // ── Student View ──
  meineFahrstunden:{ de:'Meine Fahrstunden', en:'My lessons', tr:'Derslerim', ar:'دروسي', es:'Mis clases', fr:'Mes leçons' },
  fortschritt:     { de:'Fortschritt', en:'Progress', tr:'İlerleme', ar:'التقدم', es:'Progreso', fr:'Progrès' },
  fuehrerscheinCheckliste:{ de:'Führerschein-Checkliste', en:'License checklist', tr:'Ehliyet kontrol listesi', ar:'قائمة فحص رخصة القيادة', es:'Lista de verificación del carnet', fr:'Checklist du permis' },
  naechsteFahrstunde:{ de:'Nächste Fahrstunde', en:'Next lesson', tr:'Sonraki ders', ar:'الدرس القادم', es:'Próxima clase', fr:'Prochaine leçon' },
  keineFahrstunden:{ de:'Keine Fahrstunden vorhanden', en:'No lessons available', tr:'Ders bulunamadı', ar:'لا توجد دروس', es:'No hay clases disponibles', fr:'Aucune leçon disponible' },

  // ── Status ──
  bestaetigt:      { de:'bestätigt', en:'confirmed', tr:'onaylandı', ar:'مؤكد', es:'confirmado', fr:'confirmé' },
  geplant:         { de:'geplant', en:'planned', tr:'planlandı', ar:'مخطط', es:'planificado', fr:'planifié' },
  verwendet:       { de:'verwendet', en:'used', tr:'kullanıldı', ar:'مستخدم', es:'usado', fr:'utilisé' },
  abgeschlossen:   { de:'abgeschlossen', en:'completed', tr:'tamamlandı', ar:'مكتمل', es:'completado', fr:'terminé' },

  // ── Profile ──
  deinProfil:      { de:'Dein Profil', en:'Your profile', tr:'Profiliniz', ar:'ملفك الشخصي', es:'Tu perfil', fr:'Votre profil' },
  persoenlicheDaten:{ de:'Persönliche Daten', en:'Personal data', tr:'Kişisel bilgiler', ar:'البيانات الشخصية', es:'Datos personales', fr:'Données personnelles' },
  einstellungen:   { de:'Einstellungen', en:'Settings', tr:'Ayarlar', ar:'الإعدادات', es:'Configuración', fr:'Paramètres' },
  benachrichtigungen:{ de:'Benachrichtigungen', en:'Notifications', tr:'Bildirimler', ar:'الإشعارات', es:'Notificaciones', fr:'Notifications' },
  datenschutz:     { de:'Datenschutz', en:'Privacy', tr:'Gizlilik', ar:'الخصوصية', es:'Privacidad', fr:'Confidentialité' },

  // ── Subscription ──
  aboVerwaltung:   { de:'Abo-Verwaltung', en:'Subscription management', tr:'Abonelik yönetimi', ar:'إدارة الاشتراك', es:'Gestión de suscripción', fr:'Gestion d\'abonnement' },
  testphase:       { de:'Testphase', en:'Trial period', tr:'Deneme süresi', ar:'فترة تجريبية', es:'Periodo de prueba', fr:'Période d\'essai' },
  nochXTage:       { de:'noch {n} Tage', en:'{n} days remaining', tr:'{n} gün kaldı', ar:'{n} أيام متبقية', es:'{n} días restantes', fr:'{n} jours restants' },
  aktiveSitzplaetze:{ de:'Aktive Sitzplätze', en:'Active seats', tr:'Aktif koltuklar', ar:'المقاعد النشطة', es:'Plazas activas', fr:'Places actives' },
  sitzplatz:       { de:'Sitzplatz', en:'Seat', tr:'Koltuk', ar:'مقعد', es:'Plaza', fr:'Place' },
  proMonat:        { de:'pro Monat', en:'per month', tr:'aylık', ar:'شهرياً', es:'al mes', fr:'par mois' },
  aboAbgelaufen:   { de:'Abo abgelaufen', en:'Subscription expired', tr:'Abonelik süresi doldu', ar:'انتهى الاشتراك', es:'Suscripción expirada', fr:'Abonnement expiré' },
  aboAbgelaufenKontakt:{ de:'Abo abgelaufen — bitte Fahrschule kontaktieren', en:'Subscription expired — please contact driving school', tr:'Abonelik süresi doldu — sürücü kursuna başvurun', ar:'انتهى الاشتراك — يرجى الاتصال بمدرسة القيادة', es:'Suscripción expirada — contacte la autoescuela', fr:'Abonnement expiré — veuillez contacter l\'auto-école' },

  // ── Additional UI ──
  passwortNichtGleich:{ de:'Passwörter stimmen nicht überein', en:'Passwords do not match', tr:'Şifreler eşleşmiyor', ar:'كلمات المرور غير متطابقة', es:'Las contraseñas no coinciden', fr:'Les mots de passe ne correspondent pas' },
  codeVollstaendig:{ de:'Bitte vollständigen Code eingeben', en:'Please enter the complete code', tr:'Lütfen kodun tamamını girin', ar:'يرجى إدخال الرمز بالكامل', es:'Por favor ingrese el código completo', fr:'Veuillez entrer le code complet' },
  emailBestaetigt:{ de:'E-Mail bestätigt!', en:'Email confirmed!', tr:'E-posta onaylandı!', ar:'تم تأكيد البريد الإلكتروني!', es:'¡Correo electrónico confirmado!', fr:'E-mail confirmé !' },
  geradeEben:{ de:'Gerade eben', en:'Just now', tr:'Az önce', ar:'الآن', es:'Justo ahora', fr:'À l\'instant' },
  minuten:{ de:'Min.', en:'min.', tr:'dk.', ar:'دقيقة', es:'min.', fr:'min.' },
  stunden:{ de:'Std.', en:'hrs.', tr:'saat', ar:'ساعة', es:'hrs.', fr:'h' },
  tage:{ de:'Tage', en:'days', tr:'gün', ar:'أيام', es:'días', fr:'jours' },
  terminErstellt:{ de:'Termin erstellt', en:'Appointment created', tr:'Randevu oluşturuldu', ar:'تم إنشاء الموعد', es:'Cita creada', fr:'Rendez-vous créé' },
  terminAktualisiert:{ de:'Termin aktualisiert', en:'Appointment updated', tr:'Randevu güncellendi', ar:'تم تحديث الموعد', es:'Cita actualizada', fr:'Rendez-vous mis à jour' },
  terminGeloescht:{ de:'Termin gelöscht', en:'Appointment deleted', tr:'Randevu silindi', ar:'تم حذف الموعد', es:'Cita eliminada', fr:'Rendez-vous supprimé' },
  terminBestaetigt:{ de:'Termin bestätigt', en:'Appointment confirmed', tr:'Randevu onaylandı', ar:'تم تأكيد الموعد', es:'Cita confirmada', fr:'Rendez-vous confirmé' },
  terminWirklichLoeschen:{ de:'Termin wirklich löschen?', en:'Really delete this appointment?', tr:'Randevu gerçekten silinsin mi?', ar:'هل تريد حقاً حذف هذا الموعد؟', es:'¿Eliminar esta cita?', fr:'Vraiment supprimer ce rendez-vous ?' },
  neuerTermin:{ de:'Neuer Termin', en:'New appointment', tr:'Yeni randevu', ar:'موعد جديد', es:'Nueva cita', fr:'Nouveau rendez-vous' },
  bestaetigenBtn:{ de:'Bestätigen', en:'Confirm', tr:'Onayla', ar:'تأكيد', es:'Confirmar', fr:'Confirmer' },
  keineNeueAnmeldungen:{ de:'Noch keine neuen Anmeldungen diese Woche', en:'No new sign-ups this week', tr:'Bu hafta yeni kayıt yok', ar:'لا توجد تسجيلات جديدة هذا الأسبوع', es:'Sin nuevas inscripciones esta semana', fr:'Aucune nouvelle inscription cette semaine' },
  einladungscodes:{ de:'Einladungscodes', en:'Invitation codes', tr:'Davet kodları', ar:'رموز الدعوة', es:'Códigos de invitación', fr:'Codes d\'invitation' },
  schuelerCodes:{ de:'Schüler-Codes', en:'Student codes', tr:'Öğrenci kodları', ar:'رموز الطلاب', es:'Códigos de alumnos', fr:'Codes élèves' },
  neuerCode:{ de:'Neuer Code', en:'New code', tr:'Yeni kod', ar:'رمز جديد', es:'Nuevo código', fr:'Nouveau code' },
  telefon:{ de:'Telefon', en:'Phone', tr:'Telefon', ar:'الهاتف', es:'Teléfono', fr:'Téléphone' },
  keineTermine:{ de:'Keine Termine', en:'No appointments', tr:'Randevu yok', ar:'لا توجد مواعيد', es:'Sin citas', fr:'Aucun rendez-vous' },
  erstelleTermin:{ de:'Erstelle einen Termin für diesen Tag', en:'Create an appointment for this day', tr:'Bu gün için randevu oluşturun', ar:'أنشئ موعداً لهذا اليوم', es:'Crear una cita para este día', fr:'Créer un rendez-vous pour ce jour' },
  meineSchueler:{ de:'Meine Schüler', en:'My students', tr:'Öğrencilerim', ar:'طلابي', es:'Mis alumnos', fr:'Mes élèves' },
  alleFahrstunden:{ de:'Alle Fahrstunden', en:'All lessons', tr:'Tüm dersler', ar:'جميع الدروس', es:'Todas las clases', fr:'Toutes les leçons' },
  aenderungenSpeichern:{ de:'Änderungen speichern', en:'Save changes', tr:'Değişiklikleri kaydet', ar:'حفظ التغييرات', es:'Guardar cambios', fr:'Enregistrer les modifications' },
  zuordnung:{ de:'Zuordnung', en:'Assignment', tr:'Atama', ar:'التعيين', es:'Asignación', fr:'Affectation' },
  profilAktualisiert:{ de:'Profil aktualisiert!', en:'Profile updated!', tr:'Profil güncellendi!', ar:'تم تحديث الملف الشخصي!', es:'¡Perfil actualizado!', fr:'Profil mis à jour !' },
  gesamtdurchschnitt:{ de:'Gesamtdurchschnitt', en:'Overall average', tr:'Genel ortalama', ar:'المتوسط العام', es:'Promedio general', fr:'Moyenne générale' },
  gesamtdauer:{ de:'Gesamtdauer', en:'Total duration', tr:'Toplam süre', ar:'المدة الإجمالية', es:'Duración total', fr:'Durée totale' },
  keineAnderenFahrlehrer:{ de:'Keine anderen Fahrlehrer in dieser Fahrschule.', en:'No other instructors in this driving school.', tr:'Bu sürücü kursunda başka eğitmen yok.', ar:'لا يوجد مدربون آخرون في هذه المدرسة.', es:'No hay otros instructores en esta autoescuela.', fr:'Pas d\'autres moniteurs dans cette auto-école.' },
  profilTeilenMit:{ de:'Profil teilen mit:', en:'Share profile with:', tr:'Profili paylaş:', ar:'مشاركة الملف مع:', es:'Compartir perfil con:', fr:'Partager le profil avec :' },
  bitteSchuelerWaehlen:{ de:'Bitte Schüler auswählen', en:'Please select a student', tr:'Lütfen öğrenci seçin', ar:'يرجى اختيار طالب', es:'Por favor seleccione un alumno', fr:'Veuillez sélectionner un élève' },
  fahrstundeAbbrechen:{ de:'Fahrstunde abbrechen?', en:'Cancel lesson?', tr:'Ders iptal edilsin mi?', ar:'إلغاء الدرس؟', es:'¿Cancelar la clase?', fr:'Annuler la leçon ?' },
  fahrstundeAbgebrochenMsg:{ de:'Fahrstunde abgebrochen', en:'Lesson cancelled', tr:'Ders iptal edildi', ar:'تم إلغاء الدرس', es:'Clase cancelada', fr:'Leçon annulée' },
  anmerkungenPlaceholder:{ de:'Anmerkungen zur Fahrstunde...', en:'Notes about the lesson...', tr:'Ders hakkında notlar...', ar:'ملاحظات حول الدرس...', es:'Notas sobre la clase...', fr:'Notes sur la leçon...' },
  fahrstundeGespeichert:{ de:'Fahrstunde gespeichert!', en:'Lesson saved!', tr:'Ders kaydedildi!', ar:'تم حفظ الدرس!', es:'¡Clase guardada!', fr:'Leçon enregistrée !' },
  fortschrittPruefungsreife:{ de:'Dein Fortschritt zur Prüfungsreife', en:'Your progress towards exam readiness', tr:'Sınav hazırlığına ilerlemeniz', ar:'تقدمك نحو الاستعداد للامتحان', es:'Tu progreso hacia la preparación del examen', fr:'Votre progression vers l\'examen' },
  deineSkills:{ de:'Deine Skills', en:'Your skills', tr:'Yeteneklerin', ar:'مهاراتك', es:'Tus habilidades', fr:'Vos compétences' },
  nochKeineFahrstunden:{ de:'Noch keine Fahrstunden', en:'No lessons yet', tr:'Henüz ders yok', ar:'لا توجد دروس بعد', es:'Aún no hay clases', fr:'Pas encore de leçons' },
  fahrstundenHierAngezeigt:{ de:'Deine Fahrstunden werden hier angezeigt', en:'Your lessons will be shown here', tr:'Dersleriniz burada gösterilecek', ar:'ستظهر دروسك هنا', es:'Tus clases se mostrarán aquí', fr:'Vos leçons seront affichées ici' },
  geburtsdatum:{ de:'Geburtsdatum', en:'Date of birth', tr:'Doğum tarihi', ar:'تاريخ الميلاد', es:'Fecha de nacimiento', fr:'Date de naissance' },
  fuehrerscheinklasse:{ de:'Führerscheinklasse', en:'License class', tr:'Ehliyet sınıfı', ar:'فئة الرخصة', es:'Tipo de carnet', fr:'Catégorie de permis' },
  pruefungsCheckliste:{ de:'Prüfungs-Checkliste', en:'Exam checklist', tr:'Sınav kontrol listesi', ar:'قائمة فحص الامتحان', es:'Lista de verificación del examen', fr:'Checklist de l\'examen' },
  fastPruefungsreif:{ de:'Du bist fast prüfungsreif! Vergiss diese Dinge nicht:', en:'You are almost exam ready! Don\'t forget these things:', tr:'Sınava neredeyse hazırsınız! Bunları unutmayın:', ar:'أنت قريب من الاستعداد للامتحان! لا تنسَ هذه الأمور:', es:'¡Casi estás listo para el examen! No olvides estas cosas:', fr:'Vous êtes presque prêt pour l\'examen ! N\'oubliez pas :' },
  alleGelesen:{ de:'Alle gelesen', en:'Mark all read', tr:'Tümünü okundu işaretle', ar:'تحديد الكل كمقروء', es:'Marcar todo leído', fr:'Tout marquer comme lu' },
  keineBenachrichtigungen:{ de:'Keine Benachrichtigungen', en:'No notifications', tr:'Bildirim yok', ar:'لا توجد إشعارات', es:'Sin notificaciones', fr:'Aucune notification' },
  aktuellesKoennen:{ de:'Aktuelles Können', en:'Current skill level', tr:'Mevcut beceri', ar:'مستوى المهارة الحالي', es:'Nivel actual de habilidad', fr:'Niveau de compétence actuel' },

  // ── Misc ──
  suchen:          { de:'Suchen...', en:'Search...', tr:'Ara...', ar:'بحث...', es:'Buscar...', fr:'Rechercher...' },
  laden:           { de:'Laden...', en:'Loading...', tr:'Yükleniyor...', ar:'جاري التحميل...', es:'Cargando...', fr:'Chargement...' },
  fehler:          { de:'Fehler', en:'Error', tr:'Hata', ar:'خطأ', es:'Error', fr:'Erreur' },
  keineDaten:      { de:'Keine Daten', en:'No data', tr:'Veri yok', ar:'لا توجد بيانات', es:'Sin datos', fr:'Aucune donnée' },
  codeGenerieren:  { de:'Code generieren', en:'Generate code', tr:'Kod oluştur', ar:'إنشاء رمز', es:'Generar código', fr:'Générer un code' },
  codeKopiert:     { de:'Code kopiert!', en:'Code copied!', tr:'Kod kopyalandı!', ar:'تم نسخ الرمز!', es:'¡Código copiado!', fr:'Code copié !' },
  einladungscode:  { de:'Einladungscode', en:'Invitation code', tr:'Davet kodu', ar:'رمز الدعوة', es:'Código de invitación', fr:'Code d\'invitation' },
  neuerFahrlehrer: { de:'Neuer Fahrlehrer', en:'New instructor', tr:'Yeni eğitmen', ar:'مدرب جديد', es:'Nuevo instructor', fr:'Nouveau moniteur' },
  neuerFahrschueler:{ de:'Neuer Fahrschüler', en:'New student', tr:'Yeni öğrenci', ar:'طالب جديد', es:'Nuevo alumno', fr:'Nouvel élève' },
  bearbeiten:      { de:'Bearbeiten', en:'Edit', tr:'Düzenle', ar:'تعديل', es:'Editar', fr:'Modifier' },
  bild:            { de:'Bild', en:'Image', tr:'Resim', ar:'صورة', es:'Imagen', fr:'Image' },
  sprache:         { de:'Sprache', en:'Language', tr:'Dil', ar:'اللغة', es:'Idioma', fr:'Langue' },
  designWechseln:  { de:'Design wechseln', en:'Toggle theme', tr:'Tema değiştir', ar:'تغيير المظهر', es:'Cambiar tema', fr:'Changer de thème' },
  willkommen:      { de:'Willkommen', en:'Welcome', tr:'Hoş geldiniz', ar:'مرحباً', es:'Bienvenido', fr:'Bienvenue' },
  angemeldetBleiben:{ de:'Angemeldet bleiben', en:'Stay logged in', tr:'Oturumu açık tut', ar:'البقاء مسجل الدخول', es:'Mantener sesión', fr:'Rester connecté' },
  transparenz:     { de:'Transparenz für deine Fahrstunden', en:'Transparency for your driving lessons', tr:'Sürüş dersleriniz için şeffaflık', ar:'الشفافية في دروس القيادة', es:'Transparencia para tus clases de conducción', fr:'Transparence pour vos leçons de conduite' },
  kw:              { de:'KW', en:'CW', tr:'HF', ar:'أسبوع', es:'SC', fr:'Sem.' },
  abgemeldet:      { de:'Abgemeldet', en:'Signed out', tr:'Çıkış yapıldı', ar:'تم تسجيل الخروج', es:'Sesión cerrada', fr:'Déconnecté' },
  sitzungAbgelaufen:{ de:'Sitzung abgelaufen', en:'Session expired', tr:'Oturum süresi doldu', ar:'انتهت الجلسة', es:'Sesión expirada', fr:'Session expirée' },
  serverfehler:    { de:'Serverfehler', en:'Server error', tr:'Sunucu hatası', ar:'خطأ في الخادم', es:'Error del servidor', fr:'Erreur serveur' },
  gespeichert:     { de:'Gespeichert!', en:'Saved!', tr:'Kaydedildi!', ar:'تم الحفظ!', es:'¡Guardado!', fr:'Enregistré !' },
  nichtAutorisiert:{ de:'Nicht autorisiert', en:'Not authorized', tr:'Yetkisiz', ar:'غير مصرح', es:'No autorizado', fr:'Non autorisé' },
  keineSchueler:   { de:'Noch keine Schüler', en:'No students yet', tr:'Henüz öğrenci yok', ar:'لا يوجد طلاب بعد', es:'Aún no hay alumnos', fr:'Pas encore d\'élèves' },
  alleSchueler:    { de:'Alle Schüler', en:'All students', tr:'Tüm öğrenciler', ar:'جميع الطلاب', es:'Todos los alumnos', fr:'Tous les élèves' },
  neueFahrstunde:  { de:'Neue Fahrstunde', en:'New lesson', tr:'Yeni ders', ar:'درس جديد', es:'Nueva clase', fr:'Nouvelle leçon' },
  schuelerWaehlen: { de:'Schüler wählen', en:'Select student', tr:'Öğrenci seçin', ar:'اختر الطالب', es:'Seleccionar alumno', fr:'Choisir un élève' },
  aktiveFahrstunde:{ de:'Aktive Fahrstunde', en:'Active lesson', tr:'Aktif ders', ar:'درس نشط', es:'Clase activa', fr:'Leçon active' },
  fahrstundeLaeuft:{ de:'Fahrstunde läuft...', en:'Lesson in progress...', tr:'Ders devam ediyor...', ar:'الدرس جارٍ...', es:'Clase en curso...', fr:'Leçon en cours...' },
  bildLoeschen:    { de:'Bild löschen?', en:'Delete image?', tr:'Resim silinsin mi?', ar:'حذف الصورة؟', es:'¿Eliminar imagen?', fr:'Supprimer l\'image ?' },

  // ── Checklist items ──
  checkSehtest:    { de:'Sehtest bestanden', en:'Eye test passed', tr:'Göz testi geçildi', ar:'اجتياز فحص النظر', es:'Examen de vista aprobado', fr:'Test de vue réussi' },
  checkErsteHilfe: { de:'Erste-Hilfe-Kurs absolviert', en:'First aid course completed', tr:'İlk yardım kursu tamamlandı', ar:'إتمام دورة الإسعافات الأولية', es:'Curso de primeros auxilios completado', fr:'Cours de premiers secours terminé' },
  checkPassfoto:   { de:'Biometrisches Passfoto abgeben', en:'Submit biometric photo', tr:'Biyometrik fotoğraf teslim et', ar:'تقديم صورة بيومترية', es:'Entregar foto biométrica', fr:'Fournir une photo biométrique' },
  checkTheoriePruefung:{ de:'Theorieprüfung bestanden', en:'Theory exam passed', tr:'Teori sınavı geçildi', ar:'اجتياز الامتحان النظري', es:'Examen teórico aprobado', fr:'Examen théorique réussi' },
  checkPraktPruefung:{ de:'Praktische Prüfung bestanden', en:'Practical exam passed', tr:'Pratik sınav geçildi', ar:'اجتياز الامتحان العملي', es:'Examen práctico aprobado', fr:'Examen pratique réussi' },

  // ── Route Tracking ──
  routeUndMarkierungen: { de:'Route & Markierungen', en:'Route & Markers', tr:'Rota ve İşaretler', ar:'المسار والعلامات', es:'Ruta y marcadores', fr:'Itinéraire et repères' },
  strecke: { de:'Strecke', en:'Distance', tr:'Mesafe', ar:'المسافة', es:'Distancia', fr:'Distance' },
  geschwindigkeitLabel: { de:'Geschwindigkeit', en:'Speed', tr:'Hız', ar:'السرعة', es:'Velocidad', fr:'Vitesse' },
  markierungen: { de:'Markierungen', en:'Markers', tr:'İşaretler', ar:'العلامات', es:'Marcadores', fr:'Repères' },
  markierungSetzen: { de:'Markierung setzen', en:'Set marker', tr:'İşaret koy', ar:'وضع علامة', es:'Poner marcador', fr:'Placer un repère' },
  markierungNotiz: { de:'Anmerkung zur Markierung (optional)', en:'Marker note (optional)', tr:'İşaret notu (isteğe bağlı)', ar:'ملاحظة العلامة (اختياري)', es:'Nota del marcador (opcional)', fr:'Note du repère (facultatif)' },
  markierungGesetzt: { de:'Markierung gesetzt!', en:'Marker placed!', tr:'İşaret konuldu!', ar:'تم وضع العلامة!', es:'¡Marcador colocado!', fr:'Repère placé !' },
  streetView: { de:'Straßenansicht', en:'Street View', tr:'Sokak Görünümü', ar:'عرض الشارع', es:'Vista de calle', fr:'Vue de la rue' },
  anmerkungFahrlehrer: { de:'Anmerkung des Fahrlehrers', en:'Instructor note', tr:'Eğitmen notu', ar:'ملاحظة المدرب', es:'Nota del instructor', fr:'Note du moniteur' },
  fahrstundeLaeuft: { de:'Fahrstunde läuft', en:'Lesson in progress', tr:'Ders devam ediyor', ar:'الدرس جارٍ', es:'Clase en curso', fr:'Leçon en cours' },
  gpsWirdGesucht: { de:'GPS wird gesucht...', en:'Searching GPS...', tr:'GPS aranıyor...', ar:'جارٍ البحث عن GPS...', es:'Buscando GPS...', fr:'Recherche GPS...' },
  gpsAktiv: { de:'GPS aktiv', en:'GPS active', tr:'GPS aktif', ar:'GPS نشط', es:'GPS activo', fr:'GPS actif' },
  streetViewNichtVerfuegbar: { de:'Street View an dieser Stelle nicht verfügbar', en:'Street View not available at this location', tr:'Bu konumda Sokak Görünümü mevcut değil', ar:'عرض الشارع غير متاح في هذا الموقع', es:'Vista de calle no disponible en esta ubicación', fr:'Vue de la rue non disponible à cet emplacement' },
  tippeFuerStreetView: { de:'Tippe für Street View', en:'Tap for Street View', tr:'Sokak Görünümü için dokunun', ar:'انقر لعرض الشارع', es:'Toca para vista de calle', fr:'Appuyez pour vue de la rue' },

  // ── Support / Feedback ──
  supportFeedback: { de:'Support & Feedback', en:'Support & Feedback', tr:'Destek ve Geri Bildirim', ar:'الدعم والتعليقات', es:'Soporte y comentarios', fr:'Support et retours' },
  feedbackKategorie: { de:'Kategorie', en:'Category', tr:'Kategori', ar:'الفئة', es:'Categoría', fr:'Catégorie' },
  feedbackNachricht: { de:'Deine Nachricht', en:'Your message', tr:'Mesajınız', ar:'رسالتك', es:'Tu mensaje', fr:'Votre message' },
  feedbackPlaceholder: { de:'Beschreibe dein Anliegen oder Verbesserungsvorschlag...', en:'Describe your concern or improvement suggestion...', tr:'Endişenizi veya iyileştirme önerinizi açıklayın...', ar:'صف مشكلتك أو اقتراح التحسين...', es:'Describe tu inquietud o sugerencia de mejora...', fr:'Décrivez votre problème ou suggestion d\'amélioration...' },
  feedbackSenden: { de:'Feedback senden', en:'Send feedback', tr:'Geri bildirim gönder', ar:'إرسال التعليق', es:'Enviar comentario', fr:'Envoyer le retour' },
  feedbackGesendet: { de:'Feedback gesendet! Vielen Dank.', en:'Feedback sent! Thank you.', tr:'Geri bildirim gönderildi! Teşekkürler.', ar:'تم إرسال التعليق! شكراً لك.', es:'¡Comentario enviado! Gracias.', fr:'Retour envoyé ! Merci.' },
  feedbackFehler: { de:'Bitte eine Nachricht eingeben', en:'Please enter a message', tr:'Lütfen bir mesaj girin', ar:'يرجى إدخال رسالة', es:'Por favor ingrese un mensaje', fr:'Veuillez entrer un message' },
  katBug: { de:'Fehler melden', en:'Report bug', tr:'Hata bildir', ar:'الإبلاغ عن خطأ', es:'Reportar error', fr:'Signaler un bug' },
  katVerbesserung: { de:'Verbesserung', en:'Improvement', tr:'İyileştirme', ar:'تحسين', es:'Mejora', fr:'Amélioration' },
  katFrage: { de:'Frage', en:'Question', tr:'Soru', ar:'سؤال', es:'Pregunta', fr:'Question' },
  katSonstiges: { de:'Sonstiges', en:'Other', tr:'Diğer', ar:'أخرى', es:'Otro', fr:'Autre' },

  // ── Notes Translation ──
  notizenUebersetzen: { de:'Notizen übersetzen', en:'Translate notes', tr:'Notları çevir', ar:'ترجمة الملاحظات', es:'Traducir notas', fr:'Traduire les notes' },
  uebersetztAus: { de:'Übersetzt aus dem Deutschen', en:'Translated from German', tr:'Almancadan çevrildi', ar:'مترجم من الألمانية', es:'Traducido del alemán', fr:'Traduit de l\'allemand' },
  originalAnzeigen: { de:'Original anzeigen', en:'Show original', tr:'Orijinali göster', ar:'عرض الأصل', es:'Mostrar original', fr:'Afficher l\'original' },
  wirdUebersetzt: { de:'Wird übersetzt...', en:'Translating...', tr:'Çevriliyor...', ar:'جارٍ الترجمة...', es:'Traduciendo...', fr:'Traduction en cours...' },

  // ── Marker fix ──
  markierungAufKartenmitte: { de:'Markierung an Kartenposition gesetzt', en:'Marker placed at map position', tr:'İşaret harita konumuna yerleştirildi', ar:'تم وضع العلامة في موضع الخريطة', es:'Marcador colocado en la posición del mapa', fr:'Repère placé à la position de la carte' },
  markierungSetzenTitle: { de:'Markierung setzen', en:'Set marker', tr:'İşaret koy', ar:'وضع علامة', es:'Poner marcador', fr:'Placer un repère' },
  markierungNotizPlaceholder: { de:'z.B. Schulterblick vergessen, Vorfahrt beachten...', en:'e.g. Forgot shoulder check, observe right of way...', tr:'örn. Omuz kontrolü unutuldu...', ar:'مثل: نسي النظر فوق الكتف...', es:'ej. Olvidó mirar por encima del hombro...', fr:'ex. Oublié le regard par-dessus l\'épaule...' },
  markierungSpeichern: { de:'Speichern', en:'Save', tr:'Kaydet', ar:'حفظ', es:'Guardar', fr:'Enregistrer' },
  abbrechen: { de:'Abbrechen', en:'Cancel', tr:'İptal', ar:'إلغاء', es:'Cancelar', fr:'Annuler' },

  // ── DSGVO Banner ──
  datenschutzTitle: { de:'Datenschutz', en:'Privacy', tr:'Gizlilik', ar:'الخصوصية', es:'Privacidad', fr:'Confidentialité' },
  datenschutzBannerText: { de:'Diese App nutzt lokale Speicherung für Login und Einstellungen. Durch die Nutzung stimmst du unserer Datenschutzerklärung zu.', en:'This app uses local storage for login and settings. By using it you agree to our privacy policy.', tr:'Bu uygulama giriş ve ayarlar için yerel depolama kullanır.', ar:'يستخدم هذا التطبيق التخزين المحلي.', es:'Esta app usa almacenamiento local para inicio de sesión y configuración.', fr:'Cette application utilise le stockage local pour la connexion et les paramètres.' },
  datenschutzLink: { de:'Datenschutzerklärung lesen', en:'Read privacy policy', tr:'Gizlilik politikasını oku', ar:'اقرأ سياسة الخصوصية', es:'Leer política de privacidad', fr:'Lire la politique de confidentialité' },
  akzeptieren: { de:'Alle akzeptieren', en:'Accept all', tr:'Tümünü kabul et', ar:'قبول الكل', es:'Aceptar todo', fr:'Tout accepter' },
  nurNotwendige: { de:'Nur notwendige', en:'Essential only', tr:'Yalnızca gerekli', ar:'الضرورية فقط', es:'Solo esenciales', fr:'Essentiels uniquement' },

  // ── Invite Email ──
  einladungscode: { de:'Einladungscode', en:'Invitation Code', tr:'Davet Kodu', ar:'رمز الدعوة', es:'Código de invitación', fr:'Code d\'invitation' },
  codeCopied: { de:'Code kopiert', en:'Code copied', tr:'Kod kopyalandı', ar:'تم نسخ الرمز', es:'Código copiado', fr:'Code copié' },
  codeCopyBtn: { de:'Code kopieren', en:'Copy code', tr:'Kodu kopyala', ar:'نسخ الرمز', es:'Copiar código', fr:'Copier le code' },
  inviteEmailDesc: { de:'Einladung per E-Mail versenden:', en:'Send invitation via email:', tr:'Daveti e-posta ile gönder:', ar:'إرسال الدعوة عبر البريد الإلكتروني:', es:'Enviar invitación por email:', fr:'Envoyer l\'invitation par email :' },
  emailPlaceholder: { de:'E-Mail-Adresse eingeben', en:'Enter email address', tr:'E-posta adresini girin', ar:'أدخل عنوان البريد الإلكتروني', es:'Introducir dirección de email', fr:'Saisir l\'adresse email' },
  sendInvite: { de:'Senden', en:'Send', tr:'Gönder', ar:'إرسال', es:'Enviar', fr:'Envoyer' },
  emailRequired: { de:'Bitte E-Mail-Adresse eingeben', en:'Please enter an email address', tr:'Lütfen e-posta adresini girin', ar:'يرجى إدخال عنوان البريد الإلكتروني', es:'Por favor introduce una dirección de email', fr:'Veuillez saisir une adresse email' },
  emailInvalid: { de:'Ungültige E-Mail-Adresse', en:'Invalid email address', tr:'Geçersiz e-posta adresi', ar:'عنوان بريد إلكتروني غير صالح', es:'Dirección de email no válida', fr:'Adresse email invalide' },
  sending: { de:'Wird gesendet', en:'Sending', tr:'Gönderiliyor', ar:'جارٍ الإرسال', es:'Enviando', fr:'Envoi en cours' },
  inviteSent: { de:'Einladung gesendet an', en:'Invitation sent to', tr:'Davet gönderildi:', ar:'تم إرسال الدعوة إلى', es:'Invitación enviada a', fr:'Invitation envoyée à' },
  probefahrt: { de:'Probefahrt', en:'Test drive' },
  ohneSchueler: { de:'ohne Schüler', en:'without student' },
  sonnenuntergang: { de:'Sonnenuntergang', en:'Sunset' },
  ruhezeit11h: { de:'11h Ruhezeit', en:'11h rest period' },
  ruhezeitWarnung: { de:'Achtung: Die 11-Stunden-Ruhezeit (§5 ArbZG) wird nicht eingehalten!', en:'Warning: The 11-hour rest period is not met!' },
  ruhezeitBis: { de:'Ruhezeit bis', en:'Rest period until' },
  passwortAendern: { de:'Passwort ändern', en:'Change password' },
  aktuellesPasswort: { de:'Aktuelles Passwort', en:'Current password' },
  neuesPasswort: { de:'Neues Passwort', en:'New password' },
  neuesPasswortBestaetigen: { de:'Neues Passwort bestätigen', en:'Confirm new password' },
  passwortGeaendert: { de:'Passwort erfolgreich geändert', en:'Password changed successfully' },
  passwortFalsch: { de:'Aktuelles Passwort ist falsch', en:'Current password is incorrect' },
  passwortZuKurz: { de:'Passwort muss mindestens 6 Zeichen haben', en:'Password must be at least 6 characters' },
  pause: { de:'Pause', en:'Pause', tr:'Duraklat', ar:'إيقاف مؤقت', es:'Pausa', fr:'Pause' },
  fortsetzen: { de:'Fortsetzen', en:'Resume', tr:'Devam et', ar:'استئناف', es:'Reanudar', fr:'Reprendre' },
  pausiert: { de:'PAUSIERT', en:'PAUSED', tr:'DURAKLATILDI', ar:'متوقف مؤقتاً', es:'EN PAUSA', fr:'EN PAUSE' },
  beenden: { de:'Beenden', en:'End', tr:'Bitir', ar:'إنهاء', es:'Finalizar', fr:'Terminer' },

  // ── Time Blocks (Zeitsperren) ──
  zeitsperre: { de:'Zeitsperre', en:'Time block', tr:'Zaman engeli', ar:'حظر الوقت', es:'Bloqueo de tiempo', fr:'Blocage horaire' },
  zeitsperreErstellen: { de:'Zeitsperre erstellen', en:'Create time block', tr:'Zaman engeli oluştur', ar:'إنشاء حظر وقت', es:'Crear bloqueo de tiempo', fr:'Créer un blocage horaire' },
  zeitsperreLoeschen: { de:'Zeitsperre aufheben', en:'Remove time block', tr:'Zaman engelini kaldır', ar:'إزالة حظر الوقت', es:'Eliminar bloqueo', fr:'Supprimer le blocage' },
  zeitsperreWirklichLoeschen: { de:'Zeitsperre wirklich aufheben?', en:'Really remove this time block?', tr:'Zaman engeli gerçekten kaldırılsın mı?', ar:'هل تريد حقاً إزالة حظر الوقت؟', es:'¿Eliminar este bloqueo?', fr:'Vraiment supprimer ce blocage ?' },
  zeitsperreErstellt: { de:'Zeitsperre erstellt', en:'Time block created', tr:'Zaman engeli oluşturuldu', ar:'تم إنشاء حظر الوقت', es:'Bloqueo creado', fr:'Blocage créé' },
  zeitsperreGeloescht: { de:'Zeitsperre aufgehoben', en:'Time block removed', tr:'Zaman engeli kaldırıldı', ar:'تم إزالة حظر الوقت', es:'Bloqueo eliminado', fr:'Blocage supprimé' },
  nichtVerfuegbar: { de:'Nicht verfügbar', en:'Unavailable', tr:'Müsait değil', ar:'غير متاح', es:'No disponible', fr:'Indisponible' },
  plusZeitsperre: { de:'+ Zeitsperre', en:'+ Time block', tr:'+ Zaman engeli', ar:'+ حظر وقت', es:'+ Bloqueo', fr:'+ Blocage' },

  // ── Confirmation ──
  unbestaetigt: { de:'Unbestätigt', en:'Unconfirmed', tr:'Onaylanmamış', ar:'غير مؤكد', es:'Sin confirmar', fr:'Non confirmé' },
  wartaufBestaetigung: { de:'Wartet auf Bestätigung', en:'Awaiting confirmation', tr:'Onay bekleniyor', ar:'في انتظار التأكيد', es:'Pendiente de confirmación', fr:'En attente de confirmation' },

  // ── Recurring Appointments (Wiederkehrende Termine) ──
  wiederkehrend: { de:'Wiederkehrend', en:'Recurring', tr:'Tekrarlayan', ar:'متكرر', es:'Recurrente', fr:'Récurrent' },
  haeufigkeit: { de:'Häufigkeit', en:'Frequency', tr:'Sıklık', ar:'التكرار', es:'Frecuencia', fr:'Fréquence' },
  woechentlich: { de:'Wöchentlich', en:'Weekly', tr:'Haftalık', ar:'أسبوعي', es:'Semanal', fr:'Hebdomadaire' },
  alleZweiWochen: { de:'Alle 2 Wochen', en:'Every 2 weeks', tr:'2 haftada bir', ar:'كل أسبوعين', es:'Cada 2 semanas', fr:'Toutes les 2 semaines' },
  enddatum: { de:'Enddatum', en:'End date', tr:'Bitiş tarihi', ar:'تاريخ الانتهاء', es:'Fecha de fin', fr:'Date de fin' },
  konflikteGefunden: { de:'Konflikte gefunden', en:'Conflicts found', tr:'Çakışmalar bulundu', ar:'تم العثور على تعارضات', es:'Conflictos encontrados', fr:'Conflits trouvés' },
  keineKonflikte: { de:'Keine Konflikte', en:'No conflicts', tr:'Çakışma yok', ar:'لا تعارضات', es:'Sin conflictos', fr:'Aucun conflit' },
  konfliktFahrlehrer: { de:'Fahrlehrer belegt', en:'Instructor busy', tr:'Eğitmen meşgul', ar:'المدرب مشغول', es:'Instructor ocupado', fr:'Moniteur occupé' },
  konfliktFahrzeug: { de:'Fahrzeug belegt', en:'Vehicle busy', tr:'Araç meşgul', ar:'المركبة مشغولة', es:'Vehículo ocupado', fr:'Véhicule occupé' },
  konfliktePruefen: { de:'Konflikte prüfen...', en:'Checking conflicts...', tr:'Çakışmalar kontrol ediliyor...', ar:'جارٍ التحقق من التعارضات...', es:'Comprobando conflictos...', fr:'Vérification des conflits...' },
  wiederkehrendeTermineErstellt: { de:'Wiederkehrende Termine erstellt', en:'Recurring appointments created', tr:'Tekrarlayan randevular oluşturuldu', ar:'تم إنشاء المواعيد المتكررة', es:'Citas recurrentes creadas', fr:'Rendez-vous récurrents créés' },
  termineErstellt: { de:'{count} Termine erstellt', en:'{count} appointments created', tr:'{count} randevu oluşturuldu', ar:'تم إنشاء {count} مواعيد', es:'{count} citas creadas', fr:'{count} rendez-vous créés' },
  termineUebersprungen: { de:'{count} übersprungen (Konflikte)', en:'{count} skipped (conflicts)', tr:'{count} atlandı (çakışmalar)', ar:'{count} تم تخطيه (تعارضات)', es:'{count} omitidas (conflictos)', fr:'{count} ignorés (conflits)' },
  nurDiesenTermin: { de:'Nur diesen Termin löschen', en:'Delete only this appointment', tr:'Yalnızca bu randevuyu sil', ar:'حذف هذا الموعد فقط', es:'Eliminar solo esta cita', fr:'Supprimer uniquement ce rendez-vous' },
  diesenUndFolgende: { de:'Diesen und alle folgenden löschen', en:'Delete this and all following', tr:'Bunu ve sonrakileri sil', ar:'حذف هذا وجميع التالية', es:'Eliminar esta y las siguientes', fr:'Supprimer celui-ci et tous les suivants' },
  wiederkehrenderTermin: { de:'Wiederkehrender Termin', en:'Recurring appointment', tr:'Tekrarlayan randevu', ar:'موعد متكرر', es:'Cita recurrente', fr:'Rendez-vous récurrent' },
  serieLoeschen: { de:'Serie löschen', en:'Delete series', tr:'Seriyi sil', ar:'حذف السلسلة', es:'Eliminar serie', fr:'Supprimer la série' },
  abbrechen: { de:'Abbrechen', en:'Cancel', tr:'İptal', ar:'إلغاء', es:'Cancelar', fr:'Annuler' },
  ok: { de:'OK', en:'OK', tr:'Tamam', ar:'موافق', es:'Aceptar', fr:'OK' },
  konfliktAm: { de:'Konflikt am', en:'Conflict on', tr:'Çakışma tarihi:', ar:'تعارض في', es:'Conflicto el', fr:'Conflit le' },
  terminOk: { de:'OK', en:'OK', tr:'Tamam', ar:'موافق', es:'OK', fr:'OK' },
  // ── Theory Planning ──
  theorie: { de:'Theorie', en:'Theory', tr:'Teori', ar:'النظري', es:'Teoría', fr:'Théorie' },
  theorieplanung: { de:'Theorie-Planung', en:'Theory Planning', tr:'Teori Planlaması', ar:'تخطيط النظري', es:'Planificación teórica', fr:'Planification théorique' },
  theorieVerwaltung: { de:'Theorie-Verwaltung', en:'Theory Management', tr:'Teori Yönetimi', ar:'إدارة النظري', es:'Gestión teórica', fr:'Gestion théorique' },
  raeume: { de:'Räume', en:'Rooms', tr:'Odalar', ar:'الغرف', es:'Salas', fr:'Salles' },
  raum: { de:'Raum', en:'Room', tr:'Oda', ar:'غرفة', es:'Sala', fr:'Salle' },
  raumHinzufuegen: { de:'Raum hinzufügen', en:'Add room', tr:'Oda ekle', ar:'إضافة غرفة', es:'Añadir sala', fr:'Ajouter une salle' },
  raumName: { de:'Raumname', en:'Room name', tr:'Oda adı', ar:'اسم الغرفة', es:'Nombre de sala', fr:'Nom de la salle' },
  sitzplaetze: { de:'Sitzplätze', en:'Seats', tr:'Koltuklar', ar:'المقاعد', es:'Asientos', fr:'Places' },
  raumGespeichert: { de:'Raum gespeichert', en:'Room saved', tr:'Oda kaydedildi', ar:'تم حفظ الغرفة', es:'Sala guardada', fr:'Salle enregistrée' },
  raumGeloescht: { de:'Raum gelöscht', en:'Room deleted', tr:'Oda silindi', ar:'تم حذف الغرفة', es:'Sala eliminada', fr:'Salle supprimée' },
  themen: { de:'Themen', en:'Topics', tr:'Konular', ar:'المواضيع', es:'Temas', fr:'Sujets' },
  thema: { de:'Thema', en:'Topic', tr:'Konu', ar:'الموضوع', es:'Tema', fr:'Sujet' },
  grundstoff: { de:'Grundstoff', en:'Basic', tr:'Temel', ar:'أساسي', es:'Básico', fr:'Base' },
  zusatzstoff: { de:'Zusatzstoff B', en:'Additional B', tr:'Ek B', ar:'إضافي ب', es:'Adicional B', fr:'Complémentaire B' },
  rotation: { de:'Rotation', en:'Rotation', tr:'Rotasyon', ar:'الدوران', es:'Rotación', fr:'Rotation' },
  rotationSetup: { de:'Rotation einrichten', en:'Set up rotation', tr:'Rotasyon ayarla', ar:'إعداد الدوران', es:'Configurar rotación', fr:'Configurer la rotation' },
  wochentag: { de:'Wochentag', en:'Weekday', tr:'Hafta günü', ar:'يوم الأسبوع', es:'Día de la semana', fr:'Jour de la semaine' },
  wochentage: { de:'Wochentage', en:'Weekdays', tr:'Hafta günleri', ar:'أيام الأسبوع', es:'Días de la semana', fr:'Jours de la semaine' },
  startThema: { de:'Start-Thema Nr.', en:'Start topic no.', tr:'Başlangıç konu no.', ar:'رقم الموضوع الأول', es:'Tema inicial nº', fr:'Sujet de départ nº' },
  rotationSpeichern: { de:'Rotation speichern & Termine generieren', en:'Save rotation & generate schedule', tr:'Rotasyonu kaydet ve planla', ar:'حفظ الدوران وإنشاء الجدول', es:'Guardar rotación y generar horario', fr:'Enregistrer la rotation et générer le planning' },
  rotationGespeichert: { de:'Rotation gespeichert', en:'Rotation saved', tr:'Rotasyon kaydedildi', ar:'تم حفظ الدوران', es:'Rotación guardada', fr:'Rotation enregistrée' },
  termineGeneriert: { de:'Termine generiert', en:'Schedule generated', tr:'Takvim oluşturuldu', ar:'تم إنشاء الجدول', es:'Horario generado', fr:'Planning généré' },
  anwesenheit: { de:'Anwesenheit', en:'Attendance', tr:'Yoklama', ar:'الحضور', es:'Asistencia', fr:'Présence' },
  anwesenheitSpeichern: { de:'Anwesenheit speichern', en:'Save attendance', tr:'Yoklamayı kaydet', ar:'حفظ الحضور', es:'Guardar asistencia', fr:'Enregistrer la présence' },
  anwesenheitGespeichert: { de:'Anwesenheit gespeichert', en:'Attendance saved', tr:'Yoklama kaydedildi', ar:'تم حفظ الحضور', es:'Asistencia guardada', fr:'Présence enregistrée' },
  anwesend: { de:'anwesend', en:'present', tr:'mevcut', ar:'حاضر', es:'presente', fr:'présent' },
  anwesenheitNachUnterricht: { de:'Anwesenheit nach dem Unterricht eintragen', en:'Record attendance after the lesson', tr:'Dersten sonra yoklama girin', ar:'سجل الحضور بعد الدرس', es:'Registrar asistencia después de la clase', fr:'Enregistrer la présence après le cours' },
  theorieFortschritt: { de:'Theorie-Fortschritt', en:'Theory Progress', tr:'Teori İlerlemesi', ar:'تقدم النظري', es:'Progreso teórico', fr:'Progrès théorique' },
  theoriestunden: { de:'Theoriestunden', en:'Theory lessons', tr:'Teori dersleri', ar:'دروس نظرية', es:'Clases teóricas', fr:'Cours théoriques' },
  ausbildungsnachweis: { de:'Ausbildungsnachweis', en:'Training Certificate', tr:'E\u011fitim Belgesi', ar:'\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628', es:'Certificado de formaci\u00f3n', fr:'Certificat de formation' },
  ausbildungsnachweisGenerieren: { de:'Ausbildungsnachweis (Anlage 3) generieren', en:'Generate Training Certificate (Annex 3)', tr:'E\u011fitim belgesi olu\u015ftur', ar:'\u0625\u0646\u0634\u0627\u0621 \u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628', es:'Generar certificado de formaci\u00f3n', fr:'G\u00e9n\u00e9rer le certificat' },
  ausbildungsnachweisErstellt: { de:'Ausbildungsnachweis wird erstellt...', en:'Generating certificate...', tr:'Belge olu\u015fturuluyor...', ar:'\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0634\u0647\u0627\u062f\u0629...', es:'Generando certificado...', fr:'G\u00e9n\u00e9ration en cours...' },
  themenAbsolviert: { de:'Themen absolviert', en:'Topics completed', tr:'Konu tamamlandı', ar:'مواضيع مكتملة', es:'Temas completados', fr:'Sujets terminés' },
  theorieThema: { de:'Theorie', en:'Theory', tr:'Teori', ar:'نظري', es:'Teoría', fr:'Théorie' },
  theorieDetail: { de:'Theorie-Details', en:'Theory Details', tr:'Teori Detayları', ar:'تفاصيل النظري', es:'Detalles teóricos', fr:'Détails théoriques' },
  fahrlehrerZuweisen: { de:'Fahrlehrer zuweisen', en:'Assign instructor', tr:'Eğitmen ata', ar:'تعيين مدرب', es:'Asignar instructor', fr:'Assigner un moniteur' },
  keinFahrlehrer: { de:'Kein Fahrlehrer', en:'No instructor', tr:'Eğitmen yok', ar:'لا يوجد مدرب', es:'Sin instructor', fr:'Aucun moniteur' },
  nichtZugewiesen: { de:'Nicht zugewiesen', en:'Not assigned', tr:'Atanmamış', ar:'غير معين', es:'No asignado', fr:'Non assigné' },
  geplant: { de:'Geplant', en:'Scheduled', tr:'Planlanmış', ar:'مجدول', es:'Planificado', fr:'Planifié' },
  abgeschlossen: { de:'Abgeschlossen', en:'Completed', tr:'Tamamlandı', ar:'مكتمل', es:'Completado', fr:'Terminé' },
  aktuelleRotation: { de:'Aktuelle Rotation', en:'Current rotation', tr:'Mevcut rotasyon', ar:'الدوران الحالي', es:'Rotación actual', fr:'Rotation actuelle' },
  keineRaeume: { de:'Noch keine Räume angelegt', en:'No rooms created yet', tr:'Henüz oda oluşturulmadı', ar:'لم يتم إنشاء غرف بعد', es:'Aún no hay salas', fr:'Aucune salle créée' },
  keineRotation: { de:'Noch keine Rotation eingerichtet', en:'No rotation set up yet', tr:'Henüz rotasyon ayarlanmadı', ar:'لم يتم إعداد الدوران بعد', es:'Aún no hay rotación', fr:'Aucune rotation configurée' },
  bearbeiten: { de:'Bearbeiten', en:'Edit', tr:'Düzenle', ar:'تعديل', es:'Editar', fr:'Modifier' },
  mo: { de:'Mo', en:'Mon', tr:'Pzt', ar:'اثن', es:'Lu', fr:'Lu' },
  di: { de:'Di', en:'Tue', tr:'Sal', ar:'ثلا', es:'Ma', fr:'Ma' },
  mi: { de:'Mi', en:'Wed', tr:'Çar', ar:'أرب', es:'Mi', fr:'Me' },
  do_: { de:'Do', en:'Thu', tr:'Per', ar:'خمي', es:'Ju', fr:'Je' },
  fr: { de:'Fr', en:'Fri', tr:'Cum', ar:'جمع', es:'Vi', fr:'Ve' },
  sa: { de:'Sa', en:'Sat', tr:'Cmt', ar:'سبت', es:'Sá', fr:'Sa' },
  zweierAnsicht: { de:'Zweier-Ansicht', en:'Dual View', tr:'İkili Görünüm', ar:'عرض مزدوج', es:'Vista doble', fr:'Vue double' },
  einzelansicht: { de:'Einzelansicht', en:'Single View', tr:'Tekli Görünüm', ar:'عرض فردي', es:'Vista simple', fr:'Vue simple' },
  sucheSchuelerFahrlehrer: { de:'Fahrschüler oder Fahrlehrer suchen...', en:'Search students or instructors...', tr:'Öğrenci veya eğitmen ara...', ar:'بحث عن طالب أو مدرب...', es:'Buscar alumnos o instructores...', fr:'Rechercher élèves ou moniteurs...' },
  alleRotationenLoeschen: { de:'Alle Rotationen löschen', en:'Delete all rotations', tr:'Tüm rotasyonları sil', ar:'حذف جميع الدورات', es:'Eliminar todas las rotaciones', fr:'Supprimer toutes les rotations' },
  rotationLoeschenBestaetigen: { de:'Diese Rotation wirklich löschen?', en:'Delete this rotation?', tr:'Bu rotasyonu silmek istediğinizden emin misiniz?', ar:'هل تريد حذف هذه الدورة؟', es:'¿Eliminar esta rotación?', fr:'Supprimer cette rotation ?' },
  alleRotationenLoeschenBestaetigen: { de:'Alle Rotationen löschen? (Bereits geplante Termine bleiben bestehen)', en:'Delete all rotations? (Already scheduled sessions remain)', tr:'Tüm rotasyonları sil?', ar:'حذف جميع الدورات؟', es:'¿Eliminar todas las rotaciones?', fr:'Supprimer toutes les rotations ?' },
  geloescht: { de:'Gelöscht', en:'Deleted', tr:'Silindi', ar:'تم الحذف', es:'Eliminado', fr:'Supprimé' },
  keineErgebnisse: { de:'Keine Ergebnisse', en:'No results', tr:'Sonuç yok', ar:'لا نتائج', es:'Sin resultados', fr:'Aucun résultat' },
  keineTheorieDaten: { de:'Keine Theoriedaten verfügbar', en:'No theory data available', tr:'Teori verisi yok', ar:'لا توجد بيانات نظرية', es:'Sin datos de teoría', fr:'Aucune donnée théorique' },
  von: { de:'von', en:'of', tr:'/', ar:'من', es:'de', fr:'de' },
  wiederkehrendZuweisen: { de:'Wiederkehrend zuweisen (jeden gleichen Wochentag)', en:'Assign recurring (every same weekday)', tr:'Tekrarlamalı ata (her aynı hafta günü)', ar:'تعيين متكرر', es:'Asignar recurrente', fr:'Assigner récurrent' },
  weitereTermine: { de:'weitere Termine aktualisiert', en:'more sessions updated', tr:'daha fazla oturum güncellendi', ar:'تم تحديث المزيد', es:'más sesiones actualizadas', fr:'sessions supplémentaires mises à jour' },
  gespeichert: { de:'Gespeichert', en:'Saved', tr:'Kaydedildi', ar:'تم الحفظ', es:'Guardado', fr:'Enregistré' },
  // ── Slot Offer (Termine anbieten) ──
  termineAnbieten: { de:'Termine anbieten', en:'Offer slots', tr:'Randevu sun', ar:'عرض مواعيد', es:'Ofrecer citas', fr:'Proposer des créneaux' },
  anbieten: { de:'Anbieten', en:'Offer', tr:'Sun', ar:'عرض', es:'Ofrecer', fr:'Proposer' },
  slotDauer: { de:'Dauer pro Slot', en:'Duration per slot', tr:'Slot süresi', ar:'مدة كل موعد', es:'Duración por slot', fr:'Durée par créneau' },
  ablaufzeit: { de:'Ablaufzeit', en:'Expiry time', tr:'Son kullanma süresi', ar:'وقت الانتهاء', es:'Tiempo de expiración', fr:'Délai d\'expiration' },
  absagefrist: { de:'Absagefrist', en:'Cancellation deadline', tr:'İptal süresi', ar:'مهلة الإلغاء', es:'Plazo de cancelación', fr:'Délai d\'annulation' },
  schuelerAuswaehlen: { de:'Schüler auswählen', en:'Select students', tr:'Öğrenci seç', ar:'اختر طلاب', es:'Seleccionar alumnos', fr:'Sélectionner des élèves' },
  alleAuswaehlen: { de:'Alle auswählen', en:'Select all', tr:'Tümünü seç', ar:'تحديد الكل', es:'Seleccionar todos', fr:'Tout sélectionner' },
  woechentlichWiederholen: { de:'Wöchentlich wiederholen', en:'Repeat weekly', tr:'Haftalık tekrarla', ar:'تكرار أسبوعي', es:'Repetir semanalmente', fr:'Répéter chaque semaine' },
  termineAngeboten: { de:'Termine erfolgreich angeboten', en:'Slots offered successfully', tr:'Randevular başarıyla sunuldu', ar:'تم عرض المواعيد بنجاح', es:'Citas ofrecidas con éxito', fr:'Créneaux proposés avec succès' },
  keinFahrzeug: { de:'Kein Fahrzeug', en:'No vehicle', tr:'Araç yok', ar:'بدون مركبة', es:'Sin vehículo', fr:'Aucun véhicule' },
  keinAblauf: { de:'Kein Ablauf', en:'No expiry', tr:'Süresiz', ar:'بدون انتهاء', es:'Sin expiración', fr:'Sans expiration' },
  abschicken: { de:'Abschicken', en:'Submit', tr:'Gönder', ar:'إرسال', es:'Enviar', fr:'Envoyer' },
  offeneAngebote: { de:'Offene Angebote', en:'Open offers', tr:'Açık teklifler', ar:'عروض مفتوحة', es:'Ofertas abiertas', fr:'Offres ouvertes' },
  naechsteFahrstunden: { de:'Nächste Fahrstunden', en:'Upcoming lessons', tr:'Yaklaşan dersler', ar:'الدروس القادمة', es:'Próximas clases', fr:'Prochaines leçons' },
  absolvierteFahrstunden: { de:'Absolvierte Fahrstunden', en:'Completed lessons', tr:'Tamamlanan dersler', ar:'دروس مكتملة', es:'Clases completadas', fr:'Leçons terminées' },
  buchungBestaetigen: { de:'Buchen', en:'Book', tr:'Rezerve et', ar:'حجز', es:'Reservar', fr:'Réserver' },
  buchungErfolgreich: { de:'Termin erfolgreich gebucht', en:'Slot booked successfully', tr:'Randevu başarıyla rezerve edildi', ar:'تم حجز الموعد بنجاح', es:'Cita reservada con éxito', fr:'Créneau réservé avec succès' },
  terminAbsagen: { de:'Termin absagen', en:'Cancel appointment', tr:'Randevuyu iptal et', ar:'إلغاء الموعد', es:'Cancelar cita', fr:'Annuler le rendez-vous' },
  absageErfolgreich: { de:'Termin abgesagt', en:'Appointment cancelled', tr:'Randevu iptal edildi', ar:'تم إلغاء الموعد', es:'Cita cancelada', fr:'Rendez-vous annulé' },
  absageFristAbgelaufen: { de:'Absagefrist abgelaufen', en:'Cancellation deadline passed', tr:'İptal süresi doldu', ar:'انتهت مهلة الإلغاء', es:'Plazo de cancelación vencido', fr:'Délai d\'annulation expiré' },
  abgelaufen: { de:'Abgelaufen', en:'Expired', tr:'Süresi dolmuş', ar:'منتهي', es:'Expirado', fr:'Expiré' },
  slotAuswahlModus: { de:'Klicken Sie auf freie Zeiten im Kalender, um Slots auszuwählen', en:'Click free times in calendar to select slots', tr:'Slot seçmek için takvimde boş zamanlara tıklayın', ar:'انقر على أوقات فارغة في التقويم لتحديد المواعيد', es:'Haga clic en tiempos libres del calendario', fr:'Cliquez sur des créneaux libres dans le calendrier' },
  gebuchtVon: { de:'Gebucht von', en:'Booked by', tr:'Rezerve eden', ar:'حجز بواسطة', es:'Reservado por', fr:'Réservé par' },
  slotFrei: { de:'Frei', en:'Available', tr:'Müsait', ar:'متاح', es:'Disponible', fr:'Disponible' },
  keineOffenenAngebote: { de:'Keine offenen Angebote', en:'No open offers', tr:'Açık teklif yok', ar:'لا عروض مفتوحة', es:'Sin ofertas abiertas', fr:'Aucune offre ouverte' },
  angebotAbgelaufen: { de:'Angebot abgelaufen', en:'Offer expired', tr:'Teklif süresi doldu', ar:'انتهت صلاحية العرض', es:'Oferta expirada', fr:'Offre expirée' },
  meineAngebote: { de:'Meine Angebote', en:'My offers', tr:'Tekliflerim', ar:'عروضي', es:'Mis ofertas', fr:'Mes offres' },
  keineAngebote: { de:'Noch keine Angebote erstellt', en:'No offers created yet', tr:'Henüz teklif oluşturulmadı', ar:'لم يتم إنشاء عروض بعد', es:'Aún no se han creado ofertas', fr:'Aucune offre créée' },
  aktiv: { de:'Aktiv', en:'Active', tr:'Aktif', ar:'نشط', es:'Activo', fr:'Actif' },
  offen2: { de:'Offen', en:'Open', tr:'Açık', ar:'مفتوح', es:'Abierto', fr:'Ouvert' },
  gebucht: { de:'Gebucht', en:'Booked', tr:'Rezerve', ar:'محجوز', es:'Reservado', fr:'Réservé' },
  empfaenger: { de:'Empfänger', en:'Recipients', tr:'Alıcılar', ar:'المستلمون', es:'Destinatarios', fr:'Destinataires' }
};

// ── Day names by language ──
var DAY_NAMES_I18N = {
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  tr: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
  ar: ['اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
};

var DAY_NAMES_LONG_I18N = {
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  tr: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  ar: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
};

var MONTH_NAMES_I18N = {
  de: ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  en: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
  tr: ['Oca.', 'Şub.', 'Mar.', 'Nis.', 'May.', 'Haz.', 'Tem.', 'Ağu.', 'Eyl.', 'Eki.', 'Kas.', 'Ara.'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  es: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  fr: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
};

// ── Lesson type key map (German internal → i18n key) ──
var TYPE_KEY_MAP = {
  'Übungsfahrt': 'uebungsfahrt', 'Überlandfahrt': 'ueberlandfahrt',
  'Autobahnfahrt': 'autobahnfahrt', 'Nachtfahrt': 'nachtfahrt',
  'Prüfungsvorbereitung': 'pruefungsvorbereitung',
  'Praktische Prüfung': 'praktischePruefung', 'Theoretische Prüfung': 'theoretischePruefung',
  'Zeitsperre': 'zeitsperre'
};

// ── Skill task key map ──
var SKILL_KEY_MAP = {
  'Abbiegen': 'abbiegen', 'Spurwechsel': 'spurwechsel', 'Vorfahrt': 'vorfahrt',
  'Einparken': 'einparken', 'Geschwindigkeit': 'geschwindigkeit',
  'Verkehrszeichen': 'verkehrszeichen', 'Schulterblick': 'schulterblick',
  'Allgemeines Fahrverhalten': 'allgFahrverhalten'
};

// ── Skill level key map ──
var LEVEL_KEY_MAP = {
  'Anfänger': 'anfaenger', 'Fortgeschritten': 'fortgeschritten',
  'Sicher': 'sicher', 'Prüfungsreif': 'pruefungsreif'
};

// ── Status key map (backend stores German values) ──
var STATUS_KEY_MAP = {
  'bestätigt': 'bestaetigt', 'geplant': 'geplant', 'offen': 'offen',
  'Offen': 'offen', 'verwendet': 'verwendet'
};

// ── Core translation functions ──
function t(key, params) {
  var lang = (typeof AppState !== 'undefined' && AppState.language) || 'de';
  var entry = TRANSLATIONS[key];
  if (!entry) return key;
  var str = entry[lang] || entry['de'] || key;
  if (params) {
    Object.keys(params).forEach(function(k) {
      str = str.replace('{' + k + '}', params[k]);
    });
  }
  return str;
}

function tType(germanType) {
  var key = TYPE_KEY_MAP[germanType];
  return key ? t(key) : germanType;
}

function tSkill(germanSkill) {
  var key = SKILL_KEY_MAP[germanSkill];
  return key ? t(key) : germanSkill;
}

function tLevel(germanLevel) {
  var key = LEVEL_KEY_MAP[germanLevel];
  return key ? t(key) : germanLevel;
}

function tStatus(germanStatus) {
  var key = STATUS_KEY_MAP[germanStatus];
  return key ? t(key) : germanStatus;
}

function getDayNames() {
  var lang = (typeof AppState !== 'undefined' && AppState.language) || 'de';
  return DAY_NAMES_I18N[lang] || DAY_NAMES_I18N['de'];
}

function getDayNamesLong() {
  var lang = (typeof AppState !== 'undefined' && AppState.language) || 'de';
  return DAY_NAMES_LONG_I18N[lang] || DAY_NAMES_LONG_I18N['de'];
}

function getMonthNames() {
  var lang = (typeof AppState !== 'undefined' && AppState.language) || 'de';
  return MONTH_NAMES_I18N[lang] || MONTH_NAMES_I18N['de'];
}

// ── Apply language to DOM ──
function applyLanguageToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
}

function setLanguageDirection(lang) {
  if (lang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
}
