import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 

// IMPORTA I NUOVI COMPONENTI
import TempControl from './components/haccp/TempControl';
import MerciManager from './components/haccp/MerciManager';
import HaccpCalendar from './components/haccp/HaccpCalendar';
import LabelGenerator from './components/haccp/LabelGenerator';
import StaffManager from './components/haccp/StaffManager';
import AssetSetup from './components/haccp/AssetSetup';

function Haccp() {
  // ... (Mantieni qui tutti gli stati: info, assets, logs, merci, tab, etc.)
  // ... (Mantieni qui tutte le funzioni: ricaricaDati, registraTemperatura, salvaMerci)

  if(!info) return <div>Caricamento...</div>;
  if(!isAuthorized) return <AuthForm ... />; // La tua logica di login esistente

  return (
    <div className="haccp-container" style={{minHeight:'100vh', background:'#ecf0f1', padding:20}}>
      
      {/* HEADER & NAV (Sempre visibili) */}
      {!scanId && (
          <div className="no-print" style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
              <nav style={{display:'flex', gap:10}}>
                  {['temperature', 'merci', 'calendario', 'etichette', 'staff', 'setup'].map(t => (
                      <button key={t} onClick={()=>setTab(t)} style={{/* i tuoi stili */}}>
                          {t.toUpperCase()}
                      </button>
                  ))}
              </nav>
          </div>
      )}

      {/* RENDER DINAMICO DEI COMPONENTI REFACTORIZZATI */}
      {tab === 'temperature' && (
          <TempControl 
            assetsToDisplay={assetsToDisplay} getTodayLog={getTodayLog}
            tempInput={tempInput} setTempInput={setTempInput}
            registraTemperatura={registraTemperatura} handleLogPhoto={handleLogPhoto}
            abilitaNuovaMisurazione={abilitaNuovaMisurazione}
          />
      )}

      {tab === 'merci' && (
          <MerciManager 
            merci={merci} merciForm={merciForm} setMerciForm={setMerciForm}
            salvaMerci={salvaMerci} handleMerciPhoto={handleMerciPhoto}
            assets={assets} eliminaMerce={eliminaMerce} iniziaModificaMerci={iniziaModificaMerci}
            resetMerciForm={resetMerciForm}
          />
      )}

      {tab === 'calendario' && (
          <HaccpCalendar 
            currentDate={currentDate} cambiaMese={cambiaMese}
            calendarLogs={calendarLogs} merci={merci}
            selectedDayLogs={selectedDayLogs} setSelectedDayLogs={setSelectedDayLogs}
          />
      )}

      {tab === 'etichette' && (
          <LabelGenerator 
            labelData={labelData} setLabelData={setLabelData}
            handleLabelTypeChange={handleLabelTypeChange}
            handlePrintLabel={handlePrintLabel} lastLabel={lastLabel}
          />
      )}

      {tab === 'staff' && (
          <StaffManager 
            staffList={staffList} selectedStaff={selectedStaff}
            openStaffDocs={openStaffDocs} setSelectedStaff={setSelectedStaff}
            newDoc={newDoc} setNewDoc={setNewDoc} uploadStaffDoc={uploadStaffDoc}
            staffDocs={staffDocs} deleteDoc={deleteDoc}
          />
      )}

      {tab === 'setup' && (
          <AssetSetup 
            assets={assets} apriModaleAsset={apriModaleAsset}
            setShowQRModal={setShowQRModal} setPreviewImage={setPreviewImage}
          />
      )}

      {/* MODALI E AREA DI STAMPA (Rimangono qui per semplicità di z-index) */}
      {/* ... (Codice per DownloadModal, PreviewImage, PrintArea) */}

    </div>
  );
}