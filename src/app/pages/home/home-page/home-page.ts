import {ViewChild, ChangeDetectorRef, Component, ElementRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Move, solvePuzzle, generateAllPossibilities, cloneState, pourOnce} from '../../../service/logique';
import {PuzzleHistory, WILDCARD} from '../../../models/types';

type ColorHex = string;

interface Tube {
  capacity: number;
  layers: ColorHex[];
}

interface PuzzleState {
  tubes: Tube[];
}

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  @ViewChild('progressSection') progressSection!: ElementRef;

  constructor(private cdr: ChangeDetectorRef) {}
  tubeCapacity = 4;
  availableColors: ColorHex[] = ['#cfcecd', '#28cf99', '#edc740'];
  newColorHex = '#FFFF00';
  //Pour l'édition des layers
  highlightedLayer: { tubeIndex: number; layerIndex: number } | null = null;


  puzzle: PuzzleState = { tubes: [] };
  selectedTubeIndex: number | null = null;

  solutions: {
    possibility: PuzzleState;
    moves: Move[];
    history: PuzzleHistory;
  }[] = [];

  searchingSolutions = false;
  stopSearching = false;
  testedPossibilities = 0;
  totalPossibilities = 0;

  selectedSolutionTab = 0;

  //Partie historique des étapes de résolution
  history: PuzzleHistory | null = null;
  currentPreviewStep = 0;

  ngOnInit() {
    // départ avec quelques tubes vides
    this.puzzle.tubes = [
      { capacity: this.tubeCapacity, layers: [] },
      { capacity: this.tubeCapacity, layers: [] },
    ];
  }

  // ----- gestion des couleurs -----
  addAvailableColor() {
    const input = this.newColorHex.trim();
    if (!input) return;

    // Support multiple couleurs séparées par ;
    const colors = input.split(';').map(c => c.trim()).filter(c => c);

    for (const hex of colors) {
      const isHex = /^#([0-9A-Fa-f]{6})$/i.test(hex);
      if (!isHex) {
        alert(`Invalid color : "${hex}" (format #RRGGBB)`);
        return;
      }
      if (!this.availableColors.includes(hex.toUpperCase())) {
        this.availableColors.push(hex.toUpperCase());
      }
    }

    this.newColorHex = '';  // vide le champ
  }

  removeAvailableColor(index: number) {
    this.availableColors.splice(index, 1);
  }

  countColorUsage(color: ColorHex): number {
    let count = 0;
    this.puzzle.tubes.forEach(tube => {
      tube.layers.forEach(layer => {
        if (layer === color) count++;
      });
    });
    return count;
  }

  // ----- gestion des tubes -----
  addTube() {
    this.puzzle.tubes.push({
      capacity: this.tubeCapacity,
      layers: []
    });
  }

  clearTube(index: number) {
    this.puzzle.tubes[index].layers = [];
  }

  removeTube(index: number) {
    this.puzzle.tubes.splice(index, 1);
  }

  replaceHighlightedLayer(color: ColorHex | '?') {
    if (!this.highlightedLayer) return;

    const { tubeIndex, layerIndex } = this.highlightedLayer;
    this.puzzle.tubes[tubeIndex].layers[layerIndex] = color;

    this.highlightedLayer = null;  // auto-désélectionne
  }

// app.component.ts
  validatePuzzleSetup(): { valid: boolean; error?: string } {
    const colorCounts = new Map<ColorHex | '?', number>();
    let wildcardCount = 0;

    // Compte l'utilisation de chaque couleur
    this.puzzle.tubes.forEach(tube => {
      tube.layers.forEach(layer => {
        if (layer === '?') {
          wildcardCount++;
        } else {
          colorCounts.set(layer, (colorCounts.get(layer) || 0) + 1);
        }
      });
    });

    // Vérifie que chaque couleur (non-wildcard) est utilisée 0 à tubeCapacity fois
    for (const [color, count] of colorCounts.entries()) {
      if (count > this.tubeCapacity) {
        return {
          valid: false,
          error: `Invalid puzzle pattern: Color "${color}" is used ${count} times but maximum is ${this.tubeCapacity} times.`
        };
      }

      // Si une couleur est utilisée moins de tubeCapacity fois,
      // il faut des wildcards pour compenser
      const missingLayers = this.tubeCapacity - count;
      if (missingLayers > 0) {
        // Récupère les wildcards restants après allocation
        if (wildcardCount < missingLayers) {
          return {
            valid: false,
            error: `Invalid puzzle pattern: Color "${color}" is used ${count} times but needs ${this.tubeCapacity}. You need ${missingLayers} wildcards to compensate, but only have ${wildcardCount} available.`
          };
        }
        wildcardCount -= missingLayers;
      }
    }

    return { valid: true };
  }


  async solveAllSolutions() {
    const validation = this.validatePuzzleSetup();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    this.searchingSolutions = true;
    this.stopSearching = false;
    this.solutions = [];
    this.testedPossibilities = 0;

    setTimeout(() => {
      this.progressSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    const possibilities = generateAllPossibilities(this.puzzle, this.availableColors);
    this.totalPossibilities = possibilities.length;

    for (let i = 0; i < possibilities.length; i++) {
      if (this.stopSearching) {
        // ✅ Ajoute detectChanges() avant de sortir
        this.cdr.detectChanges();
        alert(`Search stopped. ${this.solutions.length} solutions found so far.`);
        break;
      }

      this.testedPossibilities = i + 1;

      const moves = solvePuzzle(possibilities[i]);
      if (moves && moves.length > 0) {
        const states: PuzzleState[] = [cloneState(possibilities[i])];
        let currentState = cloneState(possibilities[i]);

        for (const move of moves) {
          const nextState = pourOnce(currentState, move.from, move.to)!;
          states.push(nextState);
          currentState = nextState;
        }

        this.solutions.push({
          possibility: possibilities[i],
          moves,
          history: { states, moves, currentStep: 0 }
        });
      }

      this.cdr.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.searchingSolutions = false;
    this.stopSearching = false;
    this.cdr.detectChanges();

    if (this.solutions.length === 0) {
      alert('No solution found.');
    } else {
      alert(`${this.solutions.length} solutions found!`);
    }
  }


  stopSearch() {
    this.stopSearching = true;
  }



  prevPreviewStep(tabIndex: number) {
    if (this.currentPreviewStep === 0) return;
    this.currentPreviewStep--;
  }

  nextPreviewStep(tabIndex: number) {
    const maxStep = this.solutions[tabIndex].history.states.length - 1;
    if (this.currentPreviewStep === maxStep) return;
    this.currentPreviewStep++;
  }

  onTubeSelectForEdit(index: number) {
    if (this.selectedTubeIndex === index) {
      this.selectedTubeIndex = null;  // toggle
    } else {
      this.selectedTubeIndex = index;
    }
  }

  toggleLayerHighlight(tubeIdx: number, layerIdx: number) {
    if (this.highlightedLayer?.tubeIndex === tubeIdx &&
      this.highlightedLayer?.layerIndex === layerIdx) {
      // Déjà sélectionné → désélectionne
      this.highlightedLayer = null;
    } else {
      // Sélectionne
      this.highlightedLayer = { tubeIndex: tubeIdx, layerIndex: layerIdx };
    }
  }

  addLayerToSelectedTube(color: ColorHex) {
    if (this.selectedTubeIndex === null) return;

    const tube = this.puzzle.tubes[this.selectedTubeIndex];
    if (tube.layers.length >= tube.capacity) {
      alert('Flask is full!');
      return;
    }
    tube.layers.push(color);
    console.log(tube.layers);
  }

  addWildcardToSelectedTube() {
    if (this.selectedTubeIndex === null) return;
    const tube = this.puzzle.tubes[this.selectedTubeIndex];
    if (tube.layers.length >= tube.capacity) {
      alert('Flask is full!');
      return;
    }
    tube.layers.push(WILDCARD);
    console.log(tube.layers);
  }

  exportConfig() {
    const config = {
      tubeCapacity: this.tubeCapacity,
      availableColors: this.availableColors,
      tubes: this.puzzle.tubes.map(tube => ({
        capacity: tube.capacity,
        layers: tube.layers
      }))
    };

    const json = JSON.stringify(config, null, 2);

    navigator.clipboard.writeText(json).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      // fallback si clipboard API non supporté
      const textarea = document.createElement('textarea');
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Copied to clipboard!');
    });
  }

  importConfig() {
    const jsonStr = prompt('Paste your JSON:');
    if (!jsonStr) return;

    try {
      const config = JSON.parse(jsonStr);

      // Validation
      if (!config.tubeCapacity || !Array.isArray(config.availableColors) || !Array.isArray(config.tubes)) {
        throw new Error('Invalid JSON, try again.');
      }

      // Import
      this.tubeCapacity = config.tubeCapacity;
      this.availableColors = config.availableColors;
      this.puzzle.tubes = config.tubes.map((t: any) => ({
        capacity: t.capacity,
        layers: t.layers
      }));

      // Reset solutions
      this.history = null;
      this.solutions = [];

      alert('Successfully imported!');
    } catch (error) {
      alert('JSON error: ' + (error as Error).message);
    }
  }
}
