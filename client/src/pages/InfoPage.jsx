// Simple static pages so every footer / login link goes somewhere real.
import { Link } from 'react-router-dom';
import './InfoPage.css';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const LATE_FEE = import.meta.env.VITE_LATE_FEE_PER_DAY || '20';

const PAGES = {
  help: {
    title: 'Help Center',
    intro: 'Quick answers for the most common things people do on We Share.',
    sections: [
      { h: 'Borrowing an item', list: [
        'Open an item marked “For lending” and tap “Request to Borrow”. Give a reason, three times you could meet, and your return time.',
        'The owner picks one of your times. If the item has a price, you pay it in the app to confirm (you have about 30 minutes).',
        'Meet the owner. They show a QR code (or 6-digit code) and you scan it to confirm you have the item.',
        'When you return it, you show a QR code and the owner scans it.'
      ] },
      { h: 'Buying an item', list: [
        'Open an item marked “For sale” and tap “Buy this item”. Suggest three times to meet.',
        'After the owner approves, you have about 2 days to pay inside the app. We remind you by notification and email before it runs out.',
        'Meet the seller and scan their QR code. The item is then yours.'
      ] },
      { h: 'Lending or selling an item', list: [
        'Use “+ List item” on the marketplace pages. Choose “Lend it” or “Sell it” in the pricing step. An admin reviews it before it goes live.',
        'When someone requests it, open “My dashboard” → “Incoming requests” and review it.',
        'At the meeting, generate a pickup QR for the borrower. For lending, scan their return QR when the item comes back.'
      ] },
      { h: 'Sharing notes and PDFs', p: ['Open the Digital Library and use “+ Upload PDF”. That button only exists in the Digital Library; listing physical items is done from the marketplace.'] },
      { h: 'Forgot your password?', p: ['On the login page tap “Forgot password?”, enter your Gmail and follow the link we email you (check spam too). If you signed up with Google, use “Continue with Google” instead.'] },
      { h: 'Late returns', p: [`A late fee of ₹${LATE_FEE} per day applies after the return time. You pay it in the app before the owner can close the return.`] },
      { h: 'Reminders', p: ['We send notifications (and emails for the important ones) for new requests, payment deadlines, upcoming handoffs, due dates and overdue items.'] }
    ]
  },
  safety: {
    title: 'Safety Guide',
    intro: 'Sharing works best when everyone feels safe. A few habits go a long way.',
    sections: [
      { h: 'Meeting up', list: [
        'Meet in public, well-lit campus spots like the library or student union.',
        'Bring a friend if you can, and meet during the day.',
        'Use the in-app chat so there is a record of what was agreed.'
      ] },
      { h: 'Handing items over', list: [
        'Only confirm a handoff with the QR / code in the app. That is what records who has the item.',
        'Never share your handoff or return code with anyone except the person you are meeting.',
        'Check the item’s condition together and take a quick photo.'
      ] },
      { h: 'Payments', list: [
        'Only pay inside We Share. Don’t send money to someone outside the app.',
        'Payments are currently in test mode while the platform is being built.'
      ] },
      { h: 'Something wrong?', p: ['Stop the exchange, leave if you feel unsafe, and use “Report a problem” in the account menu. An admin will review it and reply by notification and email.'] }
    ]
  },
  contact: {
    title: 'Contact Us',
    intro: 'Questions, problems with a transaction, or feedback? We’d like to hear it.',
    sections: [
      { h: 'Email support', contact: true },
      { h: 'Problem with a borrow?', p: ['Open the transaction from “My dashboard” and use the message button to talk to the other person first. Most issues are sorted that way. If not, use “Report a problem”.'] }
    ]
  },
  faq: {
    title: 'Frequently asked questions',
    intro: 'The short answers.',
    faq: [
      ['Who can use We Share?', 'Students. You sign up with a Gmail address or Google Sign-In.'],
      ['What is the difference between “For sale” and “For lending”?', 'For sale: you pay once and keep the item. For lending: you borrow it, return it by the agreed time, and pay a late fee if you are late.'],
      ['Does it cost anything to list an item?', 'No. You set a fixed price, or list it for free.'],
      ['How long do I have to pay after my request is approved?', 'About 2 days for items for sale and about 30 minutes for lending items. We send reminders before the time runs out.'],
      ['How do I know the item changed hands?', 'Each handoff and return is confirmed with a one-time QR or 6-digit code that expires in minutes.'],
      ['What if I return something late?', `A late fee of ₹${LATE_FEE} per day applies. It is shown on the transaction page.`],
      ['Is my payment real?', 'Not yet. Payments run in test mode, so no real money is taken.'],
      ['Can I list digital notes?', 'Yes. Open the Digital Library and tap “Upload PDF”. Only share material you have the right to share.'],
      ['I did not get the password reset email.', 'Check your spam folder, make sure you typed the Gmail you registered with, and wait a minute. If you signed up with Google, use “Continue with Google”.']
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'A plain-language summary of what We Share keeps and why. This is a draft and should be reviewed before public launch.',
    sections: [
      { h: 'What we store', list: ['Your name, Gmail address, college details and profile picture (if you use Google Sign-In).', 'Your listings, borrow requests, messages and notifications.', 'Payment references from Razorpay. We never see or store your card details.'] },
      { h: 'How it’s used', p: ['To run the service: showing listings, connecting borrowers with owners, confirming handoffs and sending reminders by notification and email.'] },
      { h: 'Who sees it', p: ['Other users see your name, college and rating. Your email is shared only with the person you are in a transaction with. Admins can review listings and messages to keep the platform safe.'] }
    ]
  },
  terms: {
    title: 'Terms of Service',
    intro: 'The ground rules for using We Share. This is a draft and should be reviewed before public launch.',
    sections: [
      { h: 'Your account', list: ['Use your own account and keep your login private.', 'Give accurate details in your profile and listings.'] },
      { h: 'Listings and borrowing', list: ['Only list items you own and are allowed to lend or sell.', 'Returning a lent item late may incur a daily late fee shown in the app.', 'Take care of borrowed items and return them in the condition you received them.'] },
      { h: 'Not allowed', list: ['Illegal, dangerous or counterfeit items.', 'Harassment or misleading other users.', 'Taking deals or payments outside the platform.'] },
      { h: 'Enforcement', p: ['We can remove listings or suspend accounts that break these rules.'] }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'We keep this minimal.',
    sections: [
      { h: 'What we use', list: ['We store a login token and your basic profile in your browser’s local storage so you stay signed in for up to 24 hours.', 'Google Sign-In and Razorpay Checkout may set their own cookies when you use them.'] },
      { h: 'What we don’t do', p: ['We don’t use advertising or cross-site tracking cookies.'] }
    ]
  },
  notfound: {
    title: 'Page not found',
    intro: 'That page doesn’t exist, or it has moved.',
    sections: []
  }
};

const NAV = [
  ['help', 'Help'], ['safety', 'Safety'], ['faq', 'FAQ'], ['contact', 'Contact'],
  ['privacy', 'Privacy'], ['terms', 'Terms'], ['cookies', 'Cookies']
];

function InfoPage({ page }) {
  const content = PAGES[page] || PAGES.notfound;
  const loggedIn = Boolean(localStorage.getItem('token'));

  return (
    <div className="info-page">
      <header className="info-top">
        <Link to="/" className="info-logo">🔗 We Share</Link>
        <Link to={loggedIn ? '/hub' : '/login'} className="info-cta">
          {loggedIn ? 'Go to Hub' : 'Log in'}
        </Link>
      </header>

      <nav className="info-nav" aria-label="Help and legal pages">
        {NAV.map(([key, label]) => (
          <Link key={key} to={`/${key}`} className={key === page ? 'is-active' : ''}>{label}</Link>
        ))}
      </nav>

      <main className="info-body">
        <h1>{content.title}</h1>
        <p className="info-intro">{content.intro}</p>

        {/* FIX: the FAQ page has no "sections", which used to crash the page. */}
        {(content.sections || []).map((section) => (
          <section key={section.h}>
            <h2>{section.h}</h2>
            {section.p?.map((text) => <p key={text}>{text}</p>)}
            {section.list && <ul>{section.list.map((text) => <li key={text}>{text}</li>)}</ul>}
            {section.contact && (
              SUPPORT_EMAIL
                ? <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
                : <p>A support email address is coming soon. Until then, message the other person in your transaction from the app.</p>
            )}
          </section>
        ))}

        {content.faq && content.faq.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}

        {page === 'notfound' && (
          <p><Link to="/" className="info-cta">Back to the home page</Link></p>
        )}
      </main>
    </div>
  );
}

export default InfoPage;
