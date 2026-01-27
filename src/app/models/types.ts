import {Move} from '../service/logique';

export type ColorHex = string;
export const WILDCARD = '?' as const;  // wildcard spécial

export interface Tube {
  capacity: number;
  layers: (ColorHex | typeof WILDCARD)[];
}

export interface PuzzleState {
  tubes: Tube[];
}

export interface PuzzleHistory {
  states: PuzzleState[];     // état 0 = initial, état 1 = après move 0, etc.
  moves: Move[];             // move 0 = states[0] → states[1], etc.
  currentStep: number;       // index de l'état courant affiché
}
