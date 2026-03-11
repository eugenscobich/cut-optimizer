import { Stock } from './stock.model';

export const createStockId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `stock-${Math.random().toString(36).slice(2, 10)}`;
};

export const createSampleStocks = (): Stock[] => [
  {
    id: createStockId(),
    number: 1,
    label: 'Birch Sheet A',
    length: 2800,
    width: 2070,
    thickness: 18,
    quantity: 4,
    enabled: true,
    ignoreDirection: false,
    cutTopSize: 10,
    cutBottomSize: 10,
    cutLeftSize: 5,
    cutRightSize: 5
  },
  {
    id: createStockId(),
    number: 2,
    label: 'MDF Sheet',
    length: 2440,
    width: 1220,
    thickness: 18,
    quantity: 6,
    enabled: true,
    ignoreDirection: true,
    cutTopSize: 0,
    cutBottomSize: 0,
    cutLeftSize: 0,
    cutRightSize: 0
  },
  {
    id: createStockId(),
    number: 3,
    label: 'White Laminate',
    length: 3050,
    width: 1300,
    thickness: 12,
    quantity: 2,
    enabled: true,
    ignoreDirection: false,
    cutTopSize: 3,
    cutBottomSize: 3,
    cutLeftSize: 3,
    cutRightSize: 3
  }
];

export const createEmptyStock = (nextNumber: number): Stock => ({
  id: createStockId(),
  number: nextNumber,
  label: `Stock ${nextNumber}`,
  length: 2800,
  width: 2070,
  thickness: 18,
  quantity: 1,
  enabled: true,
  ignoreDirection: false,
  cutTopSize: 0,
  cutBottomSize: 0,
  cutLeftSize: 0,
  cutRightSize: 0
});

