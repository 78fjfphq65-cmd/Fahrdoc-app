/* ================================================================
   FahrDoc — Ausbildungsdiagramm-Katalog (Klasse B)
   ----------------------------------------------------------------
   Strukturiert nach § 5 Fahrschueler-Ausbildungsordnung (FahrschAusbO)
   und Anlage 7.1 der Durchfuehrungsverordnung zum Fahrlehrergesetz.
   Die vier Stufen (Grundstufe, Aufbaustufe, Leistungsstufe) und die
   Grundfahraufgaben sind rechtliche Rahmenbegriffe und damit frei
   verwendbar. Formulierungen und Layout wurden von Grund auf neu
   fuer FahrDoc geschrieben.

   Item-Typen:
   - 'check'    : einfach abhaken (Grundstufe: hat / hat nicht geuebt)
   - 'rating'   : Regler von rot nach gruen (5 Stufen)
                  0 = nicht bewertet, 1 = uebt gerade, 2 = mit Hilfe,
                  3 = weitgehend selbstaendig, 4 = sicher, 5 = pruefungsreif

   Sub-Items: manche Items haben feste Unterpunkte (z.B. Einstellen:
   Sitz, Spiegel, Lenkrad, Kopfstuetze). Sub-Items sind vom gleichen
   Typ wie das Parent-Item.
================================================================ */

// Regler-Labels (5 Stufen + "nicht bewertet")
// TL: die 6 States sind im Frontend nur ueber Farbe + Position erkennbar,
// zusaetzlich zeigen wir das Label an. Uebersetzung pro Sprache.
var TRAINING_RATING_LABELS = {
  0: { de: 'nicht bewertet',       en: 'not rated',        tr: 'değerlendirilmedi',   ar: 'غير مقيَّم',        es: 'sin evaluar',        fr: 'non évalué',       pt: 'não avaliado' },
  1: { de: 'übt gerade',           en: 'just starting',    tr: 'yeni başlıyor',       ar: 'يتدرَّب حاليًّا',    es: 'empezando',          fr: 'apprend',          pt: 'começando' },
  2: { de: 'noch mit Hilfe',       en: 'needs help',       tr: 'yardımla',            ar: 'يحتاج مساعدة',      es: 'con ayuda',          fr: 'avec aide',        pt: 'com ajuda' },
  3: { de: 'weitgehend selbst',    en: 'mostly on own',    tr: 'çoğunlukla kendisi',  ar: 'يعتمد على نفسه في الغالب', es: 'casi solo',   fr: 'presque seul',     pt: 'quase sozinho' },
  4: { de: 'sicher',               en: 'confident',        tr: 'güvenli',             ar: 'واثق',              es: 'seguro',             fr: 'sûr',              pt: 'seguro' },
  5: { de: 'prüfungsreif',         en: 'test-ready',       tr: 'sınava hazır',        ar: 'جاهز للاختبار',     es: 'listo para examen',  fr: 'prêt pour examen', pt: 'pronto para exame' }
};

// Stufen-Namen
var TRAINING_STAGE_NAMES = {
  grundstufe:       { de: 'Grundstufe',        en: 'Basic level',       tr: 'Temel aşama',    ar: 'المرحلة الأساسية',   es: 'Nivel básico',       fr: 'Niveau de base',     pt: 'Nível básico' },
  grundfahraufgaben:{ de: 'Grundfahraufgaben', en: 'Basic tasks',       tr: 'Temel görevler', ar: 'المهام الأساسية',   es: 'Tareas básicas',     fr: 'Tâches de base',     pt: 'Tarefas básicas' },
  aufbaustufe:      { de: 'Aufbaustufe',       en: 'Intermediate',      tr: 'Orta aşama',     ar: 'المرحلة الوسيطة',   es: 'Nivel intermedio',   fr: 'Niveau intermédiaire', pt: 'Nível intermediário' },
  leistungsstufe:   { de: 'Leistungsstufe',    en: 'Advanced level',    tr: 'İleri aşama',    ar: 'المرحلة المتقدمة',  es: 'Nivel avanzado',     fr: 'Niveau avancé',      pt: 'Nível avançado' }
};

// Stufen-Kurzbeschreibungen (fuer Chip-Untertitel)
var TRAINING_STAGE_SUBTITLES = {
  grundstufe:       { de: 'Einweisung und Bedienung',                en: 'Introduction and controls',           tr: 'Tanıtım ve kullanım',                       ar: 'المقدمة والتحكم',                          es: 'Introducción y manejo',                   fr: 'Introduction et commandes',                pt: 'Introdução e comandos' },
  grundfahraufgaben:{ de: 'Prüfungsrelevante Grundfahraufgaben',     en: 'Test-relevant basic tasks',           tr: 'Sınavda sorulan temel görevler',            ar: 'المهام الأساسية ذات الصلة بالاختبار',      es: 'Tareas básicas relevantes para el examen', fr: 'Tâches de base pour l\'examen',            pt: 'Tarefas básicas relevantes para exame' },
  aufbaustufe:      { de: 'Umweltschonendes Fahren, Blickschulung',  en: 'Eco-friendly driving, visual habits', tr: 'Çevre dostu sürüş, göz alışkanlıkları',     ar: 'قيادة صديقة للبيئة، عادات النظر',           es: 'Conducción ecológica, hábitos visuales',  fr: 'Conduite éco, habitudes visuelles',        pt: 'Condução ecológica, hábitos visuais' },
  leistungsstufe:   { de: 'Schwierige Verkehrssituationen',           en: 'Difficult traffic situations',        tr: 'Zor trafik durumları',                      ar: 'مواقف مرورية صعبة',                        es: 'Situaciones de tráfico difíciles',        fr: 'Situations de circulation difficiles',     pt: 'Situações de tráfego difíceis' }
};

// ------------- Katalog: Klasse B -------------
// Struktur: [{ stage, groups: [{ title, items: [{ id, name, type, subs? }] }] }]
var TRAINING_CATALOG_B = [
  {
    stage: 'grundstufe',
    groups: [
      {
        title: { de: 'Vorbereiten und Einsteigen', en: 'Preparing and entering', tr: 'Hazırlık ve biniş', ar: 'الاستعداد والصعود', es: 'Preparación y entrada', fr: 'Préparation et entrée', pt: 'Preparação e entrada' },
        items: [
          { id: 'b_g_einsteigen',   type: 'check', name: { de: 'Sicheres Einsteigen',            en: 'Entering safely',           tr: 'Güvenli biniş',           ar: 'الصعود بأمان',        es: 'Entrada segura',        fr: 'Entrée sécurisée',   pt: 'Entrada segura' } },
          { id: 'b_g_einstellen',   type: 'check', name: { de: 'Sitzposition einstellen',        en: 'Adjusting seat',            tr: 'Koltuk ayarı',            ar: 'ضبط المقعد',          es: 'Ajustar asiento',       fr: 'Réglage du siège',   pt: 'Ajuste do banco' },
            subs: [
              { id: 'b_g_einstellen_sitz',      name: { de: 'Sitz',        en: 'Seat',        tr: 'Koltuk',   ar: 'المقعد',       es: 'Asiento',      fr: 'Siège',       pt: 'Banco' } },
              { id: 'b_g_einstellen_spiegel',   name: { de: 'Spiegel',     en: 'Mirrors',     tr: 'Aynalar',  ar: 'المرايا',      es: 'Espejos',      fr: 'Rétros',      pt: 'Retrovisores' } },
              { id: 'b_g_einstellen_lenkrad',   name: { de: 'Lenkrad',     en: 'Steering wheel', tr: 'Direksiyon', ar: 'المِقود', es: 'Volante',      fr: 'Volant',      pt: 'Volante' } },
              { id: 'b_g_einstellen_kopfstuetze', name: { de: 'Kopfstütze', en: 'Headrest',    tr: 'Kafalık',  ar: 'مسند الرأس',   es: 'Reposacabezas', fr: 'Appuie-tête', pt: 'Encosto de cabeça' } }
            ]
          },
          { id: 'b_g_gurt',         type: 'check', name: { de: 'Gurt anlegen und anpassen',      en: 'Fastening and adjusting seatbelt', tr: 'Emniyet kemeri', ar: 'ربط حزام الأمان',   es: 'Cinturón de seguridad', fr: 'Ceinture de sécurité', pt: 'Cinto de segurança' } }
        ]
      },
      {
        title: { de: 'Bedienelemente kennen', en: 'Knowing the controls', tr: 'Kumandaları tanıma', ar: 'التعرف على أدوات التحكم', es: 'Conocer los mandos', fr: 'Connaître les commandes', pt: 'Conhecer os comandos' },
        items: [
          { id: 'b_g_lenkrad_halten', type: 'check', name: { de: 'Lenkradhaltung',                en: 'Steering wheel grip',       tr: 'Direksiyon tutuşu',       ar: 'مسك المِقود',        es: 'Sujeción del volante',  fr: 'Tenue du volant',    pt: 'Segurar o volante' } },
          { id: 'b_g_pedale',       type: 'check', name: { de: 'Pedale bedienen',                en: 'Using the pedals',          tr: 'Pedal kullanımı',         ar: 'استخدام الدواسات',    es: 'Uso de los pedales',    fr: 'Utilisation des pédales', pt: 'Uso dos pedais' } },
          { id: 'b_g_schalthebel',  type: 'check', name: { de: 'Schalt- oder Wählhebel',         en: 'Gear lever or selector',    tr: 'Vites veya seçici kolu',  ar: 'رافعة التروس',        es: 'Palanca de cambios',    fr: 'Levier de vitesses', pt: 'Alavanca de câmbio' } },
          { id: 'b_g_zuendschloss', type: 'check', name: { de: 'Zündschloss und Startknopf',     en: 'Ignition and start button', tr: 'Kontak ve marş düğmesi',  ar: 'مفتاح التشغيل والزر',es: 'Contacto y botón de arranque', fr: 'Contact et bouton', pt: 'Ignição e botão' } },
          { id: 'b_g_motor_starten', type: 'check', name: { de: 'Motor starten',                 en: 'Starting the engine',       tr: 'Motoru çalıştırma',       ar: 'تشغيل المحرك',        es: 'Arrancar el motor',     fr: 'Démarrer le moteur', pt: 'Ligar o motor' } }
        ]
      },
      {
        title: { de: 'Erste Bewegungen', en: 'First movements', tr: 'İlk hareketler', ar: 'الحركات الأولى', es: 'Primeros movimientos', fr: 'Premiers mouvements', pt: 'Primeiros movimentos' },
        items: [
          { id: 'b_g_anfahren_ebene', type: 'check', name: { de: 'Anfahren und Anhalten in der Ebene', en: 'Starting and stopping on level ground', tr: 'Düz zeminde kalkış ve duruş', ar: 'الانطلاق والتوقف على أرض مستوية', es: 'Arranque y parada en llano', fr: 'Démarrer et s\'arrêter à plat', pt: 'Arrancar e parar em plano' } },
          { id: 'b_g_lenkuebungen',   type: 'check', name: { de: 'Lenkübungen',                  en: 'Steering practice',         tr: 'Direksiyon alıştırmaları', ar: 'تمارين التوجيه',       es: 'Prácticas de dirección', fr: 'Exercices de direction', pt: 'Exercícios de direção' } },
          { id: 'b_g_schalten_hoch',  type: 'check', name: { de: 'Hochschalten (umweltschonend)', en: 'Upshifting (eco style)',    tr: 'Yukarı vites (çevre dostu)', ar: 'الترقية (بيئي)',   es: 'Subir marcha (ecológico)', fr: 'Monter les rapports (éco)', pt: 'Subir marcha (eco)' } },
          { id: 'b_g_schalten_runter', type: 'check', name: { de: 'Runterschalten (angepasst)',  en: 'Downshifting (adapted)',    tr: 'Aşağı vites (uyarlanmış)', ar: 'التخفيض (متكيف)',  es: 'Bajar marcha (adaptado)', fr: 'Rétrograder (adapté)', pt: 'Reduzir marcha (adaptado)' } }
        ]
      }
    ]
  },

  {
    stage: 'grundfahraufgaben',
    groups: [
      {
        title: { de: 'Fahrübungen', en: 'Driving exercises', tr: 'Sürüş alıştırmaları', ar: 'تمارين القيادة', es: 'Ejercicios de conducción', fr: 'Exercices de conduite', pt: 'Exercícios de condução' },
        items: [
          { id: 'b_gfa_rueckwaerts', type: 'rating', name: { de: 'Rückwärtsfahren mit Abbiegen', en: 'Reversing with turn',       tr: 'Dönüşlü geri gitme',      ar: 'الرجوع مع الانعطاف',  es: 'Marcha atrás con giro', fr: 'Marche arrière avec virage', pt: 'Marcha à ré com curva' } },
          { id: 'b_gfa_umkehren',    type: 'rating', name: { de: 'Umkehren (Wenden)',            en: 'Turning around',            tr: 'Geri dönüş',              ar: 'الاستدارة',           es: 'Cambio de sentido',     fr: 'Demi-tour',           pt: 'Retorno' } },
          { id: 'b_gfa_gefahrbrems',type: 'rating', name: { de: 'Gefahrbremsung',                en: 'Emergency braking',         tr: 'Ani fren',                ar: 'الفرملة الاضطرارية',  es: 'Frenada de emergencia', fr: 'Freinage d\'urgence', pt: 'Frenagem de emergência' } }
        ]
      },
      {
        title: { de: 'Einparken', en: 'Parking', tr: 'Park etme', ar: 'ركن السيارة', es: 'Aparcamiento', fr: 'Stationnement', pt: 'Estacionamento' },
        items: [
          { id: 'b_gfa_einp_laengs_vw', type: 'rating', name: { de: 'Einparken längs vorwärts',  en: 'Parallel parking forward',  tr: 'Paralel park (ileri)',    ar: 'ركن متوازٍ للأمام',    es: 'Aparcar en línea (adelante)', fr: 'Créneau (avant)',  pt: 'Estacionar em fila (à frente)' } },
          { id: 'b_gfa_einp_laengs_rw', type: 'rating', name: { de: 'Einparken längs rückwärts', en: 'Parallel parking reverse',  tr: 'Paralel park (geri)',     ar: 'ركن متوازٍ للخلف',     es: 'Aparcar en línea (atrás)', fr: 'Créneau (arrière)', pt: 'Estacionar em fila (à ré)' } },
          { id: 'b_gfa_einp_quer_vw',   type: 'rating', name: { de: 'Einparken quer vorwärts',   en: 'Perpendicular parking fwd', tr: 'Dik park (ileri)',        ar: 'ركن عمودي للأمام',    es: 'Batería (adelante)',    fr: 'Bataille (avant)',   pt: 'Estacionar em baia (à frente)' } },
          { id: 'b_gfa_einp_quer_rw',   type: 'rating', name: { de: 'Einparken quer rückwärts',  en: 'Perpendicular parking rev', tr: 'Dik park (geri)',         ar: 'ركن عمودي للخلف',     es: 'Batería (atrás)',       fr: 'Bataille (arrière)', pt: 'Estacionar em baia (à ré)' } }
        ]
      }
    ]
  },

  {
    stage: 'aufbaustufe',
    groups: [
      {
        title: { de: 'Schalten und Rollen', en: 'Shifting and coasting', tr: 'Vites ve boşta gitme', ar: 'التعشيق والتدحرج', es: 'Cambiar y rodar', fr: 'Passer les rapports', pt: 'Trocar marcha e rolar' },
        items: [
          { id: 'b_a_rollen',      type: 'rating', name: { de: 'Rollen lassen und Schalten',     en: 'Coasting and shifting',     tr: 'Boşa alıp vitesleme',     ar: 'التدحرج والتعشيق',    es: 'Rodar y cambiar',       fr: 'Rouler en roue libre',   pt: 'Rolar e trocar' } },
          { id: 'b_a_abbremsen_sch', type: 'rating', name: { de: 'Abbremsen und Herunterschalten', en: 'Braking and downshifting', tr: 'Yavaşlama ve düşürme',    ar: 'الفرملة والتخفيض',    es: 'Frenar y bajar marcha', fr: 'Freiner et rétrograder', pt: 'Frear e reduzir' } }
        ]
      },
      {
        title: { de: 'Bremsübungen', en: 'Braking exercises', tr: 'Fren alıştırmaları', ar: 'تمارين الفرملة', es: 'Ejercicios de frenado', fr: 'Exercices de freinage', pt: 'Exercícios de frenagem' },
        items: [
          { id: 'b_a_brems_degressiv', type: 'rating', name: { de: 'Degressives Bremsen',        en: 'Progressive-release braking', tr: 'Azalan fren',           ar: 'الفرملة المتناقصة',   es: 'Frenado degresivo',     fr: 'Freinage dégressif',  pt: 'Frenagem progressiva' } },
          { id: 'b_a_brems_ziel',      type: 'rating', name: { de: 'Zielbremsung',               en: 'Targeted braking',          tr: 'Hedefli fren',            ar: 'الفرملة الموجَّهة',    es: 'Frenado con objetivo',  fr: 'Freinage ciblé',      pt: 'Frenagem alvo' } },
          { id: 'b_a_brems_gefahr',    type: 'rating', name: { de: 'Bremsen in Gefahrensituationen', en: 'Braking in danger situations', tr: 'Tehlike anında fren', ar: 'الفرملة في المخاطر',  es: 'Frenar en situación de peligro', fr: 'Freiner en danger', pt: 'Frear em situação de perigo' } }
        ]
      },
      {
        title: { de: 'Steigung und Gefälle', en: 'Uphill and downhill', tr: 'Yokuş ve iniş', ar: 'الصعود والنزول', es: 'Cuesta arriba y abajo', fr: 'Côte et descente', pt: 'Subida e descida' },
        items: [
          { id: 'b_a_steig_anhalten',  type: 'rating', name: { de: 'Anhalten am Berg',           en: 'Stopping on a hill',        tr: 'Yokuşta durma',           ar: 'التوقف على المنحدر',  es: 'Parar en pendiente',    fr: 'S\'arrêter en côte',  pt: 'Parar em subida' } },
          { id: 'b_a_steig_anfahren',  type: 'rating', name: { de: 'Anfahren am Berg',           en: 'Hill start',                tr: 'Yokuşta kalkış',          ar: 'الانطلاق من المنحدر', es: 'Arranque en pendiente', fr: 'Démarrer en côte',    pt: 'Arrancar em subida' } },
          { id: 'b_a_steig_rueck',     type: 'rating', name: { de: 'Rückwärtsfahren am Gefälle', en: 'Reversing downhill',        tr: 'İnişte geri gitme',       ar: 'الرجوع في المنحدر',   es: 'Marcha atrás en pendiente', fr: 'Marche arrière en pente', pt: 'Marcha à ré em descida' } },
          { id: 'b_a_steig_sichern',   type: 'rating', name: { de: 'Fahrzeug am Hang sichern',   en: 'Securing the vehicle',      tr: 'Yokuşta sabitleme',       ar: 'تأمين السيارة',       es: 'Asegurar el vehículo',  fr: 'Immobiliser le véhicule', pt: 'Prender o veículo' } }
        ]
      },
      {
        title: { de: 'Feingefühl', en: 'Fine control', tr: 'Hassas kontrol', ar: 'التحكم الدقيق', es: 'Control fino', fr: 'Contrôle fin', pt: 'Controle fino' },
        items: [
          { id: 'b_a_tastgeschw', type: 'rating', name: { de: 'Tastgeschwindigkeit',             en: 'Creep speed control',       tr: 'Yavaş kontrol hızı',      ar: 'سرعة اللمس',          es: 'Velocidad de tanteo',   fr: 'Vitesse de reptation', pt: 'Velocidade de tateio' } },
          { id: 'b_a_bedien_kontroll', type: 'rating', name: { de: 'Bedienungs- und Kontrolleinrichtungen nutzen', en: 'Using controls and instruments', tr: 'Kumanda ve göstergeleri kullanma', ar: 'استخدام أدوات التحكم والمؤشرات', es: 'Uso de mandos e instrumentos', fr: 'Utilisation des commandes et instruments', pt: 'Uso de comandos e instrumentos' } }
        ]
      }
    ]
  },

  {
    stage: 'leistungsstufe',
    groups: [
      {
        title: { de: 'Fahrbahn und Spur', en: 'Lane and road use', tr: 'Şerit ve yol kullanımı', ar: 'استخدام المسار والطريق', es: 'Uso de carril y calzada', fr: 'Usage de la voie', pt: 'Uso da faixa e via' },
        items: [
          { id: 'b_l_fahrbahn',      type: 'rating', name: { de: 'Fahrbahnbenutzung',            en: 'Lane use',                  tr: 'Şerit kullanımı',         ar: 'استخدام المسار',      es: 'Uso del carril',        fr: 'Utilisation de la voie', pt: 'Uso da faixa' } },
          { id: 'b_l_einordnen',     type: 'rating', name: { de: 'Einordnen und Markierungen',   en: 'Positioning and markings',  tr: 'Yerleşme ve şerit çizgileri', ar: 'الاصطفاف والعلامات', es: 'Posicionamiento y marcas', fr: 'Positionnement et marquages', pt: 'Posicionar e marcações' } },
          { id: 'b_l_spurwechsel',   type: 'rating', name: { de: 'Fahrstreifenwechsel',          en: 'Changing lanes',            tr: 'Şerit değiştirme',        ar: 'تغيير المسار',        es: 'Cambio de carril',      fr: 'Changement de voie',  pt: 'Mudança de faixa' } }
        ]
      },
      {
        title: { de: 'Vorbeifahren und Abbiegen', en: 'Passing and turning', tr: 'Geçme ve dönme', ar: 'التجاوز والانعطاف', es: 'Adelantar y girar', fr: 'Dépasser et tourner', pt: 'Ultrapassar e virar' },
        items: [
          { id: 'b_l_vorbei_ueber', type: 'rating', name: { de: 'Vorbeifahren und Überholen',    en: 'Passing and overtaking',    tr: 'Geçme ve sollama',        ar: 'المرور والتجاوز',     es: 'Adelantar y sobrepasar', fr: 'Doubler et dépasser', pt: 'Passar e ultrapassar' } },
          { id: 'b_l_abbiegen_r',   type: 'rating', name: { de: 'Rechts abbiegen',               en: 'Turning right',             tr: 'Sağa dönüş',              ar: 'الانعطاف يمينًا',      es: 'Girar a la derecha',    fr: 'Tourner à droite',    pt: 'Virar à direita' } },
          { id: 'b_l_abbiegen_l',   type: 'rating', name: { de: 'Links abbiegen',                en: 'Turning left',              tr: 'Sola dönüş',              ar: 'الانعطاف يسارًا',      es: 'Girar a la izquierda',  fr: 'Tourner à gauche',    pt: 'Virar à esquerda' } },
          { id: 'b_l_abbiegen_mehr',type: 'rating', name: { de: 'Abbiegen bei mehreren Spuren',  en: 'Multi-lane turns',          tr: 'Çok şeritli dönüş',       ar: 'الانعطاف متعدد المسارات', es: 'Girar con varios carriles', fr: 'Tourner sur voies multiples', pt: 'Virar em várias faixas' } }
        ]
      },
      {
        title: { de: 'Vorfahrt und Kreuzungen', en: 'Right of way and junctions', tr: 'Geçiş üstünlüğü ve kavşaklar', ar: 'أولوية المرور والتقاطعات', es: 'Prioridad y cruces', fr: 'Priorité et carrefours', pt: 'Prioridade e cruzamentos' },
        items: [
          { id: 'b_l_vorfahrt',      type: 'rating', name: { de: 'Vorfahrt regeln beachten',     en: 'Right-of-way rules',        tr: 'Geçiş üstünlüğü kuralları', ar: 'قواعد الأولوية',   es: 'Reglas de prioridad',   fr: 'Règles de priorité',  pt: 'Regras de prioridade' } },
          { id: 'b_l_kreisverkehr',  type: 'rating', name: { de: 'Kreisverkehr',                 en: 'Roundabout',                tr: 'Döner kavşak',            ar: 'دوَّار',               es: 'Rotonda',               fr: 'Rond-point',          pt: 'Rotatória' } },
          { id: 'b_l_ampeln',        type: 'rating', name: { de: 'Ampeln und Grünpfeil',         en: 'Traffic lights and green arrow', tr: 'Trafik ışıkları ve yeşil ok', ar: 'إشارات المرور والسهم الأخضر', es: 'Semáforos y flecha verde', fr: 'Feux et flèche verte', pt: 'Semáforos e seta verde' } }
        ]
      },
      {
        title: { de: 'Geschwindigkeit und Abstand', en: 'Speed and distance', tr: 'Hız ve mesafe', ar: 'السرعة والمسافة', es: 'Velocidad y distancia', fr: 'Vitesse et distance', pt: 'Velocidade e distância' },
        items: [
          { id: 'b_l_geschw',   type: 'rating', name: { de: 'Geschwindigkeit anpassen',          en: 'Adapting speed',            tr: 'Hız uyarlama',            ar: 'ملاءمة السرعة',       es: 'Adaptar velocidad',     fr: 'Adapter la vitesse',  pt: 'Adaptar velocidade' } },
          { id: 'b_l_abstand',  type: 'rating', name: { de: 'Sicherheitsabstand halten',         en: 'Keeping safe distance',     tr: 'Güvenli mesafe',          ar: 'الحفاظ على مسافة الأمان', es: 'Distancia de seguridad', fr: 'Distance de sécurité', pt: 'Distância de segurança' } }
        ]
      },
      {
        title: { de: 'Andere Verkehrsteilnehmer', en: 'Other road users', tr: 'Diğer trafik katılımcıları', ar: 'مستخدمو الطريق الآخرون', es: 'Otros usuarios de la vía', fr: 'Autres usagers', pt: 'Outros usuários da via' },
        items: [
          { id: 'b_l_fussgaenger', type: 'rating', name: { de: 'Fußgänger und Zebrastreifen',    en: 'Pedestrians and crossings', tr: 'Yayalar ve geçitler',     ar: 'المشاة والممرات',     es: 'Peatones y pasos',      fr: 'Piétons et passages', pt: 'Pedestres e faixas' } },
          { id: 'b_l_kinder',      type: 'rating', name: { de: 'Kinder und Schulbus',            en: 'Children and school bus',   tr: 'Çocuklar ve okul otobüsü',ar: 'الأطفال وحافلة المدرسة', es: 'Niños y autobús escolar', fr: 'Enfants et bus scolaire', pt: 'Crianças e ônibus escolar' } },
          { id: 'b_l_radfahrer',   type: 'rating', name: { de: 'Radfahrer und E-Roller',         en: 'Cyclists and e-scooters',   tr: 'Bisikletli ve e-scooter', ar: 'الدراجات والسكوتر',   es: 'Ciclistas y patinetes', fr: 'Cyclistes et trottinettes', pt: 'Ciclistas e patinetes' } },
          { id: 'b_l_oepnv',       type: 'rating', name: { de: 'Bus und Straßenbahn',            en: 'Bus and tram',              tr: 'Otobüs ve tramvay',       ar: 'الحافلة والترام',     es: 'Autobús y tranvía',     fr: 'Bus et tram',         pt: 'Ônibus e bonde' } }
        ]
      },
      {
        title: { de: 'Besondere Situationen', en: 'Special situations', tr: 'Özel durumlar', ar: 'مواقف خاصة', es: 'Situaciones especiales', fr: 'Situations particulières', pt: 'Situações especiais' },
        items: [
          { id: 'b_l_engpass',      type: 'rating', name: { de: 'Engstelle passieren',            en: 'Passing a narrow spot',    tr: 'Dar geçitten geçme',      ar: 'المرور من مضيق',       es: 'Paso por estrechamiento', fr: 'Passage étroit',   pt: 'Passar por estreitamento' } },
          { id: 'b_l_einbahn',      type: 'rating', name: { de: 'Einbahnstraßen',                en: 'One-way streets',           tr: 'Tek yönlü yollar',        ar: 'الطرق ذات الاتجاه الواحد', es: 'Calles de sentido único', fr: 'Sens uniques', pt: 'Vias de mão única' } },
          { id: 'b_l_bahnueber',    type: 'rating', name: { de: 'Bahnübergang',                  en: 'Railway crossing',          tr: 'Demiryolu geçidi',        ar: 'مَعبر السكة الحديدية', es: 'Paso a nivel',          fr: 'Passage à niveau',    pt: 'Passagem de nível' } },
          { id: 'b_l_kritisch',     type: 'rating', name: { de: 'Kritische Verkehrssituationen', en: 'Critical traffic situations', tr: 'Kritik trafik durumları', ar: 'مواقف مرورية حرجة', es: 'Situaciones críticas',  fr: 'Situations critiques', pt: 'Situações críticas' } },
          { id: 'b_l_stossverkehr', type: 'rating', name: { de: 'Hauptverkehrszeit',              en: 'Rush hour',                 tr: 'Yoğun saat',              ar: 'ساعات الذروة',        es: 'Hora punta',            fr: 'Heures de pointe',    pt: 'Horário de pico' } }
        ]
      }
    ]
  }
];

// Helper: liefert lokalisierten String (fallback via _resolveTr aus i18n.js)
function tCatalog(entry, lang) {
  if (typeof _resolveTr === 'function') return _resolveTr(entry, lang || 'de');
  // Fallback wenn i18n.js noch nicht geladen
  return (entry && (entry[lang] || entry.de)) || '';
}

// Alle Items der Klasse B flach als Liste (fuer Persist-Layer)
function trainingCatalogFlatB() {
  var out = [];
  TRAINING_CATALOG_B.forEach(function(stage) {
    stage.groups.forEach(function(g) {
      g.items.forEach(function(item) {
        out.push({ stage: stage.stage, id: item.id, type: item.type });
        if (item.subs) {
          item.subs.forEach(function(sub) {
            out.push({ stage: stage.stage, id: sub.id, type: 'check', parent: item.id });
          });
        }
      });
    });
  });
  return out;
}
