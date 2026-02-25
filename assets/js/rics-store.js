// assets/js/rics-store.js
class RICSStore {
    constructor() {
        this.data = {
            items: [], events: [], traits: [], races: [], weather: []
        };
        this.filteredData = {
            items: [], events: [], traits: [], races: [], weather: []
        };
        this.currentSort = {};
        this.loadFailed = false;
        this.init();
    }

    async init() {
        await this.loadAllData();
        this.renderAllTabs();
        this.setupEventListeners();
    }

    async loadAllData() {
        this.loadFailed = false;
        const promises = [
            this.loadJson('items', 'data/StoreItems.json', this.processItemsData.bind(this)),
            this.loadJson('traits', 'data/Traits.json', this.processTraitsData.bind(this)),
            this.loadJson('races', 'data/RaceSettings.json', this.processRacesData.bind(this)),
            this.loadJson('events', 'data/Incidents.json', this.processEventsData.bind(this)),
            this.loadJson('weather', 'data/Weather.json', this.processWeatherData.bind(this))
        ];

        await Promise.allSettled(promises);

        if (this.loadFailed) {
            console.warn('Some data files failed to load → using sample data for missing tabs');
        }

        console.log('Data loaded:', {
            items: this.data.items.length,
            traits: this.data.traits.length,
            races: this.data.races.length,
            events: this.data.events.length,
            weather: this.data.weather.length
        });
    }

    async loadJson(key, url, processor) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();

            let data;
            if (key === 'items' && raw.items) data = raw.items;
            else data = raw;

            this.data[key] = processor(data);
            this.filteredData[key] = [...this.data[key]];
        } catch (e) {
            console.error(`Failed to load ${url}:`, e);
            this.loadFailed = true;
            this.data[key] = [];
            this.filteredData[key] = [];
        }
    }

    // ==================== COLOR CONVERSION ====================
    convertRimWorldColors(text) {
        if (!text || typeof text !== 'string') return text;
        let result = text;
        result = result.replace(/<color=#([0-9a-fA-F]{6,8})>(.*?)<\/color>/gi,
            '<span style="color: #$1">$2</span>');
        result = result.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
        result = result.replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>');
        return result;
    }

    // ==================== PROCESSORS (unchanged except minor safety) ====================
    processItemsData(itemsObject) { /* ... your original code ... */ 
        return Object.entries(itemsObject || {})
            .map(([key, itemData]) => ({
                defName: itemData.DefName || key,
                name: itemData.CustomName || itemData.DefName || key,
                price: itemData.BasePrice || 0,
                category: itemData.Category || 'Misc',
                quantityLimit: itemData.HasQuantityLimit ? (itemData.QuantityLimit || 0) : 'Unlimited',
                limitMode: itemData.LimitMode,
                mod: itemData.Mod || 'Unknown',
                isUsable: itemData.IsUsable || false,
                isEquippable: itemData.IsEquippable || false,
                isWearable: itemData.IsWearable || false,
                enabled: itemData.Enabled !== false
            }))
            .filter(item => (item.enabled || item.isUsable || item.isEquippable || item.isWearable))
            .filter(item => item.price > 0);
    }

    processEventsData(eventsObject) { /* ... your original ... */ 
        return Object.entries(eventsObject || {})
            .map(([key, eventData]) => ({
                defName: eventData.DefName || key,
                label: eventData.Label || eventData.DefName || key,
                baseCost: eventData.BaseCost || 0,
                karmaType: eventData.KarmaType || 'None',
                modSource: eventData.ModSource || 'Unknown',
                enabled: eventData.Enabled !== false
            }))
            .filter(event => event.enabled && event.baseCost > 0);
    }

    processTraitsData(traitsObject) { /* ... your original ... */ 
        return Object.entries(traitsObject || {})
            .map(([key, traitData]) => ({
                defName: traitData.DefName || key,
                name: traitData.Name || traitData.DefName || key,
                description: this.processTraitDescription(traitData.Description || ''),
                stats: traitData.Stats || [],
                conflicts: traitData.Conflicts || [],
                canAdd: traitData.CanAdd || false,
                canRemove: traitData.CanRemove || false,
                addPrice: traitData.AddPrice || 0,
                removePrice: traitData.RemovePrice || 0,
                bypassLimit: traitData.BypassLimit || false,
                modSource: traitData.ModSource || 'Unknown'
            }))
            .filter(trait => trait.canAdd || trait.canRemove)
            .filter(trait => trait.addPrice > 0 || trait.removePrice > 0);
    }

    processWeatherData(weatherObject) { /* ... your original ... */ 
        return Object.entries(weatherObject || {})
            .map(([key, weatherData]) => ({
                defName: weatherData.DefName || key,
                label: weatherData.Label || weatherData.DefName || key,
                description: weatherData.Description || '',
                baseCost: weatherData.BaseCost || 0,
                karmaType: weatherData.KarmaType || 'None',
                modSource: weatherData.ModSource || 'Unknown',
                enabled: weatherData.Enabled !== false
            }))
            .filter(weather => weather.enabled && weather.baseCost > 0);
    }

    processRacesData(racesObject) { /* your original processRacesData unchanged */ 
        return Object.entries(racesObject || {})
            .map(([raceKey, raceData]) => {
                const baseRace = { /* ... your exact baseRace object ... */ 
                    defName: raceKey,
                    name: raceData.DisplayName || raceKey,
                    basePrice: Math.round(raceData.BasePrice || 0),
                    minAge: raceData.MinAge || 0,
                    maxAge: raceData.MaxAge || 0,
                    allowCustomXenotypes: raceData.AllowCustomXenotypes || false,
                    defaultXenotype: raceData.DefaultXenotype || 'None',
                    enabled: raceData.Enabled !== false,
                    modActive: raceData.ModActive !== false,
                    allowedGenders: raceData.AllowedGenders || {},
                    xenotypePrices: raceData.XenotypePrices || {},
                    enabledXenotypes: raceData.EnabledXenotypes || {}
                };

                const xenotypeEntries = [];
                if (baseRace.enabledXenotypes) {
                    Object.entries(baseRace.enabledXenotypes).forEach(([xenotype, isEnabled]) => {
                        if (isEnabled && baseRace.xenotypePrices[xenotype] !== undefined) {
                            xenotypeEntries.push({
                                defName: `${raceKey}_${xenotype}`,
                                name: `${baseRace.name} ${xenotype}`,
                                basePrice: Math.round(baseRace.xenotypePrices[xenotype]),
                                isXenotype: true,
                                parentRace: baseRace.name,
                                xenotype: xenotype,
                                minAge: baseRace.minAge,
                                maxAge: baseRace.maxAge,
                                enabled: true,
                                modActive: baseRace.modActive,
                                allowedGenders: baseRace.allowedGenders
                            });
                        }
                    });
                }

                const baseRaceEntry = { /* ... your original baseRaceEntry ... */ 
                    defName: raceKey,
                    name: baseRace.name,
                    basePrice: baseRace.basePrice,
                    isXenotype: false,
                    minAge: baseRace.minAge,
                    maxAge: baseRace.maxAge,
                    allowCustomXenotypes: baseRace.allowCustomXenotypes,
                    defaultXenotype: baseRace.defaultXenotype,
                    enabled: baseRace.enabled,
                    modActive: baseRace.modActive,
                    xenotypeCount: xenotypeEntries.length,
                    allowedGenders: baseRace.allowedGenders
                };

                return [baseRaceEntry, ...xenotypeEntries];
            })
            .flat()
            .filter(race => race.enabled && race.modActive !== false);
    }

    processTraitDescription(description) { /* your original unchanged */ 
        return description
            .replace(/{PAWN_nameDef}/g, 'Timmy')
            .replace(/{PAWN_name}/g, 'Timmy')
            .replace(/{PAWN_pronoun}/g, 'he')
            .replace(/{PAWN_possessive}/g, 'his')
            .replace(/{PAWN_objective}/g, 'him')
            .replace(/{PAWN_label}/g, 'Timmy')
            .replace(/{PAWN_def}/g, 'Timmy')
            .replace(/\[PAWN_nameDef\]/g, 'Timmy')
            .replace(/\[PAWN_name\]/g, 'Timmy')
            .replace(/\[PAWN_pronoun\]/g, 'he')
            .replace(/\[PAWN_possessive\]/g, 'his')
            .replace(/\[PAWN_objective\]/g, 'him')
            .replace(/\[PAWN_label\]/g, 'Timmy')
            .replace(/\[PAWN_def\]/g, 'Timmy');
    }

    // ==================== RENDERING ====================
    renderAllTabs() {
        this.renderItems();
        this.renderEvents();
        this.renderWeather();
        this.renderTraits();
        this.renderRaces();
    }

    renderItems() { /* your original unchanged */ 
        const tbody = document.getElementById('items-tbody');
        const items = this.filteredData.items;
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No items found</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <span class="metadata">
                        ${this.escapeHtml(item.defName)}
                        <br>From ${this.escapeHtml(this.getModDisplayName(item.mod))}
                        <br>Usage: !buy ${this.escapeHtml(item.name)} or !buy ${this.escapeHtml(item.defName)}
                        ${this.getUsageTypes(item)}
                    </span>
                </td>
                <td class="no-wrap"><strong>${item.price}</strong></td>
                <td>${this.escapeHtml(item.category)}</td>
                <td class="no-wrap">${item.quantityLimit}</td>
            </tr>
        `).join('');
    }

    renderEvents() { /* your original (uses convert directly on label) unchanged */ 
        const tbody = document.getElementById('events-tbody');
        const events = this.filteredData.events;
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">No events found</td></tr>';
            return;
        }
        tbody.innerHTML = events.map(event => {
            const coloredLabel = this.convertRimWorldColors(event.label);
            return `
            <tr>
                <td>
                    <div class="item-name">${coloredLabel}</div>
                    <span class="metadata">
                        ${this.escapeHtml(event.defName)}
                        <br>From ${this.escapeHtml(event.modSource)}
                        <br>Usage: !event ${this.escapeHtml(event.label)} or !event ${this.escapeHtml(event.defName)}
                    </span>
                </td>
                <td class="no-wrap"><strong>${event.baseCost}</strong></td>
                <td>${this.escapeHtml(event.karmaType)}</td>
            </tr>`;
        }).join('');
    }

    renderTraits() {
        const tbody = document.getElementById('traits-tbody');
        const traits = this.filteredData.traits;
        if (traits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px;">No traits found</td></tr>';
            return;
        }

        tbody.innerHTML = traits.map(trait => {
            const coloredName = this.convertRimWorldColors(trait.name);
            return `
            <tr>
                <td>
                    <div class="item-name">${coloredName}</div>
                    <span class="metadata">
                        ${this.escapeHtml(trait.defName)}
                        <br>From ${this.escapeHtml(trait.modSource)}
                        ${trait.bypassLimit ? '<br><span class="usage">Bypasses Limit</span>' : ''}
                    </span>
                    <div class="trait-description">${this.convertRimWorldColors(trait.description)}</div>
                    ${this.renderTraitStats(trait)}
                    ${this.renderTraitConflicts(trait)}
                </td>
                <td class="no-wrap">
                    ${trait.canAdd ? `<strong>${trait.addPrice}</strong>` : '<span class="metadata">Cannot Add</span>'}
                </td>
                <td class="no-wrap">
                    ${trait.canRemove ? `<strong>${trait.removePrice}</strong>` : '<span class="metadata">Cannot Remove</span>'}
                </td>
            </tr>`;
        }).join('');
    }

    renderTraitStats(trait) { /* your original unchanged */ 
        if (!trait.stats || trait.stats.length === 0) return '';
        const statsHtml = trait.stats.map(stat => `<li>${this.convertRimWorldColors(stat)}</li>`).join('');
        return `<div class="metadata"><strong>Stats:</strong><ul style="margin:5px 0;padding-left:20px;">${statsHtml}</ul></div>`;
    }

    renderTraitConflicts(trait) { /* your original unchanged */ 
        if (!trait.conflicts || trait.conflicts.length === 0) return '';
        const conflictsHtml = trait.conflicts.map(c => `<li>${this.convertRimWorldColors(c)}</li>`).join('');
        return `<div class="metadata"><strong>Conflicts with:</strong><ul style="margin:5px 0;padding-left:20px;">${conflictsHtml}</ul></div>`;
    }

    renderRaces() { /* your original unchanged */ 
        const tbody = document.getElementById('races-tbody');
        const races = this.filteredData.races;
        if (races.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No races found</td></tr>';
            return;
        }
        tbody.innerHTML = races.map(race => `
            <tr>
                <td>
                    <div class="item-name">${this.escapeHtml(race.name)}</div>
                    <span class="metadata">
                        ${race.isXenotype ? `Xenotype of ${this.escapeHtml(race.parentRace)}` : 'Base Race'}
                        ${!race.isXenotype && race.xenotypeCount > 0 ? `<br>${race.xenotypeCount} xenotypes available` : ''}
                        ${race.allowCustomXenotypes ? '<br>Custom xenotypes allowed' : ''}
                    </span>
                </td>
                <td class="no-wrap"><strong>${race.basePrice}</strong></td>
                <td class="no-wrap">Age: ${race.minAge}-${race.maxAge}</td>
                <td class="no-wrap">${this.getAvailableGenders(race.allowedGenders)}</td>
            </tr>
        `).join('');
    }

    renderWeather() { /* your original unchanged */ 
        const tbody = document.getElementById('weather-tbody');
        const weather = this.filteredData.weather;
        if (weather.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">No weather found</td></tr>';
            return;
        }
        tbody.innerHTML = weather.map(w => {
            const coloredLabel = this.convertRimWorldColors(w.label);
            return `
            <tr>
                <td>
                    <div class="item-name">${coloredLabel}</div>
                    <span class="metadata">
                        ${this.escapeHtml(w.defName)}
                        <br>From ${this.escapeHtml(w.modSource)}
                        <br>Usage: !weather ${this.escapeHtml(w.label)} or !weather ${this.escapeHtml(w.defName)}
                    </span>
                </td>
                <td class="no-wrap"><strong>${w.baseCost}</strong></td>
                <td>${this.escapeHtml(w.karmaType)}</td>
                <td>${w.description ? `<div class="trait-description">${this.convertRimWorldColors(w.description)}</div>` : 'No description'}</td>
            </tr>`;
        }).join('');
    }

    // ==================== HELPERS ====================
    getUsageTypes(item) { /* your original unchanged */ 
        const types = [];
        if (item.isUsable) types.push('Usable');
        if (item.isEquippable) types.push('Equippable');
        if (item.isWearable) types.push('Wearable');
        return types.length ? `<br><span class="usage">Usage: ${types.join(', ')}</span>` : '';
    }

    getAvailableGenders(allowedGenders) { /* your original unchanged */ 
        const g = [];
        if (allowedGenders.AllowMale) g.push('M');
        if (allowedGenders.AllowFemale) g.push('F');
        if (allowedGenders.AllowOther) g.push('O');
        return g.join(' ');
    }

    getModDisplayName(mod) {
        return mod === 'Core' ? 'RimWorld' : (mod || 'Unknown');
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe || '';
        return this.convertRimWorldColors(unsafe);   // ← FIXED: no longer breaks colors
    }

    // ==================== SAMPLE DATA (now for ALL tabs) ====================
    loadSampleData() {
        console.log('Loading full sample data...');

        this.data.items = [ /* your two sample items */ ];
        this.filteredData.items = [...this.data.items];

        this.data.traits = [{
            defName: "Beautiful", name: "Beautiful", description: "This pawn is very attractive.", 
            addPrice: 500, removePrice: 300, canAdd: true, canRemove: true, modSource: "Core"
        }];
        this.filteredData.traits = [...this.data.traits];

        this.data.races = [{
            defName: "Human", name: "Human", basePrice: 0, isXenotype: false,
            minAge: 0, maxAge: 999, xenotypeCount: 3, modActive: true
        }];
        this.filteredData.races = [...this.data.races];

        this.data.events = [{
            defName: "Raid", label: "Enemy Raid", baseCost: 800, karmaType: "Negative", modSource: "Core"
        }];
        this.filteredData.events = [...this.data.events];

        this.data.weather = [{
            defName: "Clear", label: "Clear Skies", baseCost: 50, karmaType: "Positive", modSource: "Core"
        }];
        this.filteredData.weather = [...this.data.weather];

        this.renderAllTabs();
    }

    // ==================== EVENT LISTENERS & FILTER/SORT (only small improvement in filter) ====================
    setupEventListeners() { /* your original unchanged */ 
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        this.setupSearch('items'); this.setupSearch('events'); this.setupSearch('weather');
        this.setupSearch('traits'); this.setupSearch('races');
        this.setupSorting();
    }

    setupSearch(tabName) { /* your original unchanged */ }

    filterTab(tabName, searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const allData = this.data[tabName] || [];

        if (term === '') {
            this.filteredData[tabName] = [...allData];
        } else {
            this.filteredData[tabName] = allData.filter(item => {
                const text = [
                    item.name, item.label, item.defName, item.description,
                    item.category, item.karmaType, item.modSource,
                    ...(Array.isArray(item.stats) ? item.stats : []),
                    ...(Array.isArray(item.conflicts) ? item.conflicts : [])
                ].join(' ').toLowerCase();
                return text.includes(term);
            });
        }
        this[`render${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`]();
    }

    // sortTab, switchTab, setupSorting — your original code unchanged
    setupSorting() { /* ... */ }
    sortTab(tabName, field) { /* ... */ }
    switchTab(tabName) { /* ... */ }

    // ==================== FINAL INIT ====================
}

document.addEventListener('DOMContentLoaded', () => {
    new RICSStore();
});
