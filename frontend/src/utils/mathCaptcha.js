// src/utils/mathCaptcha.js
//
// Generates a simple two-number addition captcha (e.g. "4 + 9").
// Kept intentionally simple — this is a basic bot-deterrent for a public
// verification form, not a security boundary.

export const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1; // 1–10
  const b = Math.floor(Math.random() * 10) + 1; // 1–10
  return {
    question: `${a} + ${b}`,
    answer: a + b,
  };
};
