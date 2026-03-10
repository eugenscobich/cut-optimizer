import { Component, signal, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DockviewAngularModule } from 'dockview-angular';
import { DockviewReadyEvent, DockviewPanelApi } from 'dockview-core';

// Default panel component
@Component({
  selector: 'default-panel',
  template: `<div>{{ title || 'Default Panel' }}</div>`
})
export class DefaultPanelComponent {
  @Input() api: any;

  get title() {
    return this.api?.title || this.api?.id || 'Panel';
  }

  constructor() {}
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DockviewAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('cut-optimizer');
  protected readonly components: Record<string, any> = {};

  constructor() {
    this.components = {
      default: DefaultPanelComponent,
    };
  }

  onReady(event: DockviewReadyEvent) {
    event.api.addPanel({
      id: 'panel_1',
      component: 'default',
    });
  }
}
