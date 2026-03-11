import { TestBed } from '@angular/core/testing';
import { StockViewportComponent } from './stock-viewport';

describe('StockViewportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockViewportComponent]
    }).compileComponents();
  });

  it('should create and render the viewport overlays', async () => {
    const fixture = TestBed.createComponent(StockViewportComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;

    expect(component).toBeTruthy();
    expect(compiled.querySelector('canvas[aria-label="Stock 3D viewport"]')).not.toBeNull();
    expect(compiled.textContent).toContain('Drag to rotate');
  });

  it('should fall back gracefully when WebGL is unavailable in tests', async () => {
    const fixture = TestBed.createComponent(StockViewportComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.viewportStatus()).toContain('WebGL is unavailable');
  });
});

