import { Component, Type, signal, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DockviewAngularModule } from 'dockview-angular';

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
  imports: [DockviewAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('cut-optimizer');
  components: Record<string, any> = {};

  constructor() {
    this.components = {
      default: DefaultPanelComponent,
    };
  }

  onReady(event: any) {
    event.api.addPanel({
      id: 'panel_1',
      component: 'default',
    });
  }
}
