import { HTSItem } from '../types';
import { htsData } from './htsData';

export type MetalClass = 'Steel' | 'Aluminum' | 'Copper' | 'None';
export type Status = 'Primary Article' | 'Derivative' | 'Excluded';

export interface DeterminationResult {
  htsCode: string;
  step1: {
    annex: string;
    metalClass: MetalClass;
    status: Status;
  };
  step2: {
    gateA: {
      applied: boolean;
      duty: string;
      reason?: string;
      blocked15Rule: boolean;
    };
    gateB: {
      applied: boolean;
      provision: string;
      duty: string;
      reason?: string;
    };
    gateC: {
      metal: MetalClass;
      rule: string;
      flagged: boolean;
    };
  };
  finalDuty: string;
  error?: string;
}

export function determineDuty(htsCode: string, origin: string = 'OTHER'): DeterminationResult {
  const cleanCode = htsCode.replace(/\./g, '');
  const item = htsData.find(i => i.code.replace(/\./g, '') === cleanCode);

  if (!item) {
    return {
      htsCode,
      error: `ERROR: HTS Code ${htsCode} not found in Annexes. Verification Required.`,
      step1: { annex: 'N/A', metalClass: 'None', status: 'Excluded' },
      step2: {
        gateA: { applied: false, duty: 'N/A', blocked15Rule: false },
        gateB: { applied: false, provision: 'N/A', duty: 'N/A' },
        gateC: { metal: 'None', rule: 'N/A', flagged: false }
      },
      finalDuty: 'N/A'
    } as DeterminationResult;
  }

  // STEP 1: INITIAL CLASSIFICATION
  let metalClass: MetalClass = 'None';
  if (item.category?.toLowerCase().includes('steel')) metalClass = 'Steel';
  else if (item.category?.toLowerCase().includes('aluminum')) metalClass = 'Aluminum';
  else if (item.category?.toLowerCase().includes('copper')) metalClass = 'Copper';

  let status: Status = 'Primary Article';
  if (item.category?.toLowerCase().includes('derivative')) status = 'Derivative';
  if (item.category?.toLowerCase().includes('removed')) status = 'Excluded';

  const result: DeterminationResult = {
    htsCode: item.code,
    step1: {
      annex: item.annex,
      metalClass,
      status,
    },
    step2: {
      gateA: { applied: false, duty: 'N/A', blocked15Rule: false },
      gateB: { applied: false, provision: 'N/A', duty: 'N/A' },
      gateC: { metal: metalClass, rule: 'N/A', flagged: false }
    },
    finalDuty: '0%'
  };

  // STEP 2: AUTOMATED LOGIC GATES

  // GATE A: Origin Check (Russia)
  if (origin.toUpperCase() === 'RUSSIA') {
    result.step2.gateA.applied = true;
    result.step2.gateA.blocked15Rule = true;
    if (metalClass === 'Aluminum') {
      result.step2.gateA.duty = '200%';
      result.step2.gateA.reason = 'Russia Origin & Metal = Aluminum (9903.85.67)';
    } else if (metalClass === 'Steel' || metalClass === 'Copper') {
      result.step2.gateA.duty = '50%';
      result.step2.gateA.reason = 'Russia Origin & Metal = Steel/Copper';
    }
    result.finalDuty = result.step2.gateA.duty;
  }

  // GATE B: Chapter 99 Mapping (Annex IV)
  if (!result.step2.gateA.applied) {
    result.step2.gateB.applied = true;
    const provision = item.additionalTariff || '9903.82.02';
    result.step2.gateB.provision = provision;
    
    // Mapping rules
    if (origin.toUpperCase() === 'UK') {
        result.step2.gateB.duty = '15%–25%';
        result.step2.gateB.reason = 'Origin = UK';
    } else {
        switch (provision) {
            case '9903.82.02': result.step2.gateB.duty = '50%'; break;
            case '9903.82.03': result.step2.gateB.duty = '0%'; break;
            case '9903.82.06': result.step2.gateB.duty = '10%'; break;
            case '9903.82.09': result.step2.gateB.duty = '25%'; break;
            default: result.step2.gateB.duty = item.dutyRate || 'Check Rules';
        }
    }
    result.finalDuty = result.step2.gateB.duty;
  }

  // GATE C: The "95% Rule" Check
  if (metalClass === 'Aluminum') {
    result.step2.gateC.rule = '95%+ must be Smelted & Cast in the U.S.';
    result.step2.gateC.flagged = true; // Always flag for verification in this engine
  } else if (metalClass === 'Steel') {
    result.step2.gateC.rule = '95%+ must be Melted & Poured in the U.S.';
    result.step2.gateC.flagged = true;
  } else if (metalClass === 'Copper') {
    result.step2.gateC.rule = '95%+ must be Smelted & Cast in the U.S.';
    result.step2.gateC.flagged = true;
  }

  return result;
}
