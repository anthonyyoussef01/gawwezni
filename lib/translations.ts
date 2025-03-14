// Centralized translations for the application
export const translations = {
  ar: {
    title: 'جوزني',
    subtitle: 'مخطط زفافك الذكي',
    description: 'نساعدك في تخطيط زفافك المثالي من البداية إلى النهاية',
    features: {
      timeline: '✨ جدول زمني مفصل',
      answers: '💬 إجابات فورية على جميع أسئلتك',
      discounts: '🎁 خصومات حصرية مع مزودي الخدمات'
    },
    input: {
      placeholder: 'أخبرنا عن حفل زفافك المثالي...',
      start: 'ابدأ التخطيط',
      message: 'اكتب رسالتك هنا...'
    },
    actions: {
      restart: 'البداية',
      download: 'تحميل المحادثة',
      selectDate: 'اختر تاريخ الزفاف'
    },
    chat: {
      datePrompt: 'من فضلك، اختر تاريخ الزفاف أولاً باستخدام أيقونة التقويم',
      invalidDate: 'عذراً، يجب اختيار تاريخ في المستقبل',
      dateChanged: 'لاحظت أنك غيرت تاريخ الزفاف. سأقوم بتحديث التوصيات وفقاً لذلك.',
      longTermPlanning: (months: number) => `رائع! لديك ${months} شهراً للتخطيط. أقترح أن تبدأ بالبحث عن قاعة الزفاف وتحديد الميزانية الإجمالية.`,
      midTermPlanning: 'حان الوقت لاختيار الموردين الرئيسيين مثل المصور وخدمة الطعام. هل تريد توصيات محددة؟',
      shortTermPlanning: 'يجب التركيز الآن على التفاصيل النهائية مثل الدعوات وترتيبات الجلوس. هل تحتاج مساعدة في أي من هذه الأمور؟',
      weddingDate: 'تاريخ الزفاف',
      you: 'أنت',
      bot: 'جوزني'
    }
  },
  en: {
    title: 'Gawwezni',
    subtitle: 'Your Smart Wedding Planner',
    description: 'We help you plan your perfect wedding from start to finish',
    features: {
      timeline: '✨ Detailed Timeline',
      answers: '💬 Instant Answers to All Your Questions',
      discounts: '🎁 Exclusive Vendor Discounts'
    },
    input: {
      placeholder: 'Tell us about your perfect wedding...',
      start: 'Start Planning',
      message: 'Type your message here...'
    },
    actions: {
      restart: 'Start Over',
      download: 'Download Chat',
      selectDate: 'Select Wedding Date'
    },
    chat: {
      datePrompt: 'Please select your wedding date first using the calendar icon',
      invalidDate: 'Please select a future date for your wedding',
      dateChanged: 'I notice you\'ve changed your wedding date. I\'ll update the recommendations accordingly.',
      longTermPlanning: (months: number) => `Great! You have ${months} months to plan. I suggest starting with venue hunting and setting your overall budget.`,
      midTermPlanning: 'It\'s time to select key vendors like photographer and catering. Would you like specific recommendations?',
      shortTermPlanning: 'Focus should be on final details like invitations and seating arrangements. Need help with any of these?',
      weddingDate: 'Wedding Date',
      you: 'You',
      bot: 'Gawwezni'
    }
  }
} as const;