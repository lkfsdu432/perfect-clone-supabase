import Header from '@/components/Header';
import { HelpCircle, Mail } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'ما هو التوكن وكيف أحصل عليه؟',
    answer: 'التوكن هو رمز فريد خاص بك يُستخدم للشراء وشحن الرصيد. يمكنك الحصول عليه من خلال التواصل مع الدعم عبر البريد الإلكتروني أو من خلال وكلائنا المعتمدين.'
  },
  {
    question: 'كيف أشحن رصيد التوكن؟',
    answer: 'اذهب إلى صفحة "شحن الرصيد"، اختر المبلغ المطلوب وطريقة الدفع المناسبة، ثم ارفع إيصال الدفع وانتظر الموافقة. سيتم إضافة الرصيد خلال دقائق بعد التحقق.'
  },
  {
    question: 'كيف يمكنني الشراء؟',
    answer: 'أدخل التوكن الخاص بك في الصفحة الرئيسية، اختر المنتج المطلوب، ثم اضغط على "شراء". سيتم خصم المبلغ تلقائياً من رصيدك وستستلم المنتج.'
  },
  {
    question: 'كيف أتحقق من رصيدي وطلباتي؟',
    answer: 'أدخل التوكن في الصفحة الرئيسية واضغط على "عرض الرصيد" لمعرفة رصيدك الحالي، وستجد أسفله سجل جميع طلباتك السابقة وحالتها.'
  },
  {
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: 'نوفر طرق دفع متعددة تشمل فودافون كاش، اتصالات كاش، أورانج كاش، إنستا باي، وغيرها. يمكنك اختيار الطريقة المناسبة لك عند شحن الرصيد.'
  },
  {
    question: 'كم يستغرق تسليم المنتج؟',
    answer: 'المنتجات الفورية تُسلّم مباشرة بعد الشراء. المنتجات اليدوية تحتاج وقتاً للمعالجة حسب الوقت المتوقع المذكور في وصف المنتج (عادة من دقائق إلى ساعات).'
  },
  {
    question: 'ماذا لو تم رفض طلبي؟',
    answer: 'في حالة رفض الطلب لأي سبب، يتم إرجاع المبلغ كاملاً إلى رصيد التوكن الخاص بك تلقائياً. ستتلقى إشعاراً بسبب الرفض.'
  },
  {
    question: 'هل يمكنني التواصل أثناء تنفيذ الطلب؟',
    answer: 'نعم، عندما يكون طلبك قيد التنفيذ، ستظهر لك محادثة مباشرة أسفل تفاصيل الطلب للتواصل مع فريق الدعم وإرسال أي معلومات إضافية مطلوبة.'
  },
  {
    question: 'هل يمكنني استرداد أموالي؟',
    answer: 'نعم، يمكنك طلب استرداد الأموال من صفحة "استرداد الأموال". أدخل التوكن الخاص بك واختر الطلب المراد استرداده مع ذكر السبب. سيتم مراجعة طلبك والرد عليه.'
  },
  {
    question: 'ما هي الكوبونات وكيف أستخدمها؟',
    answer: 'الكوبونات هي أكواد خصم يمكنك استخدامها للحصول على تخفيضات على مشترياتك. أدخل كود الكوبون عند الشراء وسيتم تطبيق الخصم تلقائياً.'
  },
  {
    question: 'كيف أعرف حالة طلب الشحن؟',
    answer: 'بعد تقديم طلب الشحن، يمكنك متابعة حالته من خلال سجل الطلبات. الحالات هي: "قيد الانتظار" (بانتظار المراجعة)، "مقبول" (تم إضافة الرصيد)، أو "مرفوض" (مع ذكر السبب).'
  },
  {
    question: 'هل بياناتي آمنة؟',
    answer: 'نعم، نحن نستخدم أحدث تقنيات التشفير لحماية بياناتك ومعاملاتك. لا نشارك بياناتك مع أي طرف ثالث.'
  },
  {
    question: 'ماذا أفعل إذا واجهت مشكلة؟',
    answer: 'تواصل معنا عبر البريد الإلكتروني support@boompay.store أو من خلال المحادثة المباشرة في الطلب، وسنساعدك في حل أي مشكلة في أسرع وقت.'
  }
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="card-simple p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-primary">الأسئلة الشائعة</h1>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm text-right hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Support Contact */}
          <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">للمزيد من المساعدة:</span>
              <a
                href="mailto:support@boompay.store"
                className="text-primary font-medium hover:underline"
              >
                support@boompay.store
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQ;