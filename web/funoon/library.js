'use strict';
/* مكتبة أسماء التمارين للاقتراح أثناء الكتابة (يمكنك كتابة أي اسم آخر) */
const LIBRARY = [
  // العقلة والسحب
  'عقلة (Pull-up)', 'عقلة عكسية (Chin-up)', 'عقلة واسعة (Wide Pull-up)', 'عقلة ضيقة (Close-grip Pull-up)', 'عقلة سريعة الصعود (Explosive Pull-up)',
  'عقلة الأرتشر (Archer Pull-up)', 'عقلة الآلة الكاتبة (Typewriter Pull-up)', 'عقلة بنزول بطيء (Negative Pull-up)', 'عقلة بتوقف في الأعلى (Pause Pull-up)',
  'المسل أب (Muscle-up)', 'تعلق ثابت (Dead Hang)', 'تعلق نشط (Active Hang)', 'تعلق بذراعين مثنيتين (Flexed-Arm Hang)', 'تعلق بيد واحدة (One-Arm Hang)',
  'سحب لوح الكتف (Scapular Pull)', 'تجديف مقلوب (Inverted Row)', 'الفرونت ليفر المنكمش (Tuck Front Lever)', 'الفرونت ليفر (Front Lever)',
  // الدفع
  'ضغط (Push-up)', 'ضغط ضيق (Close-grip Push-up)', 'ضغط الألماس (Diamond Push-up)', 'ضغط واسع (Wide Push-up)', 'ضغط بقدمين مرفوعتين (Decline Push-up)',
  'ضغط على مرتفع (Incline Push-up)', 'ضغط انفجاري (Explosive Push-up)', 'ضغط بالتصفيق (Clap Push-up)', 'ضغط الأرتشر (Archer Push-up)', 'ضغط شبه بلانش (Pseudo Planche Push-up)',
  'ضغط الكتف المقلوب (Pike Push-up)', 'ضغط الوقوف على اليدين (Handstand Push-up)', 'ضغط بإيقاع بطيء (Tempo Push-up)', 'تثبيت أسفل الضغط (Push-up Bottom Hold)',
  'غطس الحافة (Bench Dip)', 'غطس البار المستقيم (Straight-Bar Dip)', 'غطس المتوازي (Parallel Bar Dip)', 'تثبيت الدعم على البار (Bar Support Hold)', 'الوقوف على اليدين على الحائط (Wall Handstand)',
  // الأرجل
  'سكوات (Squat)', 'سكوات بإيقاع بطيء (Tempo Squat)', 'سكوات بتوقف (Pause Squat)', 'قفز السكوات (Squat Jump)', 'السكوات البلغاري (Bulgarian Split Squat)',
  'الاندفاع الأمامي (Forward Lunge)', 'الاندفاع الخلفي (Reverse Lunge)', 'الاندفاع المشي (Walking Lunge)', 'الاندفاع بالقفز (Jumping Lunge)', 'سكوات البيستول (Pistol Squat)',
  'سكوات الروبيان (Shrimp Squat)', 'القرفصاء الجانبية (Cossack Squat)', 'جلوس الحائط (Wall Sit)', 'النزول البطيء عن درجة (Step-Down)', 'الصعود على درجة (Step-up)',
  'رفع الكعب (Calf Raise)', 'رفع الكعب بقدم واحدة (Single-Leg Calf Raise)', 'رفع مقدّمة القدم (Tibialis Raise)', 'جسر الورك (Glute Bridge)', 'جسر الورك بقدم واحدة (Single-Leg Glute Bridge)',
  'الرفع الرومانياني بقدم واحدة (Single-Leg RDL)', 'الانحناء الإسكندنافي (Nordic Curl)',
  // القفز والانفجار
  'القفز العريض (Broad Jump)', 'قفز الركبتين للصدر (Tuck Jump)', 'القفز الجانبي (Lateral Bound)', 'القفزات المتتالية (Bounding)', 'قفز بقدم واحدة (Single-Leg Hop)',
  'قفزات الكاحل (Pogo Hops)', 'قفز الصندوق (Box Jump)', 'البيربي (Burpee)', 'بيربي مع عقلة (Burpee Pull-up)', 'قفز النجمة (Star Jump)', 'قفز الحبل (Jump Rope)',
  // الجذع
  'بلانك (Plank)', 'بلانك جانبي (Side Plank)', 'بلانك عالي التوتر (RKC Plank)', 'وضع الجسم المقعّر (Hollow Body Hold)', 'هزّ الجسم المقعّر (Hollow Rock)',
  'المشي باليدين من البلانك (Plank Walkout)', 'عجلة البطن (Ab Wheel Rollout)', 'رفع الركبتين من التعلق (Hanging Knee Raise)', 'رفع الساقين من التعلق (Hanging Leg Raise)',
  'من القدمين إلى البار (Toes-to-Bar)', 'الجلوس على شكل L (L-sit)', 'متسلق الجبال (Mountain Climber)', 'الحشرة الميتة (Dead Bug)', 'الطائر والكلب (Bird Dog)', 'الجلوس الروسي (Russian Twist)', 'الرجل الخارق (Superman)',
  // الجري واللياقة
  'جري هادئ (Easy Run)', 'جري ثابت (Tempo Run)', 'جري سريع (Fast Run)', 'سرعة قصوى (Sprint)', 'انطلاقات (Strides)', 'تسارع (Acceleration Sprint)', 'جري صعود مرتفع (Hill Sprint)',
  'رفع الركبتين السريع (High Knees)', 'الوثب التبادلي (A-Skip)', 'المشي برفع الركبة (A-March)', 'ركل المؤخرة (Butt Kicks)', 'مشي سريع (Brisk Walk)', 'زحف الدب (Bear Crawl)', 'الملاكمة في الهواء (Shadow Boxing)',
  // الليونة
  'القطة والبقرة (Cat-Cow)', 'القرفصاء العميقة (Deep Squat Hold)', 'إطالة الفخذ الخلفي (Hamstring Stretch)', 'إطالة الفخذ الأمامي (Quad Stretch)', 'إطالة الورك الأمامية (Hip Flexor Stretch)',
  'وضع الحمامة (Pigeon Pose)', 'دوران الصدر (Thoracic Rotation)', 'تمديد الصدر (Pec Stretch)', 'تعلق سلبي (Passive Hang)', 'وضع الطفل (Child\'s Pose)', 'الانحناء الأمامي (Forward Fold)',
  'تهيئة المعصمين (Wrist Prep)', 'ثني الكاحل نحو الحائط (Ankle Knee-to-Wall)', 'أرجحة الرجل (Leg Swings)', 'دوران الذراعين (Arm Circles)', 'وضع الفطيرة (Pancake)',
];

/* تمارين جاهزة تظهر أول مرة (يمكنك تعديلها أو حذفها) */
function sampleWorkouts() {
  const id = () => Math.random().toString(36).slice(2, 10);
  return [
    { id: id(), name: 'عقلة مع ثبات في الأعلى', cat: 'كاليستنكس', format: 'straight', p: { restEx: 120 }, exercises: [
      { name: 'عقلة (Pull-up)', mode: 'reps_hold', reps: 4, hold: 4, where: 'أعلى البار', gap: 3, sets: 4, rest: 90 },
      { name: 'تعلق ثابت (Dead Hang)', mode: 'time', secs: 30, sets: 3, rest: 60 },
      { name: 'رفع الركبتين من التعلق (Hanging Knee Raise)', mode: 'reps', reps: 10, tempo: '2-0-2', sets: 3, rest: 60 } ] },
    { id: id(), name: 'EMOM ضغط وسكوات — 12 دقيقة', cat: 'HIIT ولياقة', format: 'emom', p: { minutes: 12, every: 60 }, exercises: [
      { name: 'ضغط (Push-up)', mode: 'reps', reps: 15 }, { name: 'سكوات (Squat)', mode: 'reps', reps: 20 }, { name: 'بيربي (Burpee)', mode: 'reps', reps: 8 } ] },
    { id: id(), name: 'تاباتا للنَّفَس', cat: 'HIIT ولياقة', format: 'tabata', p: { work: 20, rest: 10, rounds: 8, restEx: 60 }, exercises: [
      { name: 'رفع الركبتين السريع (High Knees)', mode: 'time', secs: 20 }, { name: 'متسلق الجبال (Mountain Climber)', mode: 'time', secs: 20 } ] },
    { id: id(), name: 'AMRAP سيندي — 15 دقيقة', cat: 'كاليستنكس', format: 'amrap', p: { minutes: 15 }, exercises: [
      { name: 'عقلة (Pull-up)', mode: 'reps', reps: 5 }, { name: 'ضغط (Push-up)', mode: 'reps', reps: 10 }, { name: 'سكوات (Squat)', mode: 'reps', reps: 15 } ] },
    { id: id(), name: 'سلّم العقلة 1 إلى 5', cat: 'كاليستنكس', format: 'ladder', p: { from: 1, to: 5, step: 1, rest: 45 }, exercises: [
      { name: 'عقلة (Pull-up)', mode: 'reps', reps: 1 }, { name: 'ضغط الألماس (Diamond Push-up)', mode: 'reps', reps: 1 } ] },
    { id: id(), name: 'جري فترات 6 × 400 متر', cat: 'جري', format: 'intervals', p: { work: 0, rest: 90, rounds: 6 }, exercises: [
      { name: 'جري سريع (Fast Run)', mode: 'distance', dist: 400, pace: '4:50 دقيقة/كم' } ] },
    { id: id(), name: 'دائرة الجسم كاملًا', cat: 'قوة', format: 'circuit', p: { rounds: 3, restEx: 15, restRound: 90 }, exercises: [
      { name: 'عقلة عكسية (Chin-up)', mode: 'reps', reps: 6 }, { name: 'ضغط (Push-up)', mode: 'reps', reps: 15 },
      { name: 'الاندفاع الخلفي (Reverse Lunge)', mode: 'reps', reps: 10, side: true }, { name: 'بلانك (Plank)', mode: 'time', secs: 45 } ] },
    { id: id(), name: 'الموت بالبيربي', cat: 'HIIT ولياقة', format: 'deathby', p: { start: 1, add: 1, max: 20 }, exercises: [
      { name: 'البيربي (Burpee)', mode: 'reps', reps: 1 } ] },
    { id: id(), name: 'روتين الليونة اليومي', cat: 'ليونة وإطالة', format: 'circuit', p: { rounds: 1, restEx: 5, restRound: 0 }, exercises: [
      { name: 'القطة والبقرة (Cat-Cow)', mode: 'reps', reps: 8 }, { name: 'القرفصاء العميقة (Deep Squat Hold)', mode: 'time', secs: 45 },
      { name: 'إطالة الفخذ الخلفي (Hamstring Stretch)', mode: 'time', secs: 40, side: true }, { name: 'إطالة الورك الأمامية (Hip Flexor Stretch)', mode: 'time', secs: 40, side: true },
      { name: 'تعلق سلبي (Passive Hang)', mode: 'time', secs: 30 } ] },
  ];
}
