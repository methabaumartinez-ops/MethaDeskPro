import { mockUser, mockProjekte, mockTeilsysteme, mockPositionen, mockMaterial, mockLieferanten, mockMitarbeiter, mockFahrzeuge, mockReservierungen } from './data';

const IS_SERVER = typeof window === 'undefined';

// In-memory cache for server-side persistence during the session
// This allows POST/PUT/DELETE via API routes to be reflected in server-rendered or server-side-fetched data
const serverCache: Record<string, any> = {};

const getFromStorage = (key: string, defaultValue: any) => {
    if (IS_SERVER) {
        return serverCache[key] || defaultValue;
    }
    const stored = localStorage.getItem(`methabau_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
};

const saveToStorage = (key: string, value: any) => {
    if (IS_SERVER) {
        serverCache[key] = value;
    } else {
        localStorage.setItem(`methabau_${key}`, JSON.stringify(value));
    }
};

export const mockStore = {
    getUsers: () => getFromStorage('users', [mockUser]),
    saveUsers: (users: any) => saveToStorage('users', users),

    getProjekte: () => getFromStorage('projekte', mockProjekte),
    saveProjekte: (projekte: any) => saveToStorage('projekte', projekte),

    getTeilsysteme: (projektId?: string) => {
        const all = getFromStorage('teilsysteme', mockTeilsysteme);
        return projektId ? all.filter((ts: any) => ts.projektId === projektId) : all;
    },
    saveTeilsysteme: (teilsysteme: any) => saveToStorage('teilsysteme', teilsysteme),

    getPositionen: (tsId?: string) => {
        const all = getFromStorage('positionen', mockPositionen);
        return tsId ? all.filter((pos: any) => pos.teilsystemId === tsId) : all;
    },
    savePositionen: (positionen: any) => saveToStorage('positionen', positionen),

    getUnterpositionen: (posId?: string) => {
        const all = getFromStorage('unterpositionen', []);
        return posId ? all.filter((upos: any) => upos.positionId === posId) : all;
    },
    saveUnterpositionen: (unterpositionen: any) => saveToStorage('unterpositionen', unterpositionen),

    getMaterial: () => getFromStorage('material', mockMaterial),
    saveMaterial: (material: any) => saveToStorage('material', material),

    getLieferanten: () => getFromStorage('lieferanten', mockLieferanten),
    saveLieferanten: (lieferanten: any) => saveToStorage('lieferanten', lieferanten),

    getMitarbeiter: () => getFromStorage('mitarbeiter', mockMitarbeiter),
    saveMitarbeiter: (mitarbeiter: any) => saveToStorage('mitarbeiter', mitarbeiter),

    getFahrzeuge: () => getFromStorage('fahrzeuge', mockFahrzeuge),
    saveFahrzeuge: (fahrzeuge: any) => saveToStorage('fahrzeuge', fahrzeuge),

    getReservierungen: () => getFromStorage('reservierungen', mockReservierungen),
    saveReservierungen: (reservierungen: any) => saveToStorage('reservierungen', reservierungen),

    // Helpers
    login: (email: string) => {
        const users = mockStore.getUsers();
        const user = users.find((u: any) => u.email === email);
        if (user) {
            saveToStorage('currentUser', user);
            return user;
        }
        return null;
    },

    getCurrentUser: () => getFromStorage('currentUser', null),
    logout: () => {
        if (!IS_SERVER) localStorage.removeItem('methabau_currentUser');
    },

    getActiveProjekt: () => getFromStorage('activeProjekt', null),
    setActiveProjekt: (projekt: any) => saveToStorage('activeProjekt', projekt),

    resetData: () => {
        if (!IS_SERVER) {
            localStorage.clear();
            window.location.reload();
        }
    }
};
