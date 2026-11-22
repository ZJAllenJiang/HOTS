import {Vector3, type Camera} from 'three';
import type {DamageEvent} from './contracts';

export const DAMAGE_NUMBER_LIFE = .8;
const MAX_LABELS = 28;

interface Label {
  event: DamageEvent;
  node: HTMLElement;
  age: number;
  lane: number;
}

export class DamageNumbers {
  private readonly labels = new Map<number, Label>();
  private readonly layer: HTMLDivElement;
  private readonly point = new Vector3();

  constructor(container: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.className = 'damage-numbers';
    this.layer.setAttribute('aria-hidden', 'true');
    container.appendChild(this.layer);
  }

  update(events: readonly DamageEvent[], time: number, dt: number, camera: Camera, width: number, height: number) {
    const visibleIds = new Set<number>();
    for (const event of events.slice(-MAX_LABELS)) {
      visibleIds.add(event.id);
      let label = this.labels.get(event.id);
      if (!label) {
        const node = document.createElement('span');
        node.className = `damage-number ${event.incoming ? 'incoming' : event.ability ? 'ability' : 'basic'}`;
        node.textContent = String(Math.max(1, Math.round(event.amount)));
        this.layer.appendChild(node);
        const lane = (event.id % 3 - 1) * 13;
        label = {event, node, age: Math.max(0, time - event.time), lane};
        this.labels.set(event.id, label);
      } else {
        label.age = Math.max(label.age + dt, time - event.time);
      }
      const progress = Math.min(1, label.age / DAMAGE_NUMBER_LIFE);
      const rise = 1 - (1 - progress) ** 2;
      this.point.set(label.event.x, label.event.y, label.event.z).project(camera);
      const {x, y, z} = this.point;
      label.node.hidden = z < -1 || z > 1 || Math.abs(x) > 1.1 || Math.abs(y) > 1.1 || progress >= 1;
      if (label.node.hidden) continue;
      const sx = (x + 1) * width / 2 + label.lane * rise;
      const sy = (1 - y) * height / 2 - 36 * rise;
      label.node.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
      label.node.style.opacity = String(Math.min(1, (1 - progress) * 3));
    }
    for (const [id, label] of this.labels) {
      if (visibleIds.has(id)) continue;
      label.node.remove();
      this.labels.delete(id);
    }
  }

  clear() {
    this.labels.clear();
    this.layer.replaceChildren();
  }

  dispose() {
    this.clear();
    this.layer.remove();
  }
}
