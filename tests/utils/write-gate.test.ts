import { describe, it, expect } from '@jest/globals';
import { evaluateWriteGate, stripGateFields } from '../../src/utils/write-gate.js';

describe('evaluateWriteGate', () => {
  it('defaults to dry-run when flags omitted', () => {
    const d = evaluateWriteGate({}, { ST_ENV: 'sandbox' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('dry_run');
  });

  it('still dry-runs when dryRun is explicitly true', () => {
    const d = evaluateWriteGate({ dryRun: true, confirm: true }, { ST_ENV: 'sandbox' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('dry_run');
  });

  it('requires confirm even when dryRun is false', () => {
    const d = evaluateWriteGate({ dryRun: false }, { ST_ENV: 'sandbox' });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('confirm_required');
  });

  it('allows sandbox write when dryRun=false and confirm=true', () => {
    const d = evaluateWriteGate({ dryRun: false, confirm: true }, { ST_ENV: 'sandbox' });
    expect(d.allowed).toBe(true);
  });

  it('blocks production unless ST_ALLOW_LIVE_WRITES=1', () => {
    const blocked = evaluateWriteGate(
      { dryRun: false, confirm: true },
      { ST_ENV: 'production' }
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.code).toBe('live_writes_blocked');

    const allowed = evaluateWriteGate(
      { dryRun: false, confirm: true },
      { ST_ENV: 'production', ST_ALLOW_LIVE_WRITES: '1' }
    );
    expect(allowed.allowed).toBe(true);
  });

  it('treats missing ST_ENV as sandbox', () => {
    const d = evaluateWriteGate({ dryRun: false, confirm: true }, {});
    expect(d.allowed).toBe(true);
  });

  it('stripGateFields removes flags from payload', () => {
    expect(stripGateFields({ dryRun: false, confirm: true, customerId: 1 })).toEqual({
      customerId: 1,
    });
  });
});
