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
import { OpenCascadeInstance, OpencascadeLoaderService } from './opencascade-loader.service';

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

interface OpenCascadeResource {
  delete?: () => void;
}

interface OpenCascadeBoxMakerHandle extends OpenCascadeResource {
  Shape?: () => OpenCascadeResource | null;
}

interface StockGeometryBuildResult {
  readonly geometry: BufferGeometry;
  readonly source: 'opencascade' | 'analytical';
}

interface StockMeshBuildResult {
  readonly mesh: Mesh;
  readonly geometrySource: StockGeometryBuildResult['source'];
}

interface OpenCascadeTriangleIndices {
  readonly first: number;
  readonly second: number;
  readonly third: number;
}

type OpenCascadeBoxConstructor = new (...args: number[]) => OpenCascadeBoxMakerHandle;
type OpenCascadeGenericConstructor = new (...args: unknown[]) => OpenCascadeResource;
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

@Component({
  selector: 'app-stock-viewport',
  standalone: true,
  templateUrl: './stock-viewport.html',
  styleUrl: './stock-viewport.css'
})
export class StockViewportComponent implements AfterViewInit {
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly stocksStore = inject(StocksStore);
  private readonly opencascadeLoader = inject(OpencascadeLoaderService);

  readonly viewportStatus = signal(`${STATUS_PREFIX}: preparing renderer…`);
  readonly openCascadeStatus = signal('OpenCascade: loading…');
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
  private openCascadeBoxConstructor: OpenCascadeBoxConstructor | null = null;
  private orthographicHalfHeight = 1;
  private animationFrameActive = false;

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
      return;
    }

    const sceneReady = this.initialiseScene();

    if (!sceneReady) {
      this.viewportStatus.set(`${STATUS_PREFIX}: unable to initialise the renderer.`);
      this.openCascadeStatus.set('OpenCascade: renderer setup failed.');
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
      const gridHelper = this.createGridHelper(2);

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
      //controls.minDistance = 0.15;
      //controls.maxDistance = 40;
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

      this.syncActiveCamera();
      this.applyControlsMode();
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
    this.openCascade = await this.opencascadeLoader.load();

    if (this.openCascade) {
      this.openCascadeBoxConstructor = this.resolveOpenCascadeBoxConstructor(
        this.openCascade as Record<string, unknown>
      );
      this.openCascadeStatus.set(
        this.openCascadeBoxConstructor
          ? 'OpenCascade: loaded. Building stock solids and computed meshes.'
          : 'OpenCascade: loaded, but box bindings were not found. Using analytical box geometry.'
      );
      return;
    }

    this.openCascadeStatus.set('OpenCascade: unavailable. Rendering analytical box geometry only.');
  }

  private rebuildStocks(stocks: StockViewportItem[]): void {
    if (!this.stockGroup) {
      return;
    }

    this.clearStockGroup();
    this.renderedStockCount.set(stocks.length);

    if (stocks.length === 0) {
      this.updateGridHelper();
      this.viewportStatus.set(`${STATUS_PREFIX}: no enabled stock sheets to display.`);
      return;
    }

    const columnCount = Math.min(TARGET_COLUMN_COUNT, Math.max(1, stocks.length));
    let openCascadeMeshCount = 0;
    let analyticalMeshCount = 0;

    stocks.forEach((stock, index) => {
      const columnIndex = index % columnCount;
      const rowIndex = Math.floor(index / columnCount);
      const length = stock.length * MILLIMETERS_TO_SCENE_UNITS;
      const width = stock.width * MILLIMETERS_TO_SCENE_UNITS;
      const thickness = stock.thickness * MILLIMETERS_TO_SCENE_UNITS;
      const previousColumnWidth = this.getAccumulatedColumnWidth(stocks, columnIndex, columnCount);
      const previousRowDepth = this.getAccumulatedRowDepth(stocks, rowIndex, columnCount);
      const { mesh, geometrySource } = this.createStockMesh(stock, length, width, thickness);

      if (geometrySource === 'opencascade') {
        openCascadeMeshCount += 1;
      } else {
        analyticalMeshCount += 1;
      }

      mesh.position.set(
        previousColumnWidth + length / 2 + columnIndex * COLUMN_GAP,
        previousRowDepth + width / 2 + rowIndex * ROW_GAP,
        thickness / 2
      );

      if (stock.ignoreDirection) {
        mesh.rotation.z = Math.PI / 2;
      }

      this.stockGroup?.add(mesh);
    });

    this.updateGridHelper(new Box3().setFromObject(this.stockGroup));
    this.fitCameraToScene();

    const pluralSuffix = stocks.length === 1 ? '' : 's';
    this.viewportStatus.set(`${STATUS_PREFIX}: showing ${stocks.length} stock solid${pluralSuffix}.`);
    this.updateOpenCascadeRenderStatus(openCascadeMeshCount, analyticalMeshCount);
  }

  private getAccumulatedColumnWidth(
    stocks: StockViewportItem[],
    targetColumnIndex: number,
    columnCount: number
  ): number {
    let width = 0;

    for (let columnIndex = 0; columnIndex < targetColumnIndex; columnIndex += 1) {
      const widestInColumn = stocks
        .filter((_, index) => index % columnCount === columnIndex)
        .reduce(
          (maxWidth, stock) => Math.max(maxWidth, stock.length * MILLIMETERS_TO_SCENE_UNITS),
          0
        );

      width += widestInColumn;
    }

    return width;
  }

  private getAccumulatedRowDepth(
    stocks: StockViewportItem[],
    targetRowIndex: number,
    columnCount: number
  ): number {
    let depth = 0;

    for (let rowIndex = 0; rowIndex < targetRowIndex; rowIndex += 1) {
      const deepestInRow = stocks
        .filter((_, index) => Math.floor(index / columnCount) === rowIndex)
        .reduce(
          (maxDepth, stock) => Math.max(maxDepth, stock.width * MILLIMETERS_TO_SCENE_UNITS),
          0
        );

      depth += deepestInRow;
    }

    return depth;
  }

  private createStockMesh(
    stock: StockViewportItem,
    length: number,
    width: number,
    thickness: number
  ): StockMeshBuildResult {
    const geometryResult = this.buildStockGeometry(stock, length, width, thickness);
    const material = new MeshPhysicalMaterial({
      color: COLOR_PALETTE[(stock.stockNumber - 1) % COLOR_PALETTE.length],
      roughness: 0.52,
      metalness: 0.04,
      clearcoat: 0.22,
      clearcoatRoughness: 0.8,
      transparent: true,
      opacity: stock.selected ? 0.98 : 0.92
    });

    if (stock.selected) {
      material.emissive = new Color('#bfdbfe');
      material.emissiveIntensity = 0.35;
    }

    const mesh = new Mesh(geometryResult.geometry, material);
    const labelTexture = this.createLabelTexture(
      `${stock.label} · #${stock.stockNumber}.${stock.copyIndex + 1}`
    );

    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData = {
      labelTexture,
      geometrySource: geometryResult.source,
      stockId: stock.stockId
    };

    return {
      mesh,
      geometrySource: geometryResult.source
    };
  }

  private buildStockGeometry(
    stock: StockViewportItem,
    length: number,
    width: number,
    thickness: number
  ): StockGeometryBuildResult {
    const openCascadeGeometry = this.createOpenCascadeGeometry(stock);

    if (openCascadeGeometry) {
      return {
        geometry: openCascadeGeometry,
        source: 'opencascade'
      };
    }

    return {
      geometry: this.createFallbackBoxGeometry(length, width, thickness),
      source: 'analytical'
    };
  }

  private createFallbackBoxGeometry(
    length: number,
    width: number,
    thickness: number
  ): BoxGeometry {
    return new BoxGeometry(length, width, thickness);
  }

  private createOpenCascadeGeometry(stock: StockViewportItem): BufferGeometry | null {
    if (!this.openCascade || !this.openCascadeBoxConstructor) {
      return null;
    }

    let maker: OpenCascadeBoxMakerHandle | null = null;
    let shape: OpenCascadeResource | null = null;

    try {
      maker = new this.openCascadeBoxConstructor(stock.length, stock.width, stock.thickness);
      shape = maker.Shape?.() ?? null;

      if (!shape) {
        return null;
      }

      return this.createThreeGeometryFromOpenCascadeShape(
        this.openCascade as Record<string, unknown>,
        shape
      );
    } catch {
      return null;
    } finally {
      this.disposeOpenCascadeResource(shape);
      this.disposeOpenCascadeResource(maker);
    }
  }

  private createThreeGeometryFromOpenCascadeShape(
    openCascadeRecord: Record<string, unknown>,
    shape: OpenCascadeResource
  ): BufferGeometry | null {
    const mesherConstructor = this.resolveOpenCascadeConstructor<OpenCascadeGenericConstructor>(
      openCascadeRecord,
      'BRepMesh_IncrementalMesh'
    );
    const explorerConstructor = this.resolveOpenCascadeConstructor<OpenCascadeGenericConstructor>(
      openCascadeRecord,
      'TopExp_Explorer'
    );
    const locationConstructor = this.resolveOpenCascadeConstructor<OpenCascadeGenericConstructor>(
      openCascadeRecord,
      'TopLoc_Location'
    );

    if (!mesherConstructor || !explorerConstructor || !locationConstructor) {
      return null;
    }

    const mesher = this.instantiateOpenCascadeResource(mesherConstructor, [
      [shape, 0.5, false, 0.5, true],
      [shape, 0.5, false, 0.5],
      [shape, 0.5, false],
      [shape, 0.5],
      [shape]
    ]);

    if (!mesher) {
      return null;
    }

    let explorer: OpenCascadeResource | null = null;

    try {
      this.callOpenCascadeMethod(
        this.asOpenCascadeRecord(mesher),
        ['Perform'],
        []
      );

      const faceEnum = this.resolveOpenCascadeFaceEnum(openCascadeRecord);
      const explorerArguments =
        faceEnum === null ? [[shape]] : [[shape, faceEnum], [shape, faceEnum, false], [shape, faceEnum, 0]];

      explorer = this.instantiateOpenCascadeResource(explorerConstructor, explorerArguments);

      if (!explorer) {
        return null;
      }

      const positions: number[] = [];
      const indices: number[] = [];

      while (this.readOpenCascadeBoolean(this.asOpenCascadeRecord(explorer), ['More'])) {
        const currentFace = this.callOpenCascadeMethod(
          this.asOpenCascadeRecord(explorer),
          ['Current'],
          []
        ) as OpenCascadeResource | null;

        const face = this.castOpenCascadeFace(openCascadeRecord, currentFace);

        if (face) {
          this.appendOpenCascadeFaceGeometry(openCascadeRecord, face, locationConstructor, positions, indices);
        }

        if (face && face !== currentFace) {
          this.disposeOpenCascadeResource(face);
        }

        this.callOpenCascadeMethod(this.asOpenCascadeRecord(explorer), ['Next'], []);
      }

      if (positions.length === 0 || indices.length === 0) {
        return null;
      }

      const geometry = new BufferGeometry();

      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      return geometry;
    } finally {
      this.disposeOpenCascadeResource(explorer);
      this.disposeOpenCascadeResource(mesher);
    }
  }

  private appendOpenCascadeFaceGeometry(
    openCascadeRecord: Record<string, unknown>,
    face: OpenCascadeResource,
    locationConstructor: OpenCascadeGenericConstructor,
    positions: number[],
    indices: number[]
  ): void {
    let location: OpenCascadeResource | null = null;
    let triangulation: OpenCascadeResource | null = null;
    let transform: OpenCascadeResource | null = null;

    try {
      location = new locationConstructor();
      triangulation = this.readOpenCascadeTriangulation(openCascadeRecord, face, location);

      if (!triangulation) {
        return;
      }

      const triangulationRecord = this.asOpenCascadeRecord(triangulation);
      const nodeCount = this.readOpenCascadeNumber(triangulationRecord, ['NbNodes']);
      const triangleCount = this.readOpenCascadeNumber(triangulationRecord, ['NbTriangles']);

      if (!nodeCount || !triangleCount) {
        return;
      }

      transform = this.callOpenCascadeMethod(
        this.asOpenCascadeRecord(location),
        ['Transformation'],
        []
      ) as OpenCascadeResource | null;

      const vertexOffset = positions.length / 3;

      for (let nodeIndex = 1; nodeIndex <= nodeCount; nodeIndex += 1) {
        const node = this.callOpenCascadeMethod(triangulationRecord, ['Node'], [nodeIndex]) as
          | OpenCascadeResource
          | null;
        const transformedNode = node
          ? ((transform
              ? this.callOpenCascadeMethod(this.asOpenCascadeRecord(node), ['Transformed'], [transform])
              : null) as OpenCascadeResource | null)
          : null;
        const effectiveNode = transformedNode ?? node;
        const effectiveNodeRecord = this.asOpenCascadeRecord(effectiveNode);

        const x = this.readOpenCascadeNumber(effectiveNodeRecord, ['X']);
        const y = this.readOpenCascadeNumber(effectiveNodeRecord, ['Y']);
        const z = this.readOpenCascadeNumber(effectiveNodeRecord, ['Z']);

        if (x !== null && y !== null && z !== null) {
          positions.push(
            x * MILLIMETERS_TO_SCENE_UNITS,
            y * MILLIMETERS_TO_SCENE_UNITS,
            z * MILLIMETERS_TO_SCENE_UNITS
          );
        }

        if (transformedNode && transformedNode !== node) {
          this.disposeOpenCascadeResource(transformedNode);
        }

        this.disposeOpenCascadeResource(node);
      }

      const faceIsReversed = this.isOpenCascadeFaceReversed(openCascadeRecord, face);

      for (let triangleIndex = 1; triangleIndex <= triangleCount; triangleIndex += 1) {
        const triangle = this.callOpenCascadeMethod(triangulationRecord, ['Triangle'], [triangleIndex]) as
          | OpenCascadeResource
          | null;
        const triangleIndices = this.readOpenCascadeTriangleIndices(triangle);

        if (triangleIndices) {
          const firstIndex = vertexOffset + triangleIndices.first - 1;
          const secondIndex = vertexOffset + triangleIndices.second - 1;
          const thirdIndex = vertexOffset + triangleIndices.third - 1;

          if (faceIsReversed) {
            indices.push(firstIndex, thirdIndex, secondIndex);
          } else {
            indices.push(firstIndex, secondIndex, thirdIndex);
          }
        }

        this.disposeOpenCascadeResource(triangle);
      }
    } finally {
      this.disposeOpenCascadeResource(transform);
      this.disposeOpenCascadeResource(triangulation);
      this.disposeOpenCascadeResource(location);
    }
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

  private resolveOpenCascadeBoxConstructor(
    openCascadeRecord: Record<string, unknown>
  ): OpenCascadeBoxConstructor | null {
    return this.resolveOpenCascadeConstructor<OpenCascadeBoxConstructor>(
      openCascadeRecord,
      'BRepPrimAPI_MakeBox'
    );
  }

  private resolveOpenCascadeConstructor<T extends OpenCascadeGenericConstructor | OpenCascadeBoxConstructor>(
    openCascadeRecord: Record<string, unknown>,
    baseName: string
  ): T | null {
    for (const constructorName of this.getOpenCascadeCandidateNames(baseName)) {
      const candidate = openCascadeRecord[constructorName];

      if (typeof candidate === 'function') {
        return candidate as T;
      }
    }

    return null;
  }

  private instantiateOpenCascadeResource(
    Constructor: OpenCascadeGenericConstructor,
    argumentSets: readonly unknown[][]
  ): OpenCascadeResource | null {
    for (const argumentSet of argumentSets) {
      try {
        return new Constructor(...argumentSet);
      } catch {
        continue;
      }
    }

    return null;
  }

  private readOpenCascadeTriangulation(
    openCascadeRecord: Record<string, unknown>,
    face: OpenCascadeResource,
    location: OpenCascadeResource
  ): OpenCascadeResource | null {
    const brepTool = this.asOpenCascadeRecord(openCascadeRecord['BRep_Tool']);

    if (!brepTool) {
      return null;
    }

    return (this.callOpenCascadeMethod(brepTool, ['Triangulation'], [face, location]) ??
      this.callOpenCascadeMethod(brepTool, ['Triangulation'], [face, location, 0])) as OpenCascadeResource | null;
  }

  private castOpenCascadeFace(
    openCascadeRecord: Record<string, unknown>,
    faceCandidate: OpenCascadeResource | null
  ): OpenCascadeResource | null {
    if (!faceCandidate) {
      return null;
    }

    const topoDsNamespace = this.asOpenCascadeRecord(openCascadeRecord['TopoDS']);

    if (topoDsNamespace) {
      const castFace = this.callOpenCascadeMethod(topoDsNamespace, ['Face'], [faceCandidate]) as
        | OpenCascadeResource
        | null;

      if (castFace) {
        return castFace;
      }
    }

    const faceConstructor = this.resolveOpenCascadeConstructor<OpenCascadeGenericConstructor>(
      openCascadeRecord,
      'TopoDS_Face'
    );

    if (faceConstructor) {
      return this.instantiateOpenCascadeResource(faceConstructor, [[faceCandidate]]);
    }

    return faceCandidate;
  }

  private readOpenCascadeTriangleIndices(
    triangle: OpenCascadeResource | null
  ): OpenCascadeTriangleIndices | null {
    const triangleRecord = this.asOpenCascadeRecord(triangle);

    if (!triangleRecord) {
      return null;
    }

    const first = this.readOpenCascadeNumber(triangleRecord, ['Value'], [1]);
    const second = this.readOpenCascadeNumber(triangleRecord, ['Value'], [2]);
    const third = this.readOpenCascadeNumber(triangleRecord, ['Value'], [3]);

    if (first !== null && second !== null && third !== null) {
      return { first, second, third };
    }

    const getResult = this.callOpenCascadeMethod(triangleRecord, ['Get'], []);

    if (Array.isArray(getResult) && getResult.length >= 3) {
      const [firstIndex, secondIndex, thirdIndex] = getResult;

      if (
        typeof firstIndex === 'number' &&
        typeof secondIndex === 'number' &&
        typeof thirdIndex === 'number'
      ) {
        return {
          first: firstIndex,
          second: secondIndex,
          third: thirdIndex
        };
      }
    }

    return null;
  }

  private resolveOpenCascadeFaceEnum(openCascadeRecord: Record<string, unknown>): number | null {
    const directValue = openCascadeRecord['TopAbs_FACE'];

    if (typeof directValue === 'number') {
      return directValue;
    }

    const shapeEnumRecord = this.asOpenCascadeRecord(openCascadeRecord['TopAbs_ShapeEnum']);
    const nestedValue = shapeEnumRecord?.['TopAbs_FACE'];

    if (typeof nestedValue === 'number') {
      return nestedValue;
    }

    return 4;
  }

  private isOpenCascadeFaceReversed(
    openCascadeRecord: Record<string, unknown>,
    face: OpenCascadeResource
  ): boolean {
    const orientation = this.callOpenCascadeMethod(
      this.asOpenCascadeRecord(face),
      ['Orientation'],
      []
    );

    if (typeof orientation !== 'number') {
      return false;
    }

    const directValue = openCascadeRecord['TopAbs_REVERSED'];

    if (typeof directValue === 'number') {
      return orientation === directValue;
    }

    const orientationRecord = this.asOpenCascadeRecord(openCascadeRecord['TopAbs_Orientation']);
    const nestedValue = orientationRecord?.['TopAbs_REVERSED'];

    if (typeof nestedValue === 'number') {
      return orientation === nestedValue;
    }

    return orientation === 1;
  }

  private updateOpenCascadeRenderStatus(
    openCascadeMeshCount: number,
    analyticalMeshCount: number
  ): void {
    if (!this.openCascade) {
      this.openCascadeStatus.set('OpenCascade: unavailable. Rendering analytical box geometry only.');
      return;
    }

    if (!this.openCascadeBoxConstructor) {
      this.openCascadeStatus.set(
        'OpenCascade: loaded, but box bindings were not found. Using analytical box geometry.'
      );
      return;
    }

    if (openCascadeMeshCount > 0 && analyticalMeshCount === 0) {
      const pluralSuffix = openCascadeMeshCount === 1 ? '' : 'es';

      this.openCascadeStatus.set(
        `OpenCascade: loaded. Rendering ${openCascadeMeshCount} computed mesh${pluralSuffix}.`
      );
      return;
    }

    if (openCascadeMeshCount > 0) {
      const computedPluralSuffix = openCascadeMeshCount === 1 ? '' : 'es';
      const fallbackPluralSuffix = analyticalMeshCount === 1 ? '' : 's';

      this.openCascadeStatus.set(
        `OpenCascade: loaded. Rendering ${openCascadeMeshCount} computed mesh${computedPluralSuffix}; ${analyticalMeshCount} stock solid${fallbackPluralSuffix} are using analytical box geometry.`
      );
      return;
    }

    this.openCascadeStatus.set(
      'OpenCascade: loaded, but triangulation bindings were unavailable. Using analytical box geometry.'
    );
  }

  private callOpenCascadeMethod(
    target: Record<string, unknown> | null,
    baseNames: readonly string[],
    args: readonly unknown[]
  ): unknown {
    if (!target) {
      return null;
    }

    for (const baseName of baseNames) {
      for (const methodName of this.getOpenCascadeCandidateNames(baseName)) {
        const candidate = target[methodName];

        if (typeof candidate === 'function') {
          try {
            return Reflect.apply(candidate, target, [...args]);
          } catch {
            continue;
          }
        }
      }
    }

    return null;
  }

  private readOpenCascadeNumber(
    target: Record<string, unknown> | null,
    baseNames: readonly string[],
    args: readonly unknown[] = []
  ): number | null {
    const value = this.callOpenCascadeMethod(target, baseNames, args);

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private readOpenCascadeBoolean(
    target: Record<string, unknown> | null,
    baseNames: readonly string[],
    args: readonly unknown[] = []
  ): boolean {
    return this.callOpenCascadeMethod(target, baseNames, args) === true;
  }

  private getOpenCascadeCandidateNames(baseName: string): string[] {
    const names = [baseName];

    for (let overloadIndex = 1; overloadIndex <= 9; overloadIndex += 1) {
      names.push(`${baseName}_${overloadIndex}`);
    }

    return names;
  }

  private asOpenCascadeRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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

  private getViewModeCameraPosition(center: Vector3, distance: number): Vector3 {
    if (this.viewMode() === '2d') {
      return center.clone().add(new Vector3(0, 0, distance));
    }

    return center.clone().add(new Vector3(1, 0.65, 1).normalize().multiplyScalar(distance));
  }

  private createGridHelper(size: number): GridHelper {
    const snappedSize = Math.max(1, Math.ceil(size / GRID_CELL_SIZE) * GRID_CELL_SIZE);
    const divisions = Math.max(4, Math.round(snappedSize / GRID_CELL_SIZE));
    const gridHelper = new GridHelper(snappedSize, divisions, '#94a3b8', '#cbd5e1');

    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = GRID_OFFSET;
    gridHelper.renderOrder = -1;

    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.5;
      });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.5;
    }

    return gridHelper;
  }

  private updateGridHelper(bounds?: Box3): void {
    if (!this.scene) {
      return;
    }

    let nextGridSize = 2;
    let nextGridCenter = new Vector3(0, 0, GRID_OFFSET);

    if (bounds && !bounds.isEmpty()) {
      nextGridSize = Math.max(bounds.getSize(new Vector3()).x, bounds.getSize(new Vector3()).y) + GRID_PADDING * 2;
      nextGridCenter = bounds.getCenter(new Vector3());
    }

    const nextGridHelper = this.createGridHelper(nextGridSize);

    nextGridHelper.position.set(nextGridCenter.x, nextGridCenter.y, GRID_OFFSET);

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.disposeGridHelper(this.gridHelper);
    }

    this.gridHelper = nextGridHelper;
    this.scene.add(nextGridHelper);
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
    this.renderer.setAnimationLoop(() => {
      const camera = this.getActiveCamera();

      if (!camera) {
        return;
      }

      this.controls?.update();
      this.renderer?.render(this.scene!, camera);
    });
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

  private disposeOpenCascadeResource(resource: OpenCascadeResource | null): void {
    try {
      resource?.delete?.();
    } catch {
      // Ignore cleanup failures from optional OpenCascade bindings.
    }
  }
}

