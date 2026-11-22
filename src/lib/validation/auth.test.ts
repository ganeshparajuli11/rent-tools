import { describe, expect, it } from "vitest";

import {
  newPasswordSchema,
  passwordResetRequestSchema,
  passwordSignInSchema,
  signInSchema,
  signUpSchema,
  verifyCodeSchema,
} from "./auth";
import { emailSchema } from "./common";

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("emailSchema", () => {
  it("accepts a normal email and tidies it", () => {
    expect(emailSchema.parse("  Jane.Doe@Example.CO.UK ")).toBe(
      "jane.doe@example.co.uk",
    );
  });

  it("asks for an email when the box is empty", () => {
    const result = emailSchema.safeParse("   ");
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("Enter your email address");
  });

  it("asks for an email when nothing was sent", () => {
    const result = emailSchema.safeParse(null);
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("Enter your email address");
  });

  it.each([
    "jane",
    "jane@",
    "@example.com",
    "jane@example",
    "jane doe@example.com",
  ])("rejects %s with a plain message", (value) => {
    const result = emailSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe(
      "Enter a valid email address, like name@example.com",
    );
  });

  it("rejects very long addresses", () => {
    const result = emailSchema.safeParse(`${"a".repeat(250)}@example.com`);
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("That email address is too long");
  });
});

describe("signInSchema", () => {
  it("parses form input", () => {
    expect(signInSchema.parse({ email: "Owner@Example.com" })).toEqual({
      email: "owner@example.com",
    });
  });

  it("fails when email is missing", () => {
    expect(signInSchema.safeParse({}).success).toBe(false);
  });
});

describe("verifyCodeSchema", () => {
  it("accepts a 6-digit code", () => {
    expect(verifyCodeSchema.parse({ code: "123456" })).toEqual({
      code: "123456",
    });
  });

  it("removes spaces people paste in", () => {
    expect(verifyCodeSchema.parse({ code: " 123 456 " }).code).toBe("123456");
  });

  it("accepts longer codes if the project is set to use them", () => {
    expect(verifyCodeSchema.parse({ code: "12345678" }).code).toBe("12345678");
  });

  it("asks for the code when empty", () => {
    const result = verifyCodeSchema.safeParse({ code: "" });
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("Enter the code from your email");
  });

  it.each(["12345", "12345a", "abcdef", "12345678901"])(
    "rejects %s",
    (code) => {
      const result = verifyCodeSchema.safeParse({ code });
      expect(result.success).toBe(false);
      expect(firstError(result)).toBe(
        "The code is the 6 numbers in the email we sent you",
      );
    },
  );
});

describe("passwordSignInSchema", () => {
  it("tidies the email and keeps the password as typed", () => {
    expect(
      passwordSignInSchema.parse({
        email: " Taylor@Example.com ",
        password: " pass word ",
      }),
    ).toEqual({ email: "taylor@example.com", password: " pass word " });
  });

  it("asks for the password when it is empty", () => {
    const result = passwordSignInSchema.safeParse({
      email: "taylor@example.com",
      password: "",
    });
    expect(firstError(result)).toBe("Enter your password");
  });
});

describe("signUpSchema", () => {
  it("accepts an email and a long enough password", () => {
    expect(
      signUpSchema.parse({
        email: "taylor@example.com",
        password: "correct horse",
      }),
    ).toEqual({ email: "taylor@example.com", password: "correct horse" });
  });

  it("asks for a password when it is empty", () => {
    const result = signUpSchema.safeParse({
      email: "taylor@example.com",
      password: "",
    });
    expect(firstError(result)).toBe("Choose a password");
  });

  it("needs at least 8 characters and at most 72", () => {
    expect(
      firstError(
        signUpSchema.safeParse({
          email: "taylor@example.com",
          password: "short",
        }),
      ),
    ).toBe("Use at least 8 characters");
    expect(
      firstError(
        signUpSchema.safeParse({
          email: "taylor@example.com",
          password: "a".repeat(73),
        }),
      ),
    ).toBe("Use 72 characters or fewer");
  });
});

describe("passwordResetRequestSchema", () => {
  it("needs a valid email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "x" }).success).toBe(
      false,
    );
    expect(
      passwordResetRequestSchema.parse({ email: "Taylor@Example.com" }),
    ).toEqual({ email: "taylor@example.com" });
  });
});

describe("newPasswordSchema", () => {
  it("accepts two matching passwords", () => {
    expect(
      newPasswordSchema.parse({
        password: "a new passphrase",
        confirm: "a new passphrase",
      }),
    ).toEqual({ password: "a new passphrase", confirm: "a new passphrase" });
  });

  it("says when the two passwords differ, on the second box", () => {
    const result = newPasswordSchema.safeParse({
      password: "a new passphrase",
      confirm: "a new passphrase!",
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("The two passwords are not the same");
    expect(result.error?.issues[0]?.path).toEqual(["confirm"]);
  });

  it("checks the length before anything else", () => {
    const result = newPasswordSchema.safeParse({
      password: "short",
      confirm: "short",
    });
    expect(firstError(result)).toBe("Use at least 8 characters");
  });
});
