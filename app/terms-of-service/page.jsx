import PolicyPage from "../../components/policy-page";

const sections = [
  {
    heading: "Use of the site",
    paragraphs: [
      "By accessing or using The WOL Collective site, you agree to use it only for lawful purposes and in a way that does not interfere with the operation, security, or integrity of the storefront.",
      "You must not misuse the site, attempt to gain unauthorised access to any part of it, interfere with checkout or order systems, or use automated methods to scrape, copy, or disrupt the service without permission."
    ]
  },
  {
    heading: "Product and availability",
    paragraphs: [
      "The WOL Collective is currently operating through a tightly edited release format. Product availability, pricing, sizing, and release details may change without notice until an order is accepted.",
      "We try to present colours, imagery, and product information as accurately as possible, but display differences across screens and devices may affect how a product appears."
    ]
  },
  {
    heading: "Orders",
    paragraphs: [
      "Submitting an order request does not guarantee acceptance. We may decline or cancel an order where stock is unavailable, payment is not approved, pricing or listing errors are identified, or fraud or misuse is reasonably suspected.",
      "If an order is cancelled after payment has been taken, the relevant amount will be refunded through the original payment method unless another lawful arrangement is agreed."
    ]
  },
  {
    heading: "Pricing and payment",
    items: [
      "Prices are shown in the currency displayed on the site unless stated otherwise.",
      "Applicable shipping charges, taxes, or other costs may be added at checkout where relevant.",
      "Payment processing may be handled by third-party providers and is subject to their own terms and policies."
    ]
  },
  {
    heading: "Intellectual property",
    paragraphs: [
      "All site content, including text, graphics, artwork, branding, layout, imagery, and design elements, belongs to The WOL Collective or its licensors unless stated otherwise.",
      "You may not reproduce, distribute, modify, commercially exploit, or create derivative works from site content without prior written permission."
    ]
  },
  {
    heading: "Returns and consumer rights",
    paragraphs: [
      "Nothing in these terms is intended to remove rights that apply to consumers under mandatory law. Where local consumer protection rules give you rights relating to cancellation, faulty goods, or refunds, those rights continue to apply.",
      "Any brand-specific returns or exchanges process should be read together with these terms once that process is published."
    ]
  },
  {
    heading: "Liability",
    paragraphs: [
      "To the fullest extent permitted by law, The WOL Collective will not be liable for indirect, incidental, or consequential loss arising from use of the site or delays or interruptions outside reasonable control.",
      "Nothing in these terms excludes or limits liability where that would be unlawful, including liability for fraud or for death or personal injury caused by negligence where applicable law prohibits such exclusion."
    ]
  },
  {
    heading: "Changes",
    paragraphs: [
      "We may update these terms from time to time to reflect operational, legal, or commercial changes. The version published on this page is the version that applies at the time you use the site or place an order, unless mandatory law requires otherwise."
    ]
  }
];

export default function TermsOfServicePage() {
  return (
    <PolicyPage
      kicker="Policy"
      title="Terms of service"
      intro="Last updated: March 13, 2026. These terms are a draft storefront version and should still be reviewed against your final company details and returns process. General enquiries can be sent to thewolcollective@gmail.com."
      sections={sections}
    />
  );
}
