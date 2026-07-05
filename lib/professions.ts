export interface ProfessionFaq {
  question: string;
  answer: string;
}

export interface Profession {
  slug: string;
  noun: string;
  plural: string;
  title: string;
  metaDescription: string;
  headline: string;
  subtitle: string;
  exampleName: string;
  exampleTitle: string;
  exampleCompany: string;
  needs: string[];
  faqs: ProfessionFaq[];
}

export const PROFESSIONS: Profession[] = [
  {
    slug: "realtors",
    noun: "realtor",
    plural: "realtors",
    title: "Email Signature for Realtors — Professional Gmail Signature | Siggy",
    metaDescription:
      "Build a professional email signature for realtors in 30 seconds. License number, brokerage logo, tappable phone number, headshot — no design skills needed.",
    headline: "An email signature for realtors that closes trust before the reply",
    subtitle:
      "Buyers and sellers judge you before they finish reading your first email. Get your license number, brokerage, and headshot into a signature that looks right in Gmail and on a phone screen.",
    exampleName: "Maria Alvarez",
    exampleTitle: "Realtor® · Compass",
    exampleCompany: "Compass",
    needs: [
      "Your license number and brokerage name, formatted the way your state's real estate commission requires on business communications.",
      "A tappable phone number — most of your leads open your email on a phone between showings, and a non-clickable number is a lost callback.",
      "A headshot so the person you met at an open house recognizes you in their inbox a week later.",
      "A link to your current listings or a scheduling page, so a hot lead can book a showing without a follow-up email."
    ],
    faqs: [
      {
        question: "Do I need to include my license number in my email signature?",
        answer:
          "Many states require licensed agents to disclose their license number on business communications, including email. Check your state real estate commission's advertising rules — some also require the brokerage name to appear as prominently as your own, not buried in smaller text below."
      },
      {
        question: "Should I put my headshot in every email, or just the first one?",
        answer:
          "Put it in every email. Real estate is a referral and repeat-contact business, and a consistent headshot builds recognition across the dozens of emails a transaction generates — inspection reports, offer updates, closing docs. It costs nothing to include and it's the fastest way a client puts a face to your name."
      },
      {
        question: "What's the biggest signature mistake real estate agents make?",
        answer:
          "Pasting a giant logo or a Canva graphic that renders as a blank box in Outlook, or listing five phone numbers so no one knows which one to call. Keep it to one name, one license line, one phone, one link — and test it in Gmail before you send it to a client."
      }
    ]
  },
  {
    slug: "lawyers",
    noun: "lawyer",
    plural: "lawyers",
    title: "Email Signature for Lawyers — Professional Gmail Signature | Siggy",
    metaDescription:
      "Create a clean, compliant email signature for lawyers in 30 seconds. Bar admission, firm name, confidentiality notice — no design skills or IT ticket required.",
    headline: "An email signature for lawyers that reads as counsel, not a form letter",
    subtitle:
      "Clients and opposing counsel form an impression from your email before they read the first line. Get your firm, practice area, and bar admission into a signature that looks credible in any inbox.",
    exampleName: "David Okonkwo",
    exampleTitle: "Associate · Whitfield & Marsh LLP",
    exampleCompany: "Whitfield & Marsh LLP",
    needs: [
      "Your firm name and practice area stated plainly — clients rarely remember the full name of the firm they hired, and a clear signature saves them a Google search.",
      "Bar admission or jurisdiction where relevant, especially for solo practitioners and firms that get referrals across state lines.",
      "A confidentiality or privilege notice, since a surprising number of firms still paste this manually into every message and forget half the time.",
      "A direct phone line rather than a general firm switchboard number, so a client in a time-sensitive matter can reach you without going through reception."
    ],
    faqs: [
      {
        question: "Do lawyers need a confidentiality notice in their email signature?",
        answer:
          "It's not universally mandated, but most firms include one as a defensive practice — it puts an unintended recipient on notice that the message may be privileged. It's not a substitute for careful sending, but bar associations generally view it as good hygiene, and clients expect to see it from counsel."
      },
      {
        question: "Should associates list their bar admission in every email?",
        answer:
          "Yes, particularly if you practice in a state with advertising rules for attorney communications, or if your firm serves clients across multiple jurisdictions. It also answers a question a new client is often too polite to ask directly: are you licensed to handle my matter in my state."
      },
      {
        question: "What should a law firm signature avoid?",
        answer:
          "Avoid stacking multiple disclaimers, seals, and social icons until the signature is longer than the email itself. Judges' chambers and busy GCs read hundreds of emails a day — a signature with your name, title, firm, direct line, and one confidentiality line reads as more senior than one cluttered with badges."
      }
    ]
  },
  {
    slug: "consultants",
    noun: "consultant",
    plural: "consultants",
    title: "Email Signature for Consultants — Professional Gmail Signature | Siggy",
    metaDescription:
      "Design a polished email signature for consultants in 30 seconds. Company name, calendar link, and a clean layout that reinforces the expertise clients are paying for.",
    headline: "An email signature for consultants that looks like the invoice justifies itself",
    subtitle:
      "You're selling judgment and expertise, and every email is a small proof point. Get your positioning, company, and booking link into a signature that reads as senior, not scrappy.",
    exampleName: "Priya Nair",
    exampleTitle: "Principal · Nair Strategy Partners",
    exampleCompany: "Nair Strategy Partners",
    needs: [
      "A one-line title that states your specialty, not just \"Consultant\" — clients hire outcomes, and a vague title makes them re-explain the engagement scope every time.",
      "A scheduling link so a prospective client can book time without the five-email back-and-forth that stalls most sales cycles.",
      "Your company or practice name, even if you're independent — it signals you run this as a business, not a side gig, especially to enterprise buyers.",
      "Social proof, like a link to case studies or a LinkedIn profile with recommendations, since consultants are hired on reputation more than any other line item in the signature."
    ],
    faqs: [
      {
        question: "Should independent consultants have a company name in their signature?",
        answer:
          "Yes, even a simple one like \"Nair Strategy Partners\" instead of just your personal name. It signals you operate as a real practice with process and continuity, which matters most to procurement teams at larger clients who are wary of one-person dependency risk."
      },
      {
        question: "Is a calendar link too pushy in a consulting signature?",
        answer:
          "No — a scheduling link is one of the highest-leverage lines you can add, because it removes friction at the exact moment a prospect is warm. Keep it understated, a plain \"Book time\" link rather than a bright button, and it reads as convenient rather than salesy."
      },
      {
        question: "What builds the most credibility in a consultant's signature?",
        answer:
          "Specificity beats decoration. A precise title like \"Principal, Supply Chain Strategy\" and a link to a relevant case study does more for credibility than a logo, a headshot, and three social icons combined. Say exactly what you do and let the rest of the signature stay quiet."
      }
    ]
  },
  {
    slug: "freelancers",
    noun: "freelancer",
    plural: "freelancers",
    title: "Email Signature for Freelancers — Professional Gmail Signature | Siggy",
    metaDescription:
      "Get a professional email signature for freelancers in 30 seconds. Portfolio link, clean layout, no logo required — built to look legit to new clients.",
    headline: "An email signature for freelancers that looks like a studio, not a side hustle",
    subtitle:
      "New clients decide whether to trust you before the kickoff call, often from your very first email. Get a portfolio link and a clean layout into a signature that closes the credibility gap.",
    exampleName: "Jonah Reyes",
    exampleTitle: "Freelance Brand Designer",
    exampleCompany: "Independent",
    needs: [
      "A link to your portfolio or latest work, since a freelancer's best sales tool is proof, and a signature is free real estate to show it on every email.",
      "A clear discipline in your title — \"Freelance Brand Designer\" tells a client exactly what to hire you for, instead of a vague \"Creative\" that invites scope confusion later.",
      "A professional-looking layout even without a company logo — clients can't always tell freelance from agency by the work alone, and a clean signature closes that gap.",
      "One contact method, not three — a single email and maybe a phone number reads as focused; a Slack handle, Calendly link, Instagram, and WhatsApp number reads as scattered."
    ],
    faqs: [
      {
        question: "Do freelancers really need an email signature?",
        answer:
          "Yes, arguably more than salaried employees — you don't have a company brand doing the trust-building for you, so your signature is one of the few consistent touchpoints that signals professionalism. A thoughtful signature on an invoice email or project update reassures a client that they hired someone who takes the business seriously."
      },
      {
        question: "Should I put my portfolio link or my rate in a freelance signature?",
        answer:
          "Portfolio, not rate. Pricing is a conversation that depends on scope, but a portfolio link works passively on every email you send, including ones to people who forward your message to a colleague who's now seeing your work for the first time."
      },
      {
        question: "What's a common freelancer signature mistake?",
        answer:
          "Cramming in every platform you're active on — Upwork profile, Fiverr gig, Instagram, TikTok — until it reads like a link tree instead of a signature. Pick the one link that best proves your work and leave the rest for your website."
      }
    ]
  },
  {
    slug: "recruiters",
    noun: "recruiter",
    plural: "recruiters",
    title: "Email Signature for Recruiters — Professional Gmail Signature | Siggy",
    metaDescription:
      "Build a trustworthy email signature for recruiters in 30 seconds. Agency name, direct line, LinkedIn — built to earn replies from skeptical candidates.",
    headline: "An email signature for recruiters that doesn't read as a cold outreach template",
    subtitle:
      "Candidates get dozens of recruiter emails a week and screen most of them in a glance. Get your agency, a direct line, and your LinkedIn into a signature that reads as a real person, not a mail-merge.",
    exampleName: "Ben Foster",
    exampleTitle: "Senior Technical Recruiter · Northgate Talent",
    exampleCompany: "Northgate Talent",
    needs: [
      "A direct phone line, not a shared team inbox number — candidates deciding whether an opportunity is legitimate will often check if a real human answers.",
      "Your LinkedIn profile link, since it's the fastest way for a skeptical candidate to verify you're a real recruiter at a real firm before they reply with their resume.",
      "Your agency or company name stated clearly, especially for third-party recruiters, because candidates are wary of anonymous-looking outreach that could be a scam.",
      "A specialization line, like \"Senior Technical Recruiter,\" so a candidate immediately understands the kind of roles you place and whether it's worth their time to engage."
    ],
    faqs: [
      {
        question: "Why do candidates care about a recruiter's email signature?",
        answer:
          "Recruiting inboxes are full of low-effort mass outreach, so a signature with a real name, direct phone number, and LinkedIn link is one of the fastest signals that a candidate is talking to an actual recruiter and not a scraped-list spam campaign. It directly affects your reply rate."
      },
      {
        question: "Should third-party recruiters include their agency's client list or logos?",
        answer:
          "No — most agencies are under NDA with clients and can't disclose that relationship, and cluttering the signature with logos looks more like a marketing email than personal outreach. Keep it to your name, agency, specialization, and a way to verify you on LinkedIn."
      },
      {
        question: "What should a recruiter's signature never include?",
        answer:
          "Avoid a generic \"Talent Acquisition Team\" title with no named individual and no direct contact — it's the single biggest reason recruiting emails get ignored or marked as spam. Candidates respond to a specific person, not a department."
      }
    ]
  },
  {
    slug: "financial-advisors",
    noun: "financial advisor",
    plural: "financial advisors",
    title: "Email Signature for Financial Advisors — Professional Gmail Signature | Siggy",
    metaDescription:
      "Create a professional email signature for financial advisors in 30 seconds. Series licenses, firm disclosures, direct line — the clean layout compliance teams prefer.",
    headline: "An email signature for financial advisors clients trust with their money",
    subtitle:
      "Clients are trusting you with decisions that affect their retirement — your signature should look as considered as your advice. Get your credentials, firm, and required disclosures into one clean layout.",
    exampleName: "Elena Petrova",
    exampleTitle: "CFP® · Petrova Wealth Advisors",
    exampleCompany: "Petrova Wealth Advisors",
    needs: [
      "Your license designations, like Series 7, Series 66, or CFP®, since clients and compliance teams both look for these credentials on official correspondence.",
      "A firm disclosure line if your broker-dealer or RIA requires one — many compliance departments mandate specific wording that must appear on every outbound email.",
      "A direct phone line rather than a general office number, because clients calling about a market drop or a time-sensitive transfer want to reach you, not a receptionist.",
      "A clean, restrained layout — compliance teams at most firms review signature templates, and a busy design with stock-photo graphics is more likely to get flagged and rejected."
    ],
    faqs: [
      {
        question: "Do financial advisors need to list their Series licenses in an email signature?",
        answer:
          "It depends on your firm's compliance requirements, but many broker-dealers and RIAs require designations like Series 7, Series 66, or CFP® to appear on client-facing communications, sometimes alongside a specific disclosure sentence. Check with your compliance department before finalizing the wording, since requirements vary by firm and by state."
      },
      {
        question: "Can I use a fancy template if my firm has compliance review?",
        answer:
          "Usually not without approval — most compliance teams prefer a simple, text-based layout over heavy graphics or stock photography, since it's easier to review and less likely to misrender in a client's inbox. Start with a clean template and confirm the exact disclosure wording with compliance before you roll it out firm-wide."
      },
      {
        question: "What's the most common financial advisor signature mistake?",
        answer:
          "Omitting the firm-required disclosure line, or burying it in tiny gray text that's technically present but effectively invisible. If your compliance team mandates specific language, it should be legible, not decorative fine print that defeats the purpose of the disclosure."
      }
    ]
  }
];

export function getProfession(slug: string): Profession | undefined {
  return PROFESSIONS.find((p) => p.slug === slug);
}
