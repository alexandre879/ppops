import type { LegalContent } from "./types";

const en: LegalContent = {
  updatedLabel: "Last updated",
  updated: "7 November 2026",
  contactHeading: "Contact us",
  contactIntro: "Questions or requests about this page can be sent to:",
  labels: { company: "Company", idCode: "Identification code", address: "Registered address", email: "Email", phone: "Phone" },
  docs: {
    privacy: {
      title: "Privacy Policy",
      description: "How {company} collects, uses, stores and protects your personal data.",
      sections: [
        {
          heading: "Who we are",
          body: [
            "This website is operated by {entity} (“we”, “us”). We are the controller of the personal data described in this policy. Our contact details are at the end of this page.",
          ],
        },
        {
          heading: "What we collect",
          body: [
            "- Enquiry form: your name, phone number, email, the service you are interested in, project location and your message.",
            "- With each enquiry we also record your IP address and the time you accepted this policy, to prevent spam and to prove your consent.",
            "- AI assistant: the questions you type. Please do not enter personal or sensitive information in the chat.",
            "- Customers: the details needed to prepare an estimate, sign a contract and carry out the project (for example addresses, payment records and project documents).",
            "- Technical data: our servers keep short-lived logs (IP address, browser type, pages requested) to keep the site secure.",
            "We do not use advertising, analytics, session-recording or keystroke-logging tools.",
          ],
        },
        {
          heading: "Why we use it and on what legal basis",
          body: [
            "- To answer your enquiry and prepare an estimate — your consent and steps you request before a contract.",
            "- To perform our contract with you — contractual necessity.",
            "- To keep accounting and tax records — legal obligation.",
            "- To protect the website against abuse and fraud — our legitimate interests.",
          ],
        },
        {
          heading: "Who we share it with",
          body: [
            "We never sell your personal data. We share it only with:",
            "- hosting and IT providers that run this website and our management systems for us;",
            "- Anthropic, which processes questions sent to the AI assistant to generate replies;",
            "- Google, only if you choose to load the map on the contact page;",
            "- accountants, banks, insurers, courts or public authorities when the law requires it or a contract needs it.",
            "Some providers may process data outside Georgia; where they do, we rely on appropriate safeguards required by law.",
          ],
        },
        {
          heading: "Marketing emails",
          body: [
            "We do not send marketing or newsletter emails without your separate, explicit consent. Any such email would include our physical address and a one-click unsubscribe link that works immediately.",
          ],
        },
        {
          heading: "How long we keep it",
          body: [
            "- Enquiries that do not lead to a contract: up to 24 months, then deleted.",
            "- Contracts, invoices and payment records: as long as Georgian tax and accounting law requires (generally 6 years).",
            "- Server logs: up to 90 days.",
          ],
        },
        {
          heading: "How we protect it",
          body: [
            "We use encrypted connections, role-based access for our staff and keep contracts, project documents and receipts in private storage that is never publicly reachable.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "Under the Law of Georgia on Personal Data Protection (and the EU GDPR where it applies) you may ask us to access, correct, delete or restrict your data, object to its use, receive a copy, and withdraw consent at any time. Withdrawing consent does not affect processing that already took place.",
            "You can also lodge a complaint with the Personal Data Protection Service of Georgia.",
          ],
        },
        {
          heading: "Age restriction",
          body: [
            "Our services are intended for adults. The enquiry form may be used only by people aged 18 or over, and we do not knowingly collect personal data from children. If we learn that a child has sent us data, we delete it.",
          ],
        },
        {
          heading: "Changes to this policy",
          body: ["We may update this policy. The date at the top shows the latest version."],
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      description: "The terms for using the {company} website.",
      sections: [
        {
          heading: "About these terms",
          body: [
            "These terms apply to your use of this website, operated by {entity}. By using the site you accept them. If you do not agree, please do not use the site.",
          ],
        },
        {
          heading: "Information on the website",
          body: [
            "Prices, photos, illustrations and descriptions are for general information only and are not a binding offer. A price becomes binding only in a written quotation or a signed contract.",
          ],
        },
        {
          heading: "Estimates and contracts",
          body: [
            "Estimates requested through the website are free and do not oblige you to anything. Construction, renovation and manufacturing work is governed by a separate written contract, which prevails over these terms.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "You agree not to:",
            "- use the site for unlawful purposes or submit false information;",
            "- try to gain unauthorised access, bypass security or disrupt the site;",
            "- copy content or scrape the site by automated means without our permission;",
            "- misuse the AI assistant, for example to generate abusive content or overload it.",
          ],
        },
        {
          heading: "AI assistant",
          body: [
            "The assistant gives automated answers based on our website content. Answers may be incomplete or wrong and are not professional engineering, legal or financial advice. Always confirm important details with our team.",
          ],
        },
        {
          heading: "Intellectual property",
          body: [
            "Texts, photos, designs and logos on this site belong to {company} or its licensors. You may not reuse them without written permission.",
          ],
        },
        {
          heading: "Availability and limitation of liability",
          body: [
            "The website is provided “as is”. We work to keep it accurate and available but do not guarantee that it will be uninterrupted, error-free or free of harmful components.",
            "To the extent permitted by law, we are not liable for indirect or consequential losses arising from downtime, technical errors, or reliance on information on the site. Nothing in these terms limits liability that cannot be limited by law, including your rights as a consumer.",
          ],
        },
        {
          heading: "Links to other websites",
          body: ["Links to third-party sites are provided for convenience. We are not responsible for their content or privacy practices."],
        },
        {
          heading: "Governing law",
          body: ["These terms are governed by the laws of Georgia. Disputes are resolved by the competent courts of Georgia, without affecting any mandatory consumer protection rules."],
        },
        {
          heading: "Changes",
          body: ["We may update these terms. The date at the top shows the latest version."],
        },
      ],
    },
    cookies: {
      title: "Cookie Policy",
      description: "Which cookies and browser storage the {company} website uses, and how to control them.",
      sections: [
        {
          heading: "What are cookies",
          body: [
            "Cookies and similar browser storage (localStorage, sessionStorage) are small pieces of data a website saves on your device. We keep their use to a minimum.",
          ],
        },
        {
          heading: "Strictly necessary (always on)",
          body: [
            "- NEXT_LOCALE (cookie, 12 months): remembers the language you read the site in.",
            "- nhm-consent (localStorage, until you change it): remembers your cookie choice.",
          ],
        },
        {
          heading: "Optional (only with your consent)",
          body: [
            "- nhm-assistant (sessionStorage, until you close the tab): keeps your AI assistant conversation when you move between pages.",
            "- Google Maps on the contact page: when loaded, Google may set its own cookies and receive your IP address. See Google’s privacy policy for details.",
          ],
        },
        {
          heading: "What we do not use",
          body: ["We do not use advertising cookies, analytics, session-recording, heat-map or keystroke-logging tools."],
        },
        {
          heading: "Changing your choice",
          body: [
            "Use “Cookie settings” in the footer of any page to change or withdraw your consent at any time. Rejecting optional storage deletes the assistant conversation saved in your tab. You can also delete cookies in your browser settings.",
          ],
        },
      ],
    },
    refunds: {
      title: "Payments, Cancellation & Refunds",
      description: "How payments, cancellations and refunds work for {company} projects.",
      sections: [
        {
          heading: "Scope",
          body: [
            "We do not sell products or subscriptions online. This website takes no payments and has no automatic renewals. All payments are made under a written quotation or signed contract.",
          ],
        },
        {
          heading: "Estimates",
          body: ["Estimates are free and without obligation."],
        },
        {
          heading: "Payment schedule",
          body: [
            "The advance payment, stage payments and final payment are set out in your contract. We issue an invoice for each payment. Payments are made by bank transfer to our company account.",
          ],
        },
        {
          heading: "Cancellation by the customer",
          body: [
            "You may cancel the contract by written notice. In that case you pay only for:",
            "- work already completed;",
            "- materials already purchased for your project that cannot be returned to the supplier;",
            "- other documented costs we have already incurred.",
            "Any remaining part of your advance is refunded.",
          ],
        },
        {
          heading: "Custom-made products",
          body: [
            "Furniture and other items made to your measurements or design cannot be cancelled free of charge once production has started, except where the product is defective.",
          ],
        },
        {
          heading: "Defects and warranty",
          body: [
            "Please report defects to us in writing. We will inspect the work and repair or replace it within the warranty period stated in your contract.",
          ],
        },
        {
          heading: "Refund timing",
          body: ["Agreed refunds are paid within 14 days, to the account the payment came from."],
        },
        {
          heading: "Your statutory rights",
          body: ["This policy does not limit your rights under the Law of Georgia on Consumer Rights Protection or other mandatory law."],
        },
      ],
    },
  },
};

export default en;
