/// <reference types="tsdown/client" />

declare module '*.scss' {}

declare module '*.svg' {
  const text: string;
  export default text;
}
