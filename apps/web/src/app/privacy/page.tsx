import { BRAND } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Islamabad Restaurant collects, uses and protects your personal data, and the rights you have over it.',
  path: '/privacy',
});

const SECTIONS = [
  {
    title: 'Who we are',
    body: [
      `${BRAND.legalName} operates this website and the restaurant at ${BRAND.address.street}, ${BRAND.address.locality}. We are the data controller for the information described here. For any privacy question, write to ${BRAND.supportEmail}.`,
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Account data: your name, email address, mobile number and password (stored only as a bcrypt hash — we never see your password).',
      'Order data: what you ordered, your delivery address, any notes to the kitchen, and the payment method used. We never store card numbers; card payments are processed by Stripe on their PCI-DSS certified infrastructure.',
      'Reservation data: the date, time, party size, occasion and any accessibility or dietary requests you tell us.',
      'Technical data: IP address, browser type and pages viewed. Analytics are only collected after you consent to them in the cookie banner.',
    ],
  },
  {
    title: 'Why we use it',
    body: [
      'To take, cook and deliver your order, and to contact you if the rider cannot find you.',
      'To hold your table and to seat you correctly, including honouring allergy and accessibility requests.',
      'To operate the loyalty programme and calculate the points you have earned or redeemed.',
      'To send marketing email — only if you explicitly opted in, and you can withdraw that at any time from the footer of any email or your account settings.',
      'To meet our legal obligations, including tax records and food-safety traceability.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'Order and invoice records are kept for seven years to satisfy Pakistani tax law. Reservation records are kept for two years. Marketing consent records are kept until you withdraw them, plus two years. If you close your account, we delete or anonymise everything not required by law.',
    ],
  },
  {
    title: 'Who we share it with',
    body: [
      'Payment processors (Stripe, PayPal, JazzCash, Easypaisa) to take payment. Delivery riders, who see only your name, address and phone number. Our email provider, for transactional and — where consented — marketing email. We never sell your data to anyone.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'You can ask for a copy of your data, correct it, delete it, restrict how we use it, or object to marketing. Under GDPR you also have the right to data portability and to lodge a complaint with a supervisory authority. Email ' +
        BRAND.supportEmail +
        ' and we will respond within 30 days.',
    ],
  },
  {
    title: 'Cookies',
    body: [
      'Essential cookies keep your session and cart working and cannot be switched off. Analytics cookies are optional and load only after you accept them. You can change your choice at any time by clearing this site’s data in your browser.',
    ],
  },
  {
    title: 'Security',
    body: [
      'All traffic is encrypted with TLS. Passwords are hashed with bcrypt. Access to customer data inside the business is restricted by role, and every administrative action is written to an audit log. If a breach ever affects your data, we will notify you and the relevant authority within 72 hours.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" description={`Last updated ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`} breadcrumbs={[{ label: 'Privacy', href: '/privacy' }]} />

      <div className="container-luxe max-w-3xl py-16">
        {SECTIONS.map((section) => (
          <section key={section.title} className="mb-10">
            <h2 className="mb-3 font-display text-3xl">{section.title}</h2>
            {section.body.map((p, i) => (
              <p key={i} className="mb-3 leading-relaxed text-black/68">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-2 font-display text-2xl">Contact our data team</h2>
          <p className="text-black/65">
            {BRAND.supportEmail} · {BRAND.phone}
            <br />
            {BRAND.address.street}, {BRAND.address.locality} {BRAND.address.postalCode}, {BRAND.address.countryName}
          </p>
        </section>
      </div>
    </>
  );
}
