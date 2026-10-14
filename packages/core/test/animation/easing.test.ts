import { describe, expect, it } from 'vitest';
import { Easing } from '../../src/animation/easing';

/**
 * Golden values computed independently from the standard CSS / easings.net
 * formulas (the reference curves Remotion ports), sampled at
 * t = 0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.
 */
const T_SAMPLES = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;

const expectGolden = (fn: (t: number) => number, goldens: number[]): void => {
  T_SAMPLES.forEach((t, i) => {
    expect(fn(t)).toBeCloseTo(goldens[i], 12);
  });
};

describe('Easing.linear', () => {
  it('is the identity curve', () => {
    expectGolden(Easing.linear, [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]);
  });
});

describe('Easing.quad', () => {
  it('in accelerates as t²', () => {
    expectGolden(Easing.quad.in, [0, 0.01, 0.0625, 0.25, 0.5625, 0.81, 1]);
  });
  it('out decelerates', () => {
    expectGolden(Easing.quad.out, [0, 0.19, 0.4375, 0.75, 0.9375, 0.99, 1]);
  });
  it('inOut combines both halves', () => {
    expectGolden(Easing.quad.inOut, [0, 0.02, 0.125, 0.5, 0.875, 0.98, 1]);
  });
});

describe('Easing.cubic', () => {
  it('in accelerates as t³', () => {
    expectGolden(Easing.cubic.in, [0, 0.001, 0.015625, 0.125, 0.421875, 0.729, 1]);
  });
  it('out decelerates', () => {
    expectGolden(Easing.cubic.out, [0, 0.271, 0.578125, 0.875, 0.984375, 0.999, 1]);
  });
  it('inOut combines both halves', () => {
    expectGolden(Easing.cubic.inOut, [0, 0.004, 0.0625, 0.5, 0.9375, 0.996, 1]);
  });
});

describe('Easing.poly', () => {
  it('in is tⁿ', () => {
    expectGolden(Easing.poly(4).in, [0, 0.0001, 0.00390625, 0.0625, 0.31640625, 0.6561, 1]);
  });
  it('out decelerates', () => {
    expectGolden(Easing.poly(4).out, [0, 0.3439, 0.68359375, 0.9375, 0.99609375, 0.9999, 1]);
  });
  it('inOut combines both halves (both branches)', () => {
    expectGolden(Easing.poly(4).inOut, [0, 0.0008, 0.03125, 0.5, 0.96875, 0.9992, 1]);
  });
  it('poly(2) matches quad', () => {
    T_SAMPLES.forEach((t) => {
      expect(Easing.poly(2).in(t)).toBeCloseTo(Easing.quad.in(t), 12);
    });
  });
  it('throws for n < 1', () => {
    expect(() => Easing.poly(0)).toThrow(/poly/);
    expect(() => Easing.poly(-2)).toThrow(/poly/);
  });
});

describe('Easing.sin', () => {
  it('in is 1 − cos(tπ/2)', () => {
    expectGolden(Easing.sin.in, [0, 0.012311659404862, 0.076120467488713, 0.292893218813452, 0.61731656763491, 0.843565534959769, 1]);
  });
  it('out is sin(tπ/2)', () => {
    expectGolden(Easing.sin.out, [0, 0.156434465040231, 0.38268343236509, 0.707106781186547, 0.923879532511287, 0.987688340595138, 1]);
  });
  it('inOut is −(cos(πt) − 1) / 2', () => {
    expectGolden(Easing.sin.inOut, [0, 0.024471741852423, 0.146446609406726, 0.5, 0.853553390593274, 0.975528258147577, 1]);
  });
});

describe('Easing.circle', () => {
  it('in is 1 − √(1 − t²)', () => {
    expectGolden(Easing.circle.in, [0, 0.00501256289338, 0.031754163448146, 0.133974596215561, 0.338562172233852, 0.564110105645933, 1]);
  });
  it('out is √(1 − (t − 1)²)', () => {
    expectGolden(Easing.circle.out, [0, 0.435889894354067, 0.661437827766148, 0.866025403784439, 0.968245836551854, 0.99498743710662, 1]);
  });
  it('inOut combines both halves (both branches)', () => {
    expectGolden(Easing.circle.inOut, [0, 0.010102051443364, 0.066987298107781, 0.5, 0.933012701892219, 0.989897948556636, 1]);
  });
});

describe('Easing.exp', () => {
  it('in hits 0 exactly at t = 0 and grows exponentially', () => {
    expectGolden(Easing.exp.in, [0, 0.001953125, 0.00552427172802, 0.03125, 0.176776695296637, 0.5, 1]);
  });
  it('out hits 1 exactly at t = 1', () => {
    expectGolden(Easing.exp.out, [0, 0.5, 0.823223304703363, 0.96875, 0.99447572827198, 0.998046875, 1]);
  });
  it('inOut hits both endpoints exactly', () => {
    expectGolden(Easing.exp.inOut, [0, 0.001953125, 0.015625, 0.5, 0.984375, 0.998046875, 1]);
  });
});

describe('Easing.bounce', () => {
  it('out bounces on approach (easings.net base curve)', () => {
    expectGolden(Easing.bounce.out, [0, 0.075625, 0.47265625, 0.765625, 0.97265625, 0.988125, 1]);
  });
  it('in mirrors out', () => {
    expectGolden(Easing.bounce.in, [0, 0.011875, 0.02734375, 0.234375, 0.52734375, 0.924375, 1]);
  });
  it('inOut crosses 0.5 at the midpoint (both branches)', () => {
    expectGolden(Easing.bounce.inOut, [0, 0.03, 0.1171875, 0.5, 0.8828125, 0.97, 1]);
  });
});

describe('Easing.elastic', () => {
  it('in hits 0 and 1 exactly and dips negative in between', () => {
    expectGolden(Easing.elastic.in, [0, 0.001953125, -0.00552427172802, -0.015625, 0.088388347648318, -0.25, 1]);
  });
  it('out overshoots above 1 before settling', () => {
    expectGolden(Easing.elastic.out, [0, 1.25, 0.911611652351682, 1.015625, 1.00552427172802, 0.998046875, 1]);
  });
  it('inOut hits both endpoints exactly (both branches)', () => {
    expectGolden(Easing.elastic.inOut, [0, 0.000339156597006, 0.011969444423734, 0.5, 0.988030555576266, 0.999660843402994, 1]);
  });
});

describe('Easing.back', () => {
  it('in pulls below 0 before rising (default s = 1.70158)', () => {
    expectGolden(Easing.back().in, [0, -0.01431422, -0.0641365625, -0.0876975, 0.1825903125, 0.59117202, 1]);
  });
  it('out overshoots above 1', () => {
    expectGolden(Easing.back().out, [0, 0.40882798, 0.8174096875, 1.0876975, 1.0641365625, 1.01431422, 1]);
  });
  it('inOut overshoots on both sides (both branches)', () => {
    expectGolden(Easing.back().inOut, [0, -0.037518552, -0.09968184375, 0.5, 1.09968184375, 1.037518552, 1]);
  });
  it('accepts a custom strength s = 3', () => {
    expect(Easing.back(3).in(0.5)).toBeCloseTo(-0.25, 12);
  });
});

describe('Easing.bezier', () => {
  it('reproduces the CSS ease curve (0.42, 0, 1, 1)', () => {
    expect(Easing.bezier(0.42, 0, 1, 1)(0.5)).toBeCloseTo(0.315356812572531, 9);
    expect(Easing.bezier(0.42, 0, 1, 1)(0.25)).toBeCloseTo(0.093464650718823, 9);
  });
  it('reproduces the standard CSS curve (0.25, 0.1, 0.25, 1)', () => {
    expect(Easing.bezier(0.25, 0.1, 0.25, 1)(0.3)).toBeCloseTo(0.513315160973376, 9);
  });
  it('reproduces a smooth ease-in-out curve (0.8, 0, 0.2, 1)', () => {
    expect(Easing.bezier(0.8, 0, 0.2, 1)(0.7)).toBeCloseTo(0.923387948451016, 9);
  });
  it('passes through the endpoints exactly', () => {
    expect(Easing.bezier(0.42, 0, 1, 1)(0)).toBe(0);
    expect(Easing.bezier(0.42, 0, 1, 1)(1)).toBe(1);
  });

  it('extends naturally outside [0, 1] (used by extrapolate: extend)', () => {
    expect(Easing.bezier(0.42, 0, 1, 1)(-0.5)).toBeCloseTo(1, 12);
    expect(Easing.bezier(0.42, 0, 1, 1)(1.5)).toBeCloseTo(0, 12);
  });
  it('throws when an x control point is outside [0, 1]', () => {
    expect(() => Easing.bezier(-0.1, 0, 1, 1)).toThrow(/x control point/);
    expect(() => Easing.bezier(0, 0, 1.2, 1)).toThrow(/x control point/);
  });
});

describe('Easing.steps', () => {
  it("'end' holds the value until each step boundary", () => {
    const steps = Easing.steps(4, 'end');
    [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1].forEach((t, i) => {
      expect(steps(t)).toBeCloseTo([0, 0, 0.25, 0.5, 0.75, 0.75, 1][i], 12);
    });
  });
  it("'start' jumps at the beginning of each step interval", () => {
    const steps = Easing.steps(4, 'start');
    [0, 0.1, 0.25, 0.5, 0.75, 0.99, 1].forEach((t, i) => {
      expect(steps(t)).toBeCloseTo([0.25, 0.25, 0.5, 0.75, 1, 1, 1][i], 12);
    });
  });
  it("defaults to 'end'", () => {
    expect(Easing.steps(4)(0.99)).toBe(0.75);
    expect(Easing.steps(4)(1)).toBe(1);
  });
  it('steps(1) is a hard cut', () => {
    expect(Easing.steps(1, 'end')(0.999)).toBe(0);
    expect(Easing.steps(1, 'end')(1)).toBe(1);
  });
  it('throws when steps < 1', () => {
    expect(() => Easing.steps(0)).toThrow(/steps/);
    expect(() => Easing.steps(-3)).toThrow(/steps/);
  });
});
