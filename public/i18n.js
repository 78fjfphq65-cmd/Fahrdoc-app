/* ============================================
   FahrDoc — i18n (Internationalization)
   Languages: de, en, tr, ar, es, fr, pt
   Fallback-Kette: pt → es (verwandt) → en → de
   ============================================ */

var LANGUAGES = [
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe',    flag: '🇹🇷' },
  { code: 'ar', name: 'العربية',   flag: '🇸🇦' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'pt', name: 'Português',  flag: '🇵🇹' }
];

var TRANSLATIONS = {
  // ── Navigation & Tabs ──
  dashboard:       { de:'Dashboard', en:'Dashboard', tr:'Panel', ar:'لوحة القيادة', es:'Panel', fr:'Tableau de bord' , pt:'Painel' },
  planung:         { de:'Planung', en:'Schedule', tr:'Planlama', ar:'الجدول', es:'Planificación', fr:'Planning' , pt:'Agenda' },
  fahrlehrer:      { de:'Fahrlehrer', en:'Instructors', tr:'Eğitmenler', ar:'المدربون', es:'Instructores', fr:'Moniteurs' , pt:'Instrutores' },
  schueler:        { de:'Schüler', en:'Students', tr:'Öğrenciler', ar:'الطلاب', es:'Alumnos', fr:'Élèves' , pt:'Alunos' },
  abo:             { de:'Abo', en:'Plan', tr:'Abonelik', ar:'الاشتراك', es:'Suscripción', fr:'Abonnement' },
  profil:          { de:'Profil', en:'Profile', tr:'Profil', ar:'الملف الشخصي', es:'Perfil', fr:'Profil' },
  fahrstunden:     { de:'Fahrstunden', en:'Lessons', tr:'Dersler', ar:'الدروس', es:'Clases', fr:'Leçons' },
  anmelden:        { de:'Anmelden', en:'Sign in', tr:'Giriş yap', ar:'تسجيل الدخول', es:'Iniciar sesión', fr:'Connexion' },
  registrieren:    { de:'Registrieren', en:'Register', tr:'Kayıt ol', ar:'تسجيل', es:'Registrarse', fr:'S\'inscrire' },
  abmelden:        { de:'Abmelden', en:'Sign out', tr:'Çıkış', ar:'تسجيل الخروج', es:'Cerrar sesión', fr:'Déconnexion' , pt:'Sair' },

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
  fahrschulCode:   { de:'Fahrschul-Code', en:'School code', tr:'Okul kodu', ar:'رمز المدرسة', es:'Código de escuela', fr:'Code de l\'école', pt:'Código da escola' },
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
  typ:             { de:'Typ', en:'Type', tr:'Tür', ar:'النوع', es:'Tipo', fr:'Type' , pt:'Tipo' },
  datum:           { de:'Datum', en:'Date', tr:'Tarih', ar:'التاريخ', es:'Fecha', fr:'Date' , pt:'Data' },
  start:           { de:'Start', en:'Start', tr:'Başlangıç', ar:'البداية', es:'Inicio', fr:'Début' },
  ende:            { de:'Ende', en:'End', tr:'Bitiş', ar:'النهاية', es:'Fin', fr:'Fin' },
  dauer:           { de:'Dauer', en:'Duration', tr:'Süre', ar:'المدة', es:'Duración', fr:'Durée' , pt:'Duração' },
  schuelerLeer:    { de:'Fahrschüler (leer = offener Block)', en:'Student (empty = open block)', tr:'Öğrenci (boş = açık blok)', ar:'الطالب (فارغ = كتلة مفتوحة)', es:'Alumno (vacío = bloque abierto)', fr:'Élève (vide = bloc ouvert)' },
  klasse:          { de:'Klasse', en:'Class', tr:'Sınıf', ar:'الفئة', es:'Clase', fr:'Catégorie' , pt:'Categoria' },
  notizen:         { de:'Notizen', en:'Notes', tr:'Notlar', ar:'ملاحظات', es:'Notas', fr:'Notes' , pt:'Observações' },
  optional:        { de:'Optional...', en:'Optional...', tr:'İsteğe bağlı...', ar:'اختياري...', es:'Opcional...', fr:'Facultatif...' },
  speichern:       { de:'Speichern', en:'Save', tr:'Kaydet', ar:'حفظ', es:'Guardar', fr:'Enregistrer' , pt:'Salvar' },
  loeschen:        { de:'Löschen', en:'Delete', tr:'Sil', ar:'حذف', es:'Eliminar', fr:'Supprimer' , pt:'Excluir' },
  fahrstundeStarten:{ de:'Fahrstunde starten', en:'Start lesson', tr:'Derse başla', ar:'بدء الدرس', es:'Iniciar clase', fr:'Commencer la leçon' },
  plusTermin:       { de:'+ Termin', en:'+ Appointment', tr:'+ Randevu', ar:'+ موعد', es:'+ Cita', fr:'+ Rendez-vous' },
  offen:           { de:'Offen', en:'Open', tr:'Açık', ar:'مفتوح', es:'Abierto', fr:'Ouvert' },
  offenerBlock:    { de:'Offener Block', en:'Open block', tr:'Açık blok', ar:'كتلة مفتوحة', es:'Bloque abierto', fr:'Bloc ouvert' },

  // ── Lessons ──
  fahrstundeBeenden:{ de:'Fahrstunde beenden', en:'End lesson', tr:'Dersi bitir', ar:'إنهاء الدرس', es:'Finalizar clase', fr:'Terminer la leçon' },
  zusammenfassung: { de:'Zusammenfassung', en:'Summary', tr:'Özet', ar:'ملخص', es:'Resumen', fr:'Résumé' },
  bewertung:       { de:'Bewertung', en:'Assessment', tr:'Değerlendirme', ar:'التقييم', es:'Evaluación', fr:'Évaluation' , pt:'Avaliação' },
  bilderOptional:  { de:'Bilder (optional)', en:'Images (optional)', tr:'Resimler (isteğe bağlı)', ar:'صور (اختياري)', es:'Imágenes (opcional)', fr:'Images (facultatif)' },
  bilderHochladen: { de:'Bilder hochladen', en:'Upload images', tr:'Resim yükle', ar:'رفع صور', es:'Subir imágenes', fr:'Télécharger des images' },
  bilderHinzufuegen:{ de:'Bilder hinzufügen', en:'Add images', tr:'Resim ekle', ar:'إضافة صور', es:'Añadir imágenes', fr:'Ajouter des images' },
  fahrstundeSpeichern:{ de:'Fahrstunde speichern', en:'Save lesson', tr:'Dersi kaydet', ar:'حفظ الدرس', es:'Guardar clase', fr:'Enregistrer la leçon' },
  protokollSofortTeilen:{ de:'Protokoll sofort teilen', en:'Share report now', tr:'Raporu hemen payla\u015f', ar:'\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0622\u0646', es:'Compartir informe ahora', fr:'Partager le rapport' },
  fahrstundeBearbeiten:{ de:'Fahrstunde bearbeiten', en:'Edit lesson', tr:'Dersi düzenle', ar:'تعديل الدرس', es:'Editar clase', fr:'Modifier la leçon' },
  fahrstundeLoeschen:{ de:'Fahrstunde löschen', en:'Delete lesson', tr:'Dersi sil', ar:'حذف الدرس', es:'Eliminar clase', fr:'Supprimer la leçon' },
  fahrstundentyp:  { de:'Fahrstundentyp', en:'Lesson type', tr:'Ders türü', ar:'نوع الدرس', es:'Tipo de clase', fr:'Type de leçon' },
  wirklichLoeschen:{ de:'Fahrstunde wirklich löschen?', en:'Really delete this lesson?', tr:'Ders gerçekten silinsin mi?', ar:'هل تريد حقاً حذف هذا الدرس؟', es:'¿Eliminar esta clase?', fr:'Vraiment supprimer cette leçon ?' },
  fahrstundeAktualisiert:{ de:'Fahrstunde aktualisiert!', en:'Lesson updated!', tr:'Ders güncellendi!', ar:'تم تحديث الدرس!', es:'¡Clase actualizada!', fr:'Leçon mise à jour !' },
  fahrstundeGeloescht:{ de:'Fahrstunde gelöscht', en:'Lesson deleted', tr:'Ders silindi', ar:'تم حذف الدرس', es:'Clase eliminada', fr:'Leçon supprimée' },
  bilderWerdenHochgeladen:{ de:'Bilder werden hochgeladen...', en:'Uploading images...', tr:'Resimler yükleniyor...', ar:'جاري رفع الصور...', es:'Subiendo imágenes...', fr:'Téléchargement des images...' },
  bilderHochgeladen:{ de:'Bilder erfolgreich hochgeladen!', en:'Images uploaded successfully!', tr:'Resimler başarıyla yüklendi!', ar:'تم رفع الصور بنجاح!', es:'¡Imágenes subidas correctamente!', fr:'Images téléchargées avec succès !' },
  bilder:          { de:'Bilder', en:'Images', tr:'Resimler', ar:'صور', es:'Imágenes', fr:'Images' , pt:'Imagens' },

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
  einstellungen:   { de:'Einstellungen', en:'Settings', tr:'Ayarlar', ar:'الإعدادات', es:'Configuración', fr:'Paramètres' , pt:'Configurações' },
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

  // ── Zugangsentzug Fahrlehrer (Fahrschulansicht) ──
  zugangEntziehen: { de:'Zugang entziehen', en:'Revoke access', tr:'Erişimi kaldır', ar:'إلغاء الوصول', es:'Revocar acceso', fr:'Révoquer l\'accès', pt:'Revogar acesso' },
  zugangEntzogen: { de:'Zugang entzogen', en:'Access revoked', tr:'Erişim kaldırıldı', ar:'تم إلغاء الوصول', es:'Acceso revocado', fr:'Accès révoqué', pt:'Acesso revogado' },
  zugangWiederherstellen: { de:'Zugang wiederherstellen', en:'Restore access', tr:'Erişimi geri yükle', ar:'استعادة الوصول', es:'Restaurar acceso', fr:'Rétablir l\'accès', pt:'Restaurar acesso' },
  ehemaligeFahrlehrer: { de:'Ehemalige Fahrlehrer', en:'Former instructors', tr:'Eski eğitmenler', ar:'المدربون السابقون', es:'Instructores anteriores', fr:'Anciens moniteurs', pt:'Instrutores anteriores' },
  zugangEntziehenFrage: { de:'Zugang von {name} entziehen?', en:'Revoke access for {name}?', tr:'{name} erişimi kaldırılsın mı?', ar:'إلغاء وصول {name}؟', es:'¿Revocar el acceso de {name}?', fr:'Révoquer l\'accès de {name} ?', pt:'Revogar o acesso de {name}?' },
  zugangEntziehenErklaerung: { de:'{name} kann sich sofort nicht mehr anmelden und keine Fahrstunden mehr im Namen der Fahrschule aufzeichnen. Laufende Sitzungen werden beendet.', en:'{name} will immediately be unable to sign in or record lessons on behalf of the school. Active sessions are ended.', tr:'{name} anında giriş yapamaz ve okul adına ders kaydedemez. Aktif oturumlar sonlanır.', ar:'لن يتمكن {name} من تسجيل الدخول أو تسجيل الدروس باسم المدرسة فوراً. وستنتهي الجلسات النشطة.', es:'{name} no podrá iniciar sesión ni registrar clases en nombre de la autoescuela de inmediato. Las sesiones activas finalizan.', fr:'{name} ne pourra plus se connecter ni enregistrer de leçons au nom de l\'auto-école. Les sessions actives sont terminées.', pt:'{name} não poderá mais entrar nem registar aulas em nome da escola. As sessões ativas são encerradas.' },
  zugangEntziehenBleibt: { de:'Erhalten bleiben: {lessons} dokumentierte Fahrstunden und {students} zugeordnete Schüler.', en:'Retained: {lessons} documented lessons and {students} assigned students.', tr:'Korunur: {lessons} kayıtlı ders ve {students} atanmış öğrenci.', ar:'يتم الاحتفاظ بـ: {lessons} درساً موثقاً و{students} طالباً معيناً.', es:'Se conservan: {lessons} clases documentadas y {students} alumnos asignados.', fr:'Conservés : {lessons} leçons documentées et {students} élèves attribués.', pt:'Mantidos: {lessons} aulas documentadas e {students} alunos atribuídos.' },
  zugangEntziehenTermine: { de:'Achtung: {count} geplante Termine bleiben ihm zugeordnet. Bitte vorher umplanen.', en:'Note: {count} upcoming appointments stay assigned to them. Please reschedule first.', tr:'Dikkat: {count} planlanmış randevu ona atanmış kalır. Lütfen önce yeniden planlayın.', ar:'تنبيه: ستبقى {count} مواعيد مجدولة معينة له. يرجى إعادة الجدولة أولاً.', es:'Atención: {count} citas programadas siguen asignadas a él. Reprograma antes.', fr:'Attention : {count} rendez-vous planifiés lui restent attribués. Veuillez replanifier avant.', pt:'Atenção: {count} marcações agendadas continuam atribuídas a ele. Reagende antes.' },
  zugangEntziehenNeuerCode: { de:'Für eine Rückkehr braucht er einen neuen Einladungscode.', en:'To return, they will need a new invitation code.', tr:'Geri dönmek için yeni bir davet koduna ihtiyacı olur.', ar:'للعودة، سيحتاج إلى رمز دعوة جديد.', es:'Para volver necesitará un nuevo código de invitación.', fr:'Pour revenir, il lui faudra un nouveau code d\'invitation.', pt:'Para regressar, precisará de um novo código de convite.' },
  zugangEntzogenAm: { de:'Entzogen am {date}', en:'Revoked on {date}', tr:'{date} tarihinde kaldırıldı', ar:'أُلغي في {date}', es:'Revocado el {date}', fr:'Révoqué le {date}', pt:'Revogado em {date}' },
  zugangEntzogenErfolg: { de:'Zugang von {name} entzogen', en:'Access revoked for {name}', tr:'{name} erişimi kaldırıldı', ar:'تم إلغاء وصول {name}', es:'Acceso de {name} revocado', fr:'Accès de {name} révoqué', pt:'Acesso de {name} revogado' },
  zugangWiederhergestellt: { de:'Zugang von {name} wiederhergestellt', en:'Access restored for {name}', tr:'{name} erişimi geri yüklendi', ar:'تمت استعادة وصول {name}', es:'Acceso de {name} restaurado', fr:'Accès de {name} rétabli', pt:'Acesso de {name} restaurado' },
  widerrufen: { de:'Widerrufen', en:'Revoked', tr:'İptal edildi', ar:'ملغى', es:'Revocado', fr:'Révoqué', pt:'Revogado' },
  aktiveFahrlehrer: { de:'Aktive Fahrlehrer', en:'Active instructors', tr:'Aktif eğitmenler', ar:'المدربون النشطون', es:'Instructores activos', fr:'Moniteurs actifs', pt:'Instrutores ativos' },

  // ── Wiedereintritt nach Zugangsentzug (Login) ──
  zugangEntzogenTitel: { de:'Zugang entzogen', en:'Access revoked', tr:'Erişim kaldırıldı', ar:'تم إلغاء الوصول', es:'Acceso revocado', fr:'Accès révoqué', pt:'Acesso revogado' },
  zugangEntzogenHinweis: { de:'Deine Fahrschule hat deinen Zugang beendet. Mit einem neuen Einladungscode kannst du dich wieder freischalten.', en:'Your driving school has ended your access. You can unlock your account again with a new invitation code.', tr:'Sürücü kursun erişimini sonlandırdı. Yeni bir davet koduyla hesabını tekrar açabilirsin.', ar:'أنهت مدرسة القيادة وصولك. يمكنك إعادة تفعيل حسابك برمز دعوة جديد.', es:'Tu autoescuela ha finalizado tu acceso. Puedes reactivar tu cuenta con un nuevo código de invitación.', fr:'Votre auto-école a mis fin à votre accès. Vous pouvez réactiver votre compte avec un nouveau code d\'invitation.', pt:'A tua escola encerrou o teu acesso. Podes reativar a conta com um novo código de convite.' },
  neuerCodeEinloesen: { de:'Neuen Code einlösen', en:'Redeem new code', tr:'Yeni kodu kullan', ar:'استبدال الرمز الجديد', es:'Canjear nuevo código', fr:'Utiliser un nouveau code', pt:'Resgatar novo código' },
  wiederFreigeschaltet: { de:'Willkommen zurück! Dein Zugang ist wieder aktiv.', en:'Welcome back! Your access is active again.', tr:'Tekrar hoş geldin! Erişimin yeniden aktif.', ar:'مرحباً بعودتك! أصبح وصولك نشطاً مرة أخرى.', es:'¡Bienvenido de nuevo! Tu acceso está activo otra vez.', fr:'Bon retour ! Votre accès est de nouveau actif.', pt:'Bem-vindo de volta! O teu acesso está novamente ativo.' },
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
  berichtFuerSchueler: { de:'Bericht für Schüler senden', en:'Send report to student', tr:'Öğrenciye rapor gönder', ar:'إرسال التقرير للطالب', es:'Enviar informe al alumno', fr:'Envoyer le rapport à l\u2019élève' },
  berichtWirdErstellt: { de:'Bericht wird erstellt...', en:'Generating report...', tr:'Rapor oluşturuluyor...', ar:'جارٍ إنشاء التقرير...', es:'Generando informe...', fr:'Génération du rapport...' , pt:'Gerando relatório...' },
  berichtErstellt:     { de:'Bericht erstellt', en:'Report created', tr:'Rapor oluşturuldu', ar:'تم إنشاء التقرير', es:'Informe creado', fr:'Rapport créé' },
  berichtGeteilt:      { de:'Bericht geteilt', en:'Report shared', tr:'Rapor paylaşıldı', ar:'تمت مشاركة التقرير', es:'Informe compartido', fr:'Rapport partagé' },
  // PDF-Bericht Strings
  pdfTitel:            { de:'Fahrstunden-Bericht', en:'Driving Lesson Report', tr:'Sürüş Dersi Raporu', ar:'تقرير درس القيادة', es:'Informe de clase de conducir', fr:'Rapport de leçon de conduite' , pt:'Relatório de Aula de Condução' },
  pdfRoute:            { de:'Route', en:'Route', tr:'Rota', ar:'المسار', es:'Ruta', fr:'Itinéraire' , pt:'Percurso' },
  pdfTempo:            { de:'\u00d8 Tempo', en:'\u00d8 Speed', tr:'\u00d8 H\u0131z', ar:'\u00d8 \u0627\u0644\u0633\u0631\u0639\u0629', es:'\u00d8 Velocidad', fr:'\u00d8 Vitesse' , pt:'Ø Velocidade' },
  pdfMarkierung:       { de:'Markierung', en:'Marker', tr:'\u0130\u015faret', ar:'\u0639\u0644\u0627\u0645\u0629', es:'Marcador', fr:'Rep\u00e8re' , pt:'Marcação' },
  pdfInKarteOeffnen:   { de:'In Karte \u00f6ffnen \u203a', en:'Open in map \u203a', tr:'Haritada a\u00e7 \u203a', ar:'\u200f\u0641\u062a\u062d \u0641\u064a \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u2039', es:'Abrir en el mapa \u203a', fr:'Ouvrir dans la carte \u203a' , pt:'Abrir no mapa ›' },
  pdfStreetViewBtn:    { de:'Street View \u00f6ffnen', en:'Open Street View', tr:'Street View\u2019\u0131 a\u00e7', ar:'\u0641\u062a\u062d Street View', es:'Abrir Street View', fr:'Ouvrir Street View' , pt:'Abrir Street View' },
  pdfStreetViewHinweis:{ de:'Tippe auf die Buttons unten, um die Stelle direkt in Google Street View anzusehen.', en:'Tap the buttons below to view each spot directly in Google Street View.', tr:'A\u015fa\u011f\u0131daki d\u00fc\u011fmelere dokunarak her noktay\u0131 do\u011frudan Google Street View\u2019da g\u00f6r\u00fcnt\u00fcleyebilirsin.', ar:'\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0623\u062f\u0646\u0627\u0647 \u0644\u0639\u0631\u0636 \u0643\u0644 \u0645\u0648\u0642\u0639 \u0645\u0628\u0627\u0634\u0631\u0629 \u0641\u064a Google Street View.', es:'Toca los botones de abajo para ver cada punto directamente en Google Street View.', fr:'Appuie sur les boutons ci-dessous pour voir chaque point directement dans Google Street View.' , pt:'Toque nos botões abaixo para ver cada ponto diretamente no Google Street View.' },
  pdfSeite:            { de:'Seite', en:'Page', tr:'Sayfa', ar:'\u0635\u0641\u062d\u0629', es:'P\u00e1gina', fr:'Page' , pt:'Página' },
  pdfErstelltMit:      { de:'Erstellt mit', en:'Created with', tr:'Olu\u015fturuldu', ar:'\u062a\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0628\u0648\u0627\u0633\u0637\u0629', es:'Creado con', fr:'Cr\u00e9\u00e9 avec' , pt:'Criado com' },
  pdfSehrGut:          { de:'Sehr gut', en:'Excellent', tr:'\u00c7ok iyi', ar:'\u0645\u0645\u062a\u0627\u0632', es:'Excelente', fr:'Tr\u00e8s bien' , pt:'Excelente' },
  pdfGut:              { de:'Gut', en:'Good', tr:'\u0130yi', ar:'\u062c\u064a\u062f', es:'Bien', fr:'Bien' , pt:'Bom' },
  pdfAusreichend:      { de:'Ausreichend', en:'Sufficient', tr:'Yeterli', ar:'\u0645\u0642\u0628\u0648\u0644', es:'Suficiente', fr:'Suffisant' , pt:'Suficiente' },
  pdfUngenuegend:      { de:'Ungen\u00fcgend', en:'Insufficient', tr:'Yetersiz', ar:'\u063a\u064a\u0631 \u0643\u0627\u0641\u064d', es:'Insuficiente', fr:'Insuffisant' , pt:'Insuficiente' },
  pdfBeobachtungskategorien:{ de:'Beobachtungskategorien', en:'Observation categories', tr:'G\u00f6zlem kategorileri', ar:'\u0641\u0626\u0627\u062a \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629', es:'Categor\u00edas de observaci\u00f3n', fr:'Cat\u00e9gories d\u2019observation' , pt:'Categorias de observação' },
  pdfFahraufgaben:     { de:'Fahraufgaben im Stra\u00dfenverkehr', en:'Road driving tasks', tr:'Trafikte s\u00fcr\u00fc\u015f g\u00f6revleri', ar:'\u0645\u0647\u0627\u0645 \u0627\u0644\u0642\u064a\u0627\u062f\u0629 \u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642', es:'Tareas de conducci\u00f3n vial', fr:'T\u00e2ches de conduite' , pt:'Tarefas de condução no trânsito' },
  pdfGrundfahraufgaben:{ de:'Grundfahraufgaben', en:'Basic driving tasks', tr:'Temel s\u00fcr\u00fc\u015f g\u00f6revleri', ar:'\u0645\u0647\u0627\u0645 \u0627\u0644\u0642\u064a\u0627\u062f\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629', es:'Tareas b\u00e1sicas de conducci\u00f3n', fr:'T\u00e2ches de base' , pt:'Tarefas básicas de condução' },
  pdfAusbildungsdiagramm:{ de:'Ausbildungsdiagramm dieser Stunde', en:'Training progress this lesson', tr:'Bu ders için eğitim ilerlemesi', ar:'التقدم التدريبي في هذا الدرس', es:'Progreso de formación en esta clase', fr:'Progression de la formation \u2014 cette leçon', pt:'Progresso da formação nesta aula' },
  pdfKartenBearbeitet:  { de:'bearbeitet', en:'covered', tr:'işlendi', ar:'تمّت المعالجة', es:'trabajado', fr:'traité', pt:'trabalhado' },
  pdfKartenNiveau:      { de:'Niveau', en:'Level', tr:'Seviye', ar:'المستوى', es:'Nivel', fr:'Niveau', pt:'Nível' },
  pdfDateiName:        { de:'Fahrstunde', en:'Lesson', tr:'Ders', ar:'Lesson', es:'Clase', fr:'Lecon' , pt:'Aula' },
  pdfStudent:          { de:'Schueler', en:'Student', tr:'Ogrenci', ar:'\u0627\u0644\u0637\u0627\u0644\u0628', es:'Alumno', fr:'Eleve' , pt:'Aluno' },
  pdfFahrlehrer:       { de:'Fahrlehrer', en:'Instructor', tr:'E\u011fitmen', ar:'\u0627\u0644\u0645\u062f\u0631\u0628', es:'Instructor', fr:'Moniteur' , pt:'Instrutor' },
  spracheWaehlen:      { de:'Sprache f\u00fcr den Bericht w\u00e4hlen', en:'Choose report language', tr:'Rapor dilini se\u00e7in', ar:'\u0627\u062e\u062a\u0631 \u0644\u063a\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631', es:'Elegir idioma del informe', fr:'Choisir la langue du rapport' , pt:'Escolher idioma do relatório' },
  abbrechen:           { de:'Abbrechen', en:'Cancel', tr:'\u0130ptal', ar:'\u0625\u0644\u063a\u0627\u0621', es:'Cancelar', fr:'Annuler' , pt:'Cancelar' },
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
  fehler:          { de:'Fehler', en:'Error', tr:'Hata', ar:'خطأ', es:'Error', fr:'Erreur' , pt:'Erro' },
  keineDaten:      { de:'Keine Daten', en:'No data', tr:'Veri yok', ar:'لا توجد بيانات', es:'Sin datos', fr:'Aucune donnée' },
  codeGenerieren:  { de:'Code generieren', en:'Generate code', tr:'Kod oluştur', ar:'إنشاء رمز', es:'Generar código', fr:'Générer un code' },
  codeKopiert:     { de:'Code kopiert!', en:'Code copied!', tr:'Kod kopyalandı!', ar:'تم نسخ الرمز!', es:'¡Código copiado!', fr:'Code copié !' },
  einladungscode:  { de:'Einladungscode', en:'Invitation code', tr:'Davet kodu', ar:'رمز الدعوة', es:'Código de invitación', fr:'Code d\'invitation' },
  neuerFahrlehrer: { de:'Neuer Fahrlehrer', en:'New instructor', tr:'Yeni eğitmen', ar:'مدرب جديد', es:'Nuevo instructor', fr:'Nouveau moniteur' },
  neuerFahrschueler:{ de:'Neuer Fahrschüler', en:'New student', tr:'Yeni öğrenci', ar:'طالب جديد', es:'Nuevo alumno', fr:'Nouvel élève' },
  bearbeiten:      { de:'Bearbeiten', en:'Edit', tr:'Düzenle', ar:'تعديل', es:'Editar', fr:'Modifier' , pt:'Editar' },
  bild:            { de:'Bild', en:'Image', tr:'Resim', ar:'صورة', es:'Imagen', fr:'Image' },
  sprache:         { de:'Sprache', en:'Language', tr:'Dil', ar:'اللغة', es:'Idioma', fr:'Langue' },
  designWechseln:  { de:'Design wechseln', en:'Toggle theme', tr:'Tema değiştir', ar:'تغيير المظهر', es:'Cambiar tema', fr:'Changer de thème' },
  willkommen:      { de:'Willkommen', en:'Welcome', tr:'Hoş geldiniz', ar:'مرحباً', es:'Bienvenido', fr:'Bienvenue' },
  angemeldetBleiben:{ de:'Angemeldet bleiben', en:'Stay logged in', tr:'Oturumu açık tut', ar:'البقاء مسجل الدخول', es:'Mantener sesión', fr:'Rester connecté' },
  transparenz:     { de:'Planung und Dokumentation der Fahrstunden mit KI-Funktion', en:'Planning and documentation of driving lessons with AI', tr:'Yapay zeka destekli sürüş dersi planlama ve dokümantasyonu', ar:'تخطيط وتوثيق دروس القيادة مع وظيفة الذكاء الاصطناعي', es:'Planificación y documentación de clases con función IA', fr:'Planification et documentation des leçons avec fonction IA' },
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
  strecke: { de:'Strecke', en:'Distance', tr:'Mesafe', ar:'المسافة', es:'Distancia', fr:'Distance' , pt:'Distância' },
  geschwindigkeitLabel: { de:'Geschwindigkeit', en:'Speed', tr:'Hız', ar:'السرعة', es:'Velocidad', fr:'Vitesse' },
  geschwindigkeitKurz: { de:'Tempo', en:'Speed', tr:'Hız', ar:'السرعة', es:'Vel.', fr:'Vitesse' },
  markierungen: { de:'Markierungen', en:'Markers', tr:'İşaretler', ar:'العلامات', es:'Marcadores', fr:'Repères' , pt:'Marcações' },
  markierungenKurz: { de:'Marker', en:'Markers', tr:'İşaretler', ar:'العلامات', es:'Marcadores', fr:'Repères' },
  laeuft: { de:'läuft', en:'live', tr:'devam ediyor', ar:'يعمل', es:'en curso', fr:'en cours' },
  markierungSetzen: { de:'Markieren', en:'Mark', tr:'İşaretle', ar:'علامة', es:'Marcar', fr:'Marquer' },
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
  abbrechen: { de:'Abbrechen', en:'Cancel', tr:'İptal', ar:'إلغاء', es:'Cancelar', fr:'Annuler' , pt:'Cancelar' },

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
  fortsetzen: { de:'Fortsetzen', en:'Resume', tr:'Devam et', ar:'استئناف', es:'Reanudar', fr:'Reprendre', pt:'Retomar' },
  pausiert: { de:'PAUSIERT', en:'PAUSED', tr:'DURAKLATILDI', ar:'متوقف مؤقتاً', es:'EN PAUSA', fr:'EN PAUSE', pt:'EM PAUSA' },
  pausiertHinweis: { de:'Timer und GPS-Aufzeichnung angehalten', en:'Timer and GPS recording paused', tr:'Süre ölçümü ve GPS kaydı duraklandı', ar:'توقّف المؤقّت وتسجيل GPS', es:'Cronómetro y grabación de GPS en pausa', fr:'Minuteur et enregistrement GPS en pause', pt:'Cronómetro e gravação de GPS em pausa' },
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
  von: { de:'Von', en:'From', tr:'Başlangıç', ar:'من', es:'Desde', fr:'Du' },
  bis: { de:'Bis', en:'To', tr:'Bitiş', ar:'إلى', es:'Hasta', fr:'Au' },
  ganztaegig: { de:'Ganztägig', en:'All day', tr:'Tüm gün', ar:'طوال اليوم', es:'Todo el día', fr:'Toute la journée' },
  grund: { de:'Grund', en:'Reason', tr:'Sebep', ar:'السبب', es:'Motivo', fr:'Motif' },
  grundWaehlen: { de:'Grund wählen…', en:'Choose reason…', tr:'Sebep seçin…', ar:'اختر السبب…', es:'Elegir motivo…', fr:'Choisir un motif…' },
  urlaub: { de:'Urlaub', en:'Vacation', tr:'Tatil', ar:'إجازة', es:'Vacaciones', fr:'Vacances' },
  krank: { de:'Krank', en:'Sick', tr:'Hastalık', ar:'مرض', es:'Enfermo', fr:'Maladie' },
  fortbildung: { de:'Fortbildung', en:'Training', tr:'Eğitim', ar:'تدريب', es:'Formación', fr:'Formation' },
  privat: { de:'Privat', en:'Private', tr:'Özel', ar:'شخصي', es:'Privado', fr:'Privé' },
  sonstiges: { de:'Sonstiges', en:'Other', tr:'Diğer', ar:'أخرى', es:'Otro', fr:'Autre' },
  feiertag: { de:'Feiertag', en:'Public holiday', tr:'Resmi tatil', ar:'عطلة رسمية', es:'Día festivo', fr:'Jour férié' },
  alleTageLoeschen: { de:'Alle Tage löschen', en:'Delete all days', tr:'Tüm günleri sil', ar:'حذف جميع الأيام', es:'Eliminar todos los días', fr:'Supprimer tous les jours' },
  emailBestaetigt: { de:'E-Mail bestätigt', en:'Email confirmed', tr:'E-posta onaylandı', ar:'تم تأكيد البريد الإلكتروني', es:'Correo confirmado', fr:'E-mail confirmé' },
  emailErneutGesendet: { de:'E-Mail erneut gesendet', en:'Email resent', tr:'E-posta yeniden gönderildi', ar:'تم إعادة إرسال البريد', es:'Correo reenviado', fr:'E-mail renvoyé' },

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
  termine: { de:'Termine', en:'appointments', tr:'randevu', ar:'مواعيد', es:'citas', fr:'rendez-vous', pt:'compromissos' },
  frueheStundenZeigen: { de:'Frühe Stunden ab 00:00 anzeigen', en:'Show early hours from 00:00', tr:'00:00\'dan itibaren erken saatleri göster', ar:'إظهار الساعات المبكرة من 00:00', es:'Mostrar horas tempranas desde las 00:00', fr:'Afficher les heures tôt à partir de 00h00', pt:'Mostrar horas da manhã a partir das 00:00' },
  frueheStundenVerbergen: { de:'Frühe Stunden wieder ausblenden', en:'Hide early hours again', tr:'Erken saatleri yeniden gizle', ar:'إخفاء الساعات المبكرة مرة أخرى', es:'Ocultar de nuevo las horas tempranas', fr:'Masquer à nouveau les heures tôt', pt:'Ocultar novamente as horas da manhã' },
  termineErstellt: { de:'{count} Termine erstellt', en:'{count} appointments created', tr:'{count} randevu oluşturuldu', ar:'تم إنشاء {count} مواعيد', es:'{count} citas creadas', fr:'{count} rendez-vous créés' },
  termineUebersprungen: { de:'{count} übersprungen (Konflikte)', en:'{count} skipped (conflicts)', tr:'{count} atlandı (çakışmalar)', ar:'{count} تم تخطيه (تعارضات)', es:'{count} omitidas (conflictos)', fr:'{count} ignorés (conflits)' },
  nurDiesenTermin: { de:'Nur diesen Termin löschen', en:'Delete only this appointment', tr:'Yalnızca bu randevuyu sil', ar:'حذف هذا الموعد فقط', es:'Eliminar solo esta cita', fr:'Supprimer uniquement ce rendez-vous' },
  diesenUndFolgende: { de:'Diesen und alle folgenden löschen', en:'Delete this and all following', tr:'Bunu ve sonrakileri sil', ar:'حذف هذا وجميع التالية', es:'Eliminar esta y las siguientes', fr:'Supprimer celui-ci et tous les suivants' },
  wiederkehrenderTermin: { de:'Wiederkehrender Termin', en:'Recurring appointment', tr:'Tekrarlayan randevu', ar:'موعد متكرر', es:'Cita recurrente', fr:'Rendez-vous récurrent' },
  serieLoeschen: { de:'Serie löschen', en:'Delete series', tr:'Seriyi sil', ar:'حذف السلسلة', es:'Eliminar serie', fr:'Supprimer la série' },
  abbrechen: { de:'Abbrechen', en:'Cancel', tr:'İptal', ar:'إلغاء', es:'Cancelar', fr:'Annuler' , pt:'Cancelar' },
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
  bescheinigungen: { de:'Bescheinigungen', en:'Certificates', tr:'Belgeler', ar:'\u0634\u0647\u0627\u062f\u0627\u062a', es:'Certificados', fr:'Certificats' },
  entschuldigung: { de:'Schulentschuldigung', en:'School Excuse', tr:'Okul izin yaz\u0131s\u0131', ar:'\u0627\u0639\u062a\u0630\u0627\u0631 \u0644\u0644\u0645\u062f\u0631\u0633\u0629', es:'Justificante escolar', fr:'Justificatif scolaire' },
  entschuldigungHinweis: { de:'Bescheinigung f\u00fcr Schule oder Arbeitgeber, dass der Sch\u00fcler wegen einer Fahrschul-Pflicht entschuldigt ist.', en:'Excuse note for school/employer that the student is excused due to driving school duties.', tr:'\u00d6\u011frencinin s\u00fcr\u00fcc\u00fc kursu nedeniyle okul/i\u015fyerinden izinli oldu\u011funa dair belge.', ar:'\u0625\u0639\u0641\u0627\u0621 \u0644\u0644\u0637\u0627\u0644\u0628 \u0628\u0633\u0628\u0628 \u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0633\u064a\u0627\u0642\u0629.', es:'Justificante de que el alumno est\u00e1 excusado por la autoescuela.', fr:'Justificatif pour l\u2019\u00e9cole/employeur d\u00fb \u00e0 l\u2019auto-\u00e9cole.' },
  fristverkuerzungTheorie: { de:'Fristverk\u00fcrzung Theoriepr\u00fcfung', en:'Early Theory Re-Exam Request', tr:'Teori s\u0131nav\u0131 s\u00fcre k\u0131saltma', ar:'\u062a\u0642\u0635\u064a\u0631 \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0646\u0638\u0631\u064a', es:'Reducci\u00f3n de plazo examen te\u00f3rico', fr:'R\u00e9duction d\u00e9lai examen th\u00e9orique' },
  fristverkuerzungPraxis: { de:'Fristverk\u00fcrzung Praktische Pr\u00fcfung', en:'Early Practical Re-Exam Request', tr:'Pratik s\u0131nav\u0131 s\u00fcre k\u0131saltma', ar:'\u062a\u0642\u0635\u064a\u0631 \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u064a', es:'Reducci\u00f3n de plazo examen pr\u00e1ctico', fr:'R\u00e9duction d\u00e9lai examen pratique' },
  fristverkuerzungHinweis: { de:'Antrag auf vorzeitige Wiederholung der Pr\u00fcfung (fr\u00fchestens nach {tage} Tagen).', en:'Application for early re-examination (earliest after {tage} days).', tr:'S\u0131nav\u0131n erken tekrar\u0131 i\u00e7in ba\u015fvuru ({tage} g\u00fcn sonra en erken).', ar:'\u0637\u0644\u0628 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0628\u0643\u0631 (\u0628\u0639\u062f {tage} \u0623\u064a\u0627\u0645 \u0643\u062d\u062f \u0623\u062f\u0646\u0649).', es:'Solicitud de repetici\u00f3n anticipada (m\u00ednimo tras {tage} d\u00edas).', fr:'Demande de r\u00e9p\u00e9tition anticip\u00e9e (au plus t\u00f4t apr\u00e8s {tage} jours).' },
  bescheinigungLeerDrucken: { de:'Leeres Formular drucken (ohne Sch\u00fclerdaten)', en:'Print empty form (without student data)', tr:'Bo\u015f form yazd\u0131r', ar:'\u0637\u0628\u0627\u0639\u0629 \u0646\u0645\u0648\u0630\u062c \u0641\u0627\u0631\u063a', es:'Imprimir formulario vac\u00edo', fr:'Imprimer formulaire vide' },
  bescheinigungLeerHinweis: { de:'Wenn aktiviert, werden keine Sch\u00fcler- oder Fahrschuldaten in das PDF eingetragen.', en:'If checked, no student or school data will be filled into the PDF.', tr:'\u0130\u015faretlenirse PDF\'ye \u00f6\u011frenci verileri eklenmez.', ar:'\u0625\u0630\u0627 \u062a\u0645 \u062a\u062d\u062f\u064a\u062f\u0647\u060c \u0644\u0646 \u064a\u062a\u0645 \u062a\u0639\u0628\u0626\u0629 \u0628\u064a\u0627\u0646\u0627\u062a.', es:'Si se activa, no se rellenar\u00e1n datos.', fr:'Si coch\u00e9, aucune donn\u00e9e ne sera remplie.' },
  pruefungsdatum: { de:'Datum der letzten Pr\u00fcfung', en:'Date of last exam', tr:'Son s\u0131nav tarihi', ar:'\u062a\u0627\u0631\u064a\u062e \u0622\u062e\u0631 \u0627\u062e\u062a\u0628\u0627\u0631', es:'Fecha del \u00faltimo examen', fr:'Date du dernier examen' },
  pruefungsort: { de:'Pr\u00fcfungsort', en:'Exam location', tr:'S\u0131nav yeri', ar:'\u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631', es:'Lugar del examen', fr:'Lieu de l\u2019examen' },
  pruefungsortPlaceholder: { de:'z.B. TP Musterstadt', en:'e.g. TP Example-City', tr:'\u00f6rn. TP \u015eehir', ar:'\u0645\u062b\u0627\u0644: \u0645\u062f\u064a\u0646\u0629', es:'p.ej. TP Ciudad', fr:'ex. TP Ville' },
  wiederholungNachTagen: { de:'Wiederholung nach (Tagen)', en:'Re-examination after (days)', tr:'Tekrar (g\u00fcn sonra)', ar:'\u0625\u0639\u0627\u062f\u0629 \u0628\u0639\u062f (\u0623\u064a\u0627\u0645)', es:'Repetici\u00f3n tras (d\u00edas)', fr:'R\u00e9p\u00e9tition apr\u00e8s (jours)' },
  mindestensTage: { de:'Mindestens {tage} Tage', en:'At least {tage} days', tr:'En az {tage} g\u00fcn', ar:'{tage} \u0623\u064a\u0627\u0645 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644', es:'M\u00ednimo {tage} d\u00edas', fr:'Au moins {tage} jours' },
  begruendung: { de:'Begr\u00fcndung', en:'Reason', tr:'Gerek\u00e7e', ar:'\u0627\u0644\u0633\u0628\u0628', es:'Motivo', fr:'Motif' },
  begruendungPlaceholder: { de:'z.B. Kompaktausbildung abgeschlossen, Ausbildungsdefizite behoben.', en:'e.g. Compact training completed, deficiencies addressed.', tr:'\u00f6rn. yo\u011fun e\u011fitim tamamland\u0131.', ar:'\u0645\u062b\u0627\u0644: \u062a\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062a\u062f\u0631\u064a\u0628.', es:'p.ej. formaci\u00f3n compacta finalizada.', fr:'ex. formation compacte termin\u00e9e.' },
  b196Vertrag: { de:'B196 Vertrag (Vereinbarung)', en:'B196 Contract (Agreement)', tr:'B196 S\u00f6zle\u015fme', ar:'\u0639\u0642\u062f B196', es:'Contrato B196', fr:'Contrat B196' },
  b196Bescheinigung: { de:'B196 Teilnahmebescheinigung', en:'B196 Participation Certificate', tr:'B196 Kat\u0131l\u0131m Belgesi', ar:'\u0634\u0647\u0627\u062f\u0629 B196', es:'Certificado B196', fr:'Attestation B196' },
  b196VertragHinweis: { de:'Vereinbarung \u00fcber die Fahrerschulung nach Anlage 7b FeV zum Erwerb der Schl\u00fcsselzahl 196 (Leichtkraftrad bis 125\u202fccm).', en:'Agreement for training to acquire key code 196 (light motorcycles up to 125cc) according to Annex 7b FeV.', tr:'B196 anahtar kodu i\u00e7in e\u011fitim s\u00f6zle\u015fmesi.', ar:'\u0627\u062a\u0641\u0627\u0642\u064a\u0629 \u062a\u062f\u0631\u064a\u0628 B196.', es:'Acuerdo de formaci\u00f3n para la clave 196.', fr:'Accord de formation pour le code 196.' },
  b196BescheinigungHinweis: { de:'Dokumentation des erfolgreichen Abschlusses der B196-Fahrerschulung. Wird nach Beendigung der Schulung ausgestellt.', en:'Documentation of successful B196 training completion. Issued after training is finished.', tr:'B196 e\u011fitiminin ba\u015far\u0131yla tamamland\u0131\u011f\u0131n\u0131n belgelendirilmesi.', ar:'\u0648\u062b\u064a\u0642\u0629 \u0625\u062a\u0645\u0627\u0645 \u062a\u062f\u0631\u064a\u0628 B196.', es:'Documentaci\u00f3n del t\u00e9rmino de la formaci\u00f3n B196.', fr:'Documentation de l\u2019ach\u00e8vement de la formation B196.' },
  // ── Ausbildungsbescheinigung (Anlage 7 FahrschAusbO) ──
  anlage7: { de:'Ausbildungsbescheinigung (Anlage 7)', en:'Training Certificate (Annex 7)', tr:'E\u011fitim belgesi (Ek 7)', ar:'\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628 (\u0627\u0644\u0645\u0644\u062d\u0642 7)', es:'Certificado de formaci\u00f3n (Anexo 7)', fr:'Attestation de formation (Annexe 7)' },
  anlage7Hinweis: { de:'Bescheinigung \u00fcber die ordnungsgem\u00e4\u00dfe Ausbildung nach Anlage 7 FahrschAusbO \u2014 wird der Pr\u00fcfstelle (T\u00dcV/DEKRA) vor der praktischen Pr\u00fcfung vorgelegt. G\u00fcltigkeit: 2 Jahre.', en:'Certificate of proper training per Annex 7 FahrschAusbO \u2014 submitted to the examination authority (T\u00dcV/DEKRA) before the practical exam. Valid for 2 years.', tr:'Anlage 7 FahrschAusbO uyar\u0131nca e\u011fitim belgesi.', ar:'\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628 (\u0627\u0644\u0645\u0644\u062d\u0642 7).', es:'Certificado de formaci\u00f3n seg\u00fan Anexo 7.', fr:'Attestation de formation selon Annexe 7.' },
  // ── B197 Schaltnachweis ──
  b197: { de:'B197 Schaltnachweis', en:'B197 Manual Transmission Certificate', tr:'B197 Manuel \u015fanz\u0131man belgesi', ar:'\u0634\u0647\u0627\u062f\u0629 B197 \u0644\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u064a\u062f\u0648\u064a', es:'Certificado B197 cambio manual', fr:'Attestation B197 bo\u00eete manuelle' },
  b197Hinweis: { de:'Schaltnachweis nach \u00a7 17a FeV \u2014 best\u00e4tigt mindestens 10 Fahrstunden auf einem Schaltfahrzeug. Wird bei der F\u00fchrerscheinstelle vorgelegt, um den B-Schein ohne Schl\u00fcsselzahl 197 zu erhalten.', en:'Manual gearbox proof per \u00a7 17a FeV \u2014 confirms at least 10 lessons on a manual-shift vehicle.', tr:'\u00a7 17a FeV uyar\u0131nca manuel \u015fanz\u0131man belgesi.', ar:'\u0625\u062b\u0628\u0627\u062a \u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u064a\u062f\u0648\u064a B197.', es:'Prueba de caja manual B197.', fr:'Preuve de bo\u00eete manuelle B197.' },
  b197Stunden: { de:'Geleistete Schaltfahrstunden', en:'Manual-shift lessons completed', tr:'Tamamlanan manuel ders sayısı', ar:'\u062f\u0631\u0648\u0633 \u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u064a\u062f\u0648\u064a', es:'Clases manuales realizadas', fr:'Le\u00e7ons manuelles effectu\u00e9es' },
  b197Fahrzeug: { de:'Schaltfahrzeug (Marke/Typ)', en:'Manual-shift vehicle (make/model)', tr:'Manuel ara\u00e7 (marka/model)', ar:'\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u064a\u062f\u0648\u064a', es:'Veh\u00edculo manual', fr:'V\u00e9hicule manuel' },
  // ── BF17 Begleitetes Fahren ──
  bf17Abschluss: { de:'BF17-Abschlussbescheinigung', en:'BF17 Completion Certificate', tr:'BF17 Bitirme Belgesi', ar:'\u0634\u0647\u0627\u062f\u0629 \u0625\u062a\u0645\u0627\u0645 BF17', es:'Certificado BF17', fr:'Attestation BF17' },
  bf17AbschlussHinweis: { de:'Bescheinigung \u00fcber das erfolgreich absolvierte Begleitete Fahren ab 17 (BF17). Nach Vollendung des 18. Lebensjahres erfolgt die Umstellung zum regul\u00e4ren F\u00fchrerschein.', en:'Certificate of successfully completed accompanied driving from age 17 (BF17).', tr:'17 Ya\u015f Refakatli S\u00fcr\u00fc\u015f BF17 belgesi.', ar:'\u0634\u0647\u0627\u062f\u0629 BF17.', es:'Certificado de conducci\u00f3n acompa\u00f1ada BF17.', fr:'Attestation conduite accompagn\u00e9e BF17.' },
  bf17Begleiter: { de:'Eingetragene Begleitperson(en)', en:'Registered accompanying person(s)', tr:'Kay\u0131tl\u0131 refakat\u00e7\u0131', ar:'\u0627\u0644\u0645\u0631\u0627\u0641\u0642', es:'Acompa\u00f1ante(s)', fr:'Accompagnateur(s)' },
  bf17BegleiterPlaceholder: { de:'z.B. Max Mustermann, Erika Mustermann', en:'e.g. John Doe, Jane Doe', tr:'\u00f6rn. \u0130simler', ar:'\u0645\u062b\u0627\u0644: \u0623\u0633\u0645\u0627\u0621', es:'p.ej. nombres', fr:'ex. noms' },
  bf17Pruefung: { de:'Datum der bestandenen Pr\u00fcfung', en:'Date of passed exam', tr:'Ba\u015far\u0131l\u0131 s\u0131nav tarihi', ar:'\u062a\u0627\u0631\u064a\u062e \u0627\u062c\u062a\u064a\u0627\u0632 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631', es:'Fecha del examen aprobado', fr:'Date de l\u2019examen r\u00e9ussi' },
  // ── K\u00fcndigung / Abbruch ──
  kuendigung: { de:'K\u00fcndigung / Abbruch-Best\u00e4tigung', en:'Termination / Cancellation Confirmation', tr:'\u0130ptal / Fesih Onay\u0131', ar:'\u062a\u0623\u0643\u064a\u062f \u0625\u0644\u063a\u0627\u0621', es:'Confirmaci\u00f3n de baja', fr:'Confirmation de r\u00e9siliation' },
  kuendigungHinweis: { de:'Schriftliche Best\u00e4tigung \u00fcber die durchlaufenen Ausbildungsteile gem. \u00a7 6 FahrschAusbO \u2014 wird ben\u00f6tigt, wenn der Sch\u00fcler die Fahrschule wechselt oder die Ausbildung abbricht.', en:'Written confirmation of completed training segments per \u00a7 6 FahrschAusbO \u2014 needed when the student changes driving schools or quits.', tr:'\u00a7 6 FahrschAusbO uyar\u0131nca yaz\u0131l\u0131 onay.', ar:'\u062a\u0623\u0643\u064a\u062f \u0643\u062a\u0627\u0628\u064a \u0644\u0623\u062c\u0632\u0627\u0621 \u0627\u0644\u062a\u062f\u0631\u064a\u0628.', es:'Confirmaci\u00f3n escrita de la formaci\u00f3n recibida.', fr:'Confirmation \u00e9crite de la formation re\u00e7ue.' },
  kuendigungDatum: { de:'K\u00fcndigungsdatum', en:'Termination date', tr:'\u0130ptal tarihi', ar:'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0644\u063a\u0627\u0621', es:'Fecha de baja', fr:'Date de r\u00e9siliation' },
  kuendigungGrund: { de:'Grund (optional)', en:'Reason (optional)', tr:'Sebep (iste\u011fe ba\u011fl\u0131)', ar:'\u0627\u0644\u0633\u0628\u0628 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)', es:'Motivo (opcional)', fr:'Motif (optionnel)' },
  kuendigungGrundPlaceholder: { de:'z.B. Schulwechsel, Umzug, pers\u00f6nliche Gr\u00fcnde', en:'e.g. school change, relocation, personal reasons', tr:'\u00f6rn. okul de\u011fi\u015fimi', ar:'\u0645\u062b\u0627\u0644: \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u062f\u0631\u0633\u0629', es:'p.ej. cambio de escuela', fr:'ex. changement d\u2019\u00e9cole' },
  klasseBSeit: { de:'Klasse B im Besitz seit', en:'Holds class B license since', tr:'B s\u0131n\u0131f\u0131 sahibi olu\u015f tarihi', ar:'\u062d\u0627\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u0641\u0626\u0629 B \u0645\u0646\u0630', es:'Posee carn\u00e9 clase B desde', fr:'Permis B depuis' },
  geburtsort: { de:'Geburtsort', en:'Place of birth', tr:'Do\u011fum yeri', ar:'\u0645\u0643\u0627\u0646 \u0627\u0644\u0645\u064a\u0644\u0627\u062f', es:'Lugar de nacimiento', fr:'Lieu de naissance' },
  pauschalentgelt: { de:'Pauschalentgelt (\u20ac)', en:'Flat fee (\u20ac)', tr:'Sabit \u00fccret (\u20ac)', ar:'\u0631\u0633\u0648\u0645 \u0645\u0642\u0637\u0648\u0639\u0629 (\u20ac)', es:'Tarifa plana (\u20ac)', fr:'Forfait (\u20ac)' },
  zusatzEntgelt: { de:'Entgelt zus\u00e4tzliche Fahrstunde 45\u202fMin (\u20ac)', en:'Fee per additional 45-min lesson (\u20ac)', tr:'Ek 45 dk ders \u00fccreti (\u20ac)', ar:'\u0631\u0633\u0645 \u062f\u0631\u0633 \u0625\u0636\u0627\u0641\u064a 45 \u062f (\u20ac)', es:'Tarifa por clase extra de 45 min (\u20ac)', fr:'Tarif le\u00e7on suppl. 45 min (\u20ac)' },
  schulungsfahrzeugBereitgestelltVon: { de:'Schulungsfahrzeug wird bereitgestellt von', en:'Training vehicle provided by', tr:'E\u011fitim arac\u0131 sa\u011flayan', ar:'\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628 \u0645\u0642\u062f\u0651\u0645\u0629 \u0645\u0646', es:'Veh\u00edculo de formaci\u00f3n facilitado por', fr:'V\u00e9hicule de formation fourni par' },
  vonFahrschule: { de:'Fahrschule', en:'Driving school', tr:'S\u00fcr\u00fc\u015f okulu', ar:'\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629', es:'Autoescuela', fr:'Auto-\u00e9cole' },
  vonTeilnehmer: { de:'Teilnehmer', en:'Participant', tr:'Kat\u0131l\u0131mc\u0131', ar:'\u0627\u0644\u0645\u0634\u0627\u0631\u0643', es:'Participante', fr:'Participant' },
  schulungsfahrzeug: { de:'Schulungsfahrzeug', en:'Training vehicle', tr:'E\u011fitim arac\u0131', ar:'\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u062a\u062f\u0631\u064a\u0628', es:'Veh\u00edculo de formaci\u00f3n', fr:'V\u00e9hicule de formation' },
  schulungsfahrzeugPlaceholder: { de:'z.B. Yamaha YBR 125', en:'e.g. Yamaha YBR 125', tr:'\u00f6rn. Yamaha YBR 125', ar:'\u0645\u062b\u0627\u0644: Yamaha YBR 125', es:'p.ej. Yamaha YBR 125', fr:'ex. Yamaha YBR 125' },
  ausstellungsdatumFs: { de:'Ausstellungsdatum F\u00fchrerschein', en:'License issue date', tr:'Ehliyet veriliş tarihi', ar:'\u062a\u0627\u0631\u064a\u062e \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0631\u062e\u0635\u0629', es:'Fecha emisi\u00f3n carn\u00e9', fr:'Date de d\u00e9livrance permis' },
  bemerkungen: { de:'Bemerkungen', en:'Notes', tr:'Notlar', ar:'\u0645\u0644\u0627\u062d\u0638\u0627\u062a', es:'Observaciones', fr:'Remarques' },
  pdfErstellen: { de:'PDF erstellen', en:'Generate PDF', tr:'PDF olu\u015ftur', ar:'\u0625\u0646\u0634\u0627\u0621 PDF', es:'Generar PDF', fr:'G\u00e9n\u00e9rer PDF' },
  pdfWirdErstellt: { de:'PDF wird erstellt...', en:'Generating PDF...', tr:'PDF olu\u015fturuluyor...', ar:'\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 PDF...', es:'Generando PDF...', fr:'G\u00e9n\u00e9ration PDF...' },
  pdfErstellt: { de:'PDF erstellt', en:'PDF created', tr:'PDF olu\u015fturuldu', ar:'\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 PDF', es:'PDF creado', fr:'PDF cr\u00e9\u00e9' },
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
  bearbeiten: { de:'Bearbeiten', en:'Edit', tr:'Düzenle', ar:'تعديل', es:'Editar', fr:'Modifier' , pt:'Editar' },
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
  angebotenOffen: { de:'Angeboten', en:'Offered', tr:'Teklif edildi', ar:'معروض', es:'Ofrecido', fr:'Proposé' },
  keineAngebote: { de:'Noch keine Angebote erstellt', en:'No offers created yet', tr:'Henüz teklif oluşturulmadı', ar:'لم يتم إنشاء عروض بعد', es:'Aún no se han creado ofertas', fr:'Aucune offre créée' },
  aktiv: { de:'Aktiv', en:'Active', tr:'Aktif', ar:'نشط', es:'Activo', fr:'Actif' },
  offen2: { de:'Offen', en:'Open', tr:'Açık', ar:'مفتوح', es:'Abierto', fr:'Ouvert' },
  gebucht: { de:'Gebucht', en:'Booked', tr:'Rezerve', ar:'محجوز', es:'Reservado', fr:'Réservé' },
  empfaenger: { de:'Empfänger', en:'Recipients', tr:'Alıcılar', ar:'المستلمون', es:'Destinatarios', fr:'Destinataires' },
  fahrzeug: { de:'Fahrzeug', en:'Vehicle', tr:'Araç', ar:'مركبة', es:'Vehículo', fr:'Véhicule' },
  angebotLoeschen: { de:'Angebot löschen', en:'Delete offer', tr:'Teklifi sil', ar:'حذف العرض', es:'Eliminar oferta', fr:'Supprimer l\'offre' },
  slotBearbeitet: { de:'Slot aktualisiert', en:'Slot updated', tr:'Slot güncellendi', ar:'تم تحديث الموعد', es:'Slot actualizado', fr:'Créneau mis à jour' },
  slotGeloescht: { de:'Slot gelöscht', en:'Slot deleted', tr:'Slot silindi', ar:'تم حذف الموعد', es:'Slot eliminado', fr:'Créneau supprimé' },
  angebotGeloescht: { de:'Angebot gelöscht', en:'Offer deleted', tr:'Teklif silindi', ar:'تم حذف العرض', es:'Oferta eliminada', fr:'Offre supprimée' },
  slotLoeschenBestaetigung: { de:'Diesen Slot wirklich löschen?', en:'Really delete this slot?', tr:'Bu slotu silmek istiyor musunuz?', ar:'هل تريد حقا حذف هذا الموعد؟', es:'¿Eliminar este slot?', fr:'Vraiment supprimer ce créneau?' },
  angebotLoeschenBestaetigung: { de:'Komplettes Angebot löschen? Offene Slots werden entfernt, bereits gebuchte Fahrstunden bleiben bestehen.', en:'Delete entire offer? Open slots will be removed, booked lessons remain.', tr:'Tüm teklifi sil? Açık slotlar silinir, rezerve edilen dersler kalır.', ar:'حذف العرض بالكامل؟ ستتم إزالة المواعيد المفتوحة وتبقى الدروس المحجوزة.', es:'¿Eliminar toda la oferta? Los slots abiertos se eliminarán, las clases reservadas permanecen.', fr:'Supprimer toute l\'offre? Les créneaux ouverts seront supprimés, les leçons réservées restent.' },

  // ── Bewertungs-Items übersetzt (via EVAL_ITEM_KEY_MAP) ──
  // Beobachtungskategorien
  evalVerkehrsbeobachtung:      { de:'Verkehrsbeobachtung', en:'Traffic observation', tr:'Trafik gözlemi', ar:'مراقبة المرور', es:'Observación del tráfico', fr:'Observation de la circulation' , pt:'Observação do trânsito' },
  evalFahrzeugpositionierung:   { de:'Fahrzeugpositionierung', en:'Vehicle positioning', tr:'Araç konumlandırma', ar:'تحديد موقع السيارة', es:'Posicionamiento del vehículo', fr:'Positionnement du véhicule' , pt:'Posicionamento do veículo' },
  evalGeschwindigkeitsanpassung:{ de:'Geschwindigkeitsanpassung', en:'Speed adjustment', tr:'Hız ayarı', ar:'تعديل السرعة', es:'Ajuste de velocidad', fr:'Adaptation de la vitesse' , pt:'Adaptação da velocidade' },
  evalKommunikation:            { de:'Kommunikation', en:'Communication', tr:'İletişim', ar:'التواصل', es:'Comunicación', fr:'Communication' , pt:'Comunicação' },
  evalFahrzeugbedienung:        { de:'Fahrzeugbedienung/Umweltbewusste Fahrweise', en:'Vehicle operation / Eco-friendly driving', tr:'Araç kullanımı / Çevre dostu sürüş', ar:'تشغيل المركبة / القيادة الصديقة للبيئة', es:'Manejo del vehículo / Conducción ecológica', fr:'Utilisation du véhicule / Conduite écologique' , pt:'Operação do veículo / Condução ecológica' },
  // Fahraufgaben im Straßenverkehr
  evalKurven:                   { de:'Kurven befahren', en:'Cornering', tr:'Viraj alma', ar:'قيادة المنعطفات', es:'Tomar curvas', fr:'Prise de virages' , pt:'Fazer curvas' },
  evalUeberholen:               { de:'Vorbeifahren / Überholen / Begegnen', en:'Passing / Overtaking / Meeting', tr:'Geçme / Sollama / Karşılaşma', ar:'المرور / التجاوز / المواجهة', es:'Adelantar / rebasar / cruzar', fr:'Dépassement / croisement' , pt:'Passar / Ultrapassar / Cruzar' },
  evalAbbiegenKreuzung:         { de:'Abbiegen / Kreuzungen / Einmündungen', en:'Turning / Intersections / Junctions', tr:'Dönüşler / kavşaklar / birleşim yerleri', ar:'الانعطاف / التقاطعات / التقاطعات T', es:'Girar / cruces / incorporaciones', fr:'Tourner / intersections / jonctions' , pt:'Conversões / cruzamentos / junções' },
  evalKreisverkehr:             { de:'Kreisverkehr', en:'Roundabout', tr:'Dönel kavşak', ar:'دوار', es:'Rotonda', fr:'Rond-point' , pt:'Rotatória' },
  evalFahrstreifenwechsel:      { de:'Fahrstreifenwechsel', en:'Lane change', tr:'Şerit değiştirme', ar:'تغيير الحارة', es:'Cambio de carril', fr:'Changement de voie' , pt:'Mudança de faixa' },
  evalAutobahn:                 { de:'Autobahn / Kraftfahrstraße', en:'Motorway / Expressway', tr:'Otoyol / ekspres yol', ar:'الطريق السريع', es:'Autopista / vía rápida', fr:'Autoroute / voie rapide' , pt:'Autoestrada / via expressa' },
  evalBahnuebergang:            { de:'Bahnübergang', en:'Railway crossing', tr:'Demiryolu geçidi', ar:'ممر القطار', es:'Paso a nivel', fr:'Passage à niveau' , pt:'Passagem de nível' },
  evalHaltestellen:             { de:'Haltestellen / Fußgängerüberwege', en:'Bus stops / Pedestrian crossings', tr:'Duraklar / yaya geçitleri', ar:'محطات / ممرات المشاة', es:'Paradas / pasos de peatones', fr:'Arrêts / passages piétons' , pt:'Paradas / faixas de pedestres' },
  // Grundfahraufgaben B
  evalAbbremsen:                { de:'Abbremsen mit höchstmöglicher Verzögerung', en:'Emergency braking (max. deceleration)', tr:'Maksimum yavaşlama ile fren', ar:'الفرملة بأقصى تباطؤ', es:'Frenado con máxima deceleración', fr:'Freinage à décélération maximale' , pt:'Frenagem com desaceleração máxima' },
  evalRueckwaertsAbbiegen:      { de:'Rückwärtsfahren mit Abbiegen', en:'Reversing with turn', tr:'Dönüşlü geri gitme', ar:'الرجوع للخلف مع الانعطاف', es:'Marcha atrás con giro', fr:'Marche arrière avec virage' , pt:'Marcha à ré com conversão' },
  evalUmkehren:                 { de:'Umkehren', en:'Turning around', tr:'Geriye dönüş', ar:'الدوران', es:'Media vuelta', fr:'Faire demi-tour' , pt:'Fazer meia-volta' },
  evalEinparkenLaengs:          { de:'Einparken längs', en:'Parallel parking', tr:'Paralel park', ar:'ركن موازي', es:'Aparcamiento en línea', fr:'Stationnement en créneau' , pt:'Estacionamento paralelo' },
  evalEinparkenQuer:            { de:'Einparken quer', en:'Perpendicular parking', tr:'Dik park', ar:'ركن عمودي', es:'Aparcamiento en batería', fr:'Stationnement en bataille' , pt:'Estacionamento perpendicular' },
  // Grundfahraufgaben A (Motorrad)
  evalSlalomSchritt:            { de:'Slalom mit Schrittgeschwindigkeit', en:'Slalom at walking pace', tr:'Yürüyüş hızında slalom', ar:'سلالوم بسرعة المشي', es:'Eslalon al paso', fr:'Slalom à allure de marche' , pt:'Slalom em ritmo de passeio' },
  evalAusweichenOhne:           { de:'Ausweichen ohne Abbremsen', en:'Evasion without braking', tr:'Frenlemeden kavıs alma', ar:'التفادي دون فرملة', es:'Esquiva sin frenar', fr:'Évitement sans freinage' , pt:'Desvio sem frenagem' },
  evalAusweichenNach:           { de:'Ausweichen nach Abbremsen', en:'Evasion after braking', tr:'Frenlemeden sonra kavıs alma', ar:'التفادي بعد الفرملة', es:'Esquiva después de frenar', fr:'Évitement après freinage' , pt:'Desvio após frenagem' },
  evalSlalom:                   { de:'Slalom', en:'Slalom', tr:'Slalom', ar:'سلالوم', es:'Eslalon', fr:'Slalom' , pt:'Slalom' },
  evalLangerSlalom:             { de:'Langer Slalom', en:'Long slalom', tr:'Uzun slalom', ar:'سلالوم طويل', es:'Eslalon largo', fr:'Slalom long' , pt:'Slalom longo' },
  evalSchrittGeradeaus:         { de:'Fahren mit Schrittgeschwindigkeit geradeaus', en:'Straight riding at walking pace', tr:'Yürüyüş hızında düz sürüş', ar:'القيادة مستقيمًا بسرعة المشي', es:'Conducción recta al paso', fr:'Conduite droite à allure de marche' , pt:'Condução reta em ritmo de passeio' },
  evalStopAndGo:                { de:'Stop and Go', en:'Stop and Go', tr:'Dur-Kalk', ar:'توقف وانطلاق', es:'Parar y arrancar', fr:'Arrêt et redémarrage' , pt:'Para e Anda' },
  evalKreisfahrt:               { de:'Kreisfahrt', en:'Circular ride', tr:'Dairesel sürüş', ar:'القيادة الدائرية', es:'Marcha circular', fr:'Trajet circulaire' , pt:'Percurso circular' },

  // ── Ausbildungsdiagrammkarten (Klasse B) — Modus-Auswahl ──
  docModeChoiceTitle:      { de:'Wie dokumentieren?', en:'How to document?', tr:'Nasıl belgelenecek?', ar:'كيف تريد التوثيق؟', es:'¿Cómo documentar?', fr:'Comment documenter ?', pt:'Como documentar?' },
  docModeChoiceSubtitle:   { de:'Diese Auswahl gilt nur für diese Fahrstunde.', en:'This choice applies only to this lesson.', tr:'Bu seçim yalnızca bu ders için geçerlidir.', ar:'هذا الاختيار يسري لهذه الحصة فقط.', es:'Esta selección aplica solo a esta clase.', fr:'Ce choix ne concerne que cette leçon.', pt:'Esta escolha vale apenas para esta aula.' },
  docModeCardsTitle:       { de:'Ausbildungsdiagrammkarten', en:'Training diagram cards', tr:'Eğitim şeması kartları', ar:'بطاقات مخطط التدريب', es:'Tarjetas del diagrama de formación', fr:'Cartes de diagramme de formation', pt:'Cartões do diagrama de formação' },
  docModeCardsHint:        { de:'Für Anfänger — nur Karten mit Fortschrittsreglern. Kein GPS, keine Markierungen.', en:'For beginners — only cards with progress sliders. No GPS, no markers.', tr:'Yeni başlayanlar için — yalnızca ilerleme kaydırıcılı kartlar. GPS yok, işaret yok.', ar:'للمبتدئين — بطاقات مع أشرطة تقدّم فقط. لا GPS، لا علامات.', es:'Para principiantes — solo tarjetas con controles de progreso. Sin GPS, sin marcadores.', fr:'Pour débutants — cartes avec curseurs de progression uniquement. Pas de GPS, pas de marqueurs.', pt:'Para iniciantes — apenas cartões com controles de progresso. Sem GPS, sem marcadores.' },
  docModeExaminerTitle:    { de:'Wie ein TÜV-Prüfer', en:'Like a TÜV examiner', tr:'TÜV müfettişi gibi', ar:'مثل مفتش TÜV', es:'Como un examinador TÜV', fr:'Comme un examinateur TÜV', pt:'Como um examinador TÜV' },
  docModeExaminerHint:     { de:'Für Fortgeschrittene — GPS-Route, Markierungen und 18 Bewertungspunkte.', en:'For advanced learners — GPS route, markers and 18 evaluation points.', tr:'İleri seviye için — GPS rotası, işaretler ve 18 değerlendirme noktası.', ar:'للمستوى المتقدم — مسار GPS وعلامات و18 نقطة تقييم.', es:'Para avanzados — ruta GPS, marcadores y 18 puntos de evaluación.', fr:'Pour avancés — itinéraire GPS, marqueurs et 18 points d\u2019évaluation.', pt:'Para avançados — rota GPS, marcadores e 18 pontos de avaliação.' },

  // ── Ausbildungsdiagramm — View / Bericht ──
  trainingDiagram:         { de:'Ausbildungsdiagramm', en:'Training diagram', tr:'Eğitim şeması', ar:'مخطط التدريب', es:'Diagrama de formación', fr:'Diagramme de formation', pt:'Diagrama de formação' },
  trainingProgress:        { de:'Fortschritt', en:'Progress', tr:'İlerleme', ar:'التقدّم', es:'Progreso', fr:'Progression', pt:'Progresso' },
  trainingOfN:             { de:'{done} von {total} bewertet', en:'{done} of {total} rated', tr:'{done}/{total} değerlendirildi', ar:'{done} من {total} تم تقييمها', es:'{done} de {total} evaluados', fr:'{done} sur {total} évalués', pt:'{done} de {total} avaliados' },
  trainingCheckedOfN:      { de:'{done} von {total} geübt', en:'{done} of {total} practiced', tr:'{done}/{total} uygulandı', ar:'{done} من {total} تم التدرّب عليها', es:'{done} de {total} practicados', fr:'{done} sur {total} pratiqués', pt:'{done} de {total} praticados' },
  trainingDoneInLesson:    { de:'in dieser Stunde geübt', en:'practiced in this lesson', tr:'bu derste uygulandı', ar:'تم التدرّب عليه في هذه الحصة', es:'practicado en esta clase', fr:'pratiqué dans cette leçon', pt:'praticado nesta aula' },
  trainingNoteHint:        { de:'Notiz (optional)', en:'Note (optional)', tr:'Not (opsiyonel)', ar:'ملاحظة (اختياري)', es:'Nota (opcional)', fr:'Note (optionnel)', pt:'Nota (opcional)' },
  trainingRatingHint:      { de:'Tippe auf die Skala, um den Stand zu setzen.', en:'Tap the scale to set the level.', tr:'Seviyeyi belirlemek için ölçeğe dokun.', ar:'انقر على الشريط لتحديد المستوى.', es:'Toca la escala para fijar el nivel.', fr:'Touchez l\u2019échelle pour définir le niveau.', pt:'Toque na escala para definir o nível.' },
  trainingLastPracticed:   { de:'Zuletzt geübt', en:'Last practiced', tr:'Son uygulama', ar:'آخر تدريب', es:'Última práctica', fr:'Dernière pratique', pt:'Última prática' },
  trainingSummaryTitle:    { de:'Ausbildungsstand', en:'Training status', tr:'Eğitim durumu', ar:'حالة التدريب', es:'Estado de formación', fr:'État de formation', pt:'Estado de formação' },
  trainingReportTitle:     { de:'Ausbildungsdiagramm dieser Stunde', en:'Training diagram — this lesson', tr:'Bu dersin eğitim şeması', ar:'مخطط تدريب هذه الحصة', es:'Diagrama de formación de esta clase', fr:'Diagramme de formation — cette leçon', pt:'Diagrama de formação desta aula' },
  trainingSummaryEmpty:    { de:'In dieser Fahrstunde wurden keine Karten bewertet.', en:'No cards were rated during this lesson.', tr:'Bu ders sırasında kart değerlendirilmedi.', ar:'لم يتم تقييم أي بطاقات خلال هذه الحصة.', es:'No se evaluaron tarjetas durante esta clase.', fr:'Aucune carte n’a été évaluée pendant cette leçon.', pt:'Nenhum cartão foi avaliado nesta aula.' },

  // ── Favoriten + Custom-Kriterien ──
  trainingFavoritesTitle:  { de:'Favoriten', en:'Favorites', tr:'Favoriler', ar:'المفضلة', es:'Favoritos', fr:'Favoris', pt:'Favoritos' },
  trainingFavoritesSubtitle:{ de:'Deine mit Stern markierten Kriterien', en:'Your starred criteria', tr:'Yıldızlı kriterlerin', ar:'معاييرك المميّزة', es:'Tus criterios destacados', fr:'Tes critères favoris', pt:'Seus critérios com estrela' },
  trainingFavoritesEmpty:  { de:'Noch keine Favoriten. Tippe auf den Stern neben einem Kriterium, um es hier zu sammeln.', en:'No favorites yet. Tap the star next to a criterion to collect it here.', tr:'Henüz favori yok. Bir kriterin yanındaki yıldıza dokunarak buraya ekle.', ar:'لا توجد مفضلات. اضغط على النجمة بجانب أي معيار.', es:'Todavía no hay favoritos. Toca la estrella al lado de un criterio.', fr:'Pas encore de favoris. Appuie sur l’étoile à côté d’un critère.', pt:'Sem favoritos ainda. Toque na estrela ao lado de um critério.' },
  trainingAddOwnCriterion: { de:'Eigenes Kriterium hinzufügen', en:'Add own criterion', tr:'Kendi kriterini ekle', ar:'أضف معيارًا خاصًا', es:'Añadir criterio propio', fr:'Ajouter un critère', pt:'Adicionar critério próprio' },
  trainingNewCriterionName:{ de:'Bezeichnung', en:'Name', tr:'Ad', ar:'الاسم', es:'Nombre', fr:'Nom', pt:'Nome' },
  trainingNewCriterionType:{ de:'Bewertungstyp', en:'Rating type', tr:'Değerlendirme türü', ar:'نوع التقييم', es:'Tipo de evaluación', fr:'Type d’évaluation', pt:'Tipo de avaliação' },
  trainingTypeCheck:       { de:'Abhaken (geübt / nicht geübt)', en:'Checkbox (done / not done)', tr:'Onay kutusu', ar:'خانة اختيار', es:'Casilla', fr:'Case à cocher', pt:'Marcação' },
  trainingTypeRating:      { de:'Regler 1–5', en:'Slider 1–5', tr:'Kaydırıcı 1–5', ar:'متدرّج 1–5', es:'Regulador 1–5', fr:'Curseur 1–5', pt:'Régua 1–5' },
  trainingCustomBadge:     { de:'eigenes', en:'own', tr:'özel', ar:'خاص', es:'propio', fr:'personnel', pt:'próprio' },
  trainingDeleteCustom:    { de:'Eigenes Kriterium löschen?', en:'Delete own criterion?', tr:'Kendi kriteri sil?', ar:'حذف المعيار الخاص؟', es:'¿Eliminar criterio propio?', fr:'Supprimer ce critère ?', pt:'Excluir critério próprio?' },
  trainingAddBtn:          { de:'Hinzufügen', en:'Add', tr:'Ekle', ar:'إضافة', es:'Añadir', fr:'Ajouter', pt:'Adicionar' },
  trainingCancelBtn:       { de:'Abbrechen', en:'Cancel', tr:'İptal', ar:'إلغاء', es:'Cancelar', fr:'Annuler', pt:'Cancelar' },
  trainingStarAria:        { de:'Als Favorit markieren', en:'Mark as favorite', tr:'Favori olarak işaretle', ar:'وضع في المفضلة', es:'Marcar como favorito', fr:'Marquer comme favori', pt:'Marcar como favorito' }
};

// ── Day names by language ──
var DAY_NAMES_I18N = {
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  tr: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'],
  ar: ['اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
};

var DAY_NAMES_LONG_I18N = {
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  tr: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  ar: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  es: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  pt: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
};

var MONTH_NAMES_I18N = {
  de: ['Jan.', 'Feb.', 'Mär.', 'Apr.', 'Mai', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  en: ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
  tr: ['Oca.', 'Şub.', 'Mar.', 'Nis.', 'May.', 'Haz.', 'Tem.', 'Ağu.', 'Eyl.', 'Eki.', 'Kas.', 'Ara.'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  es: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  fr: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  pt: ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.']
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

// ── Bewertungs-Items (5 Beobachtungskategorien + 8 Fahraufgaben + 5 GFA-B + 9 GFA-A) ──
// Die App speichert Items intern mit deutschen Namen. Fuer die Anzeige
// (v.a. im PDF) mappen wir sie hier auf i18n-Keys, die dann pro Sprache
// aufgeloest werden.
var EVAL_ITEM_KEY_MAP = {
  // Beobachtungskategorien
  'Verkehrsbeobachtung': 'evalVerkehrsbeobachtung',
  'Fahrzeugpositionierung': 'evalFahrzeugpositionierung',
  'Geschwindigkeitsanpassung': 'evalGeschwindigkeitsanpassung',
  'Kommunikation': 'evalKommunikation',
  'Fahrzeugbedienung/Umweltbewusste Fahrweise': 'evalFahrzeugbedienung',
  // Fahraufgaben im Strassenverkehr
  'Kurven befahren': 'evalKurven',
  'Vorbeifahren / Überholen / Begegnen': 'evalUeberholen',
  'Abbiegen / Kreuzungen / Einmündungen': 'evalAbbiegenKreuzung',
  'Kreisverkehr': 'evalKreisverkehr',
  'Fahrstreifenwechsel': 'evalFahrstreifenwechsel',
  'Autobahn / Kraftfahrstraße': 'evalAutobahn',
  'Bahnübergang': 'evalBahnuebergang',
  'Haltestellen / Fußgängerüberwege': 'evalHaltestellen',
  // Grundfahraufgaben B
  'Abbremsen mit höchstmöglicher Verzögerung': 'evalAbbremsen',
  'Rückwärtsfahren mit Abbiegen': 'evalRueckwaertsAbbiegen',
  'Umkehren': 'evalUmkehren',
  'Einparken längs': 'evalEinparkenLaengs',
  'Einparken quer': 'evalEinparkenQuer',
  // Grundfahraufgaben A (Motorrad)
  'Slalom mit Schrittgeschwindigkeit': 'evalSlalomSchritt',
  'Ausweichen ohne Abbremsen': 'evalAusweichenOhne',
  'Ausweichen nach Abbremsen': 'evalAusweichenNach',
  'Slalom': 'evalSlalom',
  'Langer Slalom': 'evalLangerSlalom',
  'Fahren mit Schrittgeschwindigkeit geradeaus': 'evalSchrittGeradeaus',
  'Stop and Go': 'evalStopAndGo',
  'Kreisfahrt': 'evalKreisfahrt'
};

// ── Skill level key map ──
var LEVEL_KEY_MAP = {
  'Anfänger': 'anfaenger', 'Fortgeschritten': 'fortgeschritten',
  'Sicher': 'sicher', 'Prüfungsreif': 'pruefungsreif'
};

// ── Status key map (backend stores German values) ──
var STATUS_KEY_MAP = {
  'bestätigt': 'bestaetigt', 'geplant': 'geplant', 'offen': 'offen',
  'Offen': 'offen', 'verwendet': 'verwendet', 'widerrufen': 'widerrufen'
};

// ── Core translation functions ──
// Fallback-Kette pro Sprache (falls Key in Zielsprache fehlt):
//   pt → es → en → de
//   ar/tr/fr/es → en → de
//   en → de
var LANG_FALLBACK = {
  pt: ['es', 'en', 'de'],
  es: ['en', 'de'],
  fr: ['en', 'de'],
  tr: ['en', 'de'],
  ar: ['en', 'de'],
  en: ['de'],
  de: []
};

function _resolveTr(entry, lang) {
  if (!entry) return null;
  if (entry[lang] != null) return entry[lang];
  var chain = LANG_FALLBACK[lang] || ['en', 'de'];
  for (var i = 0; i < chain.length; i++) {
    if (entry[chain[i]] != null) return entry[chain[i]];
  }
  return null;
}

function t(key, params) {
  var lang = (typeof AppState !== 'undefined' && AppState.language) || 'de';
  var entry = TRANSLATIONS[key];
  if (!entry) return key;
  var str = _resolveTr(entry, lang);
  if (str == null) str = key;
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
