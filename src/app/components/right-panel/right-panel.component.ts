import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Solution, CutLine } from '@models/index';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss']
})
export class RightPanelComponent implements OnInit {
  solutions: Solution[] = [];
  selectedSolution: Solution | null = null;
  selectedCut: CutLine | null = null;
  isOptimizing = false;

  constructor() {}

  ngOnInit(): void {
    console.log('Right panel initialized');
  }

  startOptimization(): void {
    this.isOptimizing = true;
    console.log('Starting optimization...');
    // Optimization logic will be triggered here
  }

  stopOptimization(): void {
    this.isOptimizing = false;
    console.log('Optimization stopped');
  }

  selectSolution(solution: Solution): void {
    this.selectedSolution = solution;
    console.log('Solution selected:', solution.id);
  }

  selectCut(cut: CutLine): void {
    this.selectedCut = cut;
    console.log('Cut selected:', cut);
  }
}

