import PolicyPage from "../../components/policy-page";

const sections = [
  {
    heading: "Release model",
    paragraphs: [
      "The WOL Collective currently operates as a focused release model rather than a large rolling catalogue. That means order timing may vary depending on stock position, drop format, and fulfilment capacity at the time of purchase.",
      "Where a product is made available as a limited release, shipping timelines shown on the product page, checkout page, or order confirmation should be treated as the primary guidance for that order."
    ]
  },
  {
    heading: "Processing",
    paragraphs: [
      "Orders are usually prepared for dispatch after payment has been accepted and basic fraud or verification checks have been completed.",
      "Processing times may be longer during launches, restocks, holidays, or any period of unusually high demand. If a meaningful delay affects your order, we will aim to communicate that through the contact details connected to the purchase."
    ]
  },
  {
    heading: "Delivery",
    items: [
      "Shipping options and charges are shown at checkout where available.",
      "Estimated delivery windows are estimates only and are not guaranteed unless expressly stated otherwise.",
      "Once an order has been handed to the carrier, delivery timing is influenced by the courier and destination service conditions."
    ]
  },
  {
    heading: "Address accuracy",
    paragraphs: [
      "Customers are responsible for making sure delivery details are complete and accurate before an order is submitted.",
      "If an address is incomplete, incorrect, or undeliverable, dispatch may be delayed and additional shipping costs may apply where a reshipment is required."
    ]
  },
  {
    heading: "International orders",
    paragraphs: [
      "If The WOL Collective ships to destinations outside the primary fulfilment region, import duties, taxes, customs fees, or local handling charges may apply. Unless stated otherwise at checkout, those charges are the responsibility of the customer.",
      "International delivery can also be affected by customs processing, border delays, and destination-specific restrictions outside our control."
    ]
  },
  {
    heading: "Lost, delayed, or damaged parcels",
    paragraphs: [
      "If your parcel appears lost, arrives damaged, or has a delivery issue, contact The WOL Collective as soon as reasonably possible at thewolcollective@gmail.com or via Instagram at @thewolcollective.",
      "We may ask for supporting information such as photographs, order details, or confirmation of the delivery issue so we can investigate with the carrier and determine the appropriate next step."
    ]
  },
  {
    heading: "Changes and cancellations",
    paragraphs: [
      "Because release inventory may be limited, changes to items, sizes, or delivery details cannot be guaranteed once an order has been placed.",
      "If you need help with an order, contact us promptly at thewolcollective@gmail.com and we will confirm whether an update or cancellation is still possible before dispatch."
    ]
  }
];

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      kicker="Policy"
      title="Shipping policy"
      intro="Last updated: March 13, 2026. This shipping policy is written for the current single-product WOL release. Shipping support can be requested at thewolcollective@gmail.com."
      sections={sections}
    />
  );
}
