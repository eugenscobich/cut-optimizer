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
    expect(component.columnDefs[0]?.colId).toBe('actions');
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
});

