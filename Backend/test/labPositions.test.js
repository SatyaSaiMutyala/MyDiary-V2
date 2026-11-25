import { describe, expect, it } from 'vitest';
import { isFor, standingOf } from '../src/services/labReadiness.js';

/**
 * Whose line is whose.
 *
 * The rule the laboratory's shift tasks have always used, now on the readiness sheet: a line tagged
 * to positions belongs to those positions, a line tagged to none belongs to everyone, and a
 * department head holds the lot. These are pure rules, so they are tested on their own — no
 * database, no API.
 */

const TECH = '65f0000000000000000000a1';
const CHARGE = '65f0000000000000000000a2';
const line = (...positionIds) => ({ key: 'o02', text: 'Check the fridge', positionIds });

describe('isFor', () => {
  it('gives an untagged line to everyone', () => {
    expect(isFor(line(), TECH, 'member')).toBe(true);
    expect(isFor(line(), null, 'member')).toBe(true);
    expect(isFor({ key: 'o02' }, TECH, 'member')).toBe(true); // no field at all
  });

  it('gives a tagged line only to that position', () => {
    expect(isFor(line(TECH), TECH, 'member')).toBe(true);
    expect(isFor(line(CHARGE), TECH, 'member')).toBe(false);
    expect(isFor(line(TECH, CHARGE), CHARGE, 'member')).toBe(true);
  });

  it('gives every line to a department head, who holds no position of their own', () => {
    expect(isFor(line(TECH), null, 'head')).toBe(true);
    expect(isFor(line(CHARGE), null, 'cmd')).toBe(true);
  });

  it('gives a tagged line to nobody who has no position and is not the head', () => {
    expect(isFor(line(TECH), null, 'member')).toBe(false);
  });

  it('does not care whether the id is a string or an object id', () => {
    const asObject = { toString: () => TECH };
    expect(isFor({ positionIds: [asObject] }, TECH, 'member')).toBe(true);
  });
});

describe('standingOf', () => {
  const dept = {
    name: 'Clinical Laboratory',
    positions: [
      { _id: { toString: () => TECH }, name: 'Lab Technician' },
      { _id: { toString: () => CHARGE }, name: 'Lab In-charge' },
    ],
    assignments: [
      { name: 'Kavya Reddy', positionId: { toString: () => TECH }, role: 'member', unitKey: 'nrl-biochemistry' },
      { name: 'Dr. Bharath', positionId: null, role: 'head', unitKey: '' },
    ],
  };

  it('reads the position and unit from the department\'s own list', () => {
    expect(standingOf(dept, { name: 'Kavya Reddy', role: 'employee' })).toMatchObject({
      positionId: TECH,
      positionName: 'Lab Technician',
      unitKey: 'nrl-biochemistry',
      role: 'member',
    });
  });

  it('knows the head, who has every line and no unit', () => {
    expect(standingOf(dept, { name: 'Dr. Bharath', role: 'manager' })).toMatchObject({
      positionId: null,
      role: 'head',
      unitKey: '',
    });
  });

  it('falls back to the position written on the account when nobody is listed', () => {
    expect(standingOf(dept, { name: 'Ravi Teja', role: 'employee', position: 'Lab In-charge' })).toMatchObject({
      positionId: CHARGE,
      positionName: 'Lab In-charge',
      unitKey: '',
    });
  });

  it('ignores the case and spacing of a name', () => {
    expect(standingOf(dept, { name: '  kavya reddy ', role: 'employee' }).unitKey).toBe('nrl-biochemistry');
  });

  it('treats an admin nobody listed as a head, so they are never shut out', () => {
    expect(standingOf(dept, { name: 'Venkata Cherukuri', role: 'admin' })).toMatchObject({
      positionId: null,
      role: 'head',
    });
  });

  it('leaves a stranger with nothing of their own', () => {
    expect(standingOf(dept, { name: 'Someone Else', role: 'employee' })).toMatchObject({
      positionId: null,
      positionName: '',
      role: 'member',
      unitKey: '',
    });
  });
});
