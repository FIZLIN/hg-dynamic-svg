import { Component, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { interval } from "rxjs";

import { backgroundSvg } from './background-svg';


const ns = 'http://www.w3.org/2000/svg';

const utils = {
  round_to_precision: (x, precision) => {
    const y = +x + (precision === undefined ? 0.5 : precision/2);
    return y - (y % (precision === undefined ? 1 : +precision));
  }
}

const subsystems = [
  {id: 1, name: 'Eltek Flatpack'},
  {id: 2, name: 'BYD BMU'},
];

const devices = [
  {id: 1, subsystem: 1, type: 1, name: 'smartpack_s_1'},
  {id: 2, subsystem: 1, type: 1, name: 'smartpack_s_2'},
  {id: 3, subsystem: 2, type: 2, name: 'byd_bmu_1'},
];

const fields = [
  {id: 1, type: 1, name: 'batt_a'},
  {id: 2, type: 1, name: 'batt_v'},
  {id: 3, type: 1, name: 'load_a'},
  {id: 4, type: 1, name: 'load_v'},
  {id: 5, type: 2, name: 'bms_charge_a'},
  {id: 6, type: 2, name: 'bms_discharge_a'},
  {id: 7, type: 2, name: 'bms_soh'},
  {id: 8, type: 2, name: 'bms_soc'},
]

const data = {
  1: {
    1: {
      1: 54,
      2: -3,
      3: 15,
      4: -30
    },
    2: {
      1: 234,
      2: 123,
      3: 155,
      4: -43
    }
  },
  2: {
    3: {
      5: 20,
      6: -20,
      7: 98,
      8: 93
    }
  }
};

enum ElementType {
  RECTANGLE = "rect",
  CIRCLE = "circle"
}
enum Direction {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down"
}
enum Arrow {
  left = "⇦",
  right = "⇨",
  up = "⇧",
  down = "⇩"
}

interface IElement {
  type: ElementType;
  source: {
    subsystem: number;
    device: number;
    field: number;
    unit?: string;
  };
  position: {
    x?: number;
    y?: number;

    width?: number;
    height?: number;

    radius?: number;
  };
  style?: {
    fill?: string;
    textColor?: string;
  };
  hasDirection: boolean;
  directionData: {
    positiveDirection: Direction,
    negativeDirection: Direction
  }
}

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements AfterViewInit {
  @ViewChild("svg", { static: false }) svg: ElementRef;

  svgWidth = 400;
  svgHeight = 255;
  backgroundSvg = backgroundSvg;

  backgroundSvgInnerHtml = '';

  ElementType = ElementType;
  Direction = Direction;
  Arrow = Arrow;

  elements: IElement[];
  data = data;

  subsystems = subsystems;
  devices = devices;
  fields = fields;

  isEditing = true; // false;
  shouldDrag = false;
  isDragging = false;
  isResizing = false;

  selectedElementIdx: number;
  selectedElementData: IElement;

  selectedElement: any;
  transform: any;

  textElement: any;
  textTransform: any;

  gridCellSize = 1;

  offset: any;

  constructor(private domSanitaizer: DomSanitizer) {
    this.loadElements();
  }

  ngAfterViewInit() {
    this.fillBackgroundSvg();
  }

  loadElements() {
    this.elements = [
      {
        type: ElementType.RECTANGLE,
        source: { subsystem: 1, device: 1, field: 1, unit: "A" },
        position: {
          x: 105,
          y: 50,
          height: 10,
          width: 20
        },
        style: { fill: "#ffffff", textColor: '#000000' },
        hasDirection: true,
        directionData:{ positiveDirection: Direction.LEFT, negativeDirection: Direction.RIGHT }
      },
      {
        type: ElementType.RECTANGLE,
        source: { subsystem: 1, device: 1, field: 3, unit: "V" },
        position: {
          x: 135,
          y: 50,
          height: 10,
          width: 20
        },
        style: { fill: "#ffffff", textColor: "#000000" },
        hasDirection: false,
        directionData: {
          positiveDirection: null,
          negativeDirection: null
        }
      },
      {
        type: ElementType.RECTANGLE,
        source: { subsystem: 1, device: 1, field: 2, unit: "A" },
        position: {
          x: 105,
          y: 100,
          height: 10,
          width: 20
        },
        style: { fill: "#ffffff", textColor: "#b94a3b" },
        hasDirection: false,
        directionData: {
          positiveDirection: null,
          negativeDirection: null
        }
      },
      {
        type: ElementType.RECTANGLE,
        source: { subsystem: 1, device: 1, field: 4, unit: "V" },
        position: {
          x: 135,
          y: 100,
          height: 10,
          width: 20
        },
        style: { fill: "#ffffff", textColor: "#b94a3b" },
        hasDirection: false,
        directionData: {
          positiveDirection: null,
          negativeDirection: null
        }
      },
      {
        type: ElementType.CIRCLE,
        source: { subsystem: 2, device: 3, field: 5 },
        position: {
          x: 115,
          y: 80,
          radius: 10
        },
        style: { fill: "#2eb1b2", textColor: "#ffffff" },
        hasDirection: false,
        directionData: {
          positiveDirection: null,
          negativeDirection: null
        }
      }
    ];

    interval(1000).subscribe(() => {
      this.data[1][1][1] += 1;
      this.data[1][1][2] -= 1;
    });
  }

  getMousePosition(evt) {
    const CTM = this.svg.nativeElement.getScreenCTM();
    if (evt.touches) {
      evt = evt.touches[0];
    }
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d
    };
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    this.reset();
  }

  selectElement(evt) {
    if (
      (!evt.target.classList.contains("draggable") && !this.selectedElementIdx) ||
      !this.isEditing
    ) {
      this.transform = null;
      return;
    }

    if (!evt.target.classList.contains("draggable")) {
      this.reset();
      this.elements[this.selectedElementIdx] = { ...this.elements[this.selectedElementIdx], ...this.selectedElementData };
      this.transform = null;
      return;
    }

    const draggingText = evt.target.localName === 'text';
    const selectedElement = draggingText ? evt.target.parentElement.children[0] : evt.target;
    const selectedElementIdx = selectedElement.getAttribute('elIdx');

    this.shouldDrag = true;
    if (selectedElementIdx === this.selectedElementIdx) { return; }

    this.selectedElementIdx = selectedElementIdx;
    this.selectedElement = selectedElement;

    this.textElement = draggingText ? evt.target : evt.target.parentElement.children[1];

    this.selectedElementData = this.elements[this.selectedElementIdx];
  }

  startDrag(evt) {
    if (!evt.target.classList.contains("draggable") || !this.isEditing) { return; }

    this.offset = this.getMousePosition(evt);
    this.isDragging = true;

    const transforms = this.selectedElement.transform.baseVal;
    if (
      transforms.length === 0 ||
      transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
    ) {
      const translate = this.svg.nativeElement.createSVGTransform();
      translate.setTranslate(0, 0);
      this.selectedElement.transform.baseVal.insertItemBefore(translate, 0);
    }
    this.transform = transforms.getItem(0);

    const textTransforms = this.textElement.transform.baseVal;
    if (
      textTransforms.length === 0 ||
      textTransforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE
    ) {
      const translate = this.svg.nativeElement.createSVGTransform();
      translate.setTranslate(0, 0);
      this.textElement.transform.baseVal.insertItemBefore(translate, 0);
    }
    this.textTransform = textTransforms.getItem(0);

    this.offset.x -= this.transform.matrix.e;
    this.offset.y -= this.transform.matrix.f;

    this.drag(evt);
  }

  drag(evt) {
    if (!this.shouldDrag || !this.selectedElement) { return; }
    evt.preventDefault();

    if (!this.isDragging) {
      this.startDrag(evt);
      return;
    }

    const origX = this.selectedElementData.position.x;
    const origY = this.selectedElementData.position.y;
    
    const currX = this.getCurrentElementX();
    const currY = this.getCurrentElementY();


    const coord = this.getMousePosition(evt);
    const dx = utils.round_to_precision(coord.x - this.offset.x, this.gridCellSize);
    const dy = utils.round_to_precision(coord.y - this.offset.y, this.gridCellSize);

    if (evt.target.classList.contains("resizeHandle") || this.isResizing) {
      this.isResizing = true;

      const minSize = this.selectedElementData.type === ElementType.CIRCLE
       ? this.gridCellSize : this.gridCellSize * 2;

      const newWidthRaw = utils.round_to_precision(coord.x, this.gridCellSize) - currX;
      const newHeightRaw = utils.round_to_precision(coord.y, this.gridCellSize) - currY;
      const newWidth  = newWidthRaw  < minSize ? minSize : newWidthRaw;
      const newHeight = newHeightRaw < minSize ? minSize : newHeightRaw;

      if (this.selectedElementData.type === ElementType.CIRCLE) {
        this.selectedElementData.position.radius = newWidth
        return;
      }
      this.selectedElementData.position.width = newWidth;
      this.selectedElementData.position.height = newHeight;
      return;
    }

    // this.transform.setTranslate(origX - dx >= 0 ? dx : -1 * origX, origY - dy >= 0 ? dy : -1 * origY);
    // this.textTransform.setTranslate(origX - dx >= 0 ? dx : -1 * origX, origY - dy >= 0 ? dy : -1 * origY);
    this.transform.setTranslate(dx, dy);
    this.textTransform.setTranslate(dx, dy);
  }

  endDrag() {
    this.isDragging = false;
    this.isResizing = false;
    this.shouldDrag = false;
  }

  getValue(element: IElement, idx: number) {
    const currEl = idx === this.selectedElementIdx ? this.selectedElementData : element;

    const { subsystem, device, field } = currEl.source;
    
    if (!this.data[subsystem] || !this.data[subsystem][device] || !this.data[subsystem][device][field]) {
      return "---";
    }

    let value = this.data[subsystem][device][field];
    if (currEl.hasDirection) { value = Math.abs(value); }
    return `${value}${currEl.source.unit ? ` ${currEl.source.unit}` : ""}`;
  }

  getArrowData(element: IElement, idx) {
    const currEl = idx === this.selectedElementIdx ? this.selectedElementData : element;

    const { subsystem, device, field } = currEl.source;

    if (!currEl.hasDirection || !this.data[subsystem] || !this.data[subsystem][device] || !this.data[subsystem][device][field]) {
      return '';
    }

    let value = this.data[subsystem][device][field];

    const isPositive = value >= 0;
    const currDirection = currEl.directionData[`${isPositive ? 'positive' : 'negative'}Direction`];
    if (!currDirection) { return ''; }
    return Arrow[currDirection];
  }

  calcTextX(element: IElement) {
    if (element.type === ElementType.CIRCLE) {
      return element.position.x;
    }
    const { x, width } = element.position;
    return x + (width || 10) * 0.5;
  }
  calcTextY(element: IElement) {
    if (element.type === ElementType.CIRCLE) {
      return element.position.y;
    }
    const { y, height } = element.position;
    return y + (height || 10) * 0.5;
  }

  getCurrentElementX() {
    if (!this.selectedElementData) { return; }


    const elX = this.selectedElementData.position.x;
    const res = !this.transform
      ? elX
      : Math.round(elX + this.transform.matrix.e);
    // console.log(elX, !!this.transform, !!this.transform ? this.transform.matrix.e:null);
    return res;
  }
  getCurrentElementY() {
    if (!this.selectedElementData) { return; }
    const elY = this.selectedElementData.position.y;
    const res = !this.transform
      ? elY
      : Math.round(elY + this.transform.matrix.f);
    return res;
  }

  handleTypeChange(evt) {
    const newType: ElementType = evt.target.value;
    if (newType === ElementType.RECTANGLE) {
      this.selectedElementData.position.radius = null;
      this.selectedElementData.position.width = 10;
      this.selectedElementData.position.height = 10;
      return;
    }
    if (newType === ElementType.CIRCLE) {
      this.selectedElementData.position.radius = 10;
      this.selectedElementData.position.width = null;
      this.selectedElementData.position.height = null;
      return;
    }
  }

  reset() {
    this.shouldDrag = false;
    this.isDragging = false;
    this.transform = null;
    this.selectedElementIdx = null;
    this.selectedElementData = null;
  }

  newNode() {
    const size = this.gridCellSize * 10;
    this.elements.push({
      type: ElementType.RECTANGLE,
      source: { subsystem: null, device: null, field: null, unit: null },
      position: {
        x: size, y: size,
        width: size*2, height: size*2
      },
      style: { fill: "#f24f5e", textColor: '#ffffff' },
      hasDirection: false,
      directionData: {
        positiveDirection: null,
        negativeDirection: null
      }
    })
  }

  deleteSelectedNode() {
    this.elements.splice(this.selectedElementIdx, 1);
    this.reset();
  }

  onFileChange(evt) {
    const file = evt.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (evt) => {
      const content = evt.target.result.toString();

      const endOfOpeningTag = content.indexOf('>')+1;
      const startOfClosingTag = content.length - 6;


      const svgTag = content.slice(0, endOfOpeningTag);
      const svgContent = content.substr(endOfOpeningTag, startOfClosingTag);
      const svgClosingTag = content.substr(startOfClosingTag);

      const [, width, height] = svgTag.match(/viewBox="\d+,\s?\d+,\s?(\d+),\s?(\d+)"/) || [];

      this.svgWidth = +width;
      this.svgHeight = +height;
      this.backgroundSvg = svgContent;

      this.fillBackgroundSvg();
    }
    reader.onerror = (evt) => alert('error reading file')
  }

  fillBackgroundSvg() {
    this.backgroundSvgInnerHtml = this.domSanitaizer.bypassSecurityTrustHtml(this.backgroundSvg) as string;
  }

  onDirectionChange(evt) {
    const newPositiveDirection = evt.target.value;

    switch(newPositiveDirection) {
      case Direction.LEFT: this.selectedElementData.directionData.negativeDirection = Direction.RIGHT; break;
      case Direction.RIGHT: this.selectedElementData.directionData.negativeDirection = Direction.LEFT; break;
      case Direction.DOWN: this.selectedElementData.directionData.negativeDirection = Direction.UP; break;
      case Direction.UP: this.selectedElementData.directionData.negativeDirection = Direction.DOWN; break;
    }
  }

  getDevicesForSubsystem() {
    if (!this.selectedElementData.source.subsystem) { return []; }
    return this.devices.filter(({ subsystem }) => subsystem === this.selectedElementData.source.subsystem);
  }
  getFieldsForDevice() {
    if (!this.selectedElementData.source.device) { return []; }
    const device = this.devices.find(({ id }) => id === this.selectedElementData.source.device);
    return this.fields.filter(({ type }) => type === device.type);
  }
}
