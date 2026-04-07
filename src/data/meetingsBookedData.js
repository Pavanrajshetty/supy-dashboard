export const MEETINGS_DATA = [];

export function filterMeetings(data, filter, geoFil) {
  let rows = [...data];

  if (geoFil) {
    rows = rows.filter((r) => r.geo === geoFil);
  }

  if (filter === "High") {
    rows = rows.filter((r) => r.priority === "High");
  }

  return rows;
}
