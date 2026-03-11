import { Component } from '@angular/core';
import { SplitAreaComponent, SplitComponent } from 'angular-split';
import { AppMenubarComponent } from './menubar/app-menubar';

@Component({
  selector: 'app-root',
  imports: [AppMenubarComponent, SplitAreaComponent, SplitComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
