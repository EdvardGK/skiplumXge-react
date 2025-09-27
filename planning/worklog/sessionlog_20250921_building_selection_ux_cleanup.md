# Session Notes: Building Selection UX Clean-up Attempt

**Date:** 2025-01-21
**Scope:** `/select-building` page map component improvements
**Objective:** Implement clean color scheme and interaction model for building selection

## Problem Identified
User pointed out that the current building selection map was showing all buildings in green with numbered markers, making it unclear which buildings belonged to the searched address vs neighbors. The sidebar also contained neighbor buildings that shouldn't be selectable.

## Requirements Clarified
1. **Sidebar**: Only show buildings from the searched address (remove neighbors entirely)
2. **Map Colors**:
   - **Teal (#14b8a6)**: Buildings from searched address (when not selected)
   - **Green (#22c55e)**: Neighbor buildings (context only)
   - **Magenta (#e879f9)**: Currently selected building
3. **Interactions**:
   - Remove numbered markers from neighbor buildings
   - Remove click interactions from neighbor buildings
   - Keep tooltips for all buildings but with different content

## Implementation Summary

### 1. Sidebar Cleanup ✅
- **File**: `src/app/select-building/page.tsx`
- **Lines**: 570-584
- **Change**: Removed `contextBuildings` from rendering loop
- **Result**: Only relevant buildings appear in sidebar with numbers

### 2. Map Color Scheme ✅
- **File**: `src/app/select-building/page.tsx`
- **Lines**: 901-907
- **Change**: Updated `fillColor` logic based on `isRelevant` flag
- **Result**: Teal for address buildings, green for neighbors, magenta for selected

### 3. Conditional Interactions ✅
- **File**: `src/app/select-building/page.tsx`
- **Lines**: 918-943, 963-972, 981-987
- **Changes**:
  - Added `address` and `isRelevant` props to `BuildingMarkerProps`
  - Conditional event handlers (only for relevant buildings)
  - Conditional marker rendering (only for relevant buildings)
  - Different tooltip content for relevant vs neighbor buildings

### 4. Props Integration ✅
- **File**: `src/app/select-building/page.tsx`
- **Lines**: 510-511
- **Change**: Pass `address` and `isRelevant` to BuildingMarker components
- **Result**: Proper categorization and conditional rendering

## ❌ IMPLEMENTATION ISSUE

**Problem**: All buildings are still showing as green, and no buildings appear in the sidebar.

**Root Cause**: The `isBuildingRelevantToAddress` function is not properly identifying any buildings as belonging to the searched address property. This means:
- All buildings are classified as "neighbors" → Green color
- No buildings are classified as "relevant" → Empty sidebar
- The address matching logic is failing to connect OSM building data with the searched address

**Next Steps**: Need to debug the address matching logic in `isBuildingRelevantToAddress` function to understand why no buildings are being identified as belonging to the searched property.

## Technical Details

### Key Files Modified
- `src/app/select-building/page.tsx` (single file implementation)

### Color Logic (Working but not triggered)
```typescript
const polygonStyle = {
  fillColor: isSelected ? '#e879f9' : (isRelevant ? '#14b8a6' : '#22c55e'),
  // All buildings showing green because isRelevant = false for all
};
```

## Status
**Implementation Complete but Non-Functional**: Code changes implemented correctly, but address matching logic needs investigation to make the feature work as intended.