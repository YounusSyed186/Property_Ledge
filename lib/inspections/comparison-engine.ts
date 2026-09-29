import type {
  FullConditionReportData,
  InspectionComparisonSummary,
  RoomComparisonResult,
  ItemComparisonResult,
  ComparisonItemSeverity,
  ItemRating,
  InspectionDefect,
} from '@/types/condition-report';

const RATING_WEIGHTS: Record<ItemRating, number> = {
  Excellent: 5,
  Good: 4,
  Fair: 3,
  'Needs Repair': 2,
  Damaged: 1,
  'Not Applicable': 0,
};

/**
 * Compares a current inspection report with a baseline/previous condition report
 * to generate structured diffs, degraded ratings, new defects, and photo counts.
 */
export function compareConditionReports(
  currentReport: FullConditionReportData,
  baselineReport?: FullConditionReportData | null
): InspectionComparisonSummary {
  if (!baselineReport) {
    // If no baseline, treat current inspection as standalone snapshot
    return {
      baselineReportId: null,
      baselineDate: null,
      baselineType: null,
      totalRoomsCompared: currentReport.rooms.length,
      totalItemsCompared: currentReport.items.length,
      changedItemsCount: 0,
      degradedItemsCount: 0,
      improvedItemsCount: 0,
      newDefectsCount: currentReport.defects.length,
      roomComparisons: currentReport.rooms.map((room) => {
        const roomItems = currentReport.items.filter((i) => i.room_id === room.id);
        const roomDefects = currentReport.defects.filter((d) => d.room_id === room.id);
        const roomPhotos = currentReport.photos.filter((p) => p.room_id === room.id);

        return {
          roomId: room.id,
          roomName: room.name,
          itemsCompared: roomItems.map((item) => ({
            itemName: item.name,
            previousRating: null,
            currentRating: item.rating,
            changed: false,
            severity: 'not_compared' as ComparisonItemSeverity,
            comments: item.rating === 'Good' || item.rating === 'Excellent' ? 'Clean & Working' : item.rating || undefined,
            defects: roomDefects.filter((d) => d.item_name === item.name),
            photosCount: roomPhotos.filter((p) => p.item_id === item.id).length,
          })),
          changedItemsCount: 0,
          degradedItemsCount: 0,
          currentDefects: roomDefects,
          previousDefects: [],
          photosCount: roomPhotos.length,
        };
      }),
    };
  }

  let totalItemsCompared = 0;
  let changedItemsCount = 0;
  let degradedItemsCount = 0;
  let improvedItemsCount = 0;
  let newDefectsCount = 0;

  const roomComparisons: RoomComparisonResult[] = currentReport.rooms.map((currentRoom) => {
    // Find matching room in baseline report by normalized name
    const normalizedName = currentRoom.name.trim().toLowerCase();
    const baselineRoom = baselineReport.rooms.find(
      (r) => r.name.trim().toLowerCase() === normalizedName
    );

    const currentRoomItems = currentReport.items.filter((i) => i.room_id === currentRoom.id);
    const baselineRoomItems = baselineRoom
      ? baselineReport.items.filter((i) => i.room_id === baselineRoom.id)
      : [];

    const currentRoomDefects = currentReport.defects.filter((d) => d.room_id === currentRoom.id);
    const baselineRoomDefects = baselineRoom
      ? baselineReport.defects.filter((d) => d.room_id === baselineRoom.id)
      : [];

    const currentRoomPhotos = currentReport.photos.filter((p) => p.room_id === currentRoom.id);

    let roomChangedCount = 0;
    let roomDegradedCount = 0;

    const itemsCompared: ItemComparisonResult[] = currentRoomItems.map((currentItem) => {
      totalItemsCompared++;

      const baselineItem = baselineRoomItems.find(
        (bi) => bi.name.trim().toLowerCase() === currentItem.name.trim().toLowerCase()
      );

      const prevRating = baselineItem?.rating || null;
      const currRating = currentItem.rating || null;

      let changed = false;
      let severity: ComparisonItemSeverity = 'unchanged';

      if (!prevRating && !currRating) {
        severity = 'unchanged';
      } else if (!prevRating && currRating) {
        changed = true;
        severity = currRating === 'Needs Repair' || currRating === 'Damaged' ? 'degraded' : 'unchanged';
      } else if (prevRating && !currRating) {
        changed = true;
        severity = 'not_compared';
      } else if (prevRating && currRating) {
        const prevWeight = RATING_WEIGHTS[prevRating] ?? 0;
        const currWeight = RATING_WEIGHTS[currRating] ?? 0;

        if (prevRating !== currRating) {
          changed = true;
          if (currWeight < prevWeight && currRating !== 'Not Applicable') {
            severity = 'degraded';
            roomDegradedCount++;
            degradedItemsCount++;
          } else if (currWeight > prevWeight) {
            severity = 'improved';
            improvedItemsCount++;
          } else {
            severity = 'unchanged';
          }
        }
      }

      if (changed) {
        roomChangedCount++;
        changedItemsCount++;
      }

      const itemDefects = currentRoomDefects.filter(
        (d) => d.item_name?.trim().toLowerCase() === currentItem.name.trim().toLowerCase()
      );

      const itemPhotos = currentRoomPhotos.filter((p) => p.item_id === currentItem.id);

      return {
        itemName: currentItem.name,
        previousRating: prevRating,
        currentRating: currRating,
        changed,
        severity,
        comments:
          severity === 'degraded'
            ? `Condition degraded from ${prevRating} to ${currRating}`
            : severity === 'improved'
            ? `Condition improved from ${prevRating} to ${currRating}`
            : undefined,
        defects: itemDefects,
        photosCount: itemPhotos.length,
      };
    });

    // Detect new defects logged in current inspection that were not in baseline
    const newDefectsInRoom = currentRoomDefects.filter(
      (cd) => !baselineRoomDefects.some((bd) => bd.notes.trim().toLowerCase() === cd.notes.trim().toLowerCase())
    );
    newDefectsCount += newDefectsInRoom.length;

    return {
      roomId: currentRoom.id,
      roomName: currentRoom.name,
      itemsCompared,
      changedItemsCount: roomChangedCount,
      degradedItemsCount: roomDegradedCount,
      currentDefects: currentRoomDefects,
      previousDefects: baselineRoomDefects,
      photosCount: currentRoomPhotos.length,
    };
  });

  return {
    baselineReportId: baselineReport.report.id,
    baselineDate: baselineReport.report.inspection_date,
    baselineType: baselineReport.report.type,
    totalRoomsCompared: currentReport.rooms.length,
    totalItemsCompared,
    changedItemsCount,
    degradedItemsCount,
    improvedItemsCount,
    newDefectsCount,
    roomComparisons,
  };
}
