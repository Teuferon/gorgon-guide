// The game JSON files are large. Typing them as unknown keeps the type checker fast,
// the real shapes are in src/lib/types.ts and are applied in src/lib/data.ts.
declare module "*.json" {
  const value: unknown;
  export default value;
}
