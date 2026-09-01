/**
 * i18n.js — Internationalization engine for H Karate v3
 * Supported: EN (English), AR (Arabic — RTL)
 */
const I18N = (() => {
  const T = {
    // ── EN ──────────────────────────────────────────────────────────────────
    en: {
      // Nav
      nav_home:'Home', nav_kumite:'Kumite', nav_kata:'Kata 1v1',
      nav_kataAllin:'Kata All-In', nav_bracket:'Bracket',
      nav_history:'History', nav_settings:'Settings',
      // Common
      btn_back:'← Back', btn_reset:'↺ Reset', btn_print:'🖨 Print',
      btn_display:'📺 Display', btn_startServer:'Start Judge Server',
      btn_stopServer:'Stop Judge Server', btn_exportJSON:'Export JSON',
      btn_exportCSV:'Export CSV', btn_save:'💾 Save Settings',
      // Home
      home_badge:'v3 — Red Belt Edition', home_title:'Scoring',
      home_subtitle:'Professional karate scoring for kumite and kata competitions. Real-time sync across all screens and web judges.',
      home_serverTitle:'Web Judge Server',
      home_serverDesc:'Judges connect from any device on the same network using a browser — no app needed.',
      home_startServer:'Start Judge Server', home_stopServer:'Stop Server',
      home_openBrowser:'Open in Browser', home_noJudges:'No judges connected yet',
      home_quickTitle:'Quick Actions',
      home_q_display:'📺 Open Scoreboard Display', home_q_kumite:'🥊 New Kumite Match',
      home_q_kata:'🥋 New Kata 1v1 Match', home_q_allin:'🏆 New Kata Tournament',
      home_q_bracket:'📊 Tournament Bracket', home_q_history:'📋 Match History',
      home_q_settings:'⚙️ Settings',
      // Mode cards
      kumite_title:'Kumite', kumite_jp:'組手 — Fighting',
      kumite_desc:'Head-to-head fighting with real-time point scoring, penalties, and timed matches.',
      kata_title:'Kata 1v1', kata_jp:'形 — Form (Head-to-Head)',
      kata_desc:'Two competitors judged by a panel. Technical and athletic scores averaged with high/low dropped.',
      allin_title:'Kata All-In', allin_jp:'形 — Tournament Bracket',
      allin_desc:'Full elimination tournament. Multiple rounds, automatic bracket advancement, live leaderboard.',
      // Kumite page
      kumite_matchInfo:'Match Information', kumite_category:'Category',
      kumite_round:'Round', kumite_duration:'Match Duration (seconds)',
      kumite_redCorner:'🔴 Red Corner — 赤', kumite_blueCorner:'🔵 Blue Corner — 青',
      kumite_fighterName:'Fighter Name', kumite_club:'Club / Team',
      kumite_country:'Country / Flag (optional)',
      kumite_startMatch:'▶ Start Kumite Match',
      kumite_liveScoring:'🥊 Kumite — Live Scoring',
      kumite_penalties:'Penalties', kumite_matchTimer:'Match Timer',
      kumite_endMatch:'🏁 End Match', kumite_medTimeout:'🏥 Medical Timeout',
      kumite_undoScore:'↺ Undo Score', kumite_undoPenalty:'↺ Undo Penalty',
      // Kata page
      kata_compSettings:'Competition Settings', kata_numJudges:'Number of Judges',
      kata_redCorner:'🔴 Red Corner — 赤', kata_blueCorner:'🔵 Blue Corner — 青',
      kata_competitorName:'Competitor Name', kata_kataName:'Kata Name',
      kata_startMatch:'▶ Start Kata Match', kata_liveScoring:'🥋 Kata 1v1 — Live Scoring',
      kata_currentPerformer:'Current Performer',
      kata_startPerf:'▶ Start Performance', kata_endPerf:'⏹ End Performance',
      kata_calcFinal:'📊 Calculate Final', kata_endComp:'🏁 End Competition',
      kata_judgeDetails:'Judge Score Details',
      kata_technical:'Technical', kata_athletic:'Athletic',
      // Kata All-In page
      allin_tourSettings:'Tournament Settings', allin_tourName:'Tournament Name',
      allin_addComp:'Add Competitor', allin_competitors:'Competitors',
      allin_minRequired:'Minimum 4 required', allin_startTour:'🏆 Start Tournament',
      allin_currPerformer:'Current Performer',
      allin_clickToSelect:'Click a competitor card to select',
      allin_startPerf:'▶ Start Performance', allin_endScore:'⏹ End & Score',
      allin_roundControl:'Round Control', allin_finishRound:'✅ Finish Round & Advance',
      allin_showLb:'📊 Show Leaderboard', allin_endTour:'🏁 End Tournament',
      allin_liveLb:'Live Leaderboard', allin_results:'📊 Results',
      // Bracket page
      bracket_title:'🏆 Tournament Bracket',
      bracket_subtitle:'Build and visualize elimination brackets',
      bracket_setup:'Bracket Setup', bracket_tourName:'Tournament Name',
      bracket_type:'Bracket Type', bracket_singleElim:'Single Elim.',
      bracket_roundRobin:'Round Robin', bracket_addComp:'Add Competitor',
      bracket_generate:'⚡ Generate Bracket', bracket_enterResults:'Enter Results',
      bracket_clickSlot:'Click a match slot in the bracket to mark the winner',
      bracket_selMatch:'Selected Match',
      bracket_addBtn:'➕ Add',
      // History page
      history_title:'📋 Match History',
      history_subtitle:'All recorded competition results',
      history_clearAll:'🗑 Clear All', history_totalMatches:'Total Matches',
      history_kumite:'Kumite', history_kata:'Kata 1v1', history_tournaments:'Tournaments',
      history_searchPlaceholder:'Search name, club...',
      history_allDisciplines:'All Disciplines', history_allRounds:'All Rounds',
      history_clearFilters:'✕ Clear',
      history_colNum:'#', history_colDisc:'Discipline', history_colCategory:'Category',
      history_colRound:'Round', history_colRed:'Red / Competitor A',
      history_colBlue:'Blue / Competitor B', history_colScore:'Score',
      history_colWinner:'Winner', history_colMethod:'Method',
      history_colDate:'Date', history_colActions:'Actions',
      history_noRecords:'No match records found',
      history_autoSaved:'Matches are saved automatically when you end a competition',
      // Settings page
      settings_title:'⚙️ Settings',
      settings_subtitle:'Configure H Karate to your preferences',
      settings_general:'🏠 General', settings_sound:'🔊 Sound',
      settings_display:'📺 Display', settings_competition:'🥋 Competition',
      settings_data:'🗄️ Data',
      settings_orgName:'Organization Name',
      settings_orgNameDesc:'Shown on splash screen and print headers',
      settings_language:'Language', settings_langDesc:'Interface language',
      settings_soundEnable:'Enable Sound Effects',
      settings_soundDesc:'Beeps and gongs for scores, match start/end, penalties',
      settings_volume:'Volume', settings_volumeDesc:'Master volume for all sound effects',
      settings_testSounds:'Test Sounds', settings_testDesc:'Preview each sound effect',
      settings_fullscreen:'Fullscreen Scoreboard',
      settings_fullscreenDesc:'Open display window in fullscreen mode',
      settings_timerDur:'Default Timer Duration',
      settings_timerDesc:'Default kumite match duration in seconds',
      settings_judgeCount:'Default Judge Count',
      settings_judgeDesc:'Default number of judges for kata competitions',
      settings_exportTitle:'Export Match History',
      settings_exportDesc:'Download all match records as JSON or CSV',
      settings_dangerZone:'⚠️ Danger Zone',
      settings_clearTitle:'Clear All Match History',
      settings_clearDesc:'Permanently delete all saved match records',
      settings_clearBtn:'Clear History',
      settings_saveStatus:'Changes saved automatically',
      settings_saveBtn:'💾 Save Settings',
      settings_timer2min:'2:00 — Junior',
      settings_timer3min:'3:00 — Standard',
      settings_timer4min:'4:00 — Extended',
      settings_timer5min:'5:00 — Final',
      settings_judge1:'1 Judge',
      settings_judge3:'3 Judges',
      settings_judge5:'5 Judges',
      settings_judge7:'7 Judges',
      settings_autoSaved:'Changes saved automatically',
      settings_testSounds:'Test Sounds',
      settings_testDesc:'Preview each sound effect',
      settings_testMatchStart:'Match Start',
      settings_testScore:'Score',
      settings_testGong:'Gong',
      settings_testMatchEnd:'Match End',
      settings_testWinner:'Winner',
      settings_testPenalty:'Penalty',
      // Display / Scoreboard
      display_awaitingMatch:'Awaiting Match',
      display_redCorner:'Red Corner — 赤', display_blueCorner:'Blue Corner — 青',
      display_yuko:'Yūkō', display_wazaari:'Waza-ari', display_ippon:'Ippon',
      display_penalties:'Penalties', display_ready:'READY',
      display_technical:'Technical', display_athletic:'Athletic',
      display_nowPerforming:'⚡ Now Performing', display_liveLeaderboard:'Live Leaderboard',
      display_winner:'Winner',
      // Splash
      splash_subtitle:'Professional Tournament Scoring System — v3',
      splash_author:'by Hosam Sheboun',
    },

    // ── AR ──────────────────────────────────────────────────────────────────
    ar: {
      // Nav
      nav_home:'الرئيسية', nav_kumite:'كوميتي', nav_kata:'كاتا 1×1',
      nav_kataAllin:'كاتا الكل', nav_bracket:'الجدول',
      nav_history:'السجلات', nav_settings:'الإعدادات',
      // Common
      btn_back:'رجوع →', btn_reset:'↺ إعادة', btn_print:'🖨 طباعة',
      btn_display:'📺 الشاشة', btn_startServer:'تشغيل خادم الحكام',
      btn_stopServer:'إيقاف الخادم', btn_exportJSON:'تصدير JSON',
      btn_exportCSV:'تصدير CSV', btn_save:'💾 حفظ الإعدادات',
      // Home
      home_badge:'الإصدار 3 — الحزام الأحمر', home_title:'نظام التسجيل',
      home_subtitle:'نظام تسجيل احترافي للكاراتيه. مزامنة فورية عبر جميع الشاشات والحكام.',
      home_serverTitle:'خادم الحكام',
      home_serverDesc:'يتصل الحكام من أي جهاز على نفس الشبكة عبر المتصفح — بدون تطبيق.',
      home_startServer:'تشغيل الخادم', home_stopServer:'إيقاف الخادم',
      home_openBrowser:'فتح في المتصفح', home_noJudges:'لا يوجد حكام متصلون',
      home_quickTitle:'إجراءات سريعة',
      home_q_display:'📺 فتح لوحة النتائج', home_q_kumite:'🥊 مباراة كوميتي جديدة',
      home_q_kata:'🥋 مباراة كاتا 1×1 جديدة', home_q_allin:'🏆 بطولة كاتا',
      home_q_bracket:'📊 جدول البطولة', home_q_history:'📋 سجل المباريات',
      home_q_settings:'⚙️ الإعدادات',
      // Mode cards
      kumite_title:'كوميتي', kumite_jp:'組手 — القتال',
      kumite_desc:'منافسة القتال الفردي مع رصد النقاط الفوري والعقوبات والوقت.',
      kata_title:'كاتا 1×1', kata_jp:'形 — الحركات (وجهاً لوجه)',
      kata_desc:'منافسان أمام لجنة تحكيم. متوسط الدرجات التقنية والرياضية مع حذف الأعلى والأدنى.',
      allin_title:'كاتا الكل', allin_jp:'形 — جدول البطولة',
      allin_desc:'بطولة إقصائية كاملة. جولات متعددة، تقدم تلقائي، قائمة المراتب المباشرة.',
      // Kumite page
      kumite_matchInfo:'معلومات المباراة', kumite_category:'الفئة',
      kumite_round:'الجولة', kumite_duration:'مدة المباراة (ثانية)',
      kumite_redCorner:'🔴 الزاوية الحمراء — 赤', kumite_blueCorner:'🔵 الزاوية الزرقاء — 青',
      kumite_fighterName:'اسم المتنافس', kumite_club:'النادي / الفريق',
      kumite_country:'الدولة / العلم (اختياري)',
      kumite_startMatch:'▶ بدء المباراة',
      kumite_liveScoring:'🥊 كوميتي — التسجيل المباشر',
      kumite_penalties:'العقوبات', kumite_matchTimer:'الوقت',
      kumite_endMatch:'🏁 إنهاء المباراة', kumite_medTimeout:'🏥 توقف طبي',
      kumite_undoScore:'↺ تراجع', kumite_undoPenalty:'↺ تراجع',
      // Kata page
      kata_compSettings:'إعدادات المنافسة', kata_numJudges:'عدد الحكام',
      kata_redCorner:'🔴 الزاوية الحمراء — 赤', kata_blueCorner:'🔵 الزاوية الزرقاء — 青',
      kata_competitorName:'اسم المتنافس', kata_kataName:'اسم الكاتا',
      kata_startMatch:'▶ بدء مباراة الكاتا',
      kata_liveScoring:'🥋 كاتا 1×1 — التسجيل المباشر',
      kata_currentPerformer:'المؤدي الحالي',
      kata_startPerf:'▶ بدء الأداء', kata_endPerf:'⏹ إنهاء الأداء',
      kata_calcFinal:'📊 حساب النتيجة النهائية', kata_endComp:'🏁 إنهاء المنافسة',
      kata_judgeDetails:'تفاصيل درجات الحكام',
      kata_technical:'تقني', kata_athletic:'رياضي',
      // Kata All-In page
      allin_tourSettings:'إعدادات البطولة', allin_tourName:'اسم البطولة',
      allin_addComp:'إضافة متنافس', allin_competitors:'المتنافسون',
      allin_minRequired:'الحد الأدنى 4 متنافسين', allin_startTour:'🏆 بدء البطولة',
      allin_currPerformer:'المؤدي الحالي',
      allin_clickToSelect:'انقر على بطاقة متنافس للاختيار',
      allin_startPerf:'▶ بدء الأداء', allin_endScore:'⏹ إنهاء وتسجيل',
      allin_roundControl:'التحكم في الجولة',
      allin_finishRound:'✅ إنهاء الجولة والتقدم',
      allin_showLb:'📊 عرض الترتيب', allin_endTour:'🏁 إنهاء البطولة',
      allin_liveLb:'الترتيب المباشر', allin_results:'📊 النتائج',
      // Bracket page
      bracket_title:'🏆 جدول البطولة',
      bracket_subtitle:'بناء وعرض جداول الإقصاء',
      bracket_setup:'إعداد الجدول', bracket_tourName:'اسم البطولة',
      bracket_type:'نوع الجدول', bracket_singleElim:'إقصاء مباشر',
      bracket_roundRobin:'دوري', bracket_addComp:'إضافة متنافس',
      bracket_generate:'⚡ توليد الجدول', bracket_enterResults:'إدخال النتائج',
      bracket_clickSlot:'انقر على موقع مباراة في الجدول لتحديد الفائز',
      bracket_selMatch:'المباراة المحددة',
      bracket_addBtn:'➕ إضافة',
      // History page
      history_title:'📋 سجل المباريات',
      history_subtitle:'جميع نتائج المنافسات المسجلة',
      history_clearAll:'🗑 مسح الكل', history_totalMatches:'إجمالي المباريات',
      history_kumite:'كوميتي', history_kata:'كاتا 1×1',
      history_tournaments:'البطولات',
      history_searchPlaceholder:'ابحث بالاسم أو النادي...',
      history_allDisciplines:'جميع الفنون', history_allRounds:'جميع الجولات',
      history_clearFilters:'✕ مسح',
      history_colNum:'#', history_colDisc:'الفن', history_colCategory:'الفئة',
      history_colRound:'الجولة', history_colRed:'الأحمر / المتنافس أ',
      history_colBlue:'الأزرق / المتنافس ب', history_colScore:'النتيجة',
      history_colWinner:'الفائز', history_colMethod:'الطريقة',
      history_colDate:'التاريخ', history_colActions:'إجراءات',
      history_noRecords:'لا توجد سجلات مباريات',
      history_autoSaved:'تُحفظ المباريات تلقائياً عند الإنهاء',
      // Settings page
      settings_title:'⚙️ الإعدادات',
      settings_subtitle:'تخصيص H Karate حسب تفضيلاتك',
      settings_general:'🏠 عام', settings_sound:'🔊 الصوت',
      settings_display:'📺 الشاشة', settings_competition:'🥋 المنافسة',
      settings_data:'🗄️ البيانات',
      settings_orgName:'اسم المنظمة',
      settings_orgNameDesc:'يظهر على شاشة البداية وترويسات الطباعة',
      settings_language:'اللغة', settings_langDesc:'لغة الواجهة',
      settings_soundEnable:'تفعيل المؤثرات الصوتية',
      settings_soundDesc:'أصوات للنقاط وبدء/نهاية المباراة والعقوبات',
      settings_volume:'مستوى الصوت',
      settings_volumeDesc:'مستوى الصوت الرئيسي لجميع المؤثرات',
      settings_testSounds:'اختبار الأصوات', settings_testDesc:'معاينة كل مؤثر صوتي',
      settings_fullscreen:'لوحة النتائج بالشاشة الكاملة',
      settings_fullscreenDesc:'فتح نافذة الشاشة بالوضع الكامل',
      settings_timerDur:'مدة المؤقت الافتراضية',
      settings_timerDesc:'مدة مباراة الكوميتي الافتراضية بالثواني',
      settings_judgeCount:'عدد الحكام الافتراضي',
      settings_judgeDesc:'عدد الحكام الافتراضي لمنافسات الكاتا',
      settings_exportTitle:'تصدير سجل المباريات',
      settings_exportDesc:'تحميل جميع سجلات المباريات بصيغة JSON أو CSV',
      settings_dangerZone:'⚠️ منطقة الخطر',
      settings_clearTitle:'مسح سجل المباريات بالكامل',
      settings_clearDesc:'حذف دائم لجميع سجلات المباريات المحفوظة',
      settings_clearBtn:'مسح السجل',
      settings_saveStatus:'تُحفظ التغييرات تلقائياً',
      settings_saveBtn:'💾 حفظ الإعدادات',
      settings_timer2min:'2:00 — ناشئين',
      settings_timer3min:'3:00 — عادي',
      settings_timer4min:'4:00 — ممتد',
      settings_timer5min:'5:00 — نهائي',
      settings_judge1:'حكم واحد',
      settings_judge3:'3 حكام',
      settings_judge5:'5 حكام',
      settings_judge7:'7 حكام',
      settings_autoSaved:'تُحفظ التغييرات تلقائياً',
      settings_testSounds:'اختبار الأصوات',
      settings_testDesc:'معاينة كل مؤثر صوتي',
      settings_testMatchStart:'بدء المباراة',
      settings_testScore:'نقطة',
      settings_testGong:'جونج',
      settings_testMatchEnd:'نهاية المباراة',
      settings_testWinner:'فائز',
      settings_testPenalty:'عقوبة',
      // Display
      display_awaitingMatch:'في انتظار المباراة',
      display_redCorner:'الزاوية الحمراء — 赤', display_blueCorner:'الزاوية الزرقاء — 青',
      display_yuko:'يوكو', display_wazaari:'وازا-آري', display_ippon:'إيبون',
      display_penalties:'العقوبات', display_ready:'جاهز',
      display_technical:'تقني', display_athletic:'رياضي',
      display_nowPerforming:'⚡ يؤدي الآن', display_liveLeaderboard:'الترتيب المباشر',
      display_winner:'الفائز',
      // Splash
      splash_subtitle:'نظام تسجيل بطولات احترافي — الإصدار 3',
      splash_author:'من Hosam Sheboun',
    },
  };

  let currentLang = 'en';

  function t(key) {
    return (T[currentLang] && T[currentLang][key]) || T.en[key] || key;
  }

  function apply() {
    const isAR = currentLang === 'ar';
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', isAR ? 'rtl' : 'ltr');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      const val = t(key);
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
    const sel = document.getElementById('langSelector');
    if (sel) sel.value = currentLang;
  }

  function setLang(lang) {
    if (!T[lang]) return;
    currentLang = lang;
    apply();
    if (window.api && window.api.send)
      window.api.send('settings:set', { key: 'language', value: lang });
  }

  async function init() {
    if (window.api && window.api.invoke) {
      try {
        const lang = await window.api.invoke('settings:get', 'language');
        if (lang && T[lang]) currentLang = lang;
      } catch(e) {}
    }
    apply();
  }

  return { t, setLang, getLang: () => currentLang, apply, init };
})();
