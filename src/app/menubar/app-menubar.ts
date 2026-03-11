import { Component, signal, viewChild } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { MenuBar, Menu, MenuContent, MenuItem } from '@angular/aria/menu';

@Component({
  selector: 'app-menubar',
  standalone: true,
  imports: [MenuBar, Menu, MenuContent, MenuItem, OverlayModule],
  templateUrl: './app-menubar.html',
  styleUrl: './app-menubar.css'
})
export class AppMenubarComponent {
  fileMenu = viewChild<Menu<string>>('fileMenu');
  shareMenu = viewChild<Menu<string>>('shareMenu');
  editMenu = viewChild<Menu<string>>('editMenu');
  viewMenu = viewChild<Menu<string>>('viewMenu');
  insertMenu = viewChild<Menu<string>>('insertMenu');
  imageMenu = viewChild<Menu<string>>('imageMenu');
  chartMenu = viewChild<Menu<string>>('chartMenu');
  formatMenu = viewChild<Menu<string>>('formatMenu');
  textMenu = viewChild<Menu<string>>('textMenu');
  sizeMenu = viewChild<Menu<string>>('sizeMenu');
  paragraphMenu = viewChild<Menu<string>>('paragraphMenu');
  alignMenu = viewChild<Menu<string>>('alignMenu');

  rendered = signal(false);

  onFocusIn() {
    this.rendered.set(true);
  }
}

