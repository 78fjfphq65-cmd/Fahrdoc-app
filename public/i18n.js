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
  nurNotwendige: { de:'Nur notwendige', en:'Essential only', tr:'Yalnızca gerekli', ar:'الضرورية فقط', es:'Solo esenciales', fr:'Essentiels uniquement' }
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
  'Praktische Prüfung': 'praktischePruefung', 'Theoretische Prüfung': 'theoretischePruefung'
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
