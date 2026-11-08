import { describe, expect, it } from "vitest";
import { createIdleWatch } from "../src/auth/idle";

describe("verrouillage d’inactivité", () => {
  it("verrouille au retour d’arrière-plan si le délai est dépassé", () => {
    let now = 0;
    let locks = 0;
    const watch = createIdleWatch({
      ms: 15 * 60 * 1000,
      now: () => now,
      onLock: () => {
        locks += 1;
      },
    });
    watch.bump();
    now = 10 * 60 * 1000;
    watch.check();
    expect(locks).toBe(0);
    now = 15 * 60 * 1000;
    watch.check();
    expect(locks).toBe(1);
    watch.stop();
  });
});