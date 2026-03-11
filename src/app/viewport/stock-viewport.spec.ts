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
    expect(compiled.querySelector('[aria-label="Viewport mode"]')).not.toBeNull();
    expect(compiled.querySelector('[aria-label="Camera projection"]')).not.toBeNull();
    expect(compiled.textContent).toContain('Drag to rotate');
  });

  it('should switch to orthographic projection mode', async () => {
    const fixture = TestBed.createComponent(StockViewportComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const orthographicButton = compiled.querySelectorAll<HTMLButtonElement>('.view-mode-button')[3];

    orthographicButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.projectionMode()).toBe('orthographic');
    expect(orthographicButton?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should switch to a locked 2D plan mode', async () => {
    const fixture = TestBed.createComponent(StockViewportComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const twoDimensionalButton = compiled.querySelectorAll<HTMLButtonElement>('.view-mode-button')[1];

    twoDimensionalButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.viewMode()).toBe('2d');
    expect(fixture.componentInstance.interactionHint()).toContain('2D plan locked');
    expect(twoDimensionalButton?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should fall back gracefully when WebGL is unavailable in tests', async () => {
    const fixture = TestBed.createComponent(StockViewportComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.viewportStatus()).toContain('WebGL is unavailable');
  });
});

