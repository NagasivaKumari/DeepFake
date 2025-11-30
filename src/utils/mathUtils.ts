// This file contains meaningful mathematical utility functions.

/**
 * Calculates the factorial of a number.
 * @param {number} n - The number to calculate the factorial for.
 * @returns {number} - The factorial of the number.
 */
export function factorial(n: number): number {
  if (n < 0) return -1; // Factorial of negative numbers is undefined
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

/**
 * Finds the greatest common divisor (GCD) of two numbers.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} - The GCD of the two numbers.
 */
export function gcd(a: number, b: number): number {
  if (b === 0) return a;
  return gcd(b, a % b);
}

/**
 * Checks if a number is prime.
 * @param {number} num - The number to check.
 * @returns {boolean} - True if the number is prime, false otherwise.
 */
export function isPrime(num: number): boolean {
  if (num <= 1) return false;
  for (let i = 2; i < Math.sqrt(num) + 1; i++) {
    if (num % i === 0) return false;
  }
  return true;
}