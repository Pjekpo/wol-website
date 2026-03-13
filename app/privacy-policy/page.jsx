import PolicyPage from "../../components/policy-page";

const sections = [
  {
    heading: "What we collect",
    paragraphs: [
      "When you place an order, join a waitlist, claim a launch discount, or contact The WOL Collective, we may collect the information you choose to provide. This can include your name, email address, delivery details, and order information.",
      "We may also receive limited technical data when you use the site, such as device type, browser information, approximate location derived from IP, and on-site activity needed to keep the storefront functioning."
    ]
  },
  {
    heading: "How we use your information",
    items: [
      "To process purchases, manage fulfilment, and provide order updates.",
      "To respond to enquiries and manage requests relating to your order or account.",
      "To administer launch access, scratchcard claims, and waitlist sign-ups.",
      "To improve the storefront, detect misuse, and protect the site against fraud or abuse.",
      "To send marketing updates only where you have chosen to receive them."
    ]
  },
  {
    heading: "Why we process it",
    paragraphs: [
      "We use personal information where it is necessary to perform a contract with you, where it is needed for legitimate business operations such as site security and service improvement, or where you have given consent, for example by submitting your email for updates.",
      "If we need to process your data for a reason not covered by those grounds, we will only do so where required or permitted by applicable law."
    ]
  },
  {
    heading: "Sharing",
    paragraphs: [
      "We only share information with service providers that help us run the storefront and fulfil orders, such as payment processors, hosting providers, or delivery partners. They may only use that information to provide their services to us or where the law requires it.",
      "We may also disclose information if it is reasonably necessary to comply with legal obligations, enforce our terms, or protect the rights, property, or safety of The WOL Collective, our customers, or others."
    ]
  },
  {
    heading: "Retention",
    paragraphs: [
      "We keep personal information only for as long as it is reasonably needed for the purposes set out in this policy, including recordkeeping, fraud prevention, dispute resolution, or legal compliance.",
      "If you join a waitlist or submit a discount claim without completing a purchase, we may retain that information until it is no longer useful for the launch activity it was collected for."
    ]
  },
  {
    heading: "Your choices",
    items: [
      "You can unsubscribe from marketing communications at any time using the method provided in the message.",
      "You can request access to, correction of, or deletion of your information, subject to any legal or operational limits that still require us to retain certain records.",
      "You can ask questions about how your information is handled by emailing thewolcollective@gmail.com or messaging @thewolcollective on Instagram."
    ]
  },
  {
    heading: "Updates",
    paragraphs: [
      "We may update this policy from time to time to reflect operational, legal, or platform changes. When we make material changes, we will update the date shown on this page and publish the revised version here."
    ]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      kicker="Policy"
      title="Privacy policy"
      intro="Last updated: March 13, 2026. This is a working storefront policy drafted for the current WOL release. Privacy questions can be sent to thewolcollective@gmail.com."
      sections={sections}
    />
  );
}
