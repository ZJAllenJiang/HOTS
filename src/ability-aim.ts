import {Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry} from 'three';
import type {CastAim, State, Unit} from './contracts';
import {PROJECTILE_RULES} from './projectiles';
import {ABILITIES, areaRadius, castTarget, isProjectileCast} from './sim';

const ready = new Color(0x87ecff);
const blocked = new Color(0xff776f);

export class AbilityAim {
  readonly root = new Group();
  private readonly ringGeometry = new RingGeometry(.985, 1, 64);
  private readonly markGeometry = new RingGeometry(.66, 1, 24);
  private readonly plane = new PlaneGeometry();
  private readonly rim = new MeshBasicMaterial({color:ready, transparent:true, opacity:.62, depthWrite:false, side:DoubleSide});
  private readonly fill = new MeshBasicMaterial({color:ready, transparent:true, opacity:.12, depthWrite:false, side:DoubleSide});
  private readonly range = new Mesh(this.ringGeometry,this.rim);
  private readonly area = new Mesh(this.ringGeometry,this.rim);
  private readonly mark = new Mesh(this.markGeometry,this.rim);
  private readonly corridor = new Group();
  private readonly left = new Mesh(this.plane,this.rim);
  private readonly right = new Mesh(this.plane,this.rim);
  private readonly band = new Mesh(this.plane,this.fill);

  constructor(){
    this.root.visible=false;
    this.root.add(this.range,this.area,this.mark,this.corridor);
    this.corridor.add(this.left,this.right,this.band);
    for(const mesh of [this.range,this.area,this.mark,this.left,this.right,this.band])mesh.rotation.x=-Math.PI/2;
  }

  update(state:State,player:Unit|undefined,aim:CastAim|undefined){
    this.root.visible=!!player?.alive&&!!aim;
    if(!player?.alive||!aim)return;
    const {key,x,z}=aim;
    const ability=ABILITIES[player.hero][key];
    const target=castTarget(state,player,key,x,z);
    this.rim.color.copy(target?ready:blocked);
    this.fill.color.copy(this.rim.color);
    this.range.position.set(player.x,.16,player.z);
    this.range.scale.set(ability.range,ability.range,1);

    const tx=target?.x??x,tz=target?.z??z;
    const radius=areaRadius(player.hero,key);
    this.area.visible=!!target&&radius>0;
    this.area.position.set(tx,.172,tz);
    this.area.scale.set(radius,radius,1);
    this.mark.position.set(tx,.187,tz);
    this.mark.scale.set(.24,.24,1);

    this.corridor.visible=!!target&&isProjectileCast(player.hero,key);
    if(!this.corridor.visible)return;
    const width=PROJECTILE_RULES.hitRadius;
    this.corridor.position.set(player.x,.165,player.z);
    this.corridor.rotation.y=Math.atan2(tx-player.x,tz-player.z);
    this.left.position.set(-width,0,ability.range/2);
    this.right.position.set(width,0,ability.range/2);
    this.band.position.set(0,-.002,ability.range/2);
    this.left.scale.set(.055,ability.range,1);
    this.right.scale.copy(this.left.scale);
    this.band.scale.set(width*2,ability.range,1);
  }

  dispose(){
    this.root.removeFromParent();
    this.ringGeometry.dispose();
    this.markGeometry.dispose();
    this.plane.dispose();
    this.rim.dispose();
    this.fill.dispose();
  }
}
