# Rounds Migration Guide

This guide explains how to migrate your existing Icke Cup system to support 2 rounds per game.

## Overview

Previously, each game was a single match with one set of points. Now, each game consists of 2 rounds, and the winner is determined by:
1. **Best of 2 rounds**: If a team wins both rounds, they win the game
2. **Tiebreaker**: If each team wins one round, the team with more total points wins

## Database Changes

### 1. Create the Rounds Table

Run the SQL script in `api/migrations/create_rounds_table.sql`:

```sql
-- This creates the rounds table with proper foreign keys and constraints
```

### 2. Migrate Existing Data

Run the migration script in `api/migrations/migrate_existing_games_to_rounds.sql`:

```sql
-- This converts existing game data to the new rounds structure
```

## API Changes

### New Endpoints

- `GET /api/?path=rounds` - Get all rounds
- `GET /api/?path=rounds&game_id=GAME_ID` - Get rounds for a specific game
- `POST /api/?path=rounds` - Create a new round
- `PUT /api/?path=rounds` - Update an existing round

### Updated Endpoints

- `GET /api/?path=games` - Now returns games with round data included
- `POST /api/?path=games` - Now automatically creates 2 default rounds for each new game

## Frontend Changes

### Updated Components

1. **VorrundeTabContent.tsx** - Now displays:
   - Individual round scores
   - Total scores
   - Game winner (calculated from rounds)
   - Edit dialog for both rounds

### New Features

- **Round-by-round editing**: Edit scores for each round separately
- **Automatic winner calculation**: System determines game winner based on round wins and total points
- **Enhanced display**: Shows both individual round results and totals

## Implementation Steps

### Step 1: Database Setup
1. Run the rounds table creation script
2. Run the migration script for existing data

### Step 2: Backend Deployment
1. Deploy the updated API files
2. Test the new endpoints

### Step 3: Frontend Deployment
1. Deploy the updated frontend components
2. Test the new UI functionality

## Data Structure

### Games Table (unchanged)
```sql
games (
    id, team_1_id, team_2_id, ref_team_id, 
    points_team_1, points_team_2, -- These can be removed after migration
    start_at, tournament_id, round, sitting, court
)
```

### New Rounds Table
```sql
rounds (
    id, game_id, round_number, 
    points_team_1, points_team_2, winner_team_id,
    created_at, updated_at
)
```

## Winner Calculation Logic

```javascript
// Pseudo-code for determining game winner
function determineGameWinner(round1, round2) {
    const round1Won = round1.winner_team_id === team1_id ? 1 : 
                     round1.winner_team_id === team2_id ? 0 : null;
    const round2Won = round2.winner_team_id === team1_id ? 1 : 
                     round2.winner_team_id === team2_id ? 0 : null;
    
    if (round1Won === round2Won && round1Won !== null) {
        // Same team won both rounds
        return round1Won === 1 ? team1_id : team2_id;
    } else if (round1Won !== null && round2Won !== null) {
        // Different teams won each round - use total points
        const totalPoints1 = round1.points_team_1 + round2.points_team_1;
        const totalPoints2 = round1.points_team_2 + round2.points_team_2;
        return totalPoints1 > totalPoints2 ? team1_id : team2_id;
    }
    
    return null; // Game not finished
}
```

## Testing

### Test Cases
1. **Team A wins both rounds** → Team A wins game
2. **Team B wins both rounds** → Team B wins game  
3. **Team A wins round 1, Team B wins round 2, Team A has more total points** → Team A wins game
4. **Team A wins round 1, Team B wins round 2, Team B has more total points** → Team B wins game
5. **Both rounds are ties** → Game is a tie

### Manual Testing
1. Create a new game and verify 2 rounds are created
2. Edit round scores and verify winner calculation
3. Test edge cases (ties, incomplete games)

## Rollback Plan

If issues arise, you can rollback by:
1. Dropping the rounds table
2. Reverting API changes
3. Reverting frontend changes
4. Restoring from database backup

## Notes

- The existing `points_team_1` and `points_team_2` columns in the games table can be kept for backward compatibility or removed after migration
- All new games will automatically have 2 rounds created with 0 points
- The frontend now shows much more detailed information about each game 