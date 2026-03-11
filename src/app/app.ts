import { Component } from '@angular/core';
import { SplitAreaComponent, SplitComponent } from 'angular-split';
import { AppMenubarComponent } from './menubar/app-menubar';
import { PartsManagementComponent } from './parts/parts-management';
import { StocksManagementComponent } from './stocks/stocks-management';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppMenubarComponent,
    PartsManagementComponent,
    StocksManagementComponent,
    SplitAreaComponent,
    SplitComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
