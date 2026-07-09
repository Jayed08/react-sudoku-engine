export class HumanSolverEngine {
    constructor(grid) {
        // Deep copy the 2D grid to preserve the generator's original board state
        this.board = grid.map(row => [...row]);
        // 3D array tracking 1-9 booleans for each cell's pencil marks
        this.candidates = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(10).fill(true))
        );
        // Track the highest technique needed to solve the puzzle
        this.highestTechniqueUsed = 'Beginner';
    }

    /**
     * Evaluates the puzzle and returns its human difficulty rating
     * @return {Object} { puzzle: [flat array], level: string }
     */
    gradePuzzle() {
        this.initializeCandidates();
        let logicStepFound = true;

        while (logicStepFound && !this.isSolved()) {
            logicStepFound = false;

            // Tier 1: Beginner
            if (this.findFullHouse()) {
                this.updateGrade('Beginner');
                logicStepFound = true;
                continue;
            }

            if (this.findHiddenSingleNoMarks()) {
                this.updateGrade('Beginner');
                logicStepFound = true;
                continue;
            }

            // Tier 2: Easy
            if (this.findNakedSingle()) {
                this.updateGrade('Easy');
                logicStepFound = true;
                continue;
            }

            // Tier 3: Medium
            if (this.findPointingPairs()) {
                this.updateGrade('Medium');
                logicStepFound = true;
                continue;
            }
            // Tier 4: Hard
            if (this.findHiddenSingleWithMarks()) {
                this.updateGrade('Hard');
                logicStepFound = true;
                continue;
            }

            if (this.findNakedPairs()) {
                this.updateGrade('Hard');
                logicStepFound = true;
                continue;
            }

            if (this.findClaimingPairs()) {
                this.updateGrade('Hard');
                logicStepFound = true;
                continue;
            }

            if (this.findHiddenPairs()) {
                this.updateGrade('Hard');
                logicStepFound = true;
                continue;
            }

            // Tier 5: Expert
            if (this.findUniqueRectangleType1()) {
                this.updateGrade('Expert');
                logicStepFound = true;
                continue;
            }

            if (this.findUniqueRectangleType2()) {
                this.updateGrade('Expert');
                logicStepFound = true;
                continue;
            }

            if (this.findUniqueRectangleType4()) {
                this.updateGrade('Expert');
                logicStepFound = true;
                continue;
            }

            if (this.findXWing()) {
                this.updateGrade('Expert');
                logicStepFound = true;
                continue;
            }

            // No implemented technique could make progress.
            // Puzzle is classified as Extreme.
        }

        return {
            level: this.isSolved() ? this.highestTechniqueUsed : 'Extreme',
            solved: this.isSolved()
        };
    }

    updateGrade(level) {
        const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];
        if (LEVELS.indexOf(level) > LEVELS.indexOf(this.highestTechniqueUsed)) {
            this.highestTechniqueUsed = level;
        }
    }

    isSolved() {
        return this.board.every(row => row.every(val => val !== 0));
    }

    initializeCandidates() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                this.candidates[r][c].fill(false);
                if (this.board[r][c] !== 0) {
                    this.candidates[r][c][this.board[r][c]] = true;
                } else {
                    this.candidates[r][c].fill(true);
                    this.candidates[r][c][0] = false;
                }
            }
        }
        // Apply initial constraints
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== 0) {
                    const val = this.board[r][c];
                    for (let i = 0; i < 9; i++) {
                        if (i !== c) this.candidates[r][i][val] = false;
                        if (i !== r) this.candidates[i][c][val] = false;
                    }
                    let br = Math.floor(r / 3) * 3;
                    let bc = Math.floor(c / 3) * 3;
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            if (br + i !== r || bc + j !== c) {
                                this.candidates[br + i][bc + j][val] = false;
                            }
                        }
                    }
                }
            }
        }
    }

    setCell(r, c, val) {
        this.board[r][c] = val;
        this.candidates[r][c].fill(false);
        this.candidates[r][c][val] = true;
        for (let i = 0; i < 9; i++) {
            this.candidates[r][i][val] = false;
            this.candidates[i][c][val] = false;
        }
        let br = Math.floor(r / 3) * 3;
        let bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.candidates[br + i][bc + j][val] = false;
            }
        }
    }

    // ==========================================
    // LOGIC IMPLEMENTATIONS
    // ==========================================

    // Tier 1: Full House
    findFullHouse() {
        // Check rows
        for (let r = 0; r < 9; r++) {
            let zeros = 0, idx = -1, sum = 0;
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] === 0) { zeros++; idx = c; }
                else sum += this.board[r][c];
            }
            if (zeros === 1) { this.setCell(r, idx, 45 - sum); return true; }
        }
        // Check columns
        for (let c = 0; c < 9; c++) {
            let zeros = 0, idx = -1, sum = 0;
            for (let r = 0; r < 9; r++) {
                if (this.board[r][c] === 0) { zeros++; idx = r; }
                else sum += this.board[r][c];
            }
            if (zeros === 1) { this.setCell(idx, c, 45 - sum); return true; }
        }
        return false;
    }

    // Tier 1: Visual Hidden Single (scanning rows/cols without marking)
    findHiddenSingleNoMarks() {
        for (let b = 0; b < 9; b++) {
            let br = Math.floor(b / 3) * 3;
            let bc = (b % 3) * 3;
            for (let num = 1; num <= 9; num++) {
                let hasNum = false;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        if (this.board[br + i][bc + j] === num) hasNum = true;
                    }
                }
                if (hasNum) continue;

                let validSpots = [];
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        let r = br + i, c = bc + j;
                        if (this.board[r][c] !== 0) continue;
                        let blocked = false;
                        for (let k = 0; k < 9; k++) {
                            if (this.board[r][k] === num || this.board[k][c] === num) { blocked = true; break; }
                        }
                        if (!blocked) validSpots.push({ r, c });
                    }
                }
                if (validSpots.length === 1) {
                    this.setCell(validSpots[0].r, validSpots[0].c, num);
                    return true;
                }
            }
        }
        return false;
    }

    // Tier 2: Naked Single
    findNakedSingle() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== 0) continue;
                let count = 0, target = 0;
                for (let num = 1; num <= 9; num++) {
                    if (this.candidates[r][c][num]) { count++; target = num; }
                }
                if (count === 1) { this.setCell(r, c, target); return true; }
            }
        }
        return false;
    }

    // Tier 2: Hidden Single
    findHiddenSingleWithMarks() {
        for (let r = 0; r < 9; r++) {
            for (let num = 1; num <= 9; num++) {
                let count = 0, targetCol = -1;
                for (let c = 0; c < 9; c++) {
                    if (this.board[r][c] === 0 && this.candidates[r][c][num]) { count++; targetCol = c; }
                }
                if (count === 1) { this.setCell(r, targetCol, num); return true; }
            }
        }
        return false;
    }

    // Tier 3: Pointing Pairs (Box filters row/col)
    findPointingPairs() {
        for (let b = 0; b < 9; b++) {
            let br = Math.floor(b / 3) * 3;
            let bc = (b % 3) * 3;
            for (let num = 1; num <= 9; num++) {
                let rows = new Set(), cols = new Set();
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        if (this.board[br + i][bc + j] === 0 && this.candidates[br + i][bc + j][num]) {
                            rows.add(br + i);
                            cols.add(bc + j);
                        }
                    }
                }
                if (rows.size === 1) {
                    let targetRow = [...rows][0];
                    let updated = false;
                    for (let c = 0; c < 9; c++) {
                        if (Math.floor(c / 3) !== b % 3 && this.candidates[targetRow][c][num]) {
                            this.candidates[targetRow][c][num] = false; updated = true;
                        }
                    }
                    if (updated) return true;
                }
                if (cols.size === 1) {
                    let targetCol = [...cols][0];
                    let updated = false;
                    for (let r = 0; r < 9; r++) {
                        if (Math.floor(r / 3) !== Math.floor(b / 3) && this.candidates[r][targetCol][num]) {
                            this.candidates[r][targetCol][num] = false; updated = true;
                        }
                    }
                    if (updated) return true;
                }
            }
        }
        return false;
    }

    // Tier 3: Claiming Pairs (Row/Col filters box)
    findClaimingPairs() {
        for (let r = 0; r < 9; r++) {
            for (let num = 1; num <= 9; num++) {
                let boxes = new Set();
                for (let c = 0; c < 9; c++) {
                    if (this.board[r][c] === 0 && this.candidates[r][c][num]) {
                        boxes.add(Math.floor(r / 3) * 3 + Math.floor(c / 3));
                    }
                }
                if (boxes.size === 1) {
                    let targetBox = [...boxes][0];
                    let br = Math.floor(targetBox / 3) * 3;
                    let bc = (targetBox % 3) * 3;
                    let updated = false;
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            if (br + i !== r && this.candidates[br + i][bc + j][num]) {
                                this.candidates[br + i][bc + j][num] = false; updated = true;
                            }
                        }
                    }
                    if (updated) return true;
                }
            }
        }
        return false;
    }

    // Tier 4: Naked Pairs
    findNakedPairs() {
        for (let r = 0; r < 9; r++) {
            for (let c1 = 0; c1 < 9; c1++) {
                if (this.board[r][c1] !== 0) continue;
                let p1 = this.getCellCandidates(r, c1);
                if (p1.length !== 2) continue;
                for (let c2 = c1 + 1; c2 < 9; c2++) {
                    let p2 = this.getCellCandidates(r, c2);
                    if (p2.length === 2 && p1[0] === p2[0] && p1[1] === p2[1]) {
                        let updated = false;
                        for (let c = 0; c < 9; c++) {
                            if (c !== c1 && c !== c2 && this.board[r][c] === 0) {
                                if (this.candidates[r][c][p1[0]]) { this.candidates[r][c][p1[0]] = false; updated = true; }
                                if (this.candidates[r][c][p1[1]]) { this.candidates[r][c][p1[1]] = false; updated = true; }
                            }
                        }
                        if (updated) return true;
                    }
                }
            }
        }
        return false;
    }

    // Tier 4: Hidden Pairs
    findHiddenPairs() {
        for (let r = 0; r < 9; r++) {
            for (let n1 = 1; n1 <= 9; n1++) {
                let spots1 = [];
                for (let c = 0; c < 9; c++) if (this.board[r][c] === 0 && this.candidates[r][c][n1]) spots1.push(c);
                if (spots1.length !== 2) continue;
                for (let n2 = n1 + 1; n2 <= 9; n2++) {
                    let spots2 = [];
                    for (let c = 0; c < 9; c++) if (this.board[r][c] === 0 && this.candidates[r][c][n2]) spots2.push(c);
                    if (spots2.length === 2 && spots1[0] === spots2[0] && spots1[1] === spots2[1]) {
                        let updated = false;
                        let targetCols = spots1;
                        for (let col of targetCols) {
                            for (let num = 1; num <= 9; num++) {
                                if (num !== n1 && num !== n2 && this.candidates[r][col][num]) {
                                    this.candidates[r][col][num] = false; updated = true;
                                }
                            }
                        }
                        if (updated) return true;
                    }
                }
            }
        }
        return false;
    }

    // Tier 5: X-Wing
    findXWing() {
        for (let num = 1; num <= 9; num++) {
            let rowPairs = [];
            for (let r = 0; r < 9; r++) {
                let cols = [];
                for (let c = 0; c < 9; c++) if (this.board[r][c] === 0 && this.candidates[r][c][num]) cols.push(c);
                if (cols.length === 2) rowPairs.push({ r, c1: cols[0], c2: cols[1] });
            }
            for (let i = 0; i < rowPairs.length; i++) {
                for (let j = i + 1; j < rowPairs.length; j++) {
                    if (rowPairs[i].c1 === rowPairs[j].c1 && rowPairs[i].c2 === rowPairs[j].c2) {
                        let updated = false;
                        let targetCols = [rowPairs[i].c1, rowPairs[i].c2];
                        let excludedRows = [rowPairs[i].r, rowPairs[j].r];
                        for (let c of targetCols) {
                            for (let r = 0; r < 9; r++) {
                                if (!excludedRows.includes(r) && this.board[r][c] === 0 && this.candidates[r][c][num]) {
                                    this.candidates[r][c][num] = false; updated = true;
                                }
                            }
                        }
                        if (updated) return true;
                    }
                }
            }
        }
        return false;
    }

    // Tier 5: Unique Rectangle Type 1
    findUniqueRectangleType1() {
        for (let r1 = 0; r1 < 8; r1++) {
            for (let r2 = r1 + 1; r2 < 9; r2++) {
                for (let c1 = 0; c1 < 8; c1++) {
                    for (let c2 = c1 + 1; c2 < 9; c2++) {
                        let b1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
                        let b2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
                        let b3 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
                        let b4 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
                        if (new Set([b1, b2, b3, b4]).size !== 2) continue;

                        let cells = [{ r: r1, c: c1 }, { r: r1, c: c2 }, { r: r2, c: c1 }, { r: r2, c: c2 }];
                        if (cells.some(cell => this.board[cell.r][cell.c] !== 0)) continue;

                        let cands = cells.map(cell => this.getCellCandidates(cell.r, cell.c));
                        let sizes = cands.map(c => c.length);

                        let size2Count = sizes.filter(s => s === 2).length;
                        if (size2Count === 3 && sizes.some(s => s > 2)) {
                            let baseCandidates = cands.find(c => c.length === 2);
                            let [v1, v2] = baseCandidates;

                            let matchCount = cands.filter(c => c.length === 2 && c.includes(v1) && c.includes(v2)).length;
                            if (matchCount === 3) {
                                let extraCellIdx = sizes.findIndex(s => s > 2);
                                let extraCands = cands[extraCellIdx];
                                if (extraCands.includes(v1) && extraCands.includes(v2)) {
                                    let cell = cells[extraCellIdx];
                                    this.candidates[cell.r][cell.c][v1] = false;
                                    this.candidates[cell.r][cell.c][v2] = false;
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // Tier 5: Unique Rectangle Type 2
    findUniqueRectangleType2() {
        for (let r1 = 0; r1 < 8; r1++) {
            for (let r2 = r1 + 1; r2 < 9; r2++) {
                for (let c1 = 0; c1 < 8; c1++) {
                    for (let c2 = c1 + 1; c2 < 9; c2++) {
                        let b1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
                        let b2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
                        let b3 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
                        let b4 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
                        if (new Set([b1, b2, b3, b4]).size !== 2) continue;

                        let cells = [{ r: r1, c: c1 }, { r: r1, c: c2 }, { r: r2, c: c1 }, { r: r2, c: c2 }];
                        if (cells.some(cell => this.board[cell.r][cell.c] !== 0)) continue;

                        let cands = cells.map(cell => this.getCellCandidates(cell.r, cell.c));
                        let sizes = cands.map(c => c.length);
                        let size2Indices = sizes.map((s, i) => s === 2 ? i : -1).filter(i => i !== -1);
                        let size3Indices = sizes.map((s, i) => s === 3 ? i : -1).filter(i => i !== -1);

                        if (size2Indices.length === 2 && size3Indices.length === 2) {
                            let c1_idx = size2Indices[0], c2_idx = size2Indices[1];
                            let c3_idx = size3Indices[0], c4_idx = size3Indices[1];

                            let pair1 = cands[c1_idx];
                            let pair2 = cands[c2_idx];
                            if (pair1[0] !== pair2[0] || pair1[1] !== pair2[1]) continue;
                            let [v1, v2] = pair1;

                            let cand3 = cands[c3_idx];
                            let cand4 = cands[c4_idx];
                            if (!cand3.includes(v1) || !cand3.includes(v2) || !cand4.includes(v1) || !cand4.includes(v2)) continue;

                            let extra3 = cand3.find(v => v !== v1 && v !== v2);
                            let extra4 = cand4.find(v => v !== v1 && v !== v2);
                            if (extra3 !== extra4) continue;

                            let x = extra3;
                            let extraCell1 = cells[c3_idx];
                            let extraCell2 = cells[c4_idx];

                            let shareHouse = (extraCell1.r === extraCell2.r) || 
                                             (extraCell1.c === extraCell2.c) || 
                                             (Math.floor(extraCell1.r / 3) === Math.floor(extraCell2.r / 3) && Math.floor(extraCell1.c / 3) === Math.floor(extraCell2.c / 3));

                            if (shareHouse) {
                                let validSeeCells = [];
                                for (let r = 0; r < 9; r++) {
                                    for (let c = 0; c < 9; c++) {
                                        if (this.board[r][c] !== 0) continue;
                                        if (r === extraCell1.r && c === extraCell1.c) continue;
                                        if (r === extraCell2.r && c === extraCell2.c) continue;

                                        let see1 = (r === extraCell1.r) || (c === extraCell1.c) || (Math.floor(r / 3) === Math.floor(extraCell1.r / 3) && Math.floor(c / 3) === Math.floor(extraCell1.c / 3));
                                        let see2 = (r === extraCell2.r) || (c === extraCell2.c) || (Math.floor(r / 3) === Math.floor(extraCell2.r / 3) && Math.floor(c / 3) === Math.floor(extraCell2.c / 3));

                                        if (see1 && see2) {
                                            validSeeCells.push({ r, c });
                                        }
                                    }
                                }

                                let updated = false;
                                for (let cell of validSeeCells) {
                                    if (this.candidates[cell.r][cell.c][x]) {
                                        this.candidates[cell.r][cell.c][x] = false;
                                        updated = true;
                                    }
                                }
                                if (updated) return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    // Tier 5: Unique Rectangle Type 4
    findUniqueRectangleType4() {
        for (let r1 = 0; r1 < 8; r1++) {
            for (let r2 = r1 + 1; r2 < 9; r2++) {
                for (let c1 = 0; c1 < 8; c1++) {
                    for (let c2 = c1 + 1; c2 < 9; c2++) {
                        let b1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
                        let b2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
                        let b3 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
                        let b4 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
                        if (new Set([b1, b2, b3, b4]).size !== 2) continue;

                        let cells = [{ r: r1, c: c1 }, { r: r1, c: c2 }, { r: r2, c: c1 }, { r: r2, c: c2 }];
                        if (cells.some(cell => this.board[cell.r][cell.c] !== 0)) continue;

                        let cands = cells.map(cell => this.getCellCandidates(cell.r, cell.c));

                        let size2Indices = cands.map((c, i) => c.length === 2 ? i : -1).filter(i => i !== -1);
                        let largerIndices = cands.map((c, i) => c.length > 2 ? i : -1).filter(i => i !== -1);

                        if (size2Indices.length === 2 && largerIndices.length === 2) {
                            let p1 = cands[size2Indices[0]];
                            let p2 = cands[size2Indices[1]];
                            if (p1[0] !== p2[0] || p1[1] !== p2[1]) continue;
                            let [v1, v2] = p1;

                            let e1 = cands[largerIndices[0]];
                            let e2 = cands[largerIndices[1]];
                            if (!e1.includes(v1) || !e1.includes(v2) || !e2.includes(v1) || !e2.includes(v2)) continue;

                            let cell1 = cells[largerIndices[0]];
                            let cell2 = cells[largerIndices[1]];

                            let sharedRegions = [];
                            if (cell1.r === cell2.r) sharedRegions.push('row');
                            if (cell1.c === cell2.c) sharedRegions.push('col');
                            if (Math.floor(cell1.r / 3) === Math.floor(cell2.r / 3) && Math.floor(cell1.c / 3) === Math.floor(cell2.c / 3)) sharedRegions.push('block');

                            if (sharedRegions.length > 0) {
                                for (let v of [v1, v2]) {
                                    let vOther = v === v1 ? v2 : v1;
                                    for (let region of sharedRegions) {
                                        let restricted = true;
                                        if (region === 'row') {
                                            for (let c = 0; c < 9; c++) {
                                                if (c !== cell1.c && c !== cell2.c && this.board[cell1.r][c] === 0 && this.candidates[cell1.r][c][v]) restricted = false;
                                            }
                                        } else if (region === 'col') {
                                            for (let r = 0; r < 9; r++) {
                                                if (r !== cell1.r && r !== cell2.r && this.board[r][cell1.c] === 0 && this.candidates[r][cell1.c][v]) restricted = false;
                                            }
                                        } else if (region === 'block') {
                                            let br = Math.floor(cell1.r / 3) * 3;
                                            let bc = Math.floor(cell1.c / 3) * 3;
                                            for (let i = 0; i < 3; i++) {
                                                for (let j = 0; j < 3; j++) {
                                                    let r = br + i, c = bc + j;
                                                    if ((r !== cell1.r || c !== cell1.c) && (r !== cell2.r || c !== cell2.c) && this.board[r][c] === 0 && this.candidates[r][c][v]) restricted = false;
                                                }
                                            }
                                        }

                                        if (restricted) {
                                            let updated = false;
                                            if (this.candidates[cell1.r][cell1.c][vOther]) {
                                                this.candidates[cell1.r][cell1.c][vOther] = false;
                                                updated = true;
                                            }
                                            if (this.candidates[cell2.r][cell2.c][vOther]) {
                                                this.candidates[cell2.r][cell2.c][vOther] = false;
                                                updated = true;
                                            }
                                            if (updated) return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    getCellCandidates(r, c) {
        let list = [];
        for (let n = 1; n <= 9; n++) if (this.candidates[r][c][n]) list.push(n);
        return list;
    }
}
