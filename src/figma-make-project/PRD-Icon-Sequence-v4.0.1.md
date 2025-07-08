# Icon Sequence PRD - My Locations v4.0.1

## Overview
This document defines the current icon sequence used in the My Locations application for easy customization and reordering.

## Current Icon Configuration

### Icon Selector Grid Order
The icons appear in a 6-column grid in the following sequence:

**Row 1:**
1. `home` - 🏠 (Home)
2. `work` - 🏢 (Work) 
3. `retail` - 🛒 (Retail)
4. `coffee` - ☕ (Coffee)
5. `food` - 🍔 (Food)
6. `parking` - 🅿️ (Parking)

**Row 2:**
7. `market` - 🏪 (Store)
8. `gym` - 🏋️‍♂️ (Gym)
9. `park` - 🏞️ (Park)
10. `school` - 🎓 (School)
11. `bank` - 💰 (Bank)
12. `fuel` - ⛽ (Fuel)

**Row 3:**
13. `hotel` - 🏨 (Hotel)
14. `factory` - 🏗️ (Factory)
15. `airport` - ✈️ (Airport)
16. `train` - 🚊 (Train)
17. `bar` - 🍻 (Bar)
18. `other` - 📍 (Other)

**Row 4:**
19. `hospital` - 🩺 (Hospital)
20. `bus` - 🚌 (Bus)
21. `taxi` - 🚕 (Taxi)
22. `restaurant` - 🍽️ (Restaurant)
23. `beach` - 🏖️ (Beach)
24. `scenic` - 🌾 (Scenic)

## Code Implementation

### Current Array Order
```javascript
const commonIcons = [
  'home', 'work', 'retail', 'coffee', 'food', 'parking',
  'market', 'gym', 'park', 'school', 'bank', 'fuel', 
  'hotel', 'factory', 'airport', 'train', 'bar', 'other',
  'hospital', 'bus', 'taxi', 'restaurant', 'beach', 'scenic'
]
```

### Icon Definitions
```javascript
const LOCATION_ICONS = {
  home: '🏠', work: '🏢', school: '🎓', retail: '🛒', coffee: '☕',
  food: '🍔', bar: '🍻', parking: '🅿️', market: '🏪', gym: '🏋️‍♂️',
  fuel: '⛽', bank: '💰', hotel: '🏨', park: '🏞️', factory: '🏗️',
  airport: '✈️', train: '🚊', bus: '🚌', car: '🚗', hospital: '🩺',
  taxi: '🚕', restaurant: '🍽️', beach: '🏖️', scenic: '🌾', other: '📍'
}

const ICON_NAMES = {
  home: 'Home', work: 'Work', school: 'School', retail: 'Retail', coffee: 'Coffee',
  food: 'Food', bar: 'Bar', parking: 'Parking', market: 'Store', gym: 'Gym',
  fuel: 'Fuel', bank: 'Bank', hotel: 'Hotel', park: 'Park', factory: 'Factory',
  airport: 'Airport', train: 'Train', bus: 'Bus', car: 'Car', hospital: 'Hospital',
  taxi: 'Taxi', restaurant: 'Restaurant', beach: 'Beach', scenic: 'Scenic', other: 'Other'
}
```

## Customization Instructions

### To Reorder Icons:
1. Modify the `commonIcons` array in the `IconSelector` component
2. The array order directly determines the grid display order (left-to-right, top-to-bottom)
3. Icons will automatically wrap to new rows every 6 items

### Example Custom Order:
```javascript
// Most used icons first
const commonIcons = [
  'home', 'work', 'market', 'food', 'coffee', 'parking',
  'gym', 'hospital', 'bank', 'fuel', 'restaurant', 'hotel',
  'school', 'airport', 'park', 'beach', 'bar', 'taxi',
  'bus', 'train', 'factory', 'retail', 'scenic', 'other'
]
```

### To Add New Icons:
1. Add emoji and key to `LOCATION_ICONS` object
2. Add display name to `ICON_NAMES` object  
3. Include the key in the `commonIcons` array at desired position

### Grid Layout:
- **Columns:** Fixed at 6 per row
- **Responsive:** Maintains 6-column layout on all screen sizes
- **Overflow:** Additional icons automatically create new rows

## Usage Notes
- The `other` icon (📍) should typically remain as the last option
- Most frequently used icons should be placed in the top rows
- Consider grouping related icons (transport, food, etc.) for better UX
- Icon order affects the form's icon selection experience

## File Location
The icon configuration is located in `/App.tsx` in the `IconSelector` component around line 400.