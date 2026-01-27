import {ColorHex, PuzzleState, Tube, WILDCARD} from '../models/types';

export function cloneState(state: PuzzleState): PuzzleState {
  return {
    tubes: state.tubes.map(t => ({
      capacity: t.capacity,
      layers: [...t.layers],
    })),
  };
}

export function canPour(from: Tube, to: Tube): boolean {
  if (from.layers.length === 0) return false;
  if (to.layers.length === to.capacity) return false;

  const fromTop = from.layers[from.layers.length - 1];
  const toTop = to.layers[to.layers.length - 1];

  if (to.layers.length === 0) return true;
  return fromTop === toTop;
}

export function pourOnce(state: PuzzleState, fromIdx: number, toIdx: number): PuzzleState | null {
  if (fromIdx === toIdx) return null;

  const newState = cloneState(state);
  const from = newState.tubes[fromIdx];
  const to = newState.tubes[toIdx];

  if (!canPour(from, to)) return null;

  const fromTop = from.layers[from.layers.length - 1];

  let count = 0;
  for (let i = from.layers.length - 1; i >= 0; i--) {
    if (from.layers[i] === fromTop) count++;
    else break;
  }

  const freeSpace = to.capacity - to.layers.length;
  const toMove = Math.min(count, freeSpace);

  for (let i = 0; i < toMove; i++) {
    const c = from.layers.pop()!;
    to.layers.push(c);
  }

  return newState;
}

export function isSolved(state: PuzzleState): boolean {
  return state.tubes.every(tube => {
    if (tube.layers.length === 0) return true;
    if (tube.layers.length !== tube.capacity) return false;
    return tube.layers.every(c => c === tube.layers[0]);
  });
}

export interface Move {
  from: number;
  to: number;
}

function stateKey(state: PuzzleState): string {
  return state.tubes
    .map(t => t.layers.join(',') + '|' + t.capacity)
    .join('/');
}

export function solvePuzzle(initial: PuzzleState, maxSteps = 2000): Move[] | null {
  if (isSolved(initial)) return [];

  const visited = new Set<string>();
  const queue: { state: PuzzleState; moves: Move[] }[] = [];

  queue.push({ state: cloneState(initial), moves: [] });
  visited.add(stateKey(initial));

  let steps = 0;

  while (queue.length > 0 && steps < maxSteps) {
    const current = queue.shift()!;
    steps++;

    const n = current.state.tubes.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const nextState = pourOnce(current.state, i, j);
        if (!nextState) continue;

        const key = stateKey(nextState);
        if (visited.has(key)) continue;
        visited.add(key);

        const newMoves = [...current.moves, { from: i, to: j }];

        if (isSolved(nextState)) {
          return newMoves;
        }

        queue.push({ state: nextState, moves: newMoves });
      }
    }
  }

  return null; // pas de solution trouvée (ou limite atteinte)
}

function getWildcardPositions(state: PuzzleState): number[][] {
  // retourne [tubeIndex, layerIndex] pour chaque wildcard
  const positions: number[][] = [];
  state.tubes.forEach((tube, tIdx) => {
    tube.layers.forEach((layer, lIdx) => {
      if (layer === WILDCARD) {
        positions.push([tIdx, lIdx]);
      }
    });
  });
  return positions;
}

export function generateAllPossibilities(
  state: PuzzleState,
  availableColors: ColorHex[]
): PuzzleState[] {
  const wildcards = getWildcardPositions(state);
  if (wildcards.length === 0) return [cloneState(state)];

  const possibilities: PuzzleState[] = [];
  const nWildcards = wildcards.length;
  const nColors = availableColors.length;

  // Génération récursive de toutes les combinaisons
  function recurse(index: number, currentState: PuzzleState) {
    if (index === nWildcards) {
      possibilities.push(cloneState(currentState));
      return;
    }

    const [tIdx, lIdx] = wildcards[index];
    for (const color of availableColors) {
      currentState.tubes[tIdx].layers[lIdx] = color;
      recurse(index + 1, currentState);
    }
    currentState.tubes[tIdx].layers[lIdx] = WILDCARD; // reset
  }

  recurse(0, cloneState(state));
  return possibilities;
}
