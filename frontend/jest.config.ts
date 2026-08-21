import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest reusa el compilador que Next ya trae (SWC): resuelve TypeScript y el alias "@/"
// sin sumar ts-jest ni un babel.config propio.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // Entorno node y no jsdom: lo que se testea es lógica de estado, sin DOM. jsdom tarda más
  // en arrancar y no aporta nada acá.
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // El alias "@/" de tsconfig hay que repetirlo acá: Jest resuelve módulos por su cuenta y no
  // lee los paths de TypeScript.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
};

export default createJestConfig(config);
