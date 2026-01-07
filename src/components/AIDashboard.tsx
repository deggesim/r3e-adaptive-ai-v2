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
    // TODO: Implement XML modification
    console.log('Apply modification:', { classid, trackid, aifrom, aito, aiSpacing });
    alert('XML modification not yet implemented in web version');
  }, []);

  const handleRemoveGenerated = useCallback(() => {
    // TODO: Implement remove generated
    console.log('Remove generated');
    alert('Remove generated not yet implemented in web version');
  }, []);

  const handleResetAll = useCallback(() => {
    // TODO: Implement reset all
    console.log('Reset all');
    alert('Reset all not yet implemented in web version');
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
        onApplyModification={handleApplyModification}
        onRemoveGenerated={handleRemoveGenerated}
        onResetAll={handleResetAll}
      />
    </div>
  );
};

export default AIDashboard;