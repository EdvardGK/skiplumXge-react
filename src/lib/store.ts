import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Address,
  BuildingData,
  EnergyAnalysis,
  InvestmentGuidance,
  EnovaStatus,
  AppState,
} from '@/types/norwegian-energy';

interface PropertySearchState {
  query: string;
  results: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  error: string | null;
}

interface EnergyDashboardState {
  buildingData: BuildingData | null;
  energyAnalysis: EnergyAnalysis | null;
  investmentGuidance: InvestmentGuidance | null;
  enovaStatus: EnovaStatus | null;
  isCalculating: boolean;
  error: string | null;
}

interface UIState {
  theme: 'light' | 'dark';
  language: 'nb' | 'en';
  sidebarOpen: boolean;
  currentStep: 'search' | 'form' | 'dashboard';
}

interface StoreState extends AppState {
  propertySearch: PropertySearchState;
  energyDashboard: EnergyDashboardState;
  ui: UIState;
}

interface StoreActions {
  // Property Search Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Address[]) => void;
  setSelectedAddress: (address: Address | null) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchError: (error: string | null) => void;
  clearSearchResults: () => void;

  // Energy Dashboard Actions
  setBuildingData: (data: BuildingData | null) => void;
  setEnergyAnalysis: (analysis: EnergyAnalysis | null) => void;
  setInvestmentGuidance: (guidance: InvestmentGuidance | null) => void;
  setEnovaStatus: (status: EnovaStatus | null) => void;
  setCalculating: (calculating: boolean) => void;
  setDashboardError: (error: string | null) => void;
  clearDashboardData: () => void;

  // UI Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'nb' | 'en') => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentStep: (step: 'search' | 'form' | 'dashboard') => void;

  // Combined Actions
  resetApp: () => void;
  initializeFromAddress: (address: Address) => void;
}

const initialState: StoreState = {
  propertySearch: {
    query: '',
    results: [],
    selectedAddress: null,
    isLoading: false,
    error: null,
  },
  energyDashboard: {
    buildingData: null,
    energyAnalysis: null,
    investmentGuidance: null,
    enovaStatus: null,
    isCalculating: false,
    error: null,
  },
  ui: {
    theme: 'dark', // Default to dark theme for the Norwegian energy app
    language: 'nb', // Default to Norwegian
    sidebarOpen: false,
    currentStep: 'search',
  },
};

export const useAppStore = create<StoreState & StoreActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Property Search Actions
        setSearchQuery: (query: string) =>
          set(
            state => ({
              propertySearch: { ...state.propertySearch, query },
            }),
            false,
            'setSearchQuery'
          ),

        setSearchResults: (results: Address[]) =>
          set(
            state => ({
              propertySearch: { ...state.propertySearch, results },
            }),
            false,
            'setSearchResults'
          ),

        setSelectedAddress: (selectedAddress: Address | null) =>
          set(
            state => ({
              propertySearch: { ...state.propertySearch, selectedAddress },
            }),
            false,
            'setSelectedAddress'
          ),

        setSearchLoading: (isLoading: boolean) =>
          set(
            state => ({
              propertySearch: { ...state.propertySearch, isLoading },
            }),
            false,
            'setSearchLoading'
          ),

        setSearchError: (error: string | null) =>
          set(
            state => ({
              propertySearch: { ...state.propertySearch, error },
            }),
            false,
            'setSearchError'
          ),

        clearSearchResults: () =>
          set(
            state => ({
              propertySearch: {
                ...state.propertySearch,
                query: '',
                results: [],
                selectedAddress: null,
                error: null,
              },
            }),
            false,
            'clearSearchResults'
          ),

        // Energy Dashboard Actions
        setBuildingData: (buildingData: BuildingData | null) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, buildingData },
            }),
            false,
            'setBuildingData'
          ),

        setEnergyAnalysis: (energyAnalysis: EnergyAnalysis | null) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, energyAnalysis },
            }),
            false,
            'setEnergyAnalysis'
          ),

        setInvestmentGuidance: (investmentGuidance: InvestmentGuidance | null) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, investmentGuidance },
            }),
            false,
            'setInvestmentGuidance'
          ),

        setEnovaStatus: (enovaStatus: EnovaStatus | null) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, enovaStatus },
            }),
            false,
            'setEnovaStatus'
          ),

        setCalculating: (isCalculating: boolean) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, isCalculating },
            }),
            false,
            'setCalculating'
          ),

        setDashboardError: (error: string | null) =>
          set(
            state => ({
              energyDashboard: { ...state.energyDashboard, error },
            }),
            false,
            'setDashboardError'
          ),

        clearDashboardData: () =>
          set(
            state => ({
              energyDashboard: {
                ...state.energyDashboard,
                buildingData: null,
                energyAnalysis: null,
                investmentGuidance: null,
                enovaStatus: null,
                error: null,
              },
            }),
            false,
            'clearDashboardData'
          ),

        // UI Actions
        setTheme: (theme: 'light' | 'dark') =>
          set(
            state => ({
              ui: { ...state.ui, theme },
            }),
            false,
            'setTheme'
          ),

        setLanguage: (language: 'nb' | 'en') =>
          set(
            state => ({
              ui: { ...state.ui, language },
            }),
            false,
            'setLanguage'
          ),

        setSidebarOpen: (sidebarOpen: boolean) =>
          set(
            state => ({
              ui: { ...state.ui, sidebarOpen },
            }),
            false,
            'setSidebarOpen'
          ),

        setCurrentStep: (currentStep: 'search' | 'form' | 'dashboard') =>
          set(
            state => ({
              ui: { ...state.ui, currentStep },
            }),
            false,
            'setCurrentStep'
          ),

        // Combined Actions
        resetApp: () =>
          set(
            () => initialState,
            false,
            'resetApp'
          ),

        initializeFromAddress: (address: Address) => {
          const { setSelectedAddress, setCurrentStep, setBuildingData } = get();

          setSelectedAddress(address);
          setCurrentStep('form');

          // If address has matrikkel data, pre-populate building data
          if (address.matrikkel) {
            const buildingData: BuildingData = {
              type: address.matrikkel.buildingType as any,
              totalArea: address.matrikkel.totalArea || 0,
              heatedArea: address.matrikkel.heatedArea || 0,
              buildingYear: address.matrikkel.buildingYear,
              energySystems: {
                heating: 'Elektrisitet',
                lighting: 'Fluorescerende',
                ventilation: 'Naturlig',
                hotWater: 'Elektrisitet',
              },
              municipality: address.municipality,
              coordinates: address.coordinates,
            };
            setBuildingData(buildingData);
          }
        },
      }),
      {
        name: 'norwegian-energy-app',
        partialize: (state) => ({
          // Only persist UI preferences, not data
          ui: state.ui,
        }),
      }
    ),
    {
      name: 'norwegian-energy-store',
    }
  )
);

// Selector hooks for better performance
export const usePropertySearch = () =>
  useAppStore(state => state.propertySearch);

export const useEnergyDashboard = () =>
  useAppStore(state => state.energyDashboard);

export const useUI = () => useAppStore(state => state.ui);

export const useSearchActions = () =>
  useAppStore(state => ({
    setSearchQuery: state.setSearchQuery,
    setSearchResults: state.setSearchResults,
    setSelectedAddress: state.setSelectedAddress,
    setSearchLoading: state.setSearchLoading,
    setSearchError: state.setSearchError,
    clearSearchResults: state.clearSearchResults,
  }));

export const useDashboardActions = () =>
  useAppStore(state => ({
    setBuildingData: state.setBuildingData,
    setEnergyAnalysis: state.setEnergyAnalysis,
    setInvestmentGuidance: state.setInvestmentGuidance,
    setEnovaStatus: state.setEnovaStatus,
    setCalculating: state.setCalculating,
    setDashboardError: state.setDashboardError,
    clearDashboardData: state.clearDashboardData,
  }));

export const useUIActions = () =>
  useAppStore(state => ({
    setTheme: state.setTheme,
    setLanguage: state.setLanguage,
    setSidebarOpen: state.setSidebarOpen,
    setCurrentStep: state.setCurrentStep,
  }));

export const useAppActions = () =>
  useAppStore(state => ({
    resetApp: state.resetApp,
    initializeFromAddress: state.initializeFromAddress,
  }));