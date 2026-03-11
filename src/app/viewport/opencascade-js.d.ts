declare module 'opencascade.js' {
  export interface OpenCascadeInstance {
    [key: string]: unknown;
  }

  export function initOpenCascade(): Promise<OpenCascadeInstance>;
}

