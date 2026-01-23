import type { ParsedRace, RaceSlot } from "../types/raceResults";

interface DriverStanding {
  position: number;
  driver: string;
  vehicle: string;
  vehicleId?: string;
  team: string;
  points: number;
  raceResults: (number | null)[];
  racePoints: (number | null)[];
}

interface TeamStanding {
  position: number;
  team: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface VehicleStanding {
  position: number;
  vehicle: string;
  vehicleId?: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface BestTime {
  driver: string;
  vehicle: string;
  vehicleId?: string;
  time: string;
  timeMs: number;
}

const DEFAULT_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function parseTime(timeStr: string | undefined): number {
  if (!timeStr) return Infinity;
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  return Infinity;
}

function formatTimeDiff(baseMs: number, currentMs: number): string {
  const diff = currentMs - baseMs;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+ " : "- ";
  const absDiff = Math.abs(diff) / 1000;
  return `${sign}${absDiff.toFixed(3)}`;
}

function getRacePosition(slots: RaceSlot[], driver: string): number | null {
  const sortedSlots = [...slots].sort((a, b) => {
    const aFinished = a.FinishStatus === "Finished" || !!a.TotalTime;
    const bFinished = b.FinishStatus === "Finished" || !!b.TotalTime;
    if (aFinished !== bFinished) return bFinished ? 1 : -1;

    const aTime = parseTime(a.TotalTime);
    const bTime = parseTime(b.TotalTime);
    return aTime - bTime;
  });

  const index = sortedSlots.findIndex((s) => s.Driver === driver);
  return index >= 0 && sortedSlots[index].TotalTime ? index + 1 : null;
}

function calculateDriverStandings(races: ParsedRace[]): DriverStanding[] {
  const driverMap = new Map<
    string,
    {
      vehicle: string;
      vehicleId?: string;
      team: string;
      raceResults: (number | null)[];
      racePoints: (number | null)[];
    }
  >();

  for (const race of races) {
    for (const slot of race.slots) {
      if (!driverMap.has(slot.Driver)) {
        driverMap.set(slot.Driver, {
          vehicle: slot.Vehicle,
          vehicleId: slot.VehicleId,
          team: slot.Team,
          raceResults: [],
          racePoints: [],
        });
      }
    }
  }

  races.forEach((race, raceIdx) => {
    driverMap.forEach((data, driver) => {
      const position = getRacePosition(race.slots, driver);
      data.raceResults[raceIdx] = position;

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        data.racePoints[raceIdx] = DEFAULT_POINTS_SYSTEM[position - 1];
      } else {
        data.racePoints[raceIdx] = null;
      }
    });
  });

  const standings: DriverStanding[] = [];
  driverMap.forEach((data, driver) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      driver,
      vehicle: data.vehicle,
      vehicleId: data.vehicleId,
      team: data.team,
      points,
      raceResults: data.raceResults,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateTeamStandings(races: ParsedRace[]): TeamStanding[] {
  const teamMap = new Map<
    string,
    { entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    race.slots.forEach((slot) => {
      if (!teamMap.has(slot.Team)) {
        teamMap.set(slot.Team, {
          entries: new Set(),
          racePoints: Array(races.length).fill(null),
        });
      }
      teamMap.get(slot.Team)!.entries.add(slot.Driver);
    });

    const sortedSlots = [...race.slots].sort((a, b) => {
      const aTime = parseTime(a.TotalTime);
      const bTime = parseTime(b.TotalTime);
      return aTime - bTime;
    });

    const teamRacePoints = new Map<string, number>();
    sortedSlots.forEach((slot, idx) => {
      if (idx < DEFAULT_POINTS_SYSTEM.length && slot.TotalTime) {
        const pts = teamRacePoints.get(slot.Team) || 0;
        teamRacePoints.set(slot.Team, pts + DEFAULT_POINTS_SYSTEM[idx]);
      }
    });

    teamRacePoints.forEach((pts, team) => {
      teamMap.get(team)!.racePoints[raceIdx] = pts;
    });
  });

  const standings: TeamStanding[] = [];
  teamMap.forEach((data, team) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      team,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateVehicleStandings(races: ParsedRace[]): VehicleStanding[] {
  const vehicleMap = new Map<
    string,
    { vehicleId?: string; entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    race.slots.forEach((slot) => {
      if (!vehicleMap.has(slot.Vehicle)) {
        vehicleMap.set(slot.Vehicle, {
          vehicleId: slot.VehicleId,
          entries: new Set(),
          racePoints: Array(races.length).fill(null),
        });
      }
      vehicleMap.get(slot.Vehicle)!.entries.add(slot.Driver);
    });

    const sortedSlots = [...race.slots].sort((a, b) => {
      const aTime = parseTime(a.TotalTime);
      const bTime = parseTime(b.TotalTime);
      return aTime - bTime;
    });

    const vehicleRacePoints = new Map<string, number>();
    sortedSlots.forEach((slot, idx) => {
      if (idx < DEFAULT_POINTS_SYSTEM.length && slot.TotalTime) {
        const pts = vehicleRacePoints.get(slot.Vehicle) || 0;
        vehicleRacePoints.set(slot.Vehicle, pts + DEFAULT_POINTS_SYSTEM[idx]);
      }
    });

    vehicleRacePoints.forEach((pts, vehicle) => {
      vehicleMap.get(vehicle)!.racePoints[raceIdx] = pts;
    });
  });

  const standings: VehicleStanding[] = [];
  vehicleMap.forEach((data, vehicle) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      vehicle,
      vehicleId: data.vehicleId,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function getBestLapTimes(races: ParsedRace[], topN: number = 20): BestTime[][] {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.BestLap)
      .map((s) => ({
        driver: s.Driver,
        vehicle: s.Vehicle,
        vehicleId: s.VehicleId,
        time: s.BestLap!,
        timeMs: parseTime(s.BestLap!) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
}

function getBestQualifyingTimes(
  races: ParsedRace[],
  topN: number = 20,
): BestTime[][] {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.QualTime)
      .map((s) => ({
        driver: s.Driver,
        vehicle: s.Vehicle,
        vehicleId: s.VehicleId,
        time: s.QualTime!,
        timeMs: parseTime(s.QualTime!) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
}

export function generateStandingsHTML(
  races: ParsedRace[],
  championshipName: string,
  leaderboardAssets?: {
    classes: Record<string, string>;
    tracks: Record<string, string>;
  },
  gameData?: Record<string, any> | null,
): string {
  // Helper function to get vehicle name from ID
  const getVehicleName = (vehicleId?: string, vehicleName?: string): string => {
    if (vehicleName && vehicleName !== vehicleId) return vehicleName;
    if (!vehicleId || !gameData?.cars) return vehicleName || vehicleId || "";
    const car = gameData.cars[vehicleId];
    return car?.Name || vehicleName || vehicleId;
  };

  const driverStandings = calculateDriverStandings(races);
  const teamStandings = calculateTeamStandings(races);
  const vehicleStandings = calculateVehicleStandings(races);
  const bestLapTimes = getBestLapTimes(races);
  const bestQualTimes = getBestQualifyingTimes(races);

  let html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<link href='http://fonts.googleapis.com/css?family=Open+Sans:400,700' rel='stylesheet' type='text/css'>
<style>
body { font-family: 'Open Sans', sans-serif; margin: 20px; background: #f5f5f5; }
h1 { color: #333; margin-bottom: 5px; }
h3 { color: #666; margin-top: 0; }
table { border-collapse: collapse; width: 100%; margin: 30px 0; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
caption { font-size: 1.3em; font-weight: bold; padding: 15px; background: #2c3e50; color: white; text-align: left; }
thead { background-color: #34495e; color: white; }
th { border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-weight: 600; }
td { border: 1px solid #ddd; padding: 10px 8px; text-align: center; }
tbody tr:hover { background-color: #ecf0f1; }
.even { background-color: #f9f9f9; }
.points { font-weight: bold; font-size: 1.1em; }
.pos1 { background-color: #ffd700 !important; }
.pos2 { background-color: #c0c0c0 !important; }
.pos3 { background-color: #cd7f32 !important; }
.track-header { font-size: 0.9em; padding: 5px; }
.track-header img { display: block; margin: 5px auto; max-width: 80px; height: auto; }
.track-time { font-size: 0.8em; color: #95a5a6; display: block; }
.driver-name { text-align: left; font-weight: 600; }
.vehicle-name, .team-name { text-align: left; font-size: 0.9em; }
.vehicle-icon { height: auto; vertical-align: middle; margin-right: 5px; }
.time-diff { color: #e74c3c; font-size: 0.85em; display: block; }
.minor { color: #7f8c8d; font-size: 0.9em; margin-bottom: 20px; }
</style>
</head>
<body>
<span class="minor">Generated from R3E Toolbox</span>
<h1>${championshipName}</h1>
<h3>Championship Standings</h3>

<!-- Driver Standings -->
<table>
<caption>Driver Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Driver</th>
<th rowspan="2">Vehicle</th>
<th rowspan="2">Team</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    const trackImg = leaderboardAssets?.tracks[race.trackname] || "";
    html += `\n<th colspan="2" class="track-header">`;
    if (trackImg) html += `<img src="${trackImg}" alt="${race.trackname}"/>`;
    html += `${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
<tr>`;
  races.forEach(() => {
    html += `\n<th>Pts</th><th>Pos</th>`;
  });
  html += `
</tr>
</thead>
<tbody>`;

  driverStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    const vehicleIcon =
      standing.vehicleId && leaderboardAssets?.classes[standing.vehicleId]
        ? leaderboardAssets.classes[standing.vehicleId]
        : "";
    const displayVehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="driver-name">${standing.driver}</td>
<td class="vehicle-name">${vehicleIcon ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}` : displayVehicleName}</td>
<td class="team-name">${standing.team}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts, raceIdx) => {
      const pos = standing.raceResults[raceIdx];
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;

      let posClass = "";
      if (pos === 1) posClass = ' class="pos1"';
      else if (pos === 2) posClass = ' class="pos2"';
      else if (pos === 3) posClass = ' class="pos3"';

      html += `\n<td${posClass}>${pos !== null ? pos : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Team Standings -->
<table>
<caption>Team Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Team</th>
<th rowspan="2">Entries</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  teamStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="team-name">${standing.team}</td>
<td>${standing.entries}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts) => {
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Vehicle Standings -->
<table>
<caption>Vehicle Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Vehicle</th>
<th rowspan="2">Entries</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  vehicleStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    const vehicleIcon =
      standing.vehicleId && leaderboardAssets?.classes[standing.vehicleId]
        ? leaderboardAssets.classes[standing.vehicleId]
        : "";
    const displayVehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
    const vehicleDisplay = vehicleIcon
      ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
      : displayVehicleName;
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="vehicle-name">${vehicleDisplay}</td>
<td>${standing.entries}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts) => {
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Best Race Lap Times -->
<table>
<caption>Best Race Lap Times</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxLapRows = Math.max(...bestLapTimes.map((times) => times.length));
  for (let i = 0; i < maxLapRows; i++) {
    const rowClass = i % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${i + 1}</td>`;

    bestLapTimes.forEach((raceTimes) => {
      if (i < raceTimes.length) {
        const time = raceTimes[i];
        const diff =
          i > 0 ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs) : "";
        const diffHtml = diff
          ? '<span class="time-diff">' + diff + "</span>"
          : "";
        const vehicleIcon =
          time.vehicleId && leaderboardAssets?.classes[time.vehicleId]
            ? leaderboardAssets.classes[time.vehicleId]
            : "";
        const displayVehicleName = getVehicleName(time.vehicleId, time.vehicle);
        const vehicleDisplay = vehicleIcon
          ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
          : displayVehicleName;
        html += `\n<td class="driver-name">${time.driver}<br><span class="vehicle-name">${vehicleDisplay}</span><br>${time.time}${diffHtml}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

<!-- Best Qualification Times -->
<table>
<caption>Best Qualification Times</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxQualRows = Math.max(...bestQualTimes.map((times) => times.length));
  for (let i = 0; i < maxQualRows; i++) {
    const rowClass = i % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${i + 1}</td>`;

    bestQualTimes.forEach((raceTimes) => {
      if (i < raceTimes.length) {
        const time = raceTimes[i];
        const diff =
          i > 0 ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs) : "";
        const diffHtml = diff
          ? '<span class="time-diff">' + diff + "</span>"
          : "";
        const vehicleIcon =
          time.vehicleId && leaderboardAssets?.classes[time.vehicleId]
            ? leaderboardAssets.classes[time.vehicleId]
            : "";
        const displayVehicleName = getVehicleName(time.vehicleId, time.vehicle);
        const vehicleDisplay = vehicleIcon
          ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
          : displayVehicleName;
        html += `\n<td class="driver-name">${time.driver}<br><span class="vehicle-name">${vehicleDisplay}</span><br>${time.time}${diffHtml}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

<!-- Race Results -->
<table>
<caption>Race Results</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxDrivers = Math.max(
    ...driverStandings.map((s) => s.raceResults.length),
  );
  for (let pos = 1; pos <= maxDrivers; pos++) {
    const rowClass = pos % 2 === 0 ? ' class="even"' : "";
    html += `\n<tr${rowClass}>
<td>${pos}</td>`;

    races.forEach((_race, raceIdx) => {
      const driver = driverStandings.find(
        (s) => s.raceResults[raceIdx] === pos,
      );
      if (driver) {
        let posClass = "";
        if (pos === 1) posClass = ' class="pos1"';
        else if (pos === 2) posClass = ' class="pos2"';
        else if (pos === 3) posClass = ' class="pos3"';

        html += `\n<td${posClass} class="driver-name">${driver.driver}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

</body>
</html>`;

  return html;
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
