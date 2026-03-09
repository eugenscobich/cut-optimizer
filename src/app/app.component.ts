import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockviewComponent } from 'dockview';
import { LeftPanelComponent } from '@components/left-panel/left-panel.component';
import { ViewportComponent } from '@components/viewport/viewport.component';
import { RightPanelComponent } from '@components/right-panel/right-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DockviewComponent,
    LeftPanelComponent,
    ViewportComponent,
    RightPanelComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Cut Optimizer';

  ngOnInit(): void {
    console.log('Cut Optimizer Application initialized');
  }
}

