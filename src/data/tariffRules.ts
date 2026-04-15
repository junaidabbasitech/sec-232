export interface TariffRule {
  code: string;
  rate: string;
  subdivisions: string[];
  description: string;
}

export const tariffRules: TariffRule[] = [
  {
    code: '9903.82.02',
    rate: '50%',
    subdivisions: ['(i)', '(ii)', '(iii)', '(iv)', '(v)'],
    description: 'General coverage – 50% ad valorem duty applies to the full value.'
  },
  {
    code: '9903.82.03',
    rate: '0%',
    subdivisions: ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)', '(ix)', '(x)'],
    description: 'Compliance Note: If metal content is < 15% by weight (for articles not in Chapters 72, 73, 74, or 76), the duty is 0%.'
  },
  {
    code: '9903.82.04',
    rate: '25%',
    subdivisions: ['(i)', '(ii)', '(iii)', '(iv)'],
    description: 'UK origin – 25% duty applies if aluminum/steel meet specific smelting/melting requirements.'
  },
  {
    code: '9903.82.05',
    rate: '15%',
    subdivisions: ['(vi)', '(vii)'],
    description: 'UK origin – 15% duty applies if aluminum/steel meet specific smelting/melting requirements.'
  },
  {
    code: '9903.82.06',
    rate: '10%',
    subdivisions: ['(ii)', '(iv)', '(vi)', '(vii)', '(viii)'],
    description: 'Articles of copper and derivative aluminum/steel – 10% duty (U.S. processed requirements).'
  },
  {
    code: '9903.82.07',
    rate: '10% min total',
    subdivisions: ['(ix)', '(x)'],
    description: 'Derivative aluminum and steel articles – Minimum total duty of 10% (if base rate < 10%).'
  },
  {
    code: '9903.82.08',
    rate: 'No change',
    subdivisions: ['(ix)', '(x)'],
    description: 'Derivative aluminum and steel articles – No additional duty applies if base rate >= 10%.'
  },
  {
    code: '9903.82.09',
    rate: '25%',
    subdivisions: ['(vi)', '(vii)', '(viii)'],
    description: 'Articles of copper and derivative aluminum/steel – 25% duty.'
  },
  {
    code: '9903.82.10',
    rate: '15% total',
    subdivisions: ['(ix)', '(x)'],
    description: 'Special derivative rules – Total 15% (if base rate < 15% and non-U.S. processed).'
  },
  {
    code: '9903.82.11',
    rate: 'No change',
    subdivisions: ['(ix)', '(x)'],
    description: 'Special derivative rules – No additional duty if base rate >= 15%.'
  },
  {
    code: '9903.82.12',
    rate: '25%',
    subdivisions: ['(ix)', '(x)'],
    description: 'Derivative articles – 25% duty for products of General Note 3(b) countries.'
  },
  {
    code: '9903.82.14',
    rate: '50%',
    subdivisions: ['(iii)', '(iv)', '(v)'],
    description: 'Russian Federation – 50% duty applies to products of Russia.'
  }
];

export function getTariffsForSubdivision(subdivision: string) {
  return tariffRules.filter(rule => rule.subdivisions.includes(subdivision));
}
