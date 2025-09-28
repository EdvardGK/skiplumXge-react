import * as XLSX from 'xlsx';

// Types for the form data structure
interface EnergyAssessmentData {
  // General
  address?: string;
  gnr?: string;
  bnr?: string;
  fnr?: string;
  kommunenummer?: string;
  bygningstype?: string;
  oppforingsaar?: string;
  bruksareal?: string;
  oppvarmetAreal?: string;
  bygningsvolum?: string;
  antallEtasjer?: string;
  totalEnergibruk?: string;
  energimerking?: string;

  // Building Physics
  airLeakageRate?: string;
  normalizedThermalBridge?: string;
  solarHeatGainCoeff?: string;
  ventilationRate?: string;
  heatRecoveryEfficiency?: string;
  specificFanPower?: string;

  // Building Envelope
  wallInsulation?: any[];
  roofInsulation?: any[];
  floorInsulation?: any[];
  foundationInsulation?: any[];

  // Windows and Doors
  windowTypes?: any[];
  doorTypes?: any[];

  // HVAC
  heatingSystems?: any[];
  ventilationSystems?: any[];
  hotWaterSystems?: any[];
  coolingSystems?: any[];

  // Electrical
  lightingSystems?: any[];
  electricalEquipment?: any[];
  iotSensors?: any[];

  // Controls
  thermostatControl?: any[];
  demandControl?: any[];
  buildingManagement?: any[];
}

// Color definitions for Excel
const COLORS = {
  header: { argb: 'FF1F2937' }, // gray-900
  subheader: { argb: 'FF374151' }, // gray-700
  accent: { argb: 'FF10B981' }, // emerald-500
  warning: { argb: 'FFFBBF24' }, // amber-400
  error: { argb: 'FFEF4444' }, // red-500
  info: { argb: 'FF3B82F6' }, // blue-500
  light: { argb: 'FFF3F4F6' }, // gray-100
  white: { argb: 'FFFFFFFF' }, // white
};

export function generateEnergyAssessmentExcel(data: EnergyAssessmentData): Blob {
  const wb = XLSX.utils.book_new();

  // 1. Dashboard/Master Sheet
  createDashboardSheet(wb, data);

  // 2. General Information
  createGeneralSheet(wb, data);

  // 3. Building Physics
  createBuildingPhysicsSheet(wb, data);

  // 4. Building Envelope (Isolasjon)
  createBuildingEnvelopeSheet(wb, data);

  // 5. Windows and Doors
  createWindowsDoorsSheet(wb, data);

  // 6. HVAC Systems
  createHVACSheet(wb, data);

  // 7. Electrical Systems
  createElectricalSheet(wb, data);

  // 8. Control Systems
  createControlsSheet(wb, data);

  // 9. Energy Analysis
  createEnergyAnalysisSheet(wb, data);

  // Write to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function createDashboardSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['ENERGIKARTLEGGING - DASHBOARD'],
    [],
    ['NØKKELINDIKATORER (KPIs)'],
    [],
    // Building Info Cards
    ['Bygningsinformasjon', '', 'Energidata', '', 'TEK17 Compliance'],
    ['Bygningstype:', data.bygningstype || 'Ikke spesifisert', 'Total energibruk:', `${data.totalEnergibruk || 0} kWh/år`, 'Status:', calculateTEK17Status(data)],
    ['Bruksareal:', `${data.bruksareal || 0} m²`, 'Energiintensitet:', calculateEnergyIntensity(data), 'Krav:', getTEK17Requirement(data.bygningstype)],
    ['Oppføringsår:', data.oppforingsaar || 'Ikke spesifisert', 'Energimerking:', data.energimerking || 'Ikke sertifisert', 'Avvik:', calculateDeviation(data)],
    ['Oppvarmet areal:', `${data.oppvarmetAreal || 0} m²`, 'CO₂ utslipp:', calculateCO2(data), '', ''],
    [],
    // Energy Systems Distribution
    ['ENERGISYSTEMER FORDELING'],
    [],
    ['System', 'Type', 'Andel/Antall', 'Effekt', 'Status'],
  ];

  // Add heating systems
  if (data.heatingSystems && data.heatingSystems.length > 0) {
    data.heatingSystems.forEach(system => {
      wsData.push(['Oppvarming', system.value, `${system.percentage || 0}%`, '', 'Aktiv']);
    });
  }

  // Add ventilation systems
  if (data.ventilationSystems && data.ventilationSystems.length > 0) {
    data.ventilationSystems.forEach(system => {
      wsData.push(['Ventilasjon', system.value, `${system.percentage || 0}%`, '', 'Aktiv']);
    });
  }

  // Add lighting summary
  const totalLights = data.lightingSystems?.reduce((sum, l) => sum + (l.quantity || 0), 0) || 0;
  const totalLightPower = data.lightingSystems?.reduce((sum, l) => sum + ((l.quantity || 0) * (l.power || 0)), 0) || 0;
  wsData.push(['Belysning', `${data.lightingSystems?.length || 0} typer`, `${totalLights} stk`, `${totalLightPower} W`, 'Aktiv']);

  wsData.push([]);
  wsData.push(['INVESTERINGSPOTENSIAL']);
  wsData.push([]);

  // Calculate investment potential
  const annualWaste = calculateAnnualWaste(data);
  const investmentRoom = annualWaste * 7;

  wsData.push(['Årlig sløsing:', `${formatNumber(annualWaste)} kr`, '', '', '']);
  wsData.push(['Investeringsrom (7x):', `${formatNumber(investmentRoom)} kr`, '', '', '']);
  wsData.push(['Oppvarming (70%):', `${formatNumber(investmentRoom * 0.7)} kr`, '', '', '']);
  wsData.push(['Belysning (15%):', `${formatNumber(investmentRoom * 0.15)} kr`, '', '', '']);
  wsData.push(['Annet (15%):', `${formatNumber(investmentRoom * 0.15)} kr`, '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
  ];

  // Add styles (note: styles require pro version, but we'll add merge cells)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // KPIs header
    { s: { r: 11, c: 0 }, e: { r: 11, c: 4 } }, // Energy systems header
    { s: { r: 18 + (data.heatingSystems?.length || 0) + (data.ventilationSystems?.length || 0), c: 0 },
      e: { r: 18 + (data.heatingSystems?.length || 0) + (data.ventilationSystems?.length || 0), c: 4 } }, // Investment header
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
}

function createGeneralSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['GENERELL INFORMASJON'],
    [],
    ['Eiendomsinformasjon'],
    ['Gårdsnummer (gnr):', data.gnr || ''],
    ['Bruksnummer (bnr):', data.bnr || ''],
    ['Festenummer (fnr):', data.fnr || ''],
    ['Kommunenummer:', data.kommunenummer || ''],
    ['Adresse:', data.address || ''],
    [],
    ['Bygningsinformasjon'],
    ['Bygningstype:', data.bygningstype || ''],
    ['Oppføringsår:', data.oppforingsaar || ''],
    ['Bruksareal (BRA):', `${data.bruksareal || ''} m²`],
    ['Oppvarmet areal:', `${data.oppvarmetAreal || ''} m²`],
    ['Bygningsvolum:', `${data.bygningsvolum || ''} m³`],
    ['Antall etasjer:', data.antallEtasjer || ''],
    [],
    ['Energiforbruk'],
    ['Total energibruk:', `${data.totalEnergibruk || ''} kWh/år`],
    ['Energimerking:', data.energimerking || 'Ikke sertifisert'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Generelt');
}

function createBuildingPhysicsSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['BYGNINGSFYSIKK'],
    [],
    ['Parameter', 'Verdi', 'Enhet', 'TEK17 Krav', 'Status'],
    ['Luftlekkasje n50', data.airLeakageRate || '', 'ac/h', '≤ 0.6', checkCompliance(parseFloat(data.airLeakageRate || '0'), 0.6, '<=')],
    ['Normalisert kuldebroverdi', data.normalizedThermalBridge || '', 'W/m²K', '≤ 0.05', checkCompliance(parseFloat(data.normalizedThermalBridge || '0'), 0.05, '<=')],
    ['g-verdi vinduer', data.solarHeatGainCoeff || '', '', '0.4-0.6', 'Info'],
    [],
    ['Ventilasjon'],
    ['Luftmengde', data.ventilationRate || '', 'm³/h per m²', '0.8-2.0', 'Info'],
    ['Varmegjenvinning', data.heatRecoveryEfficiency || '', '%', '≥ 80', checkCompliance(parseFloat(data.heatRecoveryEfficiency || '0'), 80, '>=')],
    ['SFP-faktor', data.specificFanPower || '', 'kW/(m³/s)', '≤ 2.5', checkCompliance(parseFloat(data.specificFanPower || '0'), 2.5, '<=')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Bygningsfysikk');
}

function createBuildingEnvelopeSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['BYGNINGSKROPP OG ISOLASJON'],
    [],
    ['Komponent', 'Type', 'Tykkelse (mm)', 'U-verdi (W/m²K)', 'TEK17 Krav', 'Status'],
  ];

  // Add wall insulation
  wsData.push(['YTTERVEGGER']);
  if (data.wallInsulation && data.wallInsulation.length > 0) {
    data.wallInsulation.forEach(ins => {
      wsData.push(['', ins.value, ins.thickness || '', ins.uValue || '', '≤ 0.18', checkUValue(ins.uValue, 0.18)]);
    });
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.18', '']);
  }

  // Add roof insulation
  wsData.push(['']);
  wsData.push(['YTTERTAK']);
  if (data.roofInsulation && data.roofInsulation.length > 0) {
    data.roofInsulation.forEach(ins => {
      wsData.push(['', ins.value, ins.thickness || '', ins.uValue || '', '≤ 0.13', checkUValue(ins.uValue, 0.13)]);
    });
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.13', '']);
  }

  // Add floor insulation
  wsData.push(['']);
  wsData.push(['GULV MOT GRUNN']);
  if (data.floorInsulation && data.floorInsulation.length > 0) {
    data.floorInsulation.forEach(ins => {
      wsData.push(['', ins.value, ins.thickness || '', ins.uValue || '', '≤ 0.10', checkUValue(ins.uValue, 0.10)]);
    });
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.10', '']);
  }

  // Add foundation insulation
  wsData.push(['']);
  wsData.push(['FUNDAMENT/KJELLER']);
  if (data.foundationInsulation && data.foundationInsulation.length > 0) {
    data.foundationInsulation.forEach(ins => {
      wsData.push(['', ins.value, ins.thickness || '', ins.uValue || '', '≤ 0.15', checkUValue(ins.uValue, 0.15)]);
    });
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.15', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Isolasjon');
}

function createWindowsDoorsSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['VINDUER OG DØRER'],
    [],
    ['Type', 'Beskrivelse', 'Antall', 'U-verdi (W/m²K)', 'TEK17 Krav', 'Status'],
  ];

  // Windows
  wsData.push(['VINDUER']);
  if (data.windowTypes && data.windowTypes.length > 0) {
    data.windowTypes.forEach(window => {
      wsData.push(['', window.value, window.quantity || 0, window.uValue || '', '≤ 0.80', checkUValue(window.uValue, 0.80)]);
    });
    const totalWindows = data.windowTypes.reduce((sum, w) => sum + (w.quantity || 0), 0);
    wsData.push(['', 'TOTALT', totalWindows, '', '', '']);
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.80', '']);
  }

  // Doors
  wsData.push(['']);
  wsData.push(['DØRER']);
  if (data.doorTypes && data.doorTypes.length > 0) {
    data.doorTypes.forEach(door => {
      wsData.push(['', door.value, door.quantity || 0, door.uValue || '', '≤ 0.80', checkUValue(door.uValue, 0.80)]);
    });
    const totalDoors = data.doorTypes.reduce((sum, d) => sum + (d.quantity || 0), 0);
    wsData.push(['', 'TOTALT', totalDoors, '', '', '']);
  } else {
    wsData.push(['', 'Ingen data', '', '', '≤ 0.80', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Vinduer og Dører');
}

function createHVACSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['VARME- OG KLIMASYSTEMER'],
    [],
    ['System', 'Type', 'Andel (%)', 'Kommentar'],
  ];

  // Heating systems
  wsData.push(['OPPVARMING']);
  if (data.heatingSystems && data.heatingSystems.length > 0) {
    data.heatingSystems.forEach(system => {
      wsData.push(['', system.value, system.percentage || 0, system.ranking || '']);
    });
    const totalHeating = data.heatingSystems.reduce((sum, h) => sum + (h.percentage || 0), 0);
    wsData.push(['', 'TOTAL', totalHeating, totalHeating === 100 ? 'OK' : 'Må summere til 100%']);
  }

  // Ventilation systems
  wsData.push(['']);
  wsData.push(['VENTILASJON']);
  if (data.ventilationSystems && data.ventilationSystems.length > 0) {
    data.ventilationSystems.forEach(system => {
      wsData.push(['', system.value, system.percentage || '-', '']);
    });
  }

  // Hot water systems
  wsData.push(['']);
  wsData.push(['VARMTVANN']);
  if (data.hotWaterSystems && data.hotWaterSystems.length > 0) {
    data.hotWaterSystems.forEach(system => {
      wsData.push(['', system.value, system.percentage || 0, '']);
    });
  }

  // Cooling systems
  wsData.push(['']);
  wsData.push(['KJØLING']);
  if (data.coolingSystems && data.coolingSystems.length > 0) {
    data.coolingSystems.forEach(system => {
      wsData.push(['', system.value, system.percentage || '-', '']);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 25 }];

  XLSX.utils.book_append_sheet(wb, ws, 'HVAC');
}

function createElectricalSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['ELEKTRISK FORBRUK OG BELYSNING'],
    [],
    ['System', 'Type', 'Antall', 'Effekt (W/stk)', 'Total effekt (W)'],
  ];

  // Lighting systems
  wsData.push(['BELYSNING']);
  let totalLightPower = 0;
  if (data.lightingSystems && data.lightingSystems.length > 0) {
    data.lightingSystems.forEach(light => {
      const totalPower = (light.quantity || 0) * (light.power || 0);
      totalLightPower += totalPower;
      wsData.push(['', light.value, light.quantity || 0, light.power || 0, totalPower]);
    });
    wsData.push(['', 'TOTALT', '', '', totalLightPower]);
  }

  // Electrical equipment
  wsData.push(['']);
  wsData.push(['ELEKTRISK UTSTYR']);
  let totalEquipmentPower = 0;
  if (data.electricalEquipment && data.electricalEquipment.length > 0) {
    data.electricalEquipment.forEach(equipment => {
      const totalPower = (equipment.quantity || 0) * (equipment.power || 0);
      totalEquipmentPower += totalPower;
      wsData.push(['', equipment.value, equipment.quantity || 0, equipment.power || 0, totalPower]);
    });
    wsData.push(['', 'TOTALT', '', '', totalEquipmentPower]);
  }

  // IoT sensors
  wsData.push(['']);
  wsData.push(['IOT-SENSORER']);
  let totalSensorPower = 0;
  if (data.iotSensors && data.iotSensors.length > 0) {
    data.iotSensors.forEach(sensor => {
      const totalPower = (sensor.quantity || 0) * (sensor.power || 0);
      totalSensorPower += totalPower;
      wsData.push(['', sensor.value, sensor.quantity || 0, sensor.power || 0, totalPower]);
    });
    wsData.push(['', 'TOTALT', '', '', totalSensorPower]);
  }

  wsData.push(['']);
  wsData.push(['TOTAL ELEKTRISK LAST', '', '', '', totalLightPower + totalEquipmentPower + totalSensorPower]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Elektrisk');
}

function createControlsSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['STYRING - AUTOMASJON OG KONTROLL'],
    [],
    ['System', 'Type', 'Status'],
  ];

  // Thermostat control
  wsData.push(['TERMOSTATSTYRING']);
  if (data.thermostatControl && data.thermostatControl.length > 0) {
    data.thermostatControl.forEach(control => {
      wsData.push(['', control.value, 'Aktiv']);
    });
  } else {
    wsData.push(['', 'Ingen styring', '']);
  }

  // Demand control
  wsData.push(['']);
  wsData.push(['BEHOVSSTYRING']);
  if (data.demandControl && data.demandControl.length > 0) {
    data.demandControl.forEach(control => {
      wsData.push(['', control.value, 'Aktiv']);
    });
  } else {
    wsData.push(['', 'Ingen styring', '']);
  }

  // Building management
  wsData.push(['']);
  wsData.push(['BYGNINGSAUTOMASJON']);
  if (data.buildingManagement && data.buildingManagement.length > 0) {
    data.buildingManagement.forEach(control => {
      wsData.push(['', control.value, 'Aktiv']);
    });
  } else {
    wsData.push(['', 'Ingen automasjon', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Styring');
}

function createEnergyAnalysisSheet(wb: XLSX.WorkBook, data: EnergyAssessmentData) {
  const wsData: any[][] = [
    ['ENERGIANALYSE OG ANBEFALINGER'],
    [],
    ['Nåværende situasjon'],
    ['Total energibruk:', `${data.totalEnergibruk || 0} kWh/år`],
    ['Energiintensitet:', calculateEnergyIntensity(data)],
    ['Energimerking:', data.energimerking || 'Ikke sertifisert'],
    ['CO₂ utslipp:', calculateCO2(data)],
    [],
    ['TEK17 Analyse'],
    ['Bygningstype:', data.bygningstype || ''],
    ['TEK17 krav:', getTEK17Requirement(data.bygningstype)],
    ['Faktisk forbruk:', calculateEnergyIntensity(data)],
    ['Avvik:', calculateDeviation(data)],
    ['Status:', calculateTEK17Status(data)],
    [],
    ['Investeringspotensial'],
    ['Årlig energikostnad:', `${formatNumber(calculateAnnualEnergyCost(data))} kr`],
    ['Potensiell besparelse (30%):', `${formatNumber(calculateAnnualEnergyCost(data) * 0.3)} kr/år`],
    ['Investeringsrom (7x):', `${formatNumber(calculateAnnualEnergyCost(data) * 0.3 * 7)} kr`],
    [],
    ['Anbefalte tiltak'],
    ['1. Oppgradering av varmesystem', calculateHeatingUpgrade(data)],
    ['2. Forbedring av isolasjon', calculateInsulationUpgrade(data)],
    ['3. Utskifting av vinduer', calculateWindowUpgrade(data)],
    ['4. Oppgradering av belysning', calculateLightingUpgrade(data)],
    ['5. Installasjon av styringssystem', calculateControlUpgrade(data)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 35 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Analyse');
}

// Helper functions
function calculateEnergyIntensity(data: EnergyAssessmentData): string {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const area = parseFloat(data.oppvarmetAreal || '1');
  return area > 0 ? `${Math.round(energy / area)} kWh/m²/år` : 'N/A';
}

function calculateCO2(data: EnergyAssessmentData): string {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const co2Factor = 0.016; // kg CO2 per kWh for Norwegian electricity mix
  return `${formatNumber(energy * co2Factor)} kg/år`;
}

function getTEK17Requirement(buildingType?: string): string {
  const requirements: Record<string, string> = {
    'Småhus': '≤ 95 kWh/m²/år',
    'Flerbolig': '≤ 85 kWh/m²/år',
    'Kontor': '≤ 115 kWh/m²/år',
    'Skole': '≤ 100 kWh/m²/år',
    'Barnehage': '≤ 125 kWh/m²/år',
    'Sykehus': '≤ 225 kWh/m²/år',
    'Hotell': '≤ 170 kWh/m²/år',
    'Handel': '≤ 180 kWh/m²/år',
    'Kultur': '≤ 130 kWh/m²/år',
    'Idrett': '≤ 145 kWh/m²/år',
    'Industri': '≤ 140 kWh/m²/år',
  };
  return requirements[buildingType || ''] || 'N/A';
}

function calculateTEK17Status(data: EnergyAssessmentData): string {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const area = parseFloat(data.oppvarmetAreal || '1');
  const intensity = area > 0 ? energy / area : 0;

  const limits: Record<string, number> = {
    'Småhus': 95,
    'Flerbolig': 85,
    'Kontor': 115,
    'Skole': 100,
    'Barnehage': 125,
    'Sykehus': 225,
    'Hotell': 170,
    'Handel': 180,
    'Kultur': 130,
    'Idrett': 145,
    'Industri': 140,
  };

  const limit = limits[data.bygningstype || ''];
  if (!limit) return 'N/A';

  return intensity <= limit ? '✅ Godkjent' : '❌ Ikke godkjent';
}

function calculateDeviation(data: EnergyAssessmentData): string {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const area = parseFloat(data.oppvarmetAreal || '1');
  const intensity = area > 0 ? energy / area : 0;

  const limits: Record<string, number> = {
    'Småhus': 95,
    'Flerbolig': 85,
    'Kontor': 115,
    'Skole': 100,
    'Barnehage': 125,
    'Sykehus': 225,
    'Hotell': 170,
    'Handel': 180,
    'Kultur': 130,
    'Idrett': 145,
    'Industri': 140,
  };

  const limit = limits[data.bygningstype || ''];
  if (!limit) return 'N/A';

  const deviation = intensity - limit;
  return deviation > 0 ? `+${Math.round(deviation)} kWh/m²/år` : `${Math.round(deviation)} kWh/m²/år`;
}

function calculateAnnualWaste(data: EnergyAssessmentData): number {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const electricityPrice = 2.80; // NOK per kWh
  const potentialSaving = 0.3; // 30% potential saving
  return energy * electricityPrice * potentialSaving;
}

function calculateAnnualEnergyCost(data: EnergyAssessmentData): number {
  const energy = parseFloat(data.totalEnergibruk || '0');
  const electricityPrice = 2.80; // NOK per kWh
  return energy * electricityPrice;
}

function checkCompliance(value: number, limit: number, operator: string): string {
  if (isNaN(value)) return '';
  if (operator === '<=') return value <= limit ? '✅' : '❌';
  if (operator === '>=') return value >= limit ? '✅' : '❌';
  return '';
}

function checkUValue(value: number | undefined, limit: number): string {
  if (!value) return '';
  return value <= limit ? '✅' : '❌';
}

function formatNumber(num: number): string {
  return num.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
}

function calculateHeatingUpgrade(data: EnergyAssessmentData): string {
  const hasHeatPump = data.heatingSystems?.some(h => h.value.includes('Varmepumpe'));
  return hasHeatPump ? 'Allerede optimalisert' : 'Anbefalt - kan spare 40-60%';
}

function calculateInsulationUpgrade(data: EnergyAssessmentData): string {
  const avgUValue = calculateAverageUValue(data);
  return avgUValue > 0.2 ? 'Høyt anbefalt' : 'Vurder forbedring';
}

function calculateWindowUpgrade(data: EnergyAssessmentData): string {
  const avgWindowUValue = data.windowTypes?.reduce((sum, w) => sum + (w.uValue || 0), 0) / (data.windowTypes?.length || 1);
  return avgWindowUValue > 1.0 ? 'Anbefalt' : 'OK';
}

function calculateLightingUpgrade(data: EnergyAssessmentData): string {
  const hasLED = data.lightingSystems?.some(l => l.value === 'LED');
  return hasLED ? 'Delvis optimalisert' : 'Høyt anbefalt - bytt til LED';
}

function calculateControlUpgrade(data: EnergyAssessmentData): string {
  const hasControl = data.buildingManagement && data.buildingManagement.length > 0;
  return hasControl ? 'Installert' : 'Anbefalt for optimal drift';
}

function calculateAverageUValue(data: EnergyAssessmentData): number {
  const uValues: number[] = [];
  data.wallInsulation?.forEach(i => i.uValue && uValues.push(i.uValue));
  data.roofInsulation?.forEach(i => i.uValue && uValues.push(i.uValue));
  data.floorInsulation?.forEach(i => i.uValue && uValues.push(i.uValue));

  if (uValues.length === 0) return 0;
  return uValues.reduce((a, b) => a + b, 0) / uValues.length;
}