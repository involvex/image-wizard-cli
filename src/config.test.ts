import { describe, expect, test } from "bun:test";
import { validateConfig } from "./config";

describe("validateConfig", () => {
  test("rejects empty cookies", () => {
    expect(
      validateConfig({
        auth_cookie_u: "",
        auth_cookie_srchhpgusr: "",
      }),
    ).toBe(false);
  });

  test("rejects placeholder defaults", () => {
    expect(
      validateConfig({
        auth_cookie_u: "_U:",
        auth_cookie_srchhpgusr: "SRCHHPGUSR:",
      }),
    ).toBe(false);
  });

  test("rejects short cookie values", () => {
    expect(
      validateConfig({
        auth_cookie_u: "short",
        auth_cookie_srchhpgusr: "also-short",
      }),
    ).toBe(false);
  });

  test("accepts plausible cookie values", () => {
    expect(
      validateConfig({
        auth_cookie_u: "abcdefghijklmnopqrstuvwxyz",
        auth_cookie_srchhpgusr: "SRCHHPGUSR=abc&HV=1234567890",
      }),
    ).toBe(true);
  });
});
