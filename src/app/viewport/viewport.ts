import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from '@angular/core';
import {
  AmbientLight,
  BufferGeometry,
  Box3,
  BoxGeometry,
  Camera,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  GridHelper,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Stock } from '../stocks/stock.model';
import { StocksStore } from '../stocks/stocks.store';
import { OpenCascadeInstance, OpenCascadeLoaderService } from './opencascade-loader.service';

interface StockViewportItem {
  readonly instanceId: string;
  readonly stockId: string;
  readonly stockNumber: number;
  readonly label: string;
  readonly copyIndex: number;
  readonly length: number;
  readonly width: number;
  readonly thickness: number;
  readonly ignoreDirection: boolean;
  readonly selected: boolean;
}

type ViewMode = '3d' | '2d';
type ProjectionMode = 'perspective' | 'orthographic';
type SupportedCamera = PerspectiveCamera | OrthographicCamera;

const MILLIMETERS_TO_SCENE_UNITS = 0.001;
const COLUMN_GAP = 0.22;
const ROW_GAP = 0.3;
const TARGET_COLUMN_COUNT = 3;
const STATUS_PREFIX = '3D viewport';
const COLOR_PALETTE = ['#2563eb', '#0f766e', '#9333ea', '#c2410c', '#be123c', '#047857'];
const GRID_CELL_SIZE = 0.25;
const GRID_PADDING = 0.5;
const GRID_OFFSET = -0.001;
const FPS_SAMPLE_INTERVAL_MS = 500;

@Component({
  selector: 'app-viewport',
  standalone: true,
  templateUrl: './viewport.html',
  styleUrl: './viewport.css'
})
export class ViewportComponent implements AfterViewInit {
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly stocksStore = inject(StocksStore);
  private readonly openCascadeLoader = inject(OpenCascadeLoaderService);

  readonly viewportStatus = signal(`${STATUS_PREFIX}: preparing renderer…`);
  readonly openCascadeStatus = signal('OpenCascade: loading…');
  readonly fpsStatus = signal('FPS: waiting for renderer…');
  readonly viewMode = signal<ViewMode>('3d');
  readonly projectionMode = signal<ProjectionMode>('perspective');
  readonly renderedStockCount = signal(0);
  readonly interactionHint = computed(() =>
    this.viewMode() === '2d'
      ? '2D plan locked · Drag or right-drag to pan · Wheel to zoom'
      : 'Drag to rotate · Shift/right drag to pan · Wheel to zoom'
  );

  readonly renderedStocks = computed<StockViewportItem[]>(() => {
    const selectedStockId = this.stocksStore.selectedStockId();
    return this.expandStocks(this.stocksStore.stocks(), selectedStockId);
  });

  private scene?: Scene;
  private perspectiveCamera?: PerspectiveCamera;
  private orthographicCamera?: OrthographicCamera;
  private activeCamera?: SupportedCamera;
  private renderer?: WebGLRenderer;
  private controls?: OrbitControls;
  private gridHelper?: GridHelper;
  private stockGroup?: Group;
  private resizeObserver?: ResizeObserver;
  private openCascade: OpenCascadeInstance | null = null;
  private orthographicHalfHeight = 1;
  private animationFrameActive = false;
  private lastFpsSampleTime = 0;
  private framesSinceLastSample = 0;

  constructor() {
    effect(() => {
      const stocks = this.renderedStocks();

      if (!this.stockGroup) {
        return;
      }

      this.rebuildStocks(stocks);
    });
  }

  setViewMode(mode: ViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }

    this.viewMode.set(mode);
    this.applyControlsMode();
    this.controls?.update();
    this.fitCameraToScene();
  }

  setProjectionMode(mode: ProjectionMode): void {
    if (this.projectionMode() === mode) {
      return;
    }

    this.projectionMode.set(mode);
    this.syncActiveCamera();
    this.applyControlsMode();
    this.controls?.update();
    this.fitCameraToScene();
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.hasWebglSupport()) {
      this.viewportStatus.set(`${STATUS_PREFIX}: WebGL is unavailable in this environment.`);
      this.openCascadeStatus.set('OpenCascade: waiting for a browser WebGL context.');
      this.fpsStatus.set('FPS: unavailable without WebGL');
      return;
    }

    const sceneReady = this.initialiseScene();

    if (!sceneReady) {
      this.viewportStatus.set(`${STATUS_PREFIX}: unable to initialise the renderer.`);
      this.openCascadeStatus.set('OpenCascade: renderer setup failed.');
      this.fpsStatus.set('FPS: unavailable');
      return;
    }

    await this.initialiseOpenCascade();
    this.rebuildStocks(this.renderedStocks());
    this.startRenderLoop();
  }

  private expandStocks(stocks: Stock[], selectedStockId: string | null): StockViewportItem[] {
    return stocks
      .filter((stock) => stock.enabled)
      .flatMap((stock) =>
        Array.from({ length: stock.quantity }, (_, copyIndex) => ({
          instanceId: `${stock.id}-${copyIndex + 1}`,
          stockId: stock.id,
          stockNumber: stock.number,
          label: stock.label,
          copyIndex,
          length: Math.max(1, stock.length),
          width: Math.max(1, stock.width),
          thickness: Math.max(1, stock.thickness),
          ignoreDirection: stock.ignoreDirection,
          selected: stock.id === selectedStockId
        }))
      );
  }

  private hasWebglSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return false;
    }

    const canvas = this.canvasRef().nativeElement;

    try {
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private initialiseScene(): boolean {
    const host = this.hostRef().nativeElement;
    const canvas = this.canvasRef().nativeElement;

    try {
      const renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas,
        powerPreference: 'high-performance'
      });
      const scene = new Scene();
      const perspectiveCamera = new PerspectiveCamera(45, 1, 0.01, 200);
      const orthographicCamera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
      const controls = new OrbitControls(perspectiveCamera, canvas);
      const stockGroup = new Group();
      const gridHelper = this.createGridHelper(10);

      scene.background = new Color('#eef3f8');
      scene.add(new AmbientLight('#ffffff', 1.75));

      const keyLight = new DirectionalLight('#ffffff', 2.2);
      keyLight.position.set(4, 7, 6);
      scene.add(keyLight);

      const fillLight = new DirectionalLight('#dbeafe', 0.9);
      fillLight.position.set(-6, 5, -4);
      scene.add(fillLight);

      scene.add(gridHelper);
      scene.add(stockGroup);

      perspectiveCamera.position.set(2.6, 1.8, 2.4);
      orthographicCamera.position.copy(perspectiveCamera.position);

      controls.enablePan = true;
      controls.enableRotate = true;
      controls.enableZoom = false;
      controls.zoomToCursor = true;
      controls.zoomSpeed = 4;
      controls.enableDamping = false;
      controls.screenSpacePanning = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 0);
      controls.update();

      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.scene = scene;
      this.perspectiveCamera = perspectiveCamera;
      this.orthographicCamera = orthographicCamera;
      this.activeCamera = perspectiveCamera;
      this.renderer = renderer;
      this.controls = controls;
      this.gridHelper = gridHelper;
      this.stockGroup = stockGroup;
      this.resetFpsCounter('FPS: measuring…');

      this.syncActiveCamera();
      this.handleResize(host.clientWidth, host.clientHeight);
      this.setupResizeObserver(host);
      this.destroyRef.onDestroy(() => this.disposeScene());
      this.viewportStatus.set(`${STATUS_PREFIX}: ready.`);

      return true;
    } catch {
      return false;
    }
  }

  private async initialiseOpenCascade(): Promise<void> {
    this.openCascadeStatus.set('OpenCascade: loading WebAssembly…');
    this.openCascade = await this.openCascadeLoader.load();
    if (this.openCascade) {
      this.openCascadeStatus.set('OpenCascade: loaded.');
      return;
    }
    this.openCascadeStatus.set('OpenCascade: unavailable. Rendering is not possible.');
  }

  private rebuildStocks(stocks: StockViewportItem[]): void {
    if (!this.stockGroup) {
      return;
    }

    this.clearStockGroup();
    this.renderedStockCount.set(stocks.length);

    if (stocks.length === 0) {
      this.viewportStatus.set(`${STATUS_PREFIX}: no enabled stock sheets to display.`);
      return;
    }

    const pluralSuffix = stocks.length === 1 ? '' : 's';
    this.viewportStatus.set(`${STATUS_PREFIX}: showing ${stocks.length} stock solid${pluralSuffix}.`);
    this.updateOpenCascadeRenderStatus();
  }

  private createLabelTexture(label: string): CanvasTexture | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;

    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0f172a';
    context.font = '600 32px Segoe UI';
    context.textBaseline = 'middle';
    context.fillText(label, 20, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }


  private updateOpenCascadeRenderStatus(): void {
    if (!this.openCascade) {
      this.openCascadeStatus.set('OpenCascade: unavailable.');
      return;
    }
  }

  private getViewModeCameraPosition(center: Vector3, distance: number): Vector3 {
    if (this.viewMode() === '2d') {
      return center.clone().add(new Vector3(0, 0, distance));
    }

    return center.clone().add(new Vector3(1, 0.65, 1).normalize().multiplyScalar(distance));
  }

  private createGridHelper(size: number): GridHelper {
    const snappedSize = size;
    const divisions = size;
    const gridHelper = new GridHelper(snappedSize, divisions, '#94a3b8', '#cbd5e1');
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = GRID_OFFSET;
    gridHelper.renderOrder = -1;
    return gridHelper;
  }

  private handleResize(width: number, height: number): void {
    if (!this.renderer) {
      return;
    }

    const safeWidth = Math.max(width, 320);
    const safeHeight = Math.max(height, 240);

    if (this.perspectiveCamera) {
      this.perspectiveCamera.aspect = safeWidth / safeHeight;
      this.perspectiveCamera.updateProjectionMatrix();
    }

    if (this.orthographicCamera) {
      this.applyOrthographicFrustum(this.orthographicCamera, safeWidth / safeHeight);
      this.orthographicCamera.updateProjectionMatrix();
    }

    this.renderer.setSize(safeWidth, safeHeight, false);

    if (this.projectionMode() === 'orthographic') {
      this.controls?.update();
    }
  }

  private setupResizeObserver(host: HTMLElement): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        const nextSize = this.readEntrySize(entry);
        this.handleResize(nextSize.x, nextSize.y);
      });

      this.resizeObserver.observe(host);
      return;
    }

    const onResize = () => this.handleResize(host.clientWidth, host.clientHeight);
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }

  private readEntrySize(entry: ResizeObserverEntry): Vector2 {
    if (Array.isArray(entry.contentBoxSize) && entry.contentBoxSize.length > 0) {
      return new Vector2(entry.contentBoxSize[0].inlineSize, entry.contentBoxSize[0].blockSize);
    }

    return new Vector2(entry.contentRect.width, entry.contentRect.height);
  }

  private startRenderLoop(): void {
    if (!this.renderer || !this.scene || !this.controls || this.animationFrameActive) {
      return;
    }

    this.animationFrameActive = true;
    this.renderer.setAnimationLoop((time) => {
      const camera = this.getActiveCamera();

      if (!camera) {
        return;
      }

      this.controls?.update();
      this.renderer?.render(this.scene!, camera);
      this.updateFpsCounter(time);
    });
  }

  private resetFpsCounter(status: string): void {
    this.lastFpsSampleTime = 0;
    this.framesSinceLastSample = 0;
    this.fpsStatus.set(status);
  }

  private updateFpsCounter(time?: number): void {
    const timestamp = typeof time === 'number' ? time : this.getNow();

    if (this.lastFpsSampleTime === 0) {
      this.lastFpsSampleTime = timestamp;
      this.framesSinceLastSample = 0;
      return;
    }

    this.framesSinceLastSample += 1;
    const elapsed = timestamp - this.lastFpsSampleTime;

    if (elapsed < FPS_SAMPLE_INTERVAL_MS) {
      return;
    }

    const framesPerSecond = (this.framesSinceLastSample * 1000) / elapsed;
    this.fpsStatus.set(`FPS: ${Math.max(0, Math.round(framesPerSecond))}`);
    this.lastFpsSampleTime = timestamp;
    this.framesSinceLastSample = 0;
  }

  private getNow(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }

    return Date.now();
  }

  private clearStockGroup(): void {
    if (!this.stockGroup) {
      return;
    }

    while (this.stockGroup.children.length > 0) {
      const child = this.stockGroup.children[0];
      this.stockGroup.remove(child);

      if (child instanceof Mesh) {
        child.geometry.dispose();

        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }

        const labelTexture = child.userData['labelTexture'];

        if (labelTexture instanceof CanvasTexture) {
          labelTexture.dispose();
        }
      }
    }
  }

  private disposeScene(): void {
    this.animationFrameActive = false;
    this.resizeObserver?.disconnect();
    this.clearStockGroup();
    if (this.gridHelper) {
      this.disposeGridHelper(this.gridHelper);
    }
    this.controls?.dispose();
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.scene = undefined;
    this.perspectiveCamera = undefined;
    this.orthographicCamera = undefined;
    this.activeCamera = undefined;
    this.controls = undefined;
    this.gridHelper = undefined;
    this.stockGroup = undefined;
    this.resetFpsCounter('FPS: stopped');
  }

  private getActiveCamera(): SupportedCamera | undefined {
    return this.projectionMode() === 'orthographic' ? this.orthographicCamera : this.perspectiveCamera;
  }

  private syncActiveCamera(): void {
    const nextCamera = this.getActiveCamera();

    if (!nextCamera) {
      return;
    }

    this.activeCamera = nextCamera;

    if (this.controls) {
      this.controls.object = nextCamera as Camera;
    }
  }

  private applyOrthographicFrustum(camera: OrthographicCamera, aspect: number): void {
    camera.top = this.orthographicHalfHeight;
    camera.bottom = -this.orthographicHalfHeight;
    camera.right = this.orthographicHalfHeight * aspect;
    camera.left = -this.orthographicHalfHeight * aspect;
  }

  private getViewportAspect(): number {
    const host = this.hostRef().nativeElement;
    const width = Math.max(host.clientWidth, 320);
    const height = Math.max(host.clientHeight, 240);

    return width / height;
  }

  private disposeGridHelper(gridHelper: GridHelper): void {
    gridHelper.geometry.dispose();

    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((material) => material.dispose());
      return;
    }

    gridHelper.material.dispose();
  }

  private applyControlsMode(): void {
    const camera = this.getActiveCamera();

    if (!camera || !this.controls) {
      return;
    }

    const isPlanView = this.viewMode() === '2d';

    camera.up.set(0, 1, 0);
    this.controls.enableRotate = !isPlanView;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.screenSpacePanning = isPlanView;
    this.controls.minPolarAngle = isPlanView ? Math.PI / 2 : 0;
    this.controls.maxPolarAngle = isPlanView ? Math.PI / 2 : Math.PI;
    this.controls.minAzimuthAngle = isPlanView ? 0 : -Infinity;
    this.controls.maxAzimuthAngle = isPlanView ? 0 : Infinity;
  }

  private fitCameraToScene(): void {
    const camera = this.getActiveCamera();

    if (!camera || !this.controls || !this.stockGroup) {
      return;
    }

    const contentBounds = new Box3().setFromObject(this.stockGroup);

    if (contentBounds.isEmpty()) {
      this.applyControlsMode();
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      return;
    }

    const center = contentBounds.getCenter(new Vector3());
    const size = contentBounds.getSize(new Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 0.5);
    this.fitCameraProjection(camera, center, maxDimension);

    this.controls.target.copy(center);
    this.applyControlsMode();
    this.controls.update();
  }

  private fitCameraProjection(
    camera: SupportedCamera,
    center: Vector3,
    maxDimension: number
  ): number {
    if (camera instanceof PerspectiveCamera) {
      const horizontalFov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
      const fitHeightDistance = maxDimension / (2 * Math.tan((camera.fov * Math.PI) / 360));
      const fitWidthDistance = maxDimension / (2 * Math.tan(horizontalFov / 2));
      const distance = 1.45 * Math.max(fitHeightDistance, fitWidthDistance);

      camera.near = Math.max(0.01, distance / 100);
      camera.far = Math.max(200, distance * 40);
      camera.position.copy(this.getViewModeCameraPosition(center, distance));
      camera.updateProjectionMatrix();

      return distance;
    }

    const aspect = this.getViewportAspect();
    const halfHeight = 0.7 * Math.max(maxDimension / 2, maxDimension / (2 * Math.max(aspect, 0.1)));
    const distance = Math.max(maxDimension * 2.5, 2);

    this.orthographicHalfHeight = halfHeight;
    this.applyOrthographicFrustum(camera, aspect);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(200, distance * 40);
    camera.position.copy(this.getViewModeCameraPosition(center, distance));
    camera.updateProjectionMatrix();

    return distance;
  }
}

