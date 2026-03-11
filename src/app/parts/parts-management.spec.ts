import { TestBed } from '@angular/core/testing';
import { PartsManagementComponent } from './parts-management';

describe('PartsManagementComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartsManagementComponent]
    }).compileComponents();
  });

  it('should create with sample parts loaded', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(component.parts().length).toBe(3);
    expect(component.selectedPart()?.label).toBe('Base Panel');
    expect(component.columnDefs[component.columnDefs.length - 1]?.colId).toBe('actions');
  });

  it('should add a new part and select it', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.addPart();
    fixture.detectChanges();

    expect(component.parts().length).toBe(4);
    expect(component.selectedPart()?.number).toBe(4);
    expect(component.selectedPart()?.label).toBe('Part 4');
  });

  it('should render the parts action buttons inside an aria toolbar', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('[role="toolbar"]');
    const widgets = toolbar?.querySelectorAll('button');

    expect(toolbar).not.toBeNull();
    expect(toolbar?.getAttribute('aria-label')).toBe('Part Tools');
    expect(widgets?.length).toBe(3);
    expect(Array.from(widgets ?? []).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Add Part',
      'Download CSV',
      'Upload CSV'
    ]);
  });

  it('should delete the selected part and select a neighbouring row', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const initiallySelectedPart = component.selectedPart();

    component.deletePart(initiallySelectedPart!.id);
    fixture.detectChanges();

    expect(component.parts().length).toBe(2);
    expect(component.parts().some((part) => part.id === initiallySelectedPart!.id)).toBe(false);
    expect(component.selectedPart()?.label).toBe('Divider');
  });

  it('should preserve the current selection when deleting a different row', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const targetSelection = component.parts()[1]!;
    const rowToDelete = component.parts()[0]!;

    component.selectPart(targetSelection.id);
    component.deletePart(rowToDelete.id);
    fixture.detectChanges();

    expect(component.parts().length).toBe(2);
    expect(component.selectedPart()?.id).toBe(targetSelection.id);
  });

  it('should export parts using the canonical CSV headers and escaped values', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const [firstPart] = component.parts();

    component.parts.set([
      {
        ...firstPart!,
        label: 'Shelf, "A"',
        material: 'Birch, Prime',
        ignoreDirection: true
      }
    ]);

    expect(component.exportPartsToCsvText()).toBe(
      [
        'number,label,length,width,quantity,enabled,ignore_direction,material',
        '1,"Shelf, ""A""",2400,600,2,true,true,"Birch, Prime"'
      ].join('\r\n')
    );
  });

  it('should import parts from CSV text and overwrite the current table', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.importPartsFromCsvText(
      [
        'label,length,width,quantity,enabled,ignoreDirection,material',
        'Shelf,1000,300,2,yes,true,Birch plywood',
        'Drawer front,450,150,,0,false,'
      ].join('\n')
    );

    expect(component.parts().length).toBe(2);
    expect(component.parts().map((part) => part.number)).toEqual([1, 2]);
    expect(component.parts()[0]).toMatchObject({
      label: 'Shelf',
      length: 1000,
      width: 300,
      quantity: 2,
      enabled: true,
      ignoreDirection: true,
      material: 'Birch plywood'
    });
    expect(component.parts()[1]).toMatchObject({
      label: 'Drawer front',
      quantity: 1,
      enabled: false,
      ignoreDirection: false,
      material: ''
    });
    expect(component.selectedPart()?.id).toBe(component.parts()[0]?.id ?? null);
  });

  it('should support quoted CSV values and preserve explicit part numbers', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.importPartsFromCsvText(
      [
        'number,label,length,width,quantity,enabled,ignore_direction,material',
        '7,"Shelf, ""A""",1200,500,3,true,false,"Birch, Prime"'
      ].join('\r\n')
    );

    expect(component.parts()).toHaveLength(1);
    expect(component.parts()[0]).toMatchObject({
      number: 7,
      label: 'Shelf, "A"',
      material: 'Birch, Prime'
    });
  });

  it('should reject CSV files without supported part headers', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(() => component.importPartsFromCsvText('foo,bar\n1,2')).toThrowError(
      'CSV must include at least one supported column: number, label, length, width, quantity, enabled, ignore_direction, material.'
    );
  });

  it('should reject malformed quoted CSV input', () => {
    const fixture = TestBed.createComponent(PartsManagementComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(() => component.importPartsFromCsvText('label,length\n"Bad value,1200')).toThrowError(
      'CSV contains an unterminated quoted field.'
    );
  });
});

