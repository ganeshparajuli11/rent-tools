import { describe, expect, it } from "vitest";

import { otherAmountSchema } from "./rent";

function messageOf(input: unknown): string | undefined {
  const result = otherAmountSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("otherAmountSchema", () => {
  it("turns pounds into whole pence", () => {
    expect(otherAmountSchema.parse({ amount: "200" })).toEqual({
      amountPence: 20_000,
    });
    expect(otherAmountSchema.parse({ amount: " £1,250.50 " })).toEqual({
      amountPence: 125_050,
    });
    expect(otherAmountSchema.parse({ amount: "0.01" })).toEqual({
      amountPence: 1,
    });
  });

  it("asks for an amount when it is empty", () => {
    expect(messageOf({ amount: "" })).toBe("Enter the amount they paid");
    expect(messageOf({ amount: "   " })).toBe("Enter the amount they paid");
    expect(messageOf({})).toBe("Enter the amount they paid");
  });

  it("refuses zero, negative amounts and anything that is not money", () => {
    expect(messageOf({ amount: "0" })).toBe("Enter an amount more than £0");
    expect(messageOf({ amount: "0.00" })).toBe("Enter an amount more than £0");
    expect(messageOf({ amount: "-5" })).toBe(
      "Enter an amount in pounds, like 650 or 650.50",
    );
    expect(messageOf({ amount: "12.345" })).toBe(
      "Enter an amount in pounds, like 650 or 650.50",
    );
    expect(messageOf({ amount: "lots" })).toBe(
      "Enter an amount in pounds, like 650 or 650.50",
    );
  });
});
