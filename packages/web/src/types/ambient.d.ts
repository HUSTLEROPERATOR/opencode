// Minimal ambient module declarations to satisfy typechecker
declare module 'astro:content' {
  export function defineCollection(input: any): any
  export function getCollection(...args: any[]): any
  export type SchemaContext = any
  export const z: any
  export type CollectionEntry = any
  export type RenderResult = any
  export type DataCollectionKey = any
}

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.jsonc?raw' {
  const content: string
  export default content
}

declare module 'vscode-languageserver-types' {
  export interface Diagnostic { [key: string]: any }
}
