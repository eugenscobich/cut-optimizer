import { Component } from '@angular/core';
import { SplitAreaComponent, SplitComponent } from 'angular-split';
import { AppMenubarComponent } from './menubar/app-menubar';
import { PartsManagementComponent } from './parts/parts-management';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppMenubarComponent, PartsManagementComponent, SplitAreaComponent, SplitComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
