export interface Part {
  readonly id: string;
  number: number;
  length: number;
  width: number;
  quantity: number;
  label: string;
  enabled: boolean;
  ignoreDirection: boolean;
  material: string;
}

