import { KeyHighlight } from '../types';

export const keyHighlights: KeyHighlight[] = [
  {
    title: "1. Additional Duties (10% – 50%)",
    points: [
      "New tariffs range between 10% to 50% ad valorem on covered metal articles and derivatives.",
      "Only one applicable duty rate will apply even if the product contains multiple metals (steel, aluminum, copper)."
    ]
  },
  {
    title: "2. Exemptions",
    points: [
      "Goods listed in the annexes without any metal content are not subject to these duties.",
      "Articles (outside Chapters 72, 73, 74, 76) with less than 15% metal content by weight are also exempt (0% duty)."
    ]
  },
  {
    title: "3. 15% Weight Rule",
    points: [
      "If applicable metal content is below 15%, duty rate is 0% (HTSUS 9903.82.03).",
      "The aggregate weight of applicable metals must be reported in kg at entry."
    ]
  },
  {
    title: "4. Duty Structure (Key HTSUS References)",
    points: [
      "9903.82.02: General coverage – 50% duty",
      "9903.82.03: <15% metal content – 0% duty",
      "9903.82.04 / 05 (UK origin): 15%–25% duty (based on processing requirements)",
      "9903.82.06: applies to articles of copper and derivative aluminum and steel articles as provided in subdivisions (c)(ii), (iv), (vi) - (viii), and (e) of U.S. note 16 to this subchapter. – 10% duty",
      "9903.82.07: applies to derivative aluminum and steel articles, as provided in subdivisions (c)(ix)-(x) and (e) of U.S. note 16 to this subchapter - a minimum total duty of 10%",
      "9903.82.08: applies to derivative aluminum and steel articles, as provided in subdivisions (c)(ix)-(x) and (e) of U.S. note 16 to this subchapter - no additional duty applies if the base rate is already 10% or higher.",
      "9903.82.09: applies to articles of copper and derivative aluminum and steel articles as provided in subdivisions (c)(vi)-(viii) of U.S. note 16 to this subchapter– 25% duty",
      "9903.82.10–12: Special derivative rules (incl. non-U.S. processed metals & Column 2 countries)"
    ]
  },
  {
    title: "5. Russia-Specific Measures",
    points: [
      "Steel/Copper products: up to 50% duty depending on classification",
      "Aluminum products: 200% duty continues under HTSUS 9903.85.67 / 9903.85.68",
      "Such goods cannot be declared under low-duty provisions (e.g., 9903.82.03)"
    ]
  },
  {
    title: "6. U.S. Processing Requirement (95% Rule)",
    points: [
      "Aluminum → Smelted & cast in the U.S. (≥95%)",
      "Steel → Melted & poured in the U.S. (≥95%)",
      "Copper → Smelted & cast in the U.S. (≥95%)",
      "These conditions are cumulative if multiple metals apply."
    ]
  },
  {
    title: "7. Reporting Requirements",
    points: [
      "Continue reporting: Country of melt & pour (steel), Country of smelt & cast (aluminum)",
      "CBP will issue further guidance for copper reporting."
    ]
  },
  {
    title: "8. Additional Notes",
    points: [
      "Prior agreements (UK, EU, Japan, Korea) remain unaffected.",
      "Duties are eligible for manufacturing drawback under applicable conditions.",
      "FTZ entries must be filed under Privileged Foreign Status.",
      "Chapter 98 provisions remain applicable, but Chapter 99 duty reductions cannot override these tariffs."
    ]
  }
];

export const actionRequired = [
  "Review shipments falling under metal and derivative classifications.",
  "Ensure accurate HTS classification and metal content calculation.",
  "Confirm country of origin and processing details for compliance.",
  "Coordinate with customs brokers for correct Chapter 99 reporting."
];
