import { Injectable } from '@angular/core';

export interface OpenCascadeInstance {
  [key: string]: any;
}

interface OpenCascadeModule {
  default: (options?: { locateFile?: (path: string) => string }) => Promise<OpenCascadeInstance>;
}

const OPEN_CASCADE_BASE_PATH = '/opencascade';

@Injectable({ providedIn: 'root' })
export class OpenCascadeLoaderService {
  private loadPromise?: Promise<OpenCascadeInstance | null>;

  load(): Promise<OpenCascadeInstance | null> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (typeof window === 'undefined') {
      this.loadPromise = Promise.resolve(null);
      return this.loadPromise;
    }

    this.loadPromise = import(
      /* webpackIgnore: true */
      `${OPEN_CASCADE_BASE_PATH}/opencascade.wasm.js`
    )
      .then((module) => (module as OpenCascadeModule).default)
      .then((createOpenCascade) =>
        createOpenCascade({
          locateFile: (path) => `${OPEN_CASCADE_BASE_PATH}/${path}`
        })
      )
      .catch(() => null);

    return this.loadPromise;
  }
}

