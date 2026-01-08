import React, { useState, useCallback } from 'react';
import type { RaceRoomData, Assets, Database, ProcessedDatabase, PlayerTimes } from '../types';
import { parseJson } from '../utils/jsonParser';
import { parseAdaptive } from '../utils/xmlParser';
import { processDatabase } from '../utils/databaseProcessor';

import AIPrimerGUI from './AIPrimerGUI';

const AIDashboard: React.FC = () => {
  const [assets, setAssets] = useState<Assets | null>(null);
  const [database, setDatabase] = useState<Database>({ classes: {} });
  const [processed, setProcessed] = useState<ProcessedDatabase>({ classes: {} });
  const [playerTimes, setPlayerTimes] = useState<PlayerTimes>({ classes: {} });

  const handleJsonUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: RaceRoomData = JSON.parse(e.target?.result as string);
        const parsedAssets = parseJson(data);
        setAssets(parsedAssets);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleXmlUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const newDatabase = { ...database };
        const newPlayerTimes = { ...playerTimes };
        const added = parseAdaptive(xmlText, newDatabase, newPlayerTimes);
        if (added) {
          setDatabase(newDatabase);
          setPlayerTimes(newPlayerTimes);
          setProcessed(processDatabase(newDatabase));
        }
      } catch (error) {
        console.error('Error parsing XML:', error);
        alert('Error parsing XML file');
      }
    };
    reader.readAsText(file);
  }, [database, playerTimes]);

  const handleApplyModification = useCallback((classid: string, trackid: string, aifrom: number, aito: number, aiSpacing: number) => {
    if (!processed.classes[classid]?.tracks[trackid]) {
      alert('No processed data available for this class/track combination');
      return;
    }

    const newDatabase = JSON.parse(JSON.stringify(database)) as Database;
    
    // Ensure class and track exist in database
    if (!newDatabase.classes[classid]) {
      newDatabase.classes[classid] = { tracks: {} };
    }
    if (!newDatabase.classes[classid].tracks[trackid]) {
      newDatabase.classes[classid].tracks[trackid] = { ailevels: {} };
    }

    const track = newDatabase.classes[classid].tracks[trackid];
    const processedTrack = processed.classes[classid].tracks[trackid];

    // Add AI levels from aifrom to aito with aiSpacing step
    let addedCount = 0;
    for (let ai = aifrom; ai <= aito; ai += aiSpacing) {
      const generatedTime = processedTrack.ailevels[ai]?.[0];
      if (generatedTime) {
        if (!track.ailevels[ai]) {
          track.ailevels[ai] = [];
        }
        track.ailevels[ai].push(generatedTime);
        addedCount++;
      }
    }

    // Update min/max AI for track
    const aiLevels = Object.keys(track.ailevels).map(Number);
    track.minAI = Math.min(...aiLevels);
    track.maxAI = Math.max(...aiLevels);

    // Update min/max AI for class
    const classData = newDatabase.classes[classid];
    const allTrackAIs = Object.values(classData.tracks).flatMap(t => 
      Object.keys(t.ailevels).map(Number)
    );
    classData.minAI = Math.min(...allTrackAIs);
    classData.maxAI = Math.max(...allTrackAIs);

    setDatabase(newDatabase);
    setProcessed(processDatabase(newDatabase));
    
    alert(`Added ${addedCount} AI levels to the database`);
  }, [database, processed]);

  const handleRemoveGenerated = useCallback(() => {
    const newDatabase = JSON.parse(JSON.stringify(database)) as Database;
    let removedCount = 0;

    for (const classData of Object.values(newDatabase.classes)) {
      for (const track of Object.values(classData.tracks)) {
        for (const [aiLevel, times] of Object.entries(track.ailevels)) {
          // Remove AI levels with only 1 sample (likely generated)
          if (times.length === 1) {
            delete track.ailevels[Number(aiLevel)];
            removedCount++;
          }
        }

        // Update min/max AI for track
        const aiLevels = Object.keys(track.ailevels).map(Number);
        if (aiLevels.length > 0) {
          track.minAI = Math.min(...aiLevels);
          track.maxAI = Math.max(...aiLevels);
        } else {
          delete track.minAI;
          delete track.maxAI;
        }
      }

      // Update min/max AI for class
      const allTrackAIs = Object.values(classData.tracks).flatMap(t => 
        Object.keys(t.ailevels).map(Number)
      );
      if (allTrackAIs.length > 0) {
        classData.minAI = Math.min(...allTrackAIs);
        classData.maxAI = Math.max(...allTrackAIs);
      } else {
        delete classData.minAI;
        delete classData.maxAI;
      }
    }

    setDatabase(newDatabase);
    setProcessed(processDatabase(newDatabase));
    
    alert(`Removed ${removedCount} likely generated AI levels`);
  }, [database]);

  const handleResetAll = useCallback(() => {
    if (!confirm('Are you sure you want to reset all AI times? This action cannot be undone.')) {
      return;
    }

    setDatabase({ classes: {} });
    setProcessed({ classes: {} });
    setPlayerTimes({ classes: {} });
    
    alert('All AI times and player times have been reset');
  }, []);



  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>R3E Adaptive AI Dashboard v2</h1>
      <p>Upload RaceRoom data files to analyze and configure AI parameters</p>

      <div style={{ marginTop: '20px' }}>
        <h2>File Upload</h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label>RaceRoom Data JSON: </label>
            <input type="file" accept=".json" onChange={handleJsonUpload} />
          </div>
          <div>
            <label>AI Adaptation XML: </label>
            <input type="file" accept=".xml" onChange={handleXmlUpload} />
          </div>
        </div>

        {assets && (
          <div>
            <p>Loaded {assets.numClasses} classes and {assets.numTracks} tracks</p>
            <p>Database contains {Object.keys(database.classes).length} classes with AI data</p>
          </div>
        )}
      </div>

      <AIPrimerGUI
        assets={assets}
        processed={processed}
        playertimes={playerTimes}
        database={database}
        onApplyModification={handleApplyModification}
        onRemoveGenerated={handleRemoveGenerated}
        onResetAll={handleResetAll}
      />
    </div>
  );
};

export default AIDashboard;