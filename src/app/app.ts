import { Component } from '@angular/core';
import { SplitAreaComponent, SplitComponent } from 'angular-split';
import { AppMenubarComponent } from './menubar/app-menubar';
import { PartsManagementComponent } from './parts/parts-management';
import { StocksManagementComponent } from './stocks/stocks-management';
import { ViewportComponent } from './viewport/viewport';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AppMenubarComponent,
    PartsManagementComponent,
    StocksManagementComponent,
    ViewportComponent,
    SplitAreaComponent,
    SplitComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
