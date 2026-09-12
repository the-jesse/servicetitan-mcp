import { z } from 'zod';

/** Shared fields for every mutating ServiceTitan tool. */
export const WriteGateFields = {
  dryRun: z
    .boolean()
    .default(true)
    .describe(
      'When true (default), do not call ServiceTitan. Return the planned write instead.'
    ),
  confirm: z
    .boolean()
    .default(false)
    .describe(
      'Must be true together with dryRun=false to perform a live write. Still blocked unless ST_ENV=sandbox or ST_ALLOW_LIVE_WRITES=1.'
    ),
};

export type WriteGateInput = {
  dryRun?: boolean;
  confirm?: boolean;
};

export type WriteGateDecision =
  | { allowed: false; code: 'dry_run' | 'confirm_required' | 'live_writes_blocked'; reason: string }
  | { allowed: true };

export function evaluateWriteGate(
  input: WriteGateInput = {},
  env: NodeJS.ProcessEnv = process.env
): WriteGateDecision {
  const dryRun = input.dryRun !== false; // default true
  if (dryRun) {
    return {
      allowed: false,
      code: 'dry_run',
      reason:
        'dryRun is true (default). No ServiceTitan write was sent. Re-call with dryRun=false and confirm=true to attempt a live write.',
    };
  }
  if (input.confirm !== true) {
    return {
      allowed: false,
      code: 'confirm_required',
      reason: 'Live writes require confirm=true in addition to dryRun=false.',
    };
  }
  const stEnv = (env.ST_ENV || 'sandbox').toLowerCase();
  const allowLive = env.ST_ALLOW_LIVE_WRITES === '1';
  if (stEnv !== 'sandbox' && !allowLive) {
    return {
      allowed: false,
      code: 'live_writes_blocked',
      reason:
        'Live writes are blocked when ST_ENV is not sandbox. Set ST_ALLOW_LIVE_WRITES=1 only after explicit operator intent.',
    };
  }
  return { allowed: true };
}

export function gatedResponse(tool: string, decision: Exclude<WriteGateDecision, { allowed: true }>, planned: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            gated: true,
            tool,
            code: decision.code,
            reason: decision.reason,
            planned,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function stripGateFields<T extends WriteGateInput>(params: T): Omit<T, 'dryRun' | 'confirm'> {
  const { dryRun: _d, confirm: _c, ...rest } = params;
  return rest;
}
