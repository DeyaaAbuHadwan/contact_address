import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-map',
  styleUrl: './map.component.css',
  templateUrl: './map.component.html',
})
export class MapComponent {
  location = input<String>();
}
