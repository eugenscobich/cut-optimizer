import { TestBed } from '@angular/core/testing';
import { StocksManagementComponent } from './stocks-management';

describe('StocksManagementComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksManagementComponent]
    }).compileComponents();
  });

  it('should create with sample stocks loaded', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(component.stocks().length).toBe(3);
    expect(component.selectedStock()?.label).toBe('Birch Sheet A');
    expect(component.columnDefs[component.columnDefs.length - 1]?.colId).toBe('actions');
  });

  it('should add a new stock and select it', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.addStock();
    fixture.detectChanges();

    expect(component.stocks().length).toBe(4);
    expect(component.selectedStock()?.number).toBe(4);
    expect(component.selectedStock()?.label).toBe('Stock 4');
  });

  it('should render the stock action buttons inside an aria toolbar', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('[role="toolbar"]');
    const widgets = toolbar?.querySelectorAll('button');

    expect(toolbar).not.toBeNull();
    expect(toolbar?.getAttribute('aria-label')).toBe('Stock Tools');
    expect(widgets?.length).toBe(3);
    expect(Array.from(widgets ?? []).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Add Stock',
      'Download CSV',
      'Upload CSV'
    ]);
  });

  it('should delete the selected stock and select a neighbouring row', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const initiallySelectedStock = component.selectedStock();

    component.deleteStock(initiallySelectedStock!.id);
    fixture.detectChanges();

    expect(component.stocks().length).toBe(2);
    expect(component.stocks().some((stock) => stock.id === initiallySelectedStock!.id)).toBe(false);
    expect(component.selectedStock()?.label).toBe('MDF Sheet');
  });

  it('should preserve the current selection when deleting a different row', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const targetSelection = component.stocks()[1]!;
    const rowToDelete = component.stocks()[0]!;

    component.selectStock(targetSelection.id);
    component.deleteStock(rowToDelete.id);
    fixture.detectChanges();

    expect(component.stocks().length).toBe(2);
    expect(component.selectedStock()?.id).toBe(targetSelection.id);
  });

  it('should export stocks using the canonical CSV headers and escaped values', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const [firstStock] = component.stocks();

    component.stocks.set([
      {
        ...firstStock!,
        label: 'Sheet, "A"',
        width: 2050,
        thickness: 19,
        ignoreDirection: true,
        cutTopSize: 12,
        cutBottomSize: 8,
        cutLeftSize: 4,
        cutRightSize: 6
      }
    ]);

    expect(component.exportStocksToCsvText()).toBe(
      [
        'number,label,length,width,thickness,quantity,enabled,ignore_direction,cut_top_size,cut_bottom_size,cut_left_size,cut_right_size',
        '1,"Sheet, ""A""",2800,2050,19,4,true,true,12,8,4,6'
      ].join('\r\n')
    );
  });

  it('should import stocks from CSV text and overwrite the current table', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.importStocksFromCsvText(
      [
        'label,length,width,thickness,quantity,enabled,ignoreDirection,cutTopSize,cutBottomSize,cutLeftSize,cutRightSize',
        'Birch Prime,2800,2070,18,4,yes,false,10,10,5,5',
        'MDF Backup,2440,1220,,0,0,true,,,2,3'
      ].join('\n')
    );

    expect(component.stocks().length).toBe(2);
    expect(component.stocks().map((stock) => stock.number)).toEqual([1, 2]);
    expect(component.stocks()[0]).toMatchObject({
      label: 'Birch Prime',
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
    });
    expect(component.stocks()[1]).toMatchObject({
      label: 'MDF Backup',
      thickness: 0,
      quantity: 1,
      enabled: false,
      ignoreDirection: true,
      cutTopSize: 0,
      cutBottomSize: 0,
      cutLeftSize: 2,
      cutRightSize: 3
    });
    expect(component.selectedStock()?.id).toBe(component.stocks()[0]?.id ?? null);
  });

  it('should support quoted CSV values and preserve explicit stock numbers', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.importStocksFromCsvText(
      [
        'number,label,length,width,thickness,quantity,enabled,ignore_direction,cut_top_size,cut_bottom_size,cut_left_size,cut_right_size',
        '7,"Sheet, ""A""",3200,1600,21,3,true,false,12,8,5,4'
      ].join('\r\n')
    );

    expect(component.stocks()).toHaveLength(1);
    expect(component.stocks()[0]).toMatchObject({
      number: 7,
      label: 'Sheet, "A"',
      thickness: 21,
      cutTopSize: 12,
      cutRightSize: 4
    });
  });

  it('should reject CSV files without supported stock headers', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(() => component.importStocksFromCsvText('foo,bar\n1,2')).toThrowError(
      'CSV must include at least one supported column: number, label, length, width, thickness, quantity, enabled, ignore_direction, cut_top_size, cut_bottom_size, cut_left_size, cut_right_size.'
    );
  });

  it('should reject malformed quoted CSV input', () => {
    const fixture = TestBed.createComponent(StocksManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(() => component.importStocksFromCsvText('label,length\n"Bad value,2800')).toThrowError(
      'CSV contains an unterminated quoted field.'
    );
  });
});

