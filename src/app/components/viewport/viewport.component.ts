import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.scss']
})
export class ViewportComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor() {}

  ngOnInit(): void {
    // Initialize Three.js scene will be done here
    console.log('Viewport component initialized');
  }

  ngAfterViewInit(): void {
    // Initialize 3D visualization after view is initialized
    this.initializeScene();
  }

  private initializeScene(): void {
    // Three.js scene initialization will be implemented here
    console.log('Scene initialized');
  }
}

