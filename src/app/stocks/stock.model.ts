export interface Stock {
  readonly id: string;
  number: number;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  label: string;
  enabled: boolean;
  ignoreDirection: boolean;
  cutTopSize: number;
  cutBottomSize: number;
  cutLeftSize: number;
  cutRightSize: number;
}

