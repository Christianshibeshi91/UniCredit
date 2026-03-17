'use strict';

const {
  dollarsToCents,
  centsToDisplay,
  centsToSignedDisplay,
  applyExchangeRate,
  isValidCents,
} = require('../../../backend/src/utils/currency');

describe('Currency Utilities', () => {
  describe('dollarsToCents', () => {
    test('converts whole dollars', () => {
      expect(dollarsToCents(12)).toBe(1200);
    });

    test('converts dollars with cents', () => {
      expect(dollarsToCents(12.50)).toBe(1250);
    });

    test('handles zero', () => {
      expect(dollarsToCents(0)).toBe(0);
    });

    test('rounds half-cent up', () => {
      expect(dollarsToCents(12.555)).toBe(1256);
    });

    test('rounds half-cent down', () => {
      expect(dollarsToCents(12.554)).toBe(1255);
    });

    test('handles non-number input', () => {
      expect(dollarsToCents('abc')).toBe(0);
      expect(dollarsToCents(null)).toBe(0);
      expect(dollarsToCents(undefined)).toBe(0);
    });

    test('handles Infinity', () => {
      expect(dollarsToCents(Infinity)).toBe(0);
      expect(dollarsToCents(-Infinity)).toBe(0);
    });

    test('handles NaN', () => {
      expect(dollarsToCents(NaN)).toBe(0);
    });

    test('handles the classic floating point problem', () => {
      // 0.1 + 0.2 !== 0.3 in floating point, but dollarsToCents should handle it
      expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    });
  });

  describe('centsToDisplay', () => {
    test('formats basic amount', () => {
      expect(centsToDisplay(1250)).toBe('$12.50');
    });

    test('formats zero', () => {
      expect(centsToDisplay(0)).toBe('$0.00');
    });

    test('formats large amount with commas', () => {
      expect(centsToDisplay(124050)).toBe('$1,240.50');
    });

    test('formats whole dollar amount', () => {
      expect(centsToDisplay(5000)).toBe('$50.00');
    });

    test('handles non-number input', () => {
      expect(centsToDisplay('abc')).toBe('$0.00');
      expect(centsToDisplay(null)).toBe('$0.00');
    });

    test('handles Infinity', () => {
      expect(centsToDisplay(Infinity)).toBe('$0.00');
    });
  });

  describe('centsToSignedDisplay', () => {
    test('formats positive amount with plus sign', () => {
      expect(centsToSignedDisplay(1250)).toBe('+$12.50');
    });

    test('formats negative amount with minus sign', () => {
      expect(centsToSignedDisplay(-1250)).toBe('-$12.50');
    });

    test('formats zero', () => {
      expect(centsToSignedDisplay(0)).toBe('+$0.00');
    });

    test('handles non-number input', () => {
      expect(centsToSignedDisplay('abc')).toBe('$0.00');
    });
  });

  describe('applyExchangeRate', () => {
    test('applies 0.9 rate correctly', () => {
      expect(applyExchangeRate(10000, 0.9)).toBe(9000);
    });

    test('applies 1.0 rate (no change)', () => {
      expect(applyExchangeRate(5000, 1.0)).toBe(5000);
    });

    test('rounds result to integer', () => {
      expect(applyExchangeRate(1001, 0.9)).toBe(901);
    });

    test('handles zero amount', () => {
      expect(applyExchangeRate(0, 0.9)).toBe(0);
    });

    test('returns 0 for non-integer amount', () => {
      expect(applyExchangeRate(10.5, 0.9)).toBe(0);
    });

    test('returns 0 for invalid rate', () => {
      expect(applyExchangeRate(1000, NaN)).toBe(0);
      expect(applyExchangeRate(1000, Infinity)).toBe(0);
    });
  });

  describe('isValidCents', () => {
    test('accepts valid amounts', () => {
      expect(isValidCents(1)).toBe(true);
      expect(isValidCents(100)).toBe(true);
      expect(isValidCents(5000000)).toBe(true);
    });

    test('rejects zero', () => {
      expect(isValidCents(0)).toBe(false);
    });

    test('rejects negative', () => {
      expect(isValidCents(-100)).toBe(false);
    });

    test('rejects above max', () => {
      expect(isValidCents(5000001)).toBe(false);
    });

    test('rejects non-integers', () => {
      expect(isValidCents(10.5)).toBe(false);
    });

    test('rejects non-numbers', () => {
      expect(isValidCents('100')).toBe(false);
      expect(isValidCents(null)).toBe(false);
    });

    test('accepts custom max', () => {
      expect(isValidCents(100, 50)).toBe(false);
      expect(isValidCents(50, 50)).toBe(true);
    });
  });
});
